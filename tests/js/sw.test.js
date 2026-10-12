/* sw.js, the offline copy's service worker, run in a vm context against a fake Cache Storage, a fake
   fetch and a recorded client list. Nothing touches the network. */
import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { ROOT } from './helpers.js';

const SRC = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const ORIGIN = 'http://lw.test';

/* Cache Storage: named maps of url -> Response; match hands out clones, as a real cache does */
function fakeCaches() {
  const store = new Map();
  const cacheOf = (m) => ({
    async match(req) { const r = m.get(typeof req === 'string' ? req : req.url); return r ? r.clone() : undefined; },
    async put(req, res) { m.set(typeof req === 'string' ? req : req.url, res); },
    async keys() { return [...m.keys()].map((url) => ({ url })); },
    async delete(req) { return m.delete(typeof req === 'string' ? req : req.url); },
  });
  return {
    store,
    async open(name) { if (!store.has(name)) store.set(name, new Map()); return cacheOf(store.get(name)); },
    async keys() { return [...store.keys()]; },
    async delete(name) { return store.delete(name); },
    async has(name) { return store.has(name); },
  };
}

/* a worker with the server's list ({version, files: {path: hash}}) and bodies; list = null: PC out of reach */
function boot({ list, bodies = {}, caches = fakeCaches(), fetchImpl } = {}) {
  const handlers = {}, posted = [], fetched = [], server = { list, bodies };
  const client = { postMessage: (m) => posted.push(m) };
  const self = {
    registration: { scope: ORIGIN + '/' },
    location: { origin: ORIGIN },
    clients: { matchAll: async () => [client], claim: vi.fn(async () => {}) },
    skipWaiting: vi.fn(),
    addEventListener: (t, fn) => { handlers[t] = fn; },
  };
  const doFetch = fetchImpl || (async (input) => {
    const url = typeof input === 'string' ? input : input.url;
    fetched.push(String(url));
    const p = new URL(url).pathname.slice(1);
    if (p === 'api/offline') {
      if (!server.list) throw new TypeError('offline');
      return new Response(JSON.stringify(server.list), { status: 200 });
    }
    if (p in server.bodies) return new Response(server.bodies[p], { status: 200 });
    return new Response('nope', { status: 404 });
  });
  const ctx = vm.createContext({
    self, caches, fetch: doFetch, Response, Headers, URL, AbortController, JSON, Object, Array, Set, Promise, Error, String, Math,
    setTimeout: (...a) => globalThis.setTimeout(...a), clearTimeout: (...a) => globalThis.clearTimeout(...a),
    decodeURIComponent, console,
  });
  vm.runInContext(SRC, ctx, { filename: 'sw.js' });
  const waits = [];
  const send = async (data) => { const e = { data, waitUntil: (p) => waits.push(p) }; handlers.message(e); await Promise.all(waits.splice(0)); };
  const request = async (url, init = {}) => {
    const out = { waits: [], responded: undefined };
    const e = { request: { method: 'GET', mode: 'cors', url, ...init }, waitUntil: (p) => out.waits.push(p), respondWith: (p) => { out.responded = p; } };
    handlers.fetch(e);
    out.res = out.responded ? await out.responded : undefined;
    await Promise.all(out.waits);
    return out;
  };
  return { self, handlers, posted, fetched, server, caches, send, request, last: () => posted[posted.length - 1], states: () => posted.map((m) => m.state) };
}

const files = { 'index.html': 'h1', 'main.js': 'm1', 'books/a.js': 'a1' };
const hashes = (extra = {}) => ({ 'index.html': 'h-1', 'main.js': 'm-1', 'books/a.js': 'a-1', ...extra });
const list1 = () => ({ version: 'v1', files: hashes() });

afterEach(() => { vi.useRealTimers(); });

describe('install and activate', () => {
  it('takes over at once: skipWaiting on install, claim on activate', async () => {
    const w = boot({ list: list1() });
    w.handlers.install();
    expect(w.self.skipWaiting).toHaveBeenCalled();
    const waits = [];
    w.handlers.activate({ waitUntil: (p) => waits.push(p) });
    await Promise.all(waits);
    expect(w.self.clients.claim).toHaveBeenCalled();
  });
});

describe('the first sync', () => {
  it('keeps every listed file in a cache named for the version, with its hash, and reports ready', async () => {
    const w = boot({ list: list1(), bodies: files });
    await w.send('sync');
    expect(await w.caches.keys()).toContain('lw-files-v1');
    const cache = await w.caches.open('lw-files-v1');
    const hit = await cache.match(ORIGIN + '/main.js');
    expect(await hit.text()).toBe('m1');
    expect(hit.headers.get('x-lw-hash')).toBe('m-1');
    expect(w.last()).toEqual({ lw: 'offline', state: 'ready', total: 3, reach: true });
  });

  it('announces that it is syncing, with the total, before it ends', async () => {
    const w = boot({ list: list1(), bodies: files });
    await w.send('sync');
    expect(w.posted[0]).toEqual({ lw: 'offline', state: 'syncing', done: 0, total: 3, reach: true });
  });

  it('records the active version in the state cache', async () => {
    const w = boot({ list: list1(), bodies: files });
    await w.send('sync');
    const st = await (await (await w.caches.open('lw-offline-state')).match(ORIGIN + '/__lw-offline-state')).json();
    expect(st.active).toEqual({ cache: 'lw-files-v1', version: 'v1', count: 3 });
    expect(st.staged).toBeUndefined();
  });

  it('runs one sync at a time: two messages share it', async () => {
    const w = boot({ list: list1(), bodies: files });
    await Promise.all([w.send('sync'), w.send('sync')]);
    expect(w.fetched.filter((u) => u.endsWith('api/offline'))).toHaveLength(1);
  });

  it('reports every 40th file as progress', async () => {
    const many = {}, h = {};
    for (let i = 0; i < 85; i++) { many[`f${i}.js`] = 'x' + i; h[`f${i}.js`] = 'h' + i; }
    const w = boot({ list: { version: 'big', files: h }, bodies: many });
    await w.send('sync');
    const progress = w.posted.filter((m) => m.state === 'syncing' && m.done > 0).map((m) => m.done);
    expect(progress).toEqual([40, 80]);
  });
});

describe('a later sync', () => {
  it('does nothing when the version is the one in use', async () => {
    const w = boot({ list: list1(), bodies: files });
    await w.send('sync');
    w.fetched.length = 0;
    await w.send('sync');
    expect(w.fetched).toEqual([ORIGIN + '/api/offline']);
    expect(w.last()).toEqual({ lw: 'offline', state: 'ready', total: 3, reach: true });
  });

  it('stages a newer version, fetching only the changed files and copying the rest', async () => {
    const w = boot({ list: list1(), bodies: files });
    await w.send('sync');
    w.fetched.length = 0;
    w.server.list = { version: 'v2', files: hashes({ 'main.js': 'm-2' }) };
    w.server.bodies = { ...files, 'main.js': 'm2' };
    await w.send('sync');
    expect(w.fetched.filter((u) => !u.endsWith('api/offline'))).toEqual([ORIGIN + '/main.js']);
    expect(w.last().state).toBe('update-ready');
    const next = await w.caches.open('lw-files-v2');
    expect(await (await next.match(ORIGIN + '/main.js')).text()).toBe('m2');
    expect(await (await next.match(ORIGIN + '/index.html')).text()).toBe('h1'); // copied from v1
  });

  it('leaves the running version in place until a page load', async () => {
    const w = boot({ list: list1(), bodies: files });
    await w.send('sync');
    w.server.list = { version: 'v2', files: hashes({ 'main.js': 'm-2' }) };
    w.server.bodies = { ...files, 'main.js': 'm2' };
    await w.send('sync');
    const asset = await w.request(ORIGIN + '/main.js');
    expect(await asset.res.text()).toBe('m1');
  });

  it('promotes the staged version at a navigation and deletes the old cache', async () => {
    const w = boot({ list: list1(), bodies: files });
    await w.send('sync');
    w.server.list = { version: 'v2', files: hashes({ 'main.js': 'm-2' }) };
    w.server.bodies = { ...files, 'main.js': 'm2' };
    await w.send('sync');
    const nav = await w.request(ORIGIN + '/', { mode: 'navigate' });
    expect(await nav.res.text()).toBe('h1');
    expect(await w.caches.has('lw-files-v1')).toBe(false);
    expect(await w.caches.has('lw-files-v2')).toBe(true);
    expect(await (await w.request(ORIGIN + '/main.js')).res.text()).toBe('m2');
  });

  it('drops a staged version that went stale when the server is back on the active one', async () => {
    const w = boot({ list: list1(), bodies: files });
    await w.send('sync');
    w.server.list = { version: 'v2', files: hashes({ 'main.js': 'm-2' }) };
    w.server.bodies = { ...files, 'main.js': 'm2' };
    await w.send('sync');
    w.server.list = list1();
    await w.send('sync');
    expect(await w.caches.has('lw-files-v2')).toBe(false);
    expect(w.last().state).toBe('ready');
  });

  it('does not stage the same newer version twice', async () => {
    const w = boot({ list: list1(), bodies: files });
    await w.send('sync');
    w.server.list = { version: 'v2', files: hashes({ 'main.js': 'm-2' }) };
    w.server.bodies = { ...files, 'main.js': 'm2' };
    await w.send('sync');
    w.fetched.length = 0;
    await w.send('sync');
    expect(w.fetched).toEqual([ORIGIN + '/api/offline']);
    expect(w.last().state).toBe('update-ready');
  });

  it('removes files the new list no longer holds', async () => {
    const w = boot({ list: list1(), bodies: files });
    await w.send('sync');
    w.server.list = { version: 'v2', files: { 'index.html': 'h-1' } };
    await w.send('sync');
    const next = await w.caches.open('lw-files-v2');
    expect((await next.keys()).map((k) => k.url)).toEqual([ORIGIN + '/index.html']);
  });
});

describe('when things go wrong', () => {
  it('keeps what it has and says the PC is out of reach when the list cannot be fetched', async () => {
    const w = boot({ list: null });
    await w.send('sync');
    expect(w.last()).toEqual({ lw: 'offline', state: 'empty', reach: false });
  });

  it('says ready, not reachable, when it has a copy and the PC is away', async () => {
    const w = boot({ list: list1(), bodies: files });
    await w.send('sync');
    w.server.list = null;
    await w.send('sync');
    expect(w.last()).toEqual({ lw: 'offline', state: 'ready', total: 3, reach: false });
  });

  it('treats a non-OK list answer as out of reach', async () => {
    const w = boot({ fetchImpl: async () => new Response('', { status: 500 }) });
    await w.send('sync');
    expect(w.last().reach).toBe(false);
  });

  it('stops at a missing file, names it, and does not switch versions', async () => {
    const w = boot({ list: list1(), bodies: { 'index.html': 'h1', 'main.js': 'm1' } }); // books/a.js is a 404
    await w.send('sync');
    const m = w.last();
    expect(m.failed).toMatch(/books\/a\.js: 404/);
    expect(m.reach).toBe(true);
    expect(m.state).toBe('empty');
    const st = await (await w.caches.open('lw-offline-state')).match(ORIGIN + '/__lw-offline-state');
    expect(st).toBeUndefined();
  });

  it('resumes where it stopped: files already kept with the right hash are not fetched again', async () => {
    const w = boot({ list: list1(), bodies: { 'index.html': 'h1', 'main.js': 'm1' } });
    await w.send('sync');
    w.fetched.length = 0;
    w.server.bodies = files;
    await w.send('sync');
    const got = w.fetched.filter((u) => !u.endsWith('api/offline'));
    expect(got).toEqual([ORIGIN + '/books/a.js']);
    expect(w.last().state).toBe('ready');
  });

  it('tries a dropped connection again after a pause, and gives up after three retries', async () => {
    vi.useFakeTimers();
    let n = 0;
    const w = boot({
      fetchImpl: async (url) => {
        const p = new URL(url).pathname.slice(1);
        if (p === 'api/offline') return new Response(JSON.stringify({ version: 'v1', files: { 'a.js': 'h' } }));
        n++;
        throw new TypeError('network down');
      },
    });
    const done = w.send('sync');
    await vi.advanceTimersByTimeAsync(400 + 800 + 1200 + 10);
    await done;
    expect(n).toBe(4);
    expect(w.last().failed).toMatch(/network down/);
  });

  it('succeeds when a retry gets through', async () => {
    vi.useFakeTimers();
    let n = 0;
    const w = boot({
      fetchImpl: async (url) => {
        const p = new URL(url).pathname.slice(1);
        if (p === 'api/offline') return new Response(JSON.stringify({ version: 'v1', files: { 'a.js': 'h' } }));
        if (++n < 3) throw new TypeError('blip');
        return new Response('ok');
      },
    });
    const done = w.send('sync');
    await vi.advanceTimersByTimeAsync(2000);
    await done;
    expect(w.last().state).toBe('ready');
  });

  it('retries a server error (not 404) before giving up', async () => {
    vi.useFakeTimers();
    let n = 0;
    const w = boot({
      fetchImpl: async (url) => {
        const p = new URL(url).pathname.slice(1);
        if (p === 'api/offline') return new Response(JSON.stringify({ version: 'v1', files: { 'a.js': 'h' } }));
        n++;
        return new Response('', { status: 503 });
      },
    });
    const done = w.send('sync');
    await vi.advanceTimersByTimeAsync(5000);
    await done;
    expect(n).toBe(4);
    expect(w.last().failed).toMatch(/a\.js: 503/);
  });
});

describe('status', () => {
  it('reports empty, then ready, then update-ready', async () => {
    const w = boot({ list: list1(), bodies: files });
    await w.send('status');
    expect(w.last()).toEqual({ lw: 'offline', state: 'empty' });
    await w.send('sync');
    await w.send('status');
    expect(w.last()).toEqual({ lw: 'offline', state: 'ready', total: 3 });
    w.server.list = { version: 'v2', files: hashes({ 'main.js': 'm-2' }) };
    w.server.bodies = { ...files, 'main.js': 'm2' };
    await w.send('sync');
    await w.send('status');
    expect(w.last()).toEqual({ lw: 'offline', state: 'update-ready' });
  });

  it('ignores messages it does not know', async () => {
    const w = boot({ list: list1() });
    await w.send('hello');
    await w.send({});
    expect(w.posted).toEqual([]);
  });

  it('reads the state back from the cache after a restart of the worker', async () => {
    const caches = fakeCaches();
    const a = boot({ list: list1(), bodies: files, caches });
    await a.send('sync');
    const b = boot({ list: null, caches });
    await b.send('status');
    expect(b.last()).toEqual({ lw: 'offline', state: 'ready', total: 3 });
  });
});

describe('serving pages', () => {
  const synced = async () => { const w = boot({ list: list1(), bodies: files }); await w.send('sync'); w.fetched.length = 0; return w; };

  it('answers from the active copy, whatever the network does', async () => {
    const w = await synced();
    w.server.list = null;
    const r = await w.request(ORIGIN + '/main.js');
    expect(await r.res.text()).toBe('m1');
    expect(w.fetched).toEqual([]);
  });

  it('serves index.html for the root and decodes escaped paths', async () => {
    const w = await synced();
    expect(await (await w.request(ORIGIN + '/')).res.text()).toBe('h1');
    const cache = await w.caches.open('lw-files-v1');
    await cache.put(ORIGIN + '/art/a%20b.png', new Response('png'));
    expect(await (await w.request(ORIGIN + '/art/a%20b.png')).res.text()).toBe('png');
  });

  it('goes to the network for a file the copy lacks', async () => {
    const w = await synced();
    w.server.bodies['other.txt'] = 'live';
    const r = await w.request(ORIGIN + '/other.txt');
    expect(await r.res.text()).toBe('live');
  });

  it('goes to the network when there is no copy at all', async () => {
    const w = boot({ list: list1(), bodies: { 'main.js': 'live' } });
    const r = await w.request(ORIGIN + '/main.js');
    expect(await r.res.text()).toBe('live');
  });

  it('never touches api/ or sw.js, a non-GET or another origin', async () => {
    const w = await synced();
    for (const [url, init] of [[ORIGIN + '/api/backups', {}], [ORIGIN + '/sw.js', {}], [ORIGIN + '/main.js', { method: 'POST' }], ['http://other.test/main.js', {}]]) {
      expect((await w.request(url, init)).responded).toBeUndefined();
    }
  });

  it('looks for an update at every page load', async () => {
    const w = await synced();
    await w.request(ORIGIN + '/', { mode: 'navigate' });
    expect(w.fetched).toContain(ORIGIN + '/api/offline');
  });

  it('does not look for an update for a sub-resource', async () => {
    const w = await synced();
    await w.request(ORIGIN + '/main.js');
    expect(w.fetched).not.toContain(ORIGIN + '/api/offline');
  });
});

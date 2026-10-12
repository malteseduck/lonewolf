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




});

describe('a later sync', () => {

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


  it('goes to the network for a file the copy lacks', async () => {
    const w = await synced();
    w.server.bodies['other.txt'] = 'live';
    const r = await w.request(ORIGIN + '/other.txt');
    expect(await r.res.text()).toBe('live');
  });


  it('never touches api/ or sw.js, a non-GET or another origin', async () => {
    const w = await synced();
    for (const [url, init] of [[ORIGIN + '/api/backups', {}], [ORIGIN + '/sw.js', {}], [ORIGIN + '/main.js', { method: 'POST' }], ['http://other.test/main.js', {}]]) {
      expect((await w.request(url, init)).responded).toBeUndefined();
    }
  });


});

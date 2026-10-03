/* The offline copy (docs/reference/offline.md). tools/serve.py lists at api/offline every file the
   player loads, with a hash of each; this keeps them all in a cache named for that list's version
   and serves the page from it, so it plays with no connection. Whenever the page opens with the PC
   in reach it asks for a sync: a newer list is fetched into a new cache (unchanged files copied
   across, changed ones downloaded) and takes over at the next page load, never under a page that
   is already running. An interrupted sync resumes where it stopped. */
const STATE = 'lw-offline-state';
const scoped = (p) => new URL(p, self.registration.scope).href;
const STATE_URL = scoped('__lw-offline-state');
let state = null; // {active: {cache, version, count}, staged: {...}}

async function loadState() {
  if (!state) { const r = await (await caches.open(STATE)).match(STATE_URL); state = r ? await r.json() : {}; }
  return state;
}
async function saveState() {
  await (await caches.open(STATE)).put(STATE_URL, new Response(JSON.stringify(state), { headers: { 'Content-Type': 'application/json' } }));
}
async function tell(msg) {
  for (const c of await self.clients.matchAll({ includeUncontrolled: true })) c.postMessage({ lw: 'offline', ...msg });
}
const settled = () => (state.staged ? { state: 'update-ready' } : state.active ? { state: 'ready', total: state.active.count } : { state: 'empty' });

// a page load is the moment to change over: nothing of the old version is running then
async function promote() {
  await loadState();
  if (!state.staged) return;
  const old = state.active;
  state.active = state.staged; delete state.staged; await saveState();
  if (old && old.cache !== state.active.cache) await caches.delete(old.cache);
}

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); }));
}

// a dropped connection is tried again a few times before the sync gives up (to resume next time)
async function fetchTrying(url, p) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) return res;
      if (res.status === 404 || i >= 3) throw new Error(`${p}: ${res.status}`);
    } catch (e) {
      if (i >= 3 || /: \d+$/.test(e.message)) throw e;
    }
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
}

let syncing = null;
const sync = () => syncing || (syncing = doSync().finally(() => { syncing = null; }));
async function doSync() {
  await loadState();
  let list;
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(scoped('api/offline'), { cache: 'no-store', signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) throw new Error(r.status);
    list = await r.json();
  } catch (e) {
    return tell({ ...settled(), reach: false }); // the PC is out of reach: keep what is here
  }
  if (state.active && state.active.version === list.version) { // back to what is in use (a staged one went stale)
    if (state.staged) { await caches.delete(state.staged.cache); delete state.staged; await saveState(); }
    return tell({ ...settled(), reach: true });
  }
  if (state.staged && state.staged.version === list.version) return tell({ ...settled(), reach: true });

  const name = 'lw-files-' + list.version, cache = await caches.open(name);
  const from = state.active ? await caches.open(state.active.cache) : null;
  const paths = Object.keys(list.files);
  let done = 0;
  tell({ state: 'syncing', done, total: paths.length, reach: true });
  try {
    await pool(paths, 6, async (p) => {
      const url = scoped(p), hash = list.files[p], got = await cache.match(url);
      if (!(got && got.headers.get('x-lw-hash') === hash)) {
        let res = from && await from.match(url);
        if (!(res && res.headers.get('x-lw-hash') === hash)) {
          res = await fetchTrying(url, p);
        }
        const headers = new Headers(res.headers); headers.set('x-lw-hash', hash);
        await cache.put(url, new Response(await res.blob(), { status: 200, headers }));
      }
      if (++done % 40 === 0) tell({ state: 'syncing', done, total: paths.length, reach: true });
    });
  } catch (e) {
    return tell({ ...settled(), failed: String((e && e.message) || e), done, total: paths.length, reach: true }); // the next sync resumes
  }
  const keep = new Set(paths.map(scoped));
  for (const req of await cache.keys()) if (!keep.has(req.url)) await cache.delete(req);
  const entry = { cache: name, version: list.version, count: paths.length };
  if (state.active) state.staged = entry; else state.active = entry;
  await saveState();
  for (const k of await caches.keys()) if (k.startsWith('lw-files-') && k !== state.active.cache && k !== (state.staged || {}).cache) await caches.delete(k);
  tell({ ...settled(), reach: true });
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('message', (e) => {
  if (e.data === 'sync') e.waitUntil(sync());
  else if (e.data === 'status') e.waitUntil(loadState().then(() => tell(syncing ? { state: 'syncing' } : settled())));
});

self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  const path = url.pathname.slice(new URL(self.registration.scope).pathname.length);
  if (path.startsWith('api/') || path === 'sw.js') return; // backups and the list always go to the PC
  if (req.mode === 'navigate') e.waitUntil(promote().then(sync)); // look for an update at every page load, whatever the page does
  e.respondWith((async () => {
    await loadState();
    if (req.mode === 'navigate') await promote();
    if (state.active) {
      const hit = await (await caches.open(state.active.cache)).match(scoped(decodeURIComponent(path) || 'index.html'));
      if (hit) return hit;
    }
    return fetch(req);
  })());
});

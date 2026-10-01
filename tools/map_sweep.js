/* The map sweep: every section of a book shown on its map, as if played there by the shortest
   route from the start, and checked. Step 6 of docs/reference/map-places.md. Run it in the
   browser console on the player, with the book open:

     const M = await import('/tools/map_sweep.js');
     await M.sweep()          // all sections: prints what is wrong, puts the saves back
     await M.show('121')      // one section in context, to look at by eye
     M.restore()              // put the saves back after show()

   It plays by changing the game's state, which the player saves, so it backs up every lw-* key in
   localStorage first and restores them afterwards. Nothing here is loaded by the player itself. */
const g = () => window.__lw.game;
let backup = null;
function save() { if (!backup) backup = Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith('lw-')).map((k) => [k, localStorage.getItem(k)])); }
export function restore() {
  if (!backup) return 'nothing to restore';
  Object.keys(localStorage).filter((k) => k.startsWith('lw-') && !(k in backup)).forEach((k) => localStorage.removeItem(k));
  Object.entries(backup).forEach(([k, v]) => localStorage.setItem(k, v));
  backup = null;
  return 'saves restored: reload the page before playing on';
}

const outs = (s) => (s.choices || []).flatMap((c) => (c.random ? c.random.table.map((r) => r[1]) : [c.to]))
  .concat(s.combat ? [s.combat.to, s.combat.evade && s.combat.evade.to] : []).filter(Boolean).map(String);
/* the shortest way from the start to every section */
function routes() {
  const S = g().book.sections, start = String(g().book.start || '1'), prev = { [start]: null };
  for (let q = [start]; q.length;) { const n = []; q.forEach((k) => outs(S[k]).forEach((t) => { if (S[t] && !(t in prev)) { prev[t] = k; n.push(t); } })); q = n; }
  return (id) => { if (!(id in prev)) return null; const p = []; for (let k = id; k; k = prev[k]) p.unshift(k); return p; };
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let pathTo = null;
/* put the game on section id, its trail faked along the shortest route, and open the map */
async function stage(id, ms) {
  save();
  if (!document.getElementById('sweep-still')) document.head.insertAdjacentHTML('beforeend', '<style id="sweep-still">.mapinner,.pawn{transition:none!important}</style>');
  pathTo = pathTo || routes();
  const G = g(), p = pathTo(id) || [String(G.book.start || '1'), id];
  G.s.trail = p.map((k) => ({ id: k, via: null })); G.s.at = id; G.s.fought = {}; G.s.rolled = null; G.s.events = []; G.hero.ep = G.hero.epMax;
  window.__lw.render();
  if (!document.querySelector('#panel .mapview')) { document.querySelector('[data-panel="map"]').click(); }
  await wait(ms);
  return document.querySelector('#panel .mapview');
}
export async function show(id, ms = 600) { await stage(String(id), ms); return `section ${id} at ${g().book.sections[id].loc || 'no place'}; restore() when done`; }

/* What is certain to be wrong: no place, the figure or a destination off the view, a name cut off. */
export async function sweep({ ms = 120, from = 0 } = {}) {
  const S = g().book.sections, ids = Object.keys(S).sort((a, b) => a - b).slice(from), found = [];
  for (const id of ids) {
    const view = await stage(id, ms), sec = S[id];
    if (!sec.loc) { found.push(`${id}: no place`); continue; }
    if (!view) { found.push(`${id}: no map in the panel`); continue; }
    const box = view.getBoundingClientRect(), inside = (r, pad = 0) => r.left >= box.left - pad && r.right <= box.right + pad && r.top >= box.top - pad && r.bottom <= box.bottom + pad;
    const pawn = view.querySelector('.pawn img');
    if (pawn && !inside(pawn.getBoundingClientRect(), 4)) found.push(`${id}: the figure is out of view`);
    view.querySelectorAll('.dest').forEach((d) => {
      const r = d.getBoundingClientRect(), cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
      if (cx < box.left || cx > box.right || cy < box.top || cy > box.bottom) found.push(`${id}: the ring for choice ${d.dataset.choice} is out of view`);
      else if (!inside(r)) found.push(`${id}: the ring for choice ${d.dataset.choice} is cut by the edge (it can still be touched)`);
      const b = d.querySelector('b');
      if (b && b.textContent && !inside(b.getBoundingClientRect(), 2)) found.push(`${id}: the name "${b.textContent}" is cut off`);
    });
  }
  const said = restore();
  console.log(found.length ? found.join('\n') : `all ${ids.length} sections fine`);
  return { checked: ids.length, problems: found, saves: said };
}

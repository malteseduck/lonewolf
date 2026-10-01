/* Lay out a book's made-up places: those fixed by hand stay put; the rest are pulled together by
   the routes the story takes between them and pushed apart where they crowd. Step 4 of
   docs/reference/map-places.md.

     node tools/layout_places.js 02fotw x0 y0 x1 y1           print the positions
     node tools/layout_places.js 02fotw x0 y0 x1 y1 --write   and fill them into places-02fotw.js

   x0 y0 x1 y1: the box in the printed map's pixels the free places must stay inside (the part of
   the map the book's journey crosses). Only places whose position is null are moved; --write
   fills those in and leaves every other byte of the file alone. The result is plausible, not
   right: look at it on the map and move what sits oddly (step 6). */
const fs = require('fs'), path = require('path'), { pathToFileURL } = require('url');

const [book, ...rest] = process.argv.slice(2), write = rest.includes('--write'), box = rest.filter((a) => a !== '--write').map(Number);
if (!book || box.length !== 4 || box.some(isNaN)) { console.error('usage: node tools/layout_places.js <book> x0 y0 x1 y1 [--write]'); process.exit(2); }
const [x0, y0, x1, y1] = box, root = path.join(__dirname, '..'), file = path.join(root, `places-${book}.js`);

global.window = {};
require(path.join(root, 'data', 'projectaon', book, 'book.js'));
const S = window.LW.BOOKS[book].sections;

import(pathToFileURL(file).href).then(({ PLACES, AT }) => {
  const loc = {};
  for (const k in AT) for (const s of AT[k]) loc[s] = k;
  const outs = (s) => (s.choices || []).flatMap((c) => (c.random ? c.random.table.map((r) => r[1]) : [c.to]))
    .concat(s.combat ? [s.combat.to, s.combat.evade && s.combat.evade.to] : []).filter(Boolean);
  // routes between places, weighted by how many choices take them
  const W = {};
  for (const [k, s] of Object.entries(S)) for (const t of outs(s)) {
    const a = loc[k], b = loc[t];
    if (a && b && a !== b) { const e = [a, b].sort().join('|'); W[e] = (W[e] || 0) + 1; }
  }
  const keys = Object.keys(PLACES), fixed = (k) => PLACES[k][2] != null && PLACES[k][3] != null, P = {};
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; // the same layout every run
  keys.forEach((k) => { P[k] = fixed(k) ? [PLACES[k][2], PLACES[k][3]] : [x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0)]; });
  const span = Math.hypot(x1 - x0, y1 - y0), rest = span / 12, near = span / 9; // a route's ideal length, and how close two places may sit
  for (let it = 0; it < 4000; it++) {
    const F = Object.fromEntries(keys.map((k) => [k, [0, 0]]));
    const push = (a, b, f, d, L) => { F[a][0] += (d[0] / L) * f; F[a][1] += (d[1] / L) * f; F[b][0] -= (d[0] / L) * f; F[b][1] -= (d[1] / L) * f; };
    for (const e in W) { const [a, b] = e.split('|'), d = [P[b][0] - P[a][0], P[b][1] - P[a][1]], L = Math.hypot(...d) || 0.01; push(a, b, (L - rest) * 0.02 * Math.min(3, W[e]), d, L); }
    for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
      const a = keys[i], b = keys[j], d = [P[b][0] - P[a][0], P[b][1] - P[a][1]], L = Math.hypot(...d) || 0.01;
      if (L < near) push(a, b, -(near - L) * 0.15, d, L);
    }
    keys.forEach((k) => { if (fixed(k)) return; P[k][0] = Math.max(x0, Math.min(x1, P[k][0] + F[k][0])); P[k][1] = Math.max(y0, Math.min(y1, P[k][1] + F[k][1])); });
  }
  const free = keys.filter((k) => !fixed(k));
  free.forEach((k) => console.log(`${k}: [${P[k].map(Math.round).join(', ')}]  ${PLACES[k][0]}`));
  console.log(`${free.length} placed, ${keys.length - free.length} fixed by hand, ${Object.keys(W).length} routes`);
  if (!write) return;
  let src = fs.readFileSync(file, 'utf8');
  for (const k of free) {
    const re = new RegExp(`(\\b${k}:\\s*\\[\\s*(?:"(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')\\s*,\\s*(?:'\\w+'|null)\\s*,\\s*)null\\s*,\\s*null(\\s*\\])`);
    src = src.replace(re, `$1${Math.round(P[k][0])}, ${Math.round(P[k][1])}$2`);
  }
  fs.writeFileSync(file, src);
  console.log(`filled into ${path.basename(file)}`);
});

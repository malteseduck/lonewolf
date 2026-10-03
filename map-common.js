/* What every replica map shares: the ink, the engraved stamps and buildings, the reading of a
   printed map (replicaModel), and the steps of painting one. Each map's own look (its terrain, its
   ice, its symbols' density, its labels' ink) is in its own file, map-<name>.js, which calls these
   steps in its own order; change a step here only if every map should change with it, and check
   them all after. */
import * as Ink from './shared/ink.js';
import { analyse, worldTerrain, toPath, toLine } from './replica.js';
import { drawBuilding } from './buildings.js';

export const INK = '38,26,16', PAPER = '226,212,176';
export const ink = (a) => `rgba(${INK},${a})`;

/* the engraved symbols, one sheet built by tools/build_map_atlas.py: kind -> [{x, y, w, h}] */
export const STAMPS = {};
let sheet = null, loading = null;
export const stampsLoaded = () => !!sheet;
/* an image decoded off the page: unlike an <img>, it decodes even while the pane is hidden */
const bitmap = (url) => fetch(url).then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`${url}: ${r.status}`)))).then((b) => createImageBitmap(b));
export function loadStamps() {
  if (loading) return loading;
  let im;
  return (loading = Promise.all([fetch('assets/map/widman.json').then((r) => r.json()), bitmap('assets/map/widman.png').then((b) => { im = b; }), loadHogenburg()]).then(([index]) => {
    for (const kind in index) STAMPS[kind] = index[kind].map(([x, y, w, h]) => ({ x, y, w, h }));
    sheet = { ink: tint(im, ink(0.95)), pale: tint(im, `rgb(${PAPER})`) };
  }));
}
/* the Hogenburg symbols the town plans use (assets/map/hogenburg, CC0), each its own image, toned
   to the maps' ink: a stamp with its own src, drawn at its own size (s 2 = its pixels one to one) */
function loadHogenburg() {
  return fetch('assets/map/hogenburg/hogenburg.json').then((r) => r.json()).then((index) => Promise.all(Object.entries(index).map(([kind, files]) => Promise.all(files.map((f) => {
    return bitmap('assets/map/hogenburg/' + f).then((im) => ({ x: 0, y: 0, w: im.width, h: im.height, src: tone(im) }));
  })).then((list) => { STAMPS[kind] = list; }))));
}
/* an engraving toned by its darkness: black lines to the maps' ink, any white to their paper */
function tone(im) {
  const c = Ink.canvas(im.width, im.height), x = c.getContext('2d');
  x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data, [ir, ig, ib] = INK.split(',').map(Number), [pr, pg, pb] = PAPER.split(',').map(Number);
  for (let i = 0; i < p.length; i += 4) {
    const t = (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) / 255;
    p[i] = ir + (pr - ir) * t; p[i + 1] = ig + (pg - ig) * t; p[i + 2] = ib + (pb - ib) * t;
  }
  x.putImageData(d, 0, 0);
  return c;
}
/* black engraving -> sepia ink, or -> paper for the halo that lifts a symbol off the washes */
function tint(im, col) {
  const c = Ink.canvas(im.width, im.height), x = c.getContext('2d');
  x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, im.width, im.height);
  return c;
}
/* a stamp sits on its foot: (px, py) is the middle of its base line, s scales its own pixels */
export function stamp(x, st, px, py, s, halo) {
  const w = st.w * s / 2, h = st.h * s / 2, put = (src) => x.drawImage(st.src || src, st.x, st.y, st.w, st.h, px - w / 2, py - h, w, h);
  if (halo && !st.src) {
    x.save(); x.shadowColor = `rgba(${PAPER},0.95)`; x.shadowBlur = halo;
    put(sheet.pale); put(sheet.pale);
    x.restore();
  }
  put(sheet.ink);
}

/* a settlement on a replica by kind, as a building (buildings.js); its height in printed pixels */
export const BUILDING = { city: ['castle', 16], walled: ['castle', 12], town: ['tower', 10], fort: ['monastery', 12], village: ['house', 7] };
export const ICON_HEIGHT = { castle: 12, monastery: 12, tower: 9, keep: 9, house: 7, temple: 8, obelisk: 7, bridge: 4 };
/* a building standing on (cx, cy), height canvas pixels tall; where it stands varies the hand */
export const building = (x, r, key, cx, cy, height) => drawBuilding(x, key, cx, cy, height, cx * 0.37 + cy);

/* the similarity (move, turn, scale) that takes two points of one map onto the same two of another */
export function fit([[a, A], [b, B]]) {
  const dx = b[0] - a[0], dy = b[1] - a[1], DX = B[0] - A[0], DY = B[1] - A[1], d2 = dx * dx + dy * dy;
  const c = (dx * DX + dy * DY) / d2, s = (dx * DY - dy * DX) / d2;
  const f = ([px, py]) => [A[0] + c * (px - a[0]) - s * (py - a[1]), A[1] + s * (px - a[0]) + c * (py - a[1])];
  f.scale = Math.hypot(c, s);
  return f;
}

/* the affine map (least squares) taking points a onto points b, from pairs [a, b] */
function affine(pairs) {
  const solve = (A) => { // Gauss-Jordan on an augmented 3x4
    for (let c = 0; c < 3; c++) {
      let m = c; for (let r = c + 1; r < 3; r++) if (Math.abs(A[r][c]) > Math.abs(A[m][c])) m = r;
      [A[c], A[m]] = [A[m], A[c]];
      for (let r = 0; r < 3; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k < 4; k++) A[r][k] -= f * A[c][k]; }
    }
    return A.map((row, i) => row[3] / row[i]);
  };
  const axis = (j) => {
    const A = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    pairs.forEach(([a, b]) => { const t = [a[0], a[1], 1]; for (let r = 0; r < 3; r++) { A[r][3] += t[r] * b[j]; for (let c = 0; c < 3; c++) A[r][c] += t[r] * t[c]; } });
    return solve(A);
  };
  const X = axis(0), Y = axis(1);
  return ([px, py]) => [X[0] * px + X[1] * py + X[2], Y[0] * px + Y[1] * py + Y[2]];
}

/* The replica's reading of the printed map, made once per image. With the world map (world), land
   the printed map leaves plain takes its hills, mountains and forest from the world map instead. */
const models = {}, readings = {};
export function replicaModel(img, world, geo) {
  if (!geo.world) world = undefined;
  const key = img.src + (world ? '+' + world.src : '');
  if (models[key]) return models[key];
  // the printed map is read once; the world map's terrain goes into copies of its grids
  const base = readings[img.src] || (readings[img.src] = analyse(img, geo));
  const m = world ? { ...base, mountain: base.mountain.slice(), hill: base.hill.slice(), forest: base.forest.slice() } : base;
  if (world) {
    const S = geo.world, t = worldTerrain(world, S.crop), toWorld = affine(S.anchors.map(([w, p]) => [p, w]));
    const [rx, ry, rw, rh] = S.region;
    for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) {
      const i = y * m.W + x;
      if (m.land[i] < 0.6 || m.mountain[i] > 0.2 || m.forest[i] > 0.03 || m.hill[i] > 0.15) continue;
      const [wx, wy] = toWorld([x, y]), gx = Math.round(wx - S.crop[0]), gy = Math.round(wy - S.crop[1]);
      if (gx < 0 || gy < 0 || gx >= t.W || gy >= t.H) continue;
      const j = gy * t.W + gx;
      m.mountain[i] = t.mountain[j] * 1.2; m.hill[i] = t.hill[j] * 0.3; m.forest[i] = t.forest[j]; // scaled to the printed map's thresholds
    }
  }
  return (models[key] = m);
}

/* whether point (px, py) lies inside polygon poly (ray casting) */
export const inside = (poly, px, py) => poly.reduce((v, [ax, ay], i) => { const [bx, by] = poly[(i + 1) % poly.length]; return (ay > py) !== (by > py) && px < ax + ((py - ay) * (bx - ax)) / (by - ay) ? !v : v; }, false);

/* The steps of painting a replica: view is [x, y, w, h] in the printed map's pixels, W x H the
   canvas. Symbols keep roughly their own size on screen, so zooming in shows more of them, not
   bigger ones. extra: a book's own places ([name, symbol, x, y]); when given, they replace the
   Magnamund detail. out: the canvas is painted out times the size: the drawing is laid out for
   W x H and scaled onto it, so a smaller canvas looks the same, only with fewer pixels to paint.
   own: what one book adds to its map for itself (own.rivers), so the others are untouched.
   begin returns the painting's state, c, which the other steps take. */
const sheets = {};
export function begin(model, view, W, H, extra, out, own, geo) {
  const rivers = [...geo.rivers, ...(own.rivers || [])];
  const [vx, vy, vw] = view, z = W / vw, R = geo, cv = Ink.canvas(Math.round(W * out), Math.round(H * out)), x = cv.getContext('2d');
  const r = Ink.seeded(Math.round(vx * 7 + vy * 13 + vw * 3));
  const P = ([px, py]) => [(px - vx) * z, (py - vy) * z];
  const toMap = () => x.setTransform(z * out, 0, 0, z * out, -vx * z * out, -vy * z * out), toCanvas = () => x.setTransform(out, 0, 0, out, 0, 0);
  const D = z >= 6 && !extra && R.detail, dt = D && fit(D.anchors);
  const places = [...R.places, ...(D ? D.places.map(([n, k, px, py]) => [n, k, ...dt([px, py])]) : [])];
  const roads = [...R.roads, ...(D ? D.roads.map((l) => l.map(dt)) : [])];
  const k = Math.max(1.1, Math.min(2, 1 + 0.3 * Math.log2(z))); // symbol scale

  const pk = cv.width + 'x' + cv.height; // the same sheet every repaint of this size
  x.drawImage(sheets[pk] || (sheets[pk] = Ink.parchment(cv.width, cv.height, false, true)), 0, 0);
  toCanvas();
  x.fillStyle = 'rgba(84,56,26,0.2)'; x.fillRect(0, 0, W, H);
  x.lineCap = 'round'; // square-ended washes read as pale blocks on open ground
  for (let i = 0; i < 140; i++) {
    const px = r() * W, py = r() * H, a = r() * Math.PI, l = (40 + r() * 150) * W / 1000;
    x.strokeStyle = r() < 0.7 ? ink(0.02 + r() * 0.04) : `rgba(${PAPER},${0.04 + r() * 0.06})`; x.lineWidth = (14 + r() * 50) * W / 1000;
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * l * 0.5, py + Math.sin(a) * l * 0.5, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  return { model, W, H, extra, out, R, rivers, vx, vy, z, cv, x, r, P, toMap, toCanvas, D, dt, places, roads, k };
}

/* sea: a wash darkening along the shore, ripples, an inked coast; leaves the map's transform set,
   and c.land and c.sea the paths of each */
export function paintSea(c) {
  const { model, W, H, out, R, z, x, r, toMap, toCanvas } = c;
  toMap();
  const land = toPath(model.coast), [fx, fy, fw, fh] = R.frame, sea = new Path2D();
  sea.rect(fx - 60, fy - 60, fw + 120, fh + 120); sea.addPath(land);
  x.fillStyle = ink(0.28); x.fill(sea, 'evenodd');
  x.save(); x.clip(sea, 'evenodd');
  for (let i = 6; i >= 1; i--) { x.strokeStyle = ink(0.05); x.lineWidth = (i * 14) / z; x.stroke(land); }
  const ripples = [];
  for (let i = 0; i < 400; i++) { const cx = r() * W, cy = r() * H; if (x.isPointInPath(sea, cx * out, cy * out, 'evenodd')) ripples.push([cx, cy]); }
  x.restore();
  toCanvas();
  ripples.forEach(([cx, cy]) => { x.strokeStyle = r() < 0.5 ? `rgba(${PAPER},0.22)` : ink(0.22); x.lineWidth = 1.6; x.beginPath(); x.moveTo(cx, cy); x.quadraticCurveTo(cx + 12, cy - 5, cx + 24, cy); x.stroke(); });
  toMap();
  x.strokeStyle = ink(0.9); x.lineWidth = 2.6 / z; x.stroke(land);
  c.land = land; c.sea = sea;
}

/* rivers: ink banks and pale water, a fixed width on screen */
export function paintRivers(c) {
  const { extra, rivers, z, x } = c;
  const rw = Math.max(4, Math.min(13, z));
  // a book's stream, and its bridges away from the rivers, get a brook of their own (so no bridge
  // stands on dry land): it rises a little above the spot and runs down into the nearest river
  const brooks = [];
  (extra || []).forEach(([, kind, px, py]) => {
    if (kind !== 'bridge' && kind !== 'stream') return;
    let best = null;
    rivers.forEach((l) => l.forEach((p, i) => { if (!i) return; const q = nearest([px, py], l[i - 1], p), d = Math.hypot(q[0] - px, q[1] - py); if (!best || d < best[2]) best = [...q, d]; }));
    if (best[2] < 4) return;
    const [tx, ty] = best[2] < 30 ? best : [px + 1, py + 12], d = Math.hypot(tx - px, ty - py), ux = (tx - px) / d, uy = (ty - py) / d;
    // it winds: a gentle swing either side of the straight line, through the spot itself
    const pts = [], n = Math.max(4, Math.round((d + 8) / 2.5)), ph = (px * 7 + py * 3) % 6;
    for (let i = 0; i <= n; i++) {
      const s = -8 + ((d + 8) * i) / n, sway = i && i < n ? Math.sin(s / 3.2 + ph) * 1.1 - Math.sin(ph) * 1.1 * Math.max(0, 1 - Math.abs(s) / 4) : 0;
      pts.push([px + ux * s - uy * sway, py + uy * s + ux * sway]);
    }
    brooks.push(pts);
  });
  [...rivers, ...brooks].forEach((l, i) => {
    const p = toLine([l]), w = i < rivers.length ? rw : rw * 0.5;
    x.lineCap = 'round'; x.lineJoin = 'round';
    x.strokeStyle = ink(0.85); x.lineWidth = (w + 4) / z; x.stroke(p);
    x.strokeStyle = `rgb(${PAPER})`; x.lineWidth = w / z; x.stroke(p);
    x.strokeStyle = ink(0.26); x.stroke(p);
  });
  c.brooks = brooks;
}

/* Land symbols on a jittered screen grid: cell(i, mx, my, jx, jy) for each spot on land (i its index
   in the model's grids, (mx, my) in the printed map's pixels, (jx, jy) on the canvas). Before the
   loop it sets c.clear(cx, cy), whether a symbol may stand there, and c.onLine. */
export function landGrid(c, cell) {
  const { model, W, H, extra, rivers, brooks, vx, vy, z, r, P, places, roads, k } = c;
  const roadPaths = roads.map((l) => toLine([l])), riverPaths = [...rivers, ...brooks].map((l) => toLine([l]));
  const spots = [...places, ...(extra || []).filter((e) => e[1])].map(([, , px, py]) => P([px, py]));
  // Where roads and rivers run, 44 px wide on screen, drawn once into a quarter-size mask and
  // looked up per spot: testing every path with isPointInStroke for every grid cell took seconds
  // a repaint and froze the page while zooming.
  const MS = 4, mw = Math.ceil(W / MS), mh = Math.ceil(H / MS), mc = Ink.canvas(mw, mh), mk = mc.getContext('2d', { willReadFrequently: true });
  mk.setTransform(z / MS, 0, 0, z / MS, (-vx * z) / MS, (-vy * z) / MS); mk.lineWidth = 44 / z; mk.lineCap = 'round'; mk.lineJoin = 'round';
  [...roadPaths, ...riverPaths].forEach((p) => mk.stroke(p));
  const md = mk.getImageData(0, 0, mw, mh).data;
  const onLine = (c.onLine = (cx, cy) => { const ix = Math.floor(cx / MS), iy = Math.floor(cy / MS); return ix >= 0 && iy >= 0 && ix < mw && iy < mh && md[(iy * mw + ix) * 4 + 3] > 0; });
  c.clear = (cx, cy) => !onLine(cx, cy) && !spots.some(([sx, sy]) => Math.hypot(sx - cx, sy - cy) < 60 * k);
  c.roadPaths = roadPaths;
  const g = 30;
  for (let cy = 0; cy < H + 80; cy += g * 0.75) for (let cx = -40; cx < W + 40; cx += g) {
    const jx = cx + (r() - 0.5) * g * 0.9, jy = cy + (r() - 0.5) * g * 0.6, mx = Math.floor(vx + jx / z), my = Math.floor(vy + jy / z);
    if (mx < 0 || my < 0 || mx >= model.W || my >= model.H) continue;
    const i = my * model.W + mx;
    if (model.land[i] < 0.6) continue;
    cell(i, mx, my, jx, jy);
  }
}

/* roads over the land, white dashes on a dark bed */
export function paintRoads(c) {
  const { z, x, toMap, toCanvas } = c;
  toMap();
  c.roadPaths.forEach((p) => {
    x.setLineDash([]); x.strokeStyle = ink(0.6); x.lineWidth = 6 / z; x.stroke(p);
    x.setLineDash([12 / z, 7 / z]); x.strokeStyle = 'rgba(255,248,228,0.95)'; x.lineWidth = 3 / z; x.stroke(p);
  });
  x.setLineDash([]);
  toCanvas();
}

/* the book's own places: a symbol each, no name until he has been there (the panel adds that) */
export function paintOwnPlaces(c) {
  const { W, H, extra, z, x, r, P, k } = c;
  (extra || []).forEach(([, kind, px, py]) => {
    const [cx, cy] = P([px, py]);
    if (!kind || kind === 'stream' || cx < -80 || cx > W + 80 || cy < -80 || cy > H + 120) return;
    if (kind === 'lake') {
      x.beginPath(); x.ellipse(cx + 34 * k, cy + 4, 46 * k, 20 * k, -0.1, 0, Math.PI * 2);
      x.fillStyle = ink(0.26); x.fill(); x.strokeStyle = ink(0.85); x.lineWidth = 2.4; x.stroke();
      building(x, r, 'house', cx - 6, cy + 4, Math.max(40, Math.min(150, ICON_HEIGHT.house * z * 0.45)), k);
    } else if (kind === 'marsh') {
      x.strokeStyle = ink(0.7); x.lineWidth = 1.6;
      for (let i = 0; i < 14; i++) { const ax = cx + (r() - 0.5) * 90 * k, ay = cy + (r() - 0.5) * 40 * k; for (let j = -1; j <= 1; j++) { x.beginPath(); x.moveTo(ax + j * 4, ay); x.lineTo(ax + j * 7, ay - 12 - r() * 6); x.stroke(); } x.beginPath(); x.moveTo(ax - 9, ay + 1); x.lineTo(ax + 9, ay + 1); x.stroke(); }
    } else if (kind === 'hill') stamp(x, pick(r, 'mountain', 90), cx, cy + 8, 2 * k, 6);
    else if (kind === 'tree') stamp(x, pick(r, 'tree'), cx, cy + 6, 2.6 * k, 6);
    else if (kind === 'wood') { // a wood where the printed map shows open country: clumps round the spot, back to front
      const clumps = []; for (let i = 0; i < 9; i++) { const a = r() * Math.PI * 2, d = (0.3 + r() * 0.7) * 46 * k; clumps.push([cy + Math.sin(a) * d * 0.55, cx + Math.cos(a) * d]); }
      clumps.push([cy + 4, cx]); clumps.sort((a, b) => a[0] - b[0]).forEach(([py2, px2], i) => stamp(x, pick(r, i % 3 ? 'forest' : 'tree'), px2, py2 + 6, (i % 3 ? 1.5 : 2.2) * k, 0));
    }
    else if (ICON_HEIGHT[kind]) building(x, r, kind, cx, cy + 4, Math.max(kind === 'bridge' ? 24 : 40, Math.min(150, ICON_HEIGHT[kind] * z * 0.45)), k);
    else stamp(x, pick(r, kind), cx, cy + 6, 2 * k, 0);
  });
}

/* settlements on a pale halo, with their names */
export function paintPlaces(c) {
  const { W, H, z, x, r, P, places, k } = c;
  places.forEach(([, kind, px, py]) => {
    const [cx, cy] = P([px, py]);
    if (cx < -160 || cx > W + 160 || cy < -80 || cy > H + 220) return;
    if (BUILDING[kind]) building(x, r, BUILDING[kind][0], cx, cy + 4, Math.max(36, Math.min(220, BUILDING[kind][1] * z * 0.45)), k);
    else stamp(x, pick(r, kind), cx, cy + 6, 2.1 * k, 0);
  });
  x.textAlign = 'center'; x.lineJoin = 'round';
  const fs = Math.max(24, Math.min(40, 20 + 5 * Math.log2(z)));
  places.forEach(([name, kind, px, py]) => {
    if (!name) return;
    const [cx, cy] = P([px, py]), size = kind === 'city' || kind === 'walled' ? fs * 1.15 : fs * 0.85;
    x.font = `${size}px 'Metamorphous', serif`;
    x.lineWidth = size * 0.3; x.strokeStyle = `rgba(${PAPER},0.9)`; x.strokeText(name, cx, cy + size * 1.25); x.fillStyle = ink(0.95); x.fillText(name, cx, cy + size * 1.25);
  });
}

/* the names of seas and lands: size(s) the canvas size of one s map pixels tall, fill(kind) its ink */
export function paintLabels(c, size, fill) {
  const { x, P, R } = c;
  x.textAlign = 'center';
  R.labels.forEach(([text, px, py, sz, rot, kind]) => {
    const [cx, cy] = P([px, py]), s = size(sz);
    x.save(); x.translate(cx, cy); x.rotate(rot);
    x.font = `${kind === 'sea' ? 'italic ' : ''}${s}px ${kind === 'sea' ? "'Charm', cursive" : "'Metamorphous', serif"}`;
    if ('letterSpacing' in x) x.letterSpacing = kind === 'land' ? `${s * 0.25}px` : '0px';
    x.fillStyle = fill(kind); x.fillText(kind === 'land' ? text.toUpperCase() : text, 0, 0); x.restore();
  });
}

/* border and a burnt edge; returns the canvas */
export function finish(c) {
  const { W, H, x, cv } = c;
  x.strokeStyle = ink(0.85); x.lineWidth = 5; x.strokeRect(14, 14, W - 28, H - 28); x.lineWidth = 1.5; x.strokeRect(24, 24, W - 48, H - 48);
  const gr = x.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.66);
  gr.addColorStop(0, 'rgba(40,24,10,0)'); gr.addColorStop(1, 'rgba(40,24,10,0.5)'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
  return cv;
}

/* the point of the segment a-b nearest to p */
function nearest([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return [ax + t * dx, ay + t * dy];
}
/* a random symbol of a kind, optionally only those narrower than maxW */
export function pick(r, kind, maxW) {
  const list = maxW ? STAMPS[kind].filter((st) => st.w < maxW) : STAMPS[kind];
  return list[Math.floor(r() * list.length)];
}

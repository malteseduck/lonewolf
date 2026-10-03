/* Town plans for the travel map: a town, a village or a crypt seen from above in the maps' sepia
   ink, for the stretches of a book that wander its streets or passages. Each book's plans are laid
   out by hand in its own towns-<book>.js (maps.js gathers them into CITIES), on a 1000x700 grid.
   A town: water, rivers, lanes and squares, every house a small roof seen from above (lit on one
   slope, hatched on the other, packed along its lane), walls with towers and gates, and what stands
   up (the citadel, landmarks, ships, the places' own symbols) as the engraved buildings of
   buildings.js. A crypt: rock cut with hatching, its rooms and passages left as bare paper, the
   few things in them drawn in ink, and patches of open ground above. Nothing here is a plain shape:
   every edge is inked by hand. */
import * as Ink from './shared/ink.js';
import { drawBuilding, buildingBox } from './buildings.js';

const INK = '38,26,16', PAPER = '226,212,176';
const ink = (a) => `rgba(${INK},${a})`, paper = (a = 1) => `rgba(${PAPER},${a})`;

export const CITIES = {};

/* ---------- shapes ---------- */
/* points of a polyline smoothed into a path, through the midpoints; into: carry on an outline */
function smooth(pts, closed, into) {
  const p = new Path2D();
  if (closed) {
    const n = pts.length, mid = (i) => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
    p.moveTo(...mid(0));
    for (let i = 1; i <= n; i++) p.quadraticCurveTo(pts[i % n][0], pts[i % n][1], ...mid(i));
    p.closePath();
    return p;
  }
  const q = into || p;
  if (into) into.lineTo(...pts[0]); else p.moveTo(...pts[0]);
  for (let i = 1; i < pts.length - 1; i++) q.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
  q.lineTo(...pts[pts.length - 1]);
  return q;
}
/* straight segments, as a crypt's walls are cut */
function poly(pts, closed = true) { const p = new Path2D(); pts.forEach(([u, v], i) => (i ? p.lineTo(u, v) : p.moveTo(u, v))); if (closed) p.closePath(); return p; }
/* a lane, a river or a passage: {w, pts}, or a bare list of points (w given) */
const way = (s, w) => (Array.isArray(s) ? { w, pts: s } : s);

/* the nearest point's direction along any lane: houses face their street */
function grain(lanes, px, py) {
  let best = Infinity, ang = 0;
  for (const { pts: s } of lanes) for (let i = 1; i < s.length; i++) {
    const [ax, ay] = s[i - 1], [bx, by] = s[i], dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
    const d = Math.hypot(ax + dx * t - px, ay + dy * t - py);
    if (d < best) { best = d; ang = Math.atan2(dy, dx); }
  }
  return ang;
}

/* one house seen from above: a roof with its ridge along the street, the near slope lit with sparse
   strokes, the far one hatched close, a soft shadow to the south-east, every edge inked */
function roof(x, r, cx, cy, w, d, a) {
  x.save(); x.translate(cx, cy); x.rotate(a);
  const j = () => (r() - 0.5) * 0.5;
  x.fillStyle = ink(0.22); x.fillRect(-w / 2 + 1.3, -d / 2 + 1.6, w, d);
  const lit = [[-w / 2 + j(), j()], [w / 2 + j(), j()], [w / 2 + j(), d / 2 + j()], [-w / 2 + j(), d / 2 + j()]];
  const dark = [[-w / 2 + j(), -d / 2 + j()], [w / 2 + j(), -d / 2 + j()], [w / 2 + j(), j()], [-w / 2 + j(), j()]];
  x.fillStyle = paper(); x.fill(poly(lit)); x.fill(poly(dark));
  x.strokeStyle = ink(0.55); x.lineWidth = 0.35;
  x.save(); x.clip(poly(dark)); for (let u = -w / 2; u < w / 2; u += 1.1) { x.beginPath(); x.moveTo(u, -d / 2); x.lineTo(u + 0.6, 0); x.stroke(); } x.restore();
  x.save(); x.clip(poly(lit)); x.strokeStyle = ink(0.3); for (let u = -w / 2 + 1.5; u < w / 2; u += 3.2) { x.beginPath(); x.moveTo(u, 0.4); x.lineTo(u, d / 2 - 0.4); x.stroke(); } x.restore();
  x.strokeStyle = ink(0.9); x.lineWidth = 0.7; x.lineJoin = 'round';
  x.stroke(poly([[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([u, v]) => [u + j(), v + j()])));
  x.lineWidth = 0.6; x.beginPath(); x.moveTo(-w / 2, 0); x.lineTo(w / 2, 0); x.stroke(); // the ridge
  x.restore();
}

/* ---------- a town's parts, as paths ---------- */
function parts(c) {
  const lanes = (c.streets || []).map((s, i) => way(s, i < (c.main == null ? 4 : c.main) ? 9 : 6.5));
  const rivers = (c.rivers || []).map((s) => way(s, 12));
  const walls = (c.walls || []).map((w) => (Array.isArray(w) ? { pts: w } : w));
  return {
    lanes, rivers, walls,
    lanePaths: lanes.map((l) => smooth(l.pts)), riverPaths: rivers.map((v) => smooth(v.pts)),
    water: (c.water || []).map((pts) => smooth(pts, true)),
    // where houses may stand: the town's own outline, else inside its first wall
    town: (c.town || (walls[0] ? [walls[0].pts] : [])).map((pts) => smooth(pts, true)),
    wallPaths: walls.map((w) => poly(w.pts, !!w.closed)), // straight from tower to tower
  };
}

/* Everything on a plan that stands up, as [kind, x, y, height, role, name]: the citadel, landmarks,
   the walls' towers, gates, bridges, the moles' towers, moored boats, the places' own symbols. */
function standing(c, places, r) {
  const t = [];
  if (c.citadel) t.push(['castle', c.citadel.x, c.citadel.y, c.citadel.h || 96, 'citadel']);
  (c.landmarks || []).forEach((l) => t.push([...l, 'landmark']));
  (c.walls || []).map((w) => (Array.isArray(w) ? { pts: w } : w)).forEach((w) => {
    if (w.towers === false) return;
    (w.closed ? w.pts : w.pts.slice(1, -1)).forEach(([px, py]) => t.push(['tower', px, py + 6, w.tower || 22, 'wall']));
  });
  (c.gates || []).forEach(([px, py, h]) => t.push(['keep', px, py + 8, h || 28, 'gate']));
  (c.bridges || []).forEach(([px, py, h]) => t.push(['bridge', px, py + 5, h || 12, 'bridge']));
  (c.moles || []).forEach((m) => t.push(['tower', m[m.length - 1][0], m[m.length - 1][1] + 4, 30, 'mole']));
  (c.boats || []).forEach(([px, py]) => t.push(['ship', px, py, 12 + r() * 4, 'boat']));
  places.filter(([, sym]) => sym).forEach(([name, sym, px, py]) => t.push([sym, px, py + (sym === 'ship' ? 0 : 6), sym === 'ship' ? 32 : sym === 'house' ? 26 : 30, 'place', name]));
  return t;
}
/* the Hogenburg symbols a plan sets down (fountains, tombs, a monument), as [kind, x, y, height, role] */
const symbolsOf = (c) => (c.symbols || []).map((sy) => [...sy, 'symbol']);
/* the ground a building or a symbol covers on the plan: [left, right, top, bottom] */
function cover([kind, px, py, h, role]) {
  if (role === 'symbol') return [px - h * 0.8, px + h * 0.8, py - h, py];
  const [l, rt, t, b] = buildingBox(kind) || [-0.4, 0.4, -1, 0];
  return [px + l * h, px + rt * h, py + t * h, py + b * h];
}

/* What stands where it should not. In a town: a landmark, the citadel or a place's symbol whose
   footing is on a lane, a river or the water, or two of them overlapping (gates, bridges, wall and
   mole towers and boats stand on those by design). In a crypt: a place outside its rooms, passages
   and open ground. For checking a plan by hand, once maps.js has gathered the plans:
   (await import('/city.js')).cityClashes('holmgard', places). Returns lines of text. */
export function cityClashes(id, places = []) {
  const c = CITIES[id], x = Ink.canvas(1000, 700).getContext('2d'), out = [];
  if (!c) return [`no plan ${id}`];
  if (c.kind === 'crypt') {
    const { open } = cryptParts(c);
    places.forEach(([name, , px, py]) => { if (!open.some(([p, w]) => (w ? ((x.lineWidth = w), x.isPointInStroke(p, px, py)) : x.isPointInPath(p, px, py)))) out.push(`${name} is in the rock`); });
    return out;
  }
  const P = parts(c), items = [...standing(c, places, () => 0.5), ...symbolsOf(c)].filter((t) => ['citadel', 'landmark', 'place', 'symbol'].includes(t[4]) && t[0] !== 'ship');
  const name = (t) => (t[5] ? `${t[5]} (${t[0]})` : `${t[4]} ${t[0]} at ${t[1]},${t[2]}`);
  items.forEach((t) => {
    const [l, rt, top, b] = cover(t), foot = [];
    // the footing: the lowest fifth of what it covers, sampled along and across
    for (let i = 0; i <= 8; i++) for (let j = 0; j <= 2; j++) foot.push([l + ((rt - l) * i) / 8, b - ((b - top) * 0.2 * j) / 2]);
    if (foot.some(([px, py]) => P.lanePaths.some((p, i) => ((x.lineWidth = P.lanes[i].w), x.isPointInStroke(p, px, py))))) out.push(`${name(t)} stands on a lane`);
    if (foot.some(([px, py]) => P.riverPaths.some((p, i) => ((x.lineWidth = P.rivers[i].w + 3), x.isPointInStroke(p, px, py))) || P.water.some((p) => x.isPointInPath(p, px, py)))) out.push(`${name(t)} stands in the water`);
  });
  items.forEach((a, i) => items.slice(i + 1).forEach((b) => {
    const [al, ar, at, ab] = cover(a), [bl, br, bt, bb] = cover(b);
    if (al < br && bl < ar && at < bb && bt < ab) out.push(`${name(a)} overlaps ${name(b)}`);
  }));
  return out;
}

/* The plan painted onto a canvas W x H; places: [name, symbol, x, y] drawn with their symbols.
   stamps: {pick(kind, r), put(x, stamp, px, py, scale)} for the engraved trees and hills. */
export function cityCanvas(c, W, H, places, stamps) {
  const cv = Ink.canvas(W, H), x = cv.getContext('2d'), r = Ink.seeded(c.seed || 4242), k = W / 1000;
  x.drawImage(Ink.parchment(W, H, false, true), 0, 0);
  x.fillStyle = 'rgba(84,56,26,0.2)'; x.fillRect(0, 0, W, H);
  x.save(); x.scale(k, k); x.lineCap = 'round'; x.lineJoin = 'round';
  // hit tests run on this canvas, whose transform scales the plan: test at scaled points
  const inPath = (p, px, py) => x.isPointInPath(p, px * k, py * k);
  const inStroke = (p, w, px, py) => { x.lineWidth = w; return x.isPointInStroke(p, px * k, py * k); };
  if (c.kind === 'crypt') crypt(c, x, r, places, stamps);
  else town(c, x, r, places, stamps, inPath, inStroke);
  labels(c, x);
  frame(c, x);
  x.restore();
  return cv;
}

/* ---------- a town ---------- */
function town(c, x, r, places, stamps, inPath, inStroke) {
  const P = parts(c), wet = (px, py) => P.water.some((p) => inPath(p, px, py)) || P.riverPaths.some((p, i) => inStroke(p, P.rivers[i].w + 6, px, py));
  const inTown = (px, py) => P.town.some((p) => inPath(p, px, py));

  // fields outside the town: strips ploughed in different directions; woods and the odd tree
  if (c.fields !== false) {
    for (let i = 0; i < 90; i++) {
      const px = 30 + r() * 940, py = 30 + r() * 640;
      if (inTown(px, py) || wet(px, py)) continue;
      const a = r() * Math.PI, w = 40 + r() * 40, h = 24 + r() * 26;
      x.save(); x.translate(px, py); x.rotate(a); x.strokeStyle = ink(0.16); x.lineWidth = 0.6;
      for (let v = -h / 2; v < h / 2; v += 3) { x.beginPath(); x.moveTo(-w / 2, v); x.lineTo(w / 2, v + (r() - 0.5)); x.stroke(); }
      x.restore();
    }
    for (let i = 0; i < 70; i++) {
      const px = 30 + r() * 940, py = 40 + r() * 640;
      if (inTown(px, py) || wet(px, py)) continue;
      stamps.put(x, stamps.pick('tree', r), px, py, 0.45 + r() * 0.25);
    }
  }
  (c.woods || []).forEach(([wx, wy, wr]) => {
    for (let i = 0; i < wr * wr / 60; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * wr, px = wx + Math.cos(a) * d, py = wy + Math.sin(a) * d * 0.7;
      if (!wet(px, py)) stamps.put(x, stamps.pick('tree', r), px, py, 0.4 + r() * 0.25);
    }
  });

  // rivers: inked banks round the same dark water as the sea they run into
  P.riverPaths.forEach((p, i) => {
    const w = P.rivers[i].w;
    x.strokeStyle = ink(0.9); x.lineWidth = w + 3; x.stroke(p); x.strokeStyle = paper(); x.lineWidth = w; x.stroke(p);
    x.strokeStyle = ink(0.3); x.lineWidth = w; x.stroke(p);
    x.strokeStyle = paper(0.35); x.lineWidth = 0.8; x.setLineDash([4, 9]); x.stroke(p); x.setLineDash([]);
  });
  // the sea and harbours: a dark wash deepening off the shore, ripples, an inked coast
  P.water.forEach((sea) => {
    x.fillStyle = paper(); x.fill(sea); // over the river banks where a river runs in
    x.fillStyle = ink(0.22); x.fill(sea);
    x.save(); x.clip(sea);
    for (let n = 6; n >= 1; n--) { x.strokeStyle = ink(0.05); x.lineWidth = n * 10; x.stroke(sea); }
    for (let i = 0; i < 260; i++) { const px = r() * 1000, py = r() * 700; if (!inPath(sea, px, py)) continue; x.strokeStyle = r() < 0.5 ? paper(0.2) : ink(0.25); x.lineWidth = 0.9; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 7, py - 3, px + 14, py); x.stroke(); }
    x.restore();
    x.strokeStyle = ink(0.9); x.lineWidth = 2; x.stroke(sea);
  });

  // the lanes: pale ways between inked edges; the squares paved the same
  P.lanePaths.forEach((p, i) => { x.strokeStyle = ink(0.75); x.lineWidth = P.lanes[i].w + 2; x.stroke(p); });
  P.lanePaths.forEach((p, i) => { x.strokeStyle = paper(); x.lineWidth = P.lanes[i].w; x.stroke(p); });
  (c.squares || []).forEach(([ox, oy, or]) => { x.fillStyle = paper(); x.beginPath(); x.ellipse(ox, oy, or, or * 0.7, 0, 0, Math.PI * 2); x.fill(); x.strokeStyle = ink(0.6); x.lineWidth = 0.9; x.stroke(); });

  // the quays: a dressed stone edge, its courses ticked along the water side
  (c.quays || []).forEach((q) => {
    x.strokeStyle = ink(0.9); x.lineWidth = 3.4; x.stroke(smooth(q));
    for (let i = 1; i < q.length; i++) {
      const [ax, ay] = q[i - 1], [bx, by] = q[i], len = Math.hypot(bx - ax, by - ay), nx = (ay - by) / len, ny = (bx - ax) / len;
      for (let t = 0; t < len; t += 5) { const px = ax + ((bx - ax) * t) / len, py = ay + ((by - ay) * t) / len; x.strokeStyle = ink(0.6); x.lineWidth = 0.7; x.beginPath(); x.moveTo(px, py); x.lineTo(px - nx * 3, py - ny * 3); x.stroke(); }
    }
  });
  // the moles out into the water, each with its light-tower at the end (with what stands up)
  (c.moles || []).forEach((m) => {
    const p = smooth(m); x.strokeStyle = ink(0.9); x.lineWidth = 11; x.stroke(p); x.strokeStyle = paper(); x.lineWidth = 8; x.stroke(p);
    x.save(); x.setLineDash([1.2, 3.2]); x.strokeStyle = ink(0.55); x.lineWidth = 7; x.stroke(p); x.restore();
  });

  // everything that stands up (drawn last), known now so the houses keep out from under it
  const tall = standing(c, places, r), under = [...tall, ...symbolsOf(c)].map(cover);
  // the houses: a loose grid inside the town, each kept off the lanes, the water, the walls, the
  // squares and open ground, the places, and the buildings that stand up
  const hs = Object.assign({ gap: [14, 11], skip: 0.16, size: 1, jitter: [5, 4] }, c.houses), [gx, gy] = hs.gap;
  const keep = [...(c.squares || []), ...(c.clear || []), ...(c.trees || []).map(([tx, ty]) => [tx, ty - 4, 6])];
  const clear = (px, py) => {
    if (!inTown(px, py)) return false;
    if (under.some(([l, rt, t, b]) => px > l - 7 && px < rt + 7 && py > t - 4 && py < b + 6)) return false;
    if (P.lanePaths.some((p, i) => inStroke(p, P.lanes[i].w + 6, px, py))) return false;
    if (wet(px, py) || P.water.some((p) => inStroke(p, 10, px, py))) return false;
    if (P.wallPaths.some((p) => inStroke(p, 16, px, py))) return false;
    if ((c.quays || []).some((q) => inStroke(smooth(q), 10, px, py))) return false;
    return !keep.some(([ox, oy, or]) => Math.hypot(ox - px, (oy - py) / 0.7) < or + 6) && !places.some(([, , qx, qy]) => Math.hypot(qx - px, qy - py) < 13);
  };
  const houses = [], gardens = [];
  for (let py = 20; py < 690; py += gy) for (let px = 20 + (Math.round(py / gy) % 2 ? gx / 2 : 0); px < 985; px += gx) {
    const hx = px + (r() - 0.5) * hs.jitter[0], hy = py + (r() - 0.5) * hs.jitter[1]; // a village's scattered loosely
    if (!clear(hx, hy)) continue;
    if (r() < hs.skip) { if (r() < 0.35) gardens.push([hx, hy]); continue; } // a yard, now and then with a tree in it
    houses.push([hx, hy, (9 + r() * 5) * hs.size, (6 + r() * 2.5) * hs.size, grain(P.lanes, hx, hy) + (r() - 0.5) * 0.25]);
  }
  [...houses.map((h) => ['h', ...h]), ...gardens.map((g) => ['g', ...g])].sort((a, b) => a[2] - b[2])
    .forEach(([kind, hx, hy, w, d, a]) => (kind === 'h' ? roof(x, r, hx, hy, w, d, a) : stamps.put(x, stamps.pick('tree', r), hx, hy + 4, 0.32 + r() * 0.1)));
  // trees planted along an avenue or in a garden
  (c.trees || []).forEach(([tx, ty, ts]) => stamps.put(x, stamps.pick('tree', r), tx, ty, ts || 0.45));

  // the walls: a thick inked rampart, battlements outward, towers at the angles (with what stands up)
  P.wallPaths.forEach((p) => {
    x.strokeStyle = ink(0.9); x.lineWidth = 7; x.stroke(p); x.strokeStyle = paper(); x.lineWidth = 4.2; x.stroke(p);
    x.save(); x.setLineDash([2, 2.4]); x.strokeStyle = ink(0.7); x.lineWidth = 2; x.stroke(p); x.restore();
  });

  // the citadel's hill, then everything that stands up, back to front
  if (c.citadel && c.citadel.hill) {
    const { x: hx, y: hy } = c.citadel;
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, d = 38 + r() * 20; stamps.put(x, stamps.pick('mountain', r), hx + Math.cos(a) * d, hy + 20 + Math.sin(a) * d * 0.45, 0.5 + r() * 0.25); }
  }
  upright(x, r, stamps, tall, symbolsOf(c));
}
/* buildings and symbols, back to front */
function upright(x, r, stamps, tall, symbols) {
  [...tall, ...symbols].sort((a, b) => a[2] - b[2]).forEach(([kind, px, py, h, role]) => {
    if (role !== 'symbol') return drawBuilding(x, kind, px, py, h, px * 0.37 + py);
    const st = stamps.pick(kind, r);
    if (st) stamps.put(x, st, px, py, (2 * h) / st.h);
  });
}

/* ---------- a crypt ---------- */
/* a wall cut by hand: each straight edge broken into short steps that wander a little */
function rough(pts, closed, r) {
  const out = [], n = pts.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % n], steps = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 9));
    for (let j = 0; j < steps; j++) out.push([ax + ((bx - ax) * j) / steps + (j ? (r() - 0.5) * 2.2 : 0), ay + ((by - ay) * j) / steps + (j ? (r() - 0.5) * 2.2 : 0)]);
  }
  if (!closed) out.push(pts[n - 1]);
  return poly(out, closed);
}
function cryptParts(c) {
  const r = Ink.seeded(c.seed || 77);
  const rooms = (c.rooms || []).map((pts) => rough(pts, true, r)), passages = (c.passages || []).map((s) => way(s, 22)), ground = (c.ground || []).map((pts) => smooth(pts, true));
  const passagePaths = passages.map((s) => rough(s.pts, false, r));
  // what is not rock, for the clash check: [path, stroke width or 0]
  const open = [...rooms.map((p) => [p, 0]), ...passagePaths.map((p, i) => [p, passages[i].w]), ...ground.map((p) => [p, 0])];
  return { rooms, passages, passagePaths, ground, open };
}
function crypt(c, x, r, places, stamps) {
  const C = cryptParts(c), k = x.getTransform().a; // hit tests and the offscreen band work in device pixels
  // the rock: hatched across, and cross-hatched close where it meets a room or a passage
  x.fillStyle = ink(0.14); x.fillRect(0, 0, 1000, 700);
  x.strokeStyle = ink(0.32); x.lineWidth = 0.7;
  for (let u = -700; u < 1000; u += 4.2) { x.beginPath(); x.moveTo(u + (r() - 0.5), 700); x.lineTo(u + 700 + (r() - 0.5), 0); x.stroke(); }
  const band = Ink.canvas(Math.round(1000 * k), Math.round(700 * k)), b = band.getContext('2d');
  b.scale(k, k); b.lineCap = 'round'; b.lineJoin = 'round'; b.strokeStyle = '#000'; b.fillStyle = '#000';
  C.rooms.forEach((p) => { b.lineWidth = 26; b.stroke(p); });
  C.passagePaths.forEach((p, i) => { b.lineWidth = C.passages[i].w + 26; b.stroke(p); });
  C.ground.forEach((p) => { b.lineWidth = 22; b.stroke(p); });
  // the cross-hatching is drawn whole, then kept only inside the band (one composite: line by line
  // would keep only the last line)
  const cross = Ink.canvas(band.width, band.height), h = cross.getContext('2d');
  h.scale(k, k); h.strokeStyle = ink(0.7); h.lineWidth = 0.8;
  for (let u = -700; u < 1700; u += 2.6) { h.beginPath(); h.moveTo(u, 0); h.lineTo(u - 700, 700); h.stroke(); }
  b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'source-in'; b.drawImage(cross, 0, 0);
  x.drawImage(band, 0, 0, 1000, 700);

  // open ground above: the necropolis between its tombs, weeds and the odd tree
  C.ground.forEach((p) => {
    x.fillStyle = paper(); x.fill(p);
    x.save(); x.clip(p);
    x.strokeStyle = ink(0.35); x.lineWidth = 0.5;
    for (let i = 0; i < 900; i++) { const px = r() * 1000, py = r() * 700; if (!x.isPointInPath(p, px * k, py * k)) continue; x.beginPath(); x.moveTo(px, py); x.lineTo(px + 2 + r() * 2, py - 1 - r() * 2); x.moveTo(px + 1, py); x.lineTo(px - 1 - r(), py - 2 - r()); x.stroke(); }
    x.restore();
    x.strokeStyle = ink(0.85); x.lineWidth = 1.6; x.stroke(p);
  });
  // the rooms and passages: inked walls, then the floor left as paper with its flagstones scored
  x.strokeStyle = ink(0.92);
  C.rooms.forEach((p) => { x.lineWidth = 2.6; x.stroke(p); });
  C.passagePaths.forEach((p, i) => { x.lineWidth = C.passages[i].w + 2.6; x.stroke(p); });
  x.fillStyle = paper();
  C.rooms.forEach((p) => x.fill(p));
  C.passagePaths.forEach((p, i) => { x.strokeStyle = paper(); x.lineWidth = C.passages[i].w; x.stroke(p); });
  x.save(); x.strokeStyle = ink(0.1); x.lineWidth = 0.5;
  C.rooms.forEach((p) => {
    x.save(); x.clip(p);
    for (let v = 0; v < 700; v += 12) {
      x.beginPath(); x.moveTo(0, v); for (let u = 40; u <= 1000; u += 40) x.lineTo(u, v + (r() - 0.5) * 1.2); x.stroke();
      for (let u = (v / 12) % 2 ? 0 : 9; u < 1000; u += 16 + r() * 4) { x.beginPath(); x.moveTo(u, v); x.lineTo(u + (r() - 0.5), v + 12); x.stroke(); }
    }
    x.restore();
  });
  x.restore();
  (c.features || []).forEach((f) => feature(x, r, ...f));
  // what stands on the open ground: tombs, gates, places' symbols, back to front
  upright(x, r, stamps, [...(c.landmarks || []), ...places.filter(([, s]) => s).map(([, s, px, py]) => [s, px, py + 6, 28])], symbolsOf(c));
  (c.trees || []).forEach(([px, py, s]) => stamps.put(x, stamps.pick('tree', r), px, py, s || 0.5));
}

/* the things in a crypt, drawn in ink at (px, py), turned a degrees; s scales */
function feature(x, r, kind, px, py, a = 0, s = 1) {
  x.save(); x.translate(px, py); x.rotate((a * Math.PI) / 180); x.scale(s * 1.3, s * 1.3);
  x.strokeStyle = ink(0.9); x.fillStyle = paper(); x.lineWidth = 1;
  const hatch = (pts, gap = 1.6) => { x.save(); x.clip(poly(pts)); x.lineWidth = 0.45; for (let u = -40; u < 40; u += gap) { x.beginPath(); x.moveTo(u, -30); x.lineTo(u + 20, 30); x.stroke(); } x.restore(); };
  if (kind === 'sarcophagus') { // a stone coffin, its lid carved with a figure's outline
    const o = [[-15, -7], [15, -7], [15, 7], [-15, 7]];
    x.fillStyle = ink(0.25); x.fill(poly(o.map(([u, v]) => [u + 1.5, v + 1.5]))); x.fillStyle = paper(); x.fill(poly(o)); x.lineWidth = 1.3; x.stroke(poly(o));
    x.lineWidth = 0.7; x.stroke(poly([[-12, -4.5], [12, -4.5], [12, 4.5], [-12, 4.5]]));
    x.beginPath(); x.ellipse(-8, 0, 2.6, 2.2, 0, 0, Math.PI * 2); x.moveTo(-5.5, 0); x.quadraticCurveTo(2, -3.4, 10, -1.2); x.moveTo(-5.5, 0); x.quadraticCurveTo(2, 3.4, 10, 1.2); x.stroke();
    hatch([[13, -7], [15, -7], [15, 7], [13, 7]], 1);
  } else if (kind === 'throne') { // a granite seat, its high back to the wall, and the bowl of light above it
    const back = [[-9, -9], [9, -9], [9, -5], [-9, -5]], seat = [[-7, -5], [7, -5], [7, 5], [-7, 5]];
    x.fill(poly(back)); x.lineWidth = 1.2; x.stroke(poly(back)); hatch(back, 1.2);
    x.fill(poly(seat)); x.stroke(poly(seat)); x.lineWidth = 0.6; x.stroke(poly([[-5, -3], [5, -3], [5, 3], [-5, 3]]));
    x.beginPath(); x.ellipse(0, -7, 5, 2.6, 0, 0, Math.PI * 2); x.fill(); x.lineWidth = 1; x.stroke();
    x.lineWidth = 0.4; for (let i = 0; i < 18; i++) { const t = (i / 18) * Math.PI * 2; x.beginPath(); x.moveTo(Math.cos(t) * 7, -7 + Math.sin(t) * 4); x.lineTo(Math.cos(t) * (12 + r() * 4), -7 + Math.sin(t) * (7 + r() * 3)); x.stroke(); }
  } else if (kind === 'serpent') { // the winged serpent's statue on its plinth, coiled in an S
    const pl = [[-8, -8], [8, -8], [8, 8], [-8, 8]]; x.fill(poly(pl)); x.lineWidth = 1.1; x.stroke(poly(pl));
    x.lineWidth = 2.4; x.beginPath(); x.moveTo(4, -6); x.bezierCurveTo(-8, -6, -8, 0, 0, 0); x.bezierCurveTo(8, 0, 8, 6, -4, 6); x.stroke();
    x.strokeStyle = paper(); x.lineWidth = 1; x.stroke(); x.strokeStyle = ink(0.9);
    x.lineWidth = 0.6; x.beginPath(); x.moveTo(-2, -1); x.lineTo(-7, -6); x.lineTo(-4, -1); x.moveTo(2, 1); x.lineTo(7, -3); x.lineTo(4, 1); x.stroke();
  } else if (kind === 'skulls') { // two rows of plinths facing across a walkway, a skull on each
    for (let i = 0; i < 6; i++) for (const v of [-11, 11]) {
      const u = -30 + i * 12, b = [[u - 3.5, v - 3.5], [u + 3.5, v - 3.5], [u + 3.5, v + 3.5], [u - 3.5, v + 3.5]];
      x.fill(poly(b)); x.lineWidth = 0.8; x.stroke(poly(b));
      x.beginPath(); x.arc(u, v, 2.2, 0, Math.PI * 2); x.fill(); x.lineWidth = 0.7; x.stroke();
      x.fillStyle = ink(0.9); x.fillRect(u - 1.2, v - 0.6, 0.8, 0.8); x.fillRect(u + 0.4, v - 0.6, 0.8, 0.8); x.fillStyle = paper();
    }
  } else if (kind === 'stairs') { // steps across a passage, closer together as they go down
    const len = 26 * (s || 1);
    x.lineWidth = 0.8; for (let i = 0; i <= 8; i++) { const v = -len / 2 + len * Math.pow(i / 8, 0.8); x.beginPath(); x.moveTo(-9, v); x.lineTo(9, v); x.stroke(); }
    x.lineWidth = 1.1; x.beginPath(); x.moveTo(-9, -len / 2); x.lineTo(-9, len / 2); x.moveTo(9, -len / 2); x.lineTo(9, len / 2); x.stroke();
  } else if (kind === 'door') { // a great granite door on hidden hinges, pinned through its lockplate
    const d = [[-12, -3], [12, -3], [12, 3], [-12, 3]]; x.fill(poly(d)); x.lineWidth = 1.4; x.stroke(poly(d)); hatch(d, 1.3);
    x.beginPath(); x.arc(0, 0, 2.2, 0, Math.PI * 2); x.fillStyle = paper(); x.fill(); x.lineWidth = 0.8; x.stroke();
  } else if (kind === 'portal' || kind === 'portcullis') { // a stone portal, or a portcullis's bars, across a passage
    x.lineWidth = 0.9; const n = kind === 'portal' ? 2 : 6;
    for (let i = 0; i <= n; i++) { const u = -11 + (22 * i) / n; x.beginPath(); x.moveTo(u, -2.5); x.lineTo(u, 2.5); x.stroke(); }
    x.lineWidth = 1.3; x.beginPath(); x.moveTo(-11, -2.5); x.lineTo(11, -2.5); x.moveTo(-11, 2.5); x.lineTo(11, 2.5); x.stroke();
  } else if (kind === 'pillar') { // an ancient pillar, shaded on its right
    x.beginPath(); x.arc(0, 0, 5, 0, Math.PI * 2); x.fill(); x.lineWidth = 1.2; x.stroke();
    x.save(); x.beginPath(); x.arc(0, 0, 5, -Math.PI / 2, Math.PI / 2); x.closePath(); x.clip(); x.lineWidth = 0.5; for (let v = -5; v < 5; v += 1.3) { x.beginPath(); x.moveTo(0, v); x.lineTo(5, v + 1); x.stroke(); } x.restore();
  } else if (kind === 'candle') { // a black candle that gives no heat, and its still flame
    x.beginPath(); x.arc(0, 0, 2, 0, Math.PI * 2); x.fillStyle = ink(0.85); x.fill();
    x.lineWidth = 0.6; x.beginPath(); x.moveTo(0, -2); x.quadraticCurveTo(2, -5, 0, -8); x.quadraticCurveTo(-2, -5, 0, -2); x.stroke();
  } else if (kind === 'hole') { // where the ground gave way: a ragged mouth, and the rubble beneath it
    const n = 14, pts = Array.from({ length: n }, (_, i) => { const t = (i / n) * Math.PI * 2, d = 10 + r() * 5; return [Math.cos(t) * d, Math.sin(t) * d * 0.75]; });
    x.fillStyle = ink(0.75); x.fill(smooth(pts, true)); x.lineWidth = 1.2; x.stroke(smooth(pts, true));
    x.fillStyle = paper(); for (let i = 0; i < 9; i++) { const u = (r() - 0.5) * 16, v = (r() - 0.5) * 10; x.beginPath(); x.arc(u, v, 1 + r() * 1.6, 0, Math.PI * 2); x.fill(); x.lineWidth = 0.5; x.stroke(); }
  }
  x.restore();
}

/* ---------- lettering and frame, as on the other maps ---------- */
function labels(c, x) {
  x.textAlign = 'center';
  (c.labels || []).forEach(([text, px, py, size, rot, soft]) => {
    x.save(); x.translate(px, py); x.rotate(rot || 0);
    x.font = `${soft ? 'italic ' : ''}${size}px ${soft ? "'Charm', cursive" : "'Metamorphous', serif"}`;
    x.lineWidth = 4; x.strokeStyle = paper(0.85); if (!soft) x.strokeText(text, 0, 0);
    x.fillStyle = ink(soft ? 0.7 : 0.95); x.fillText(text, 0, 0); x.restore();
  });
}
function frame(c, x) {
  if (c.compass) {
    x.save(); x.translate(...c.compass); x.strokeStyle = ink(0.85); x.fillStyle = ink(0.9); x.lineWidth = 1.3;
    x.beginPath(); x.arc(0, 0, 30, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.arc(0, 0, 24, 0, Math.PI * 2); x.stroke();
    for (let i = 0; i < 8; i++) { x.rotate(Math.PI / 4); const l = i % 2 ? 42 : 22; x.beginPath(); x.moveTo(0, -l); x.lineTo(4.5, 0); x.lineTo(-4.5, 0); x.fill(); }
    x.restore();
  }
  x.strokeStyle = ink(0.85); x.lineWidth = 3; x.strokeRect(14, 14, 972, 672); x.lineWidth = 1; x.strokeRect(21, 21, 958, 658);
  const g = x.createRadialGradient(500, 350, 260, 500, 350, 640);
  g.addColorStop(0, 'rgba(40,24,10,0)'); g.addColorStop(1, 'rgba(40,24,10,0.5)'); x.fillStyle = g; x.fillRect(0, 0, 1000, 700);
}

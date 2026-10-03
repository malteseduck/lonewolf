/* Town plans for the travel map: a city seen from above in the maps' sepia ink, for the stretches of
   a book that wander its streets (Book 2 begins in Holmgard's harbour quarter). Laid out by hand
   here; drawn on the 1000x700 grid of a map spec. The look follows the town clusters of painted
   gamebook maps: each house a small roof seen from above, lit on one slope and hatched on the
   other, packed along lanes; the landmarks (the citadel, towers, ships) stand up among them as the
   engraved buildings of buildings.js. Nothing here is a plain shape: every edge is inked by hand. */
import * as Ink from './shared/ink.js';
import { drawBuilding, buildingBox } from './buildings.js';

const INK = '38,26,16', PAPER = '226,212,176';
const ink = (a) => `rgba(${INK},${a})`;

export const CITIES = {
  /* Holmgard on the Holmgulf: the harbour basin between two moles, the quays round it, the square
     by the quay, the river from the south, the citadel on its hill to the west, the walls round all.
     Not surveyed: the books give no plan of the city. */
  holmgard: {
    sea: [[0, 0], [1000, 0], [1000, 232], [930, 236], [870, 230], [800, 246], [770, 300], [742, 360], [690, 390], [640, 414], [560, 420], [500, 402],
      [450, 386], [420, 342], [402, 302], [380, 266], [300, 246], [200, 238], [100, 252], [0, 240]],
    quay: [[402, 302], [420, 342], [450, 386], [500, 402], [560, 420], [640, 414], [690, 390], [742, 360], [770, 300], [800, 246]],
    moles: [[[398, 292], [442, 250], [494, 216]], [[796, 252], [744, 216], [700, 204]]],
    river: [[640, 700], [632, 640], [610, 560], [612, 480], [606, 444], [600, 420]],
    bridges: [[612, 532], [608, 470]],
    wall: [[54, 244], [62, 330], [80, 432], [140, 560], [250, 640], [400, 672], [560, 678], [720, 662], [860, 608], [930, 500], [952, 380], [958, 234]],
    gates: [[80, 432], [560, 678], [930, 500]],
    // lanes, the widest first: from the citadel to the square, along the quays, to the gates
    streets: [
      [[300, 486], [360, 474], [420, 466], [480, 456], [520, 452]],
      [[404, 316], [426, 356], [458, 394], [506, 414], [560, 432], [640, 428], [694, 402], [748, 370], [784, 300], [806, 262]],
      [[524, 458], [530, 520], [540, 600], [560, 676]],
      [[612, 500], [700, 506], [800, 500], [930, 500]],
      [[210, 478], [150, 460], [80, 432]],
      [[530, 520], [612, 532], [700, 560], [800, 590], [860, 606]],
      [[612, 470], [660, 440], [700, 420]],
      [[398, 530], [430, 510], [462, 490], [490, 472], [514, 460]],
      [[380, 520], [420, 562], [470, 602], [530, 612]],
      [[300, 486], [320, 560], [380, 620], [400, 668]],
      [[150, 460], [170, 360], [200, 300], [300, 262], [380, 276]],
      [[700, 506], [720, 600], [720, 660]],
      [[800, 500], [840, 420], [880, 330], [900, 262]],
    ],
    // ground kept clear of houses: the square, the citadel's hill, a market by the east gate
    open: [[514, 456, 26], [236, 490, 70], [860, 500, 22]],
    citadel: [236, 500],
    landmarks: [['tower', 404, 600, 34], ['temple', 756, 616, 34], ['tower', 820, 430, 30], ['keep', 360, 380, 30]],
    boats: [[470, 372], [560, 404], [700, 372], [750, 330], [430, 334]],
    labels: [['Holmgard', 160, 140, 34, 0], ['The Holmgulf', 640, 90, 22, 0, 'sea'], ['River', 650, 610, 12, -1.3, 'soft']],
    compass: [920, 110],
  },
};

/* Everything on a plan that stands up, as [kind, x, y, height, role]: the citadel, landmarks, the
   wall's towers and gates, bridges, the moles' towers, moored boats, and the places' own symbols. */
function standing(c, places, r) {
  const [hx, hy] = c.citadel;
  return [['castle', hx, hy, 96, 'citadel'], ...c.landmarks.map((l) => [...l, 'landmark']),
    ...c.wall.slice(1, -1).map(([px, py]) => ['tower', px, py + 6, 22, 'wall']), ...c.gates.map(([px, py]) => ['keep', px, py + 8, 28, 'gate']),
    ...c.bridges.map(([px, py]) => ['bridge', px, py + 5, 12, 'bridge']), ...c.moles.map((m) => ['tower', m[m.length - 1][0], m[m.length - 1][1] + 4, 30, 'mole']),
    ...c.boats.map(([px, py]) => ['ship', px, py, 12 + r() * 4, 'boat']),
    ...places.filter(([, sym]) => sym).map(([name, sym, px, py]) => [sym, px, py + (sym === 'ship' ? 0 : 6), sym === 'ship' ? 32 : sym === 'house' ? 26 : 30, 'place', name])];
}
/* the ground a building covers on the plan: [left, right, top, bottom] */
function cover([kind, px, py, h]) {
  const [l, rt, t, b] = buildingBox(kind) || [-0.4, 0.4, -1, 0];
  return [px + l * h, px + rt * h, py + t * h, py + b * h];
}
/* Buildings that stand where they should not: a landmark, the citadel or a place's symbol whose
   footing is on a lane, the river or the water, or two such buildings overlapping. Gates, bridges,
   wall and mole towers and boats stand on those by design. For checking a plan by hand:
   (await import('/city.js')).cityClashes('holmgard', places). Returns lines of text. */
export function cityClashes(id, places = []) {
  const c = CITIES[id], x = Ink.canvas(1000, 700).getContext('2d'), out = [];
  const streets = c.streets.map((s) => smooth(s)), river = smooth(c.river), sea = new Path2D();
  sea.moveTo(0, 0); sea.lineTo(1000, 0); smooth([c.sea[2], ...c.sea.slice(3)], false, sea); sea.closePath();
  const items = standing(c, places, () => 0.5).filter((t) => ['citadel', 'landmark', 'place'].includes(t[4]) && t[0] !== 'ship');
  const name = (t) => (t[5] ? `${t[5]} (${t[0]})` : `${t[4]} ${t[0]} at ${t[1]},${t[2]}`);
  items.forEach((t) => {
    const [l, rt, , b] = cover(t), foot = [];
    // the footing: the lowest fifth of what it covers, sampled along and across
    for (let i = 0; i <= 8; i++) for (let j = 0; j <= 2; j++) foot.push([l + ((rt - l) * i) / 8, b - ((b - cover(t)[2]) * 0.2 * j) / 2]);
    x.lineWidth = 9;
    if (foot.some(([px, py]) => streets.some((p) => x.isPointInStroke(p, px, py)))) out.push(`${name(t)} stands on a lane`);
    x.lineWidth = 12;
    if (foot.some(([px, py]) => x.isPointInStroke(river, px, py) || x.isPointInPath(sea, px, py))) out.push(`${name(t)} stands in the water`);
  });
  items.forEach((a, i) => items.slice(i + 1).forEach((b) => {
    const [al, ar, at, ab] = cover(a), [bl, br, bt, bb] = cover(b);
    if (al < br && bl < ar && at < bb && bt < ab) out.push(`${name(a)} overlaps ${name(b)}`);
  }));
  return out;
}

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
/* the nearest point's direction along any lane: houses face their street */
function grain(streets, px, py) {
  let best = Infinity, ang = 0;
  for (const s of streets) for (let i = 1; i < s.length; i++) {
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
  const poly = (pts) => { const p = new Path2D(); pts.forEach(([u, v], i) => (i ? p.lineTo(u, v) : p.moveTo(u, v))); p.closePath(); return p; };
  x.fillStyle = `rgb(${PAPER})`; x.fill(poly(lit)); x.fill(poly(dark));
  x.strokeStyle = ink(0.55); x.lineWidth = 0.35;
  x.save(); x.clip(poly(dark)); for (let u = -w / 2; u < w / 2; u += 1.1) { x.beginPath(); x.moveTo(u, -d / 2); x.lineTo(u + 0.6, 0); x.stroke(); } x.restore();
  x.save(); x.clip(poly(lit)); x.strokeStyle = ink(0.3); for (let u = -w / 2 + 1.5; u < w / 2; u += 3.2) { x.beginPath(); x.moveTo(u, 0.4); x.lineTo(u, d / 2 - 0.4); x.stroke(); } x.restore();
  x.strokeStyle = ink(0.9); x.lineWidth = 0.7; x.lineJoin = 'round';
  x.stroke(poly([[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([u, v]) => [u + j(), v + j()])));
  x.lineWidth = 0.6; x.beginPath(); x.moveTo(-w / 2, 0); x.lineTo(w / 2, 0); x.stroke(); // the ridge
  x.restore();
}

/* The plan painted onto a canvas W x H; places: [name, symbol, x, y] drawn with their symbols.
   stamps: {pick(kind, r), put(x, stamp, px, py, scale)} for the engraved trees and hills. */
export function cityCanvas(c, W, H, places, stamps) {
  const cv = Ink.canvas(W, H), x = cv.getContext('2d'), r = Ink.seeded(4242), k = W / 1000;
  x.drawImage(Ink.parchment(W, H, false, true), 0, 0);
  x.fillStyle = 'rgba(84,56,26,0.2)'; x.fillRect(0, 0, W, H);
  x.save(); x.scale(k, k); x.lineCap = 'round'; x.lineJoin = 'round';
  // the ground inside the walls: their ring, closed along the shore (the sea test keeps the harbour clear)
  // the sea: the map's top edge, then the coast smoothed from east to west
  const sea = new Path2D(), coast = c.sea.slice(3);
  sea.moveTo(0, 0); sea.lineTo(1000, 0); smooth([c.sea[2], ...coast], false, sea); sea.closePath();
  const wallRing = smooth(c.wall, true);
  const streets = c.streets.map((s) => smooth(s)), river = smooth(c.river);

  // fields outside the walls: strips ploughed in different directions, and the odd tree
  for (let i = 0; i < 70; i++) {
    const px = r() * 1000, py = 240 + r() * 460;
    if (x.isPointInPath(wallRing, px * k, py * k) || x.isPointInPath(sea, px * k, py * k)) continue;
    const a = r() * Math.PI, w = 40 + r() * 40, h = 24 + r() * 26;
    x.save(); x.translate(px, py); x.rotate(a); x.strokeStyle = ink(0.16); x.lineWidth = 0.6;
    for (let v = -h / 2; v < h / 2; v += 3) { x.beginPath(); x.moveTo(-w / 2, v); x.lineTo(w / 2, v + (r() - 0.5)); x.stroke(); }
    x.restore();
  }
  for (let i = 0; i < 60; i++) {
    const px = r() * 1000, py = 250 + r() * 450;
    if (x.isPointInPath(wallRing, px * k, py * k) || x.isPointInPath(sea, px * k, py * k)) continue;
    stamps.put(x, stamps.pick('tree', r), px, py, 0.45 + r() * 0.25);
  }

  // the sea: a dark wash deepening off the shore, ripples, an inked coast
  x.fillStyle = ink(0.22); x.fill(sea);
  x.save(); x.clip(sea);
  for (let n = 6; n >= 1; n--) { x.strokeStyle = ink(0.05); x.lineWidth = n * 10; x.stroke(sea); }
  for (let i = 0; i < 260; i++) { const px = r() * 1000, py = r() * 420; x.strokeStyle = r() < 0.5 ? `rgba(${PAPER},0.2)` : ink(0.25); x.lineWidth = 0.9; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 7, py - 3, px + 14, py); x.stroke(); }
  x.restore();
  x.strokeStyle = ink(0.9); x.lineWidth = 2; x.stroke(sea);

  // the river, inked banks and the same dark water as the harbour it runs into
  x.strokeStyle = ink(0.9); x.lineWidth = 12; x.stroke(river); x.strokeStyle = `rgb(${PAPER})`; x.lineWidth = 9; x.stroke(river);
  x.strokeStyle = ink(0.3); x.lineWidth = 9; x.stroke(river);
  x.strokeStyle = `rgba(${PAPER},0.35)`; x.lineWidth = 0.8; x.setLineDash([4, 9]); x.stroke(river); x.setLineDash([]);

  // the lanes: pale ways between inked edges
  streets.forEach((p, i) => { const w = i < 4 ? 9 : 6.5; x.strokeStyle = ink(0.75); x.lineWidth = w + 2; x.stroke(p); });
  streets.forEach((p, i) => { const w = i < 4 ? 9 : 6.5; x.strokeStyle = `rgb(${PAPER})`; x.lineWidth = w; x.stroke(p); });
  c.open.forEach(([ox, oy, or]) => { if (or > 40) return; x.fillStyle = `rgb(${PAPER})`; x.beginPath(); x.ellipse(ox, oy, or, or * 0.7, 0, 0, Math.PI * 2); x.fill(); x.strokeStyle = ink(0.6); x.lineWidth = 0.9; x.stroke(); });

  // the quays: a dressed stone edge, its courses ticked along the water side
  const quay = smooth(c.quay);
  x.strokeStyle = ink(0.9); x.lineWidth = 3.4; x.stroke(quay);
  for (let i = 1; i < c.quay.length; i++) {
    const [ax, ay] = c.quay[i - 1], [bx, by] = c.quay[i], len = Math.hypot(bx - ax, by - ay), nx = (ay - by) / len, ny = (bx - ax) / len;
    for (let t = 0; t < len; t += 5) { const px = ax + ((bx - ax) * t) / len, py = ay + ((by - ay) * t) / len; x.strokeStyle = ink(0.6); x.lineWidth = 0.7; x.beginPath(); x.moveTo(px, py); x.lineTo(px - nx * 3, py - ny * 3); x.stroke(); }
  }
  // the moles out into the water, each with its light-tower at the end
  c.moles.forEach((m) => {
    const p = smooth(m); x.strokeStyle = ink(0.9); x.lineWidth = 11; x.stroke(p); x.strokeStyle = `rgb(${PAPER})`; x.lineWidth = 8; x.stroke(p);
    x.save(); x.setLineDash([1.2, 3.2]); x.strokeStyle = ink(0.55); x.lineWidth = 7; x.stroke(p); x.restore();
  });

  // everything that stands up (drawn last), known now so the houses keep out from under it
  const [hx, hy] = c.citadel, tall = standing(c, places, r), under = tall.map(cover);
  // the houses: a loose grid inside the walls, each kept off the lanes, the water, open ground and
  // the buildings that stand up
  const houses = [], gardens = [], wallLine = smooth(c.wall);
  const clear = (px, py) => {
    if (under.some(([l, rt, t, b]) => px > l - 7 && px < rt + 7 && py > t - 4 && py < b + 6)) return false;
    x.lineWidth = 15;
    if (streets.some((p) => x.isPointInStroke(p, px * k, py * k))) return false;
    x.lineWidth = 22;
    if (x.isPointInStroke(river, px * k, py * k)) return false;
    if (x.isPointInPath(sea, px * k, py * k) || !x.isPointInPath(wallRing, px * k, py * k)) return false;
    x.lineWidth = 16;
    if (x.isPointInStroke(wallLine, px * k, py * k)) return false;
    return !c.open.some(([ox, oy, or]) => Math.hypot(ox - px, (oy - py) / 0.7) < or + 6) && !places.some(([, , qx, qy]) => Math.hypot(qx - px, qy - py) < 13);
  };
  for (let py = 250; py < 690; py += 11) for (let px = 40 + (py % 22 ? 7 : 0); px < 980; px += 14) {
    const hx = px + (r() - 0.5) * 5, hy = py + (r() - 0.5) * 4;
    if (!clear(hx, hy)) continue;
    if (r() < 0.16) { if (r() < 0.35) gardens.push([hx, hy]); continue; } // a yard, now and then with a tree in it
    houses.push([hx, hy, 9 + r() * 5, 6 + r() * 2.5, grain(c.streets, hx, hy) + (r() - 0.5) * 0.25]);
  }
  [...houses.map((h) => ['h', ...h]), ...gardens.map((g) => ['g', ...g])].sort((a, b) => a[2] - b[2])
    .forEach(([kind, hx, hy, w, d, a]) => (kind === 'h' ? roof(x, r, hx, hy, w, d, a) : stamps.put(x, stamps.pick('tree', r), hx, hy + 4, 0.32 + r() * 0.1)));

  // the walls round the city: a thick inked rampart, battlements outward, towers at the angles
  const wall = smooth(c.wall);
  x.strokeStyle = ink(0.9); x.lineWidth = 7; x.stroke(wall); x.strokeStyle = `rgb(${PAPER})`; x.lineWidth = 4.2; x.stroke(wall);
  x.save(); x.setLineDash([2, 2.4]); x.strokeStyle = ink(0.7); x.lineWidth = 2; x.stroke(wall); x.restore();

  // the citadel's hill, then everything that stands up, back to front
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, d = 38 + r() * 20; stamps.put(x, stamps.pick('mountain', r), hx + Math.cos(a) * d, hy + 20 + Math.sin(a) * d * 0.45, 0.5 + r() * 0.25); }
  tall.sort((a, b) => a[2] - b[2]).forEach(([kind, px, py, h]) => drawBuilding(x, kind, px, py, h, px * 0.37 + py));

  x.textAlign = 'center';
  c.labels.forEach(([text, px, py, size, rot, soft]) => {
    x.save(); x.translate(px, py); x.rotate(rot || 0);
    x.font = `${soft ? 'italic ' : ''}${size}px ${soft ? "'Charm', cursive" : "'Metamorphous', serif"}`;
    x.lineWidth = 4; x.strokeStyle = `rgba(${PAPER},0.85)`; if (!soft) x.strokeText(text, 0, 0);
    x.fillStyle = ink(soft ? 0.7 : 0.95); x.fillText(text, 0, 0); x.restore();
  });
  // compass, border, and a darkened edge, as on the other maps
  x.save(); x.translate(...c.compass); x.strokeStyle = ink(0.85); x.fillStyle = ink(0.9); x.lineWidth = 1.3;
  x.beginPath(); x.arc(0, 0, 30, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.arc(0, 0, 24, 0, Math.PI * 2); x.stroke();
  for (let i = 0; i < 8; i++) { x.rotate(Math.PI / 4); const l = i % 2 ? 42 : 22; x.beginPath(); x.moveTo(0, -l); x.lineTo(4.5, 0); x.lineTo(-4.5, 0); x.fill(); }
  x.restore();
  x.strokeStyle = ink(0.85); x.lineWidth = 3; x.strokeRect(14, 14, 972, 672); x.lineWidth = 1; x.strokeRect(21, 21, 958, 658);
  const g = x.createRadialGradient(500, 350, 260, 500, 350, 640);
  g.addColorStop(0, 'rgba(40,24,10,0)'); g.addColorStop(1, 'rgba(40,24,10,0.5)'); x.fillStyle = g; x.fillRect(0, 0, 1000, 700);
  x.restore();
  return cv;
}

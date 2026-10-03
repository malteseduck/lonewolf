/* Sepia ink maps in the Lone Wolf HD manner. Mountains, forests and settlements are stamped from
   engraved symbols (assets/map/widman, CC0, from a 1680 atlas) tinted to the ink; water, roads and
   washes are painted. Each map is a 1000x700 spec, painted at 2000x1400 so a stamp's own pixels
   land one to one on the canvas. */
import * as Ink from './shared/ink.js';
import { drawBuilding } from './buildings.js';
import { CITIES, cityCanvas } from './city.js';
import { ink, PAPER, STAMPS, stamp, stampsLoaded, replicaModel as readReplica } from './map-common.js';
import { LASTLANDS, paint as paintLastlands } from './map-lastlands.js';
import { KALTE, paint as paintKalte } from './map-kalte.js';
import { PLACES as BOOK1_PLACES, AT as BOOK1_AT, KNOWN as BOOK1_KNOWN, LEGS as BOOK1_LEGS } from './places-01fftd.js';
import { PLACES as BOOK2_PLACES, AT as BOOK2_AT, KNOWN as BOOK2_KNOWN, LEGS as BOOK2_LEGS } from './places-02fotw.js';
import { PLACES as BOOK3_PLACES, AT as BOOK3_AT, KNOWN as BOOK3_KNOWN, LEGS as BOOK3_LEGS } from './places-03tcok.js';
import { TOWNS as BOOK1_TOWNS } from './towns-01fftd.js';
import { TOWNS as BOOK2_TOWNS } from './towns-02fotw.js';

/* each book's town plans, under its own code so no two books share one: CITIES['02fotw/holmgard'] */
Object.entries({ '01fftd': BOOK1_TOWNS, '02fotw': BOOK2_TOWNS }).forEach(([b, t]) => Object.entries(t).forEach(([k, v]) => { CITIES[`${b}/${k}`] = v; }));

export { LASTLANDS, KALTE };
export { stampsLoaded };
export { loadStamps } from './map-common.js';

/* points in the printed map's pixels to the 1000x700 grid of a 10:7 view of it */
const onView = (v, pts) => pts.map(([px, py]) => [((px - v[0]) / v[2]) * 1000, ((py - v[1]) / v[3]) * 700]);
const BOOK1_VIEW = [125, 446, 110, 77];
/* the road the figure walks in Book 1, in the printed map's pixels */
const BOOK1_TRAIL = [[168, 466], [176, 478], [186, 490], [198, 501], [211, 511], [222, 519]];
/* Book 3's whole-journey view of the Kalte replica, and the road across it, in its printed pixels */
const BOOK3_VIEW = [90, 34, 636, 445];
const BOOK3_TRAIL = [[298, 350], [306, 301], [413, 277], [441, 246], [402, 201], [432, 150], [438, 110], [432, 100]];

/* Each printed map a replica is read from, with its own painter, in its own file (map-<name>.js):
   replica true is the Lastlands, a name one of these. A change to one map's painter leaves the
   others alone. */
const GEO = { kalte: KALTE };
const PAINT = new Map([[LASTLANDS, paintLastlands], [KALTE, paintKalte]]);
export const geoOf = (id) => (MAPS[id] && MAPS[id].replica && MAPS[id].replica !== true ? GEO[MAPS[id].replica] : LASTLANDS);
/* the replica's reading of a printed map (map-common.js), the Lastlands' by default */
export const replicaModel = (img, world, geo = LASTLANDS) => readReplica(img, world, geo);
/* paint a view of a replica with its own map's painter: view is [x, y, w, h] in the printed map's
   pixels, W x H the canvas; see begin in map-common.js for the rest */
export const replicaCanvas = (model, view, W, H, extra, out = 1, own = {}, geo = LASTLANDS) => PAINT.get(geo)(model, view, W, H, extra, out, own);

export const MAPS = {
  /* the invented country of the demo chapter */
  demo: {
    sea: 'M1000 520 C950 580 990 640 940 700 L1000 700 Z',
    rivers: ['M600 0 C560 150 560 260 535 330 S470 470 420 540 S330 640 300 700', 'M1000 380 C900 430 860 500 840 550 S790 650 770 700'],
    roads: ['M550 468 Q640 425 735 470 T838 552 T915 628'],
    trails: ['M150 110 Q230 140 285 195 T350 320 T462 432', 'M150 110 Q110 200 140 280 T350 320', 'M462 432 Q500 370 540 318 T550 468', 'M462 432 Q430 490 418 548 T550 468'],
    woods: [[290, 215, 200, 125], [370, 430, 160, 125], [630, 230, 130, 115], [650, 580, 120, 70], [110, 540, 120, 130], [860, 330, 80, 70], [480, 90, 110, 70]],
    hills: [[140, 288, 95, 36]],
    peaks: { box: [740, 40, 230, 140] },
    marks: [['ruins', 150, 104], ['cairn', 140, 272], ['wagon', 350, 314], ['posts', 462, 428], ['log', 540, 316], ['reeds', 418, 546], ['posts', 550, 466], ['tent', 735, 462], ['bridge', 838, 552], ['city', 915, 618]],
    clear: [[150, 110], [285, 195], [140, 280], [350, 320], [462, 432], [540, 318], [418, 548], [550, 468], [735, 470], [838, 552], [915, 628]],
    labels: [],
    compass: [84, 606],
  },
  /* Book 1: the redrawn Lastlands, framed on the country between the Kai Monastery and Holmgard,
     with made-up places for the story to move between (places-01fftd.js) */
  '01fftd': {
    replica: true,
    view: BOOK1_VIEW, places: BOOK1_PLACES, at: BOOK1_AT, known: BOOK1_KNOWN, legs: BOOK1_LEGS,
    trail: BOOK1_TRAIL, route: onView(BOOK1_VIEW, BOOK1_TRAIL),
    start: 'Kai Monastery', goal: 'Holmgard', goalAt: 'fieldworks',
  },
  /* Book 2 crosses most of the Lastlands, so it travels in legs, each its own close view
     (places-02fotw.js); the map turns to a leg's view when he arrives in it */
  '02fotw': {
    replica: true,
    view: [180, 380, 780, 546], places: BOOK2_PLACES, at: BOOK2_AT, known: BOOK2_KNOWN, legs: BOOK2_LEGS,
    // Book 2's own addition to the Lastlands: the channel of the Rymerift, from the coast by Port Bax
    // south to the Rymerift itself, for its bridges to stand on
    rivers: [[[692, 583], [697, 592], [703, 601], [707, 610], [710, 620], [709, 630], [714, 640], [721, 650], [727, 660], [731, 672], [734, 685], [738, 697]]],
    trail: [[222, 520], [404, 488], [520, 500], [497, 568], [660, 607], [711, 577], [845, 525], [918, 487]],
    start: 'Holmgard', goal: 'Hammerdal and home', goalAt: 'hammerdal',
  },
  /* Book 3 is set on Kalte, off the Lastlands, so it uses the replica of its own printed map
     (KALTE). Like Book 2 it travels in legs, each a close view (places-03tcok.js): the ice shelf,
     the Hrod Basin, the Viad Glacier, the caverns below it, and Ikaya itself. */
  '03tcok': {
    replica: 'kalte',
    view: BOOK3_VIEW, places: BOOK3_PLACES, at: BOOK3_AT, known: BOOK3_KNOWN, legs: BOOK3_LEGS,
    trail: BOOK3_TRAIL, route: onView(BOOK3_VIEW, BOOK3_TRAIL),
    start: 'Anskaven', goal: 'Ikaya', goalAt: 'f_throne',
  },
};
/* each leg of a book is a map of its own, painted for its view: MAPS['02fotw/sea']. A leg with a
   city is a town plan (city.js) whose places are in the plan's own 1000x700 grid; on the whole map
   they all stand at the leg's spot (at, in the printed map's pixels). */
for (const id of Object.keys(MAPS)) {
  const legs = MAPS[id].legs || {}, inTown = new Set();
  // a town plan's own mark (mark: a building) stands at its spot on the views of the Lastlands, so a
  // place with a plan of its own (the Graveyard) does not vanish from the country around it
  const marks = Object.fromEntries(Object.entries(legs).filter(([, l]) => l.city && l.mark).map(([leg, l]) => [`__${leg}`, [l.name, l.mark, ...l.at]]));
  for (const [leg, { view, places, city }] of Object.entries(legs)) {
    const own = Object.fromEntries(places.map((k) => [k, MAPS[id].places[k]]));
    MAPS[`${id}/${leg}`] = city ? { city: `${id}/${city}`, view: [0, 0, 1000, 700], places: own } : { replica: MAPS[id].replica, view, places: own, marks, rivers: MAPS[id].rivers };
    if (city) places.forEach((k) => inTown.add(k));
  }
  MAPS[id].wholePlaces = Object.fromEntries([...Object.entries(MAPS[id].places || {}).filter(([k]) => !inTown.has(k)), ...Object.entries(marks)]);
}

/* which building (buildings.js) and how tall a landmark in a spec is drawn with. Minor places (a
   cairn, a wagon) get none: the map's own place markers show them once visited. */
const MARK_BUILDING = { city: ['castle', 58], town: ['tower', 40], ruins: ['keep', 34], bridge: ['bridge', 16] };

/* Give a book the places its map spec has: book.locations in the 1000x700 grid of the spec's
   view, and each section its place. That switches the book to travel on the map. */
export function placeBook(book) {
  const m = MAPS[book.id];
  if (!m || !m.places || book.locations) return;
  book.locations = {};
  const legOf = {};
  for (const leg in m.legs || {}) m.legs[leg].places.forEach((k) => { legOf[k] = leg; });
  for (const k in m.places) {
    const [name, , x, y] = m.places[k], leg = legOf[k], L = leg && m.legs[leg], [[gx, gy]] = L && L.city ? [[x, y]] : onView(L ? L.view : m.view, [[x, y]]);
    book.locations[k] = { x: gx, y: gy, name, known: !m.known || m.known.includes(k), map: leg ? `${book.id}/${leg}` : book.id, printed: L && L.city ? L.at : [x, y] };
  }
  for (const k in m.at) m.at[k].forEach((s) => { if (book.sections[s]) book.sections[s].loc = k; });
}

/* A book's printed map repainted as sepia ink: lightness becomes ink depth, water is pushed a
   shade darker so coasts still read, and strong red survives as a faint rubric (flags, banners).
   Then the parchment grain is multiplied over it. crop is in image pixels. */
const DARK = [38, 25, 14], LIGHT = [236, 222, 186], RUBRIC = [146, 40, 24];
export function printedCanvas(img, crop, w, h) {
  const cv = Ink.canvas(w, h), x = cv.getContext('2d');
  x.imageSmoothingQuality = 'high';
  x.drawImage(img, crop[0], crop[1], crop[2], crop[3], 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i], g = p[i + 1], b = p[i + 2];
    const water = Math.max(0, Math.min(1, (b - r - 25) / 110)), red = Math.max(0, Math.min(1, (r - g - 60) / 90));
    const v = Math.max(0, Math.min(1, ((0.3 * r + 0.55 * g + 0.15 * b) / 255 - water * 0.24 - 0.5) * 1.3 + 0.56));
    for (let k = 0; k < 3; k++) { const o = DARK[k] + (LIGHT[k] - DARK[k]) * v; p[i + k] = o + (RUBRIC[k] - o) * red * 0.75; }
  }
  x.putImageData(d, 0, 0);
  x.globalCompositeOperation = 'multiply'; x.globalAlpha = 0.7;
  x.drawImage(Ink.parchment(w, h, false, true), 0, 0);
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  const g = x.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.68);
  g.addColorStop(0, 'rgba(40,24,10,0)'); g.addColorStop(1, 'rgba(40,24,10,0.6)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  return cv;
}

/* the painted map for a spec, or null until the symbols (loadStamps) and, for a replica, the
   book's printed map (img) have loaded */
const cache = {};
/* out: how much of the 3200x2240 a replica or town plan is laid out for is actually painted (the
   panel shows it 1.8 times its own height, so on most screens far less is needed) */
export function mapCanvas(id, img, world, out = 1) {
  const key = id + '@' + out;
  if (cache[key]) return cache[key];
  if (!stampsLoaded()) return null;
  // one painting per map: a painting at another size is dropped (each is tens of megabytes)
  Object.keys(cache).forEach((k) => { if (k.startsWith(id + '@')) delete cache[k]; });
  if (MAPS[id].city) return (cache[key] = cityCanvas(CITIES[MAPS[id].city], Math.round(3200 * out), Math.round(2240 * out), Object.values(MAPS[id].places), { pick: (kind, r) => STAMPS[kind][Math.floor(r() * STAMPS[kind].length)], put: (x, st, px, py, s) => stamp(x, st, px, py, s, 0) }));
  if (MAPS[id].replica) return img ? (cache[key] = replicaCanvas(replicaModel(img, world, geoOf(id)), MAPS[id].view, 3200, 2240, MAPS[id].places && Object.values({ ...MAPS[id].places, ...MAPS[id].marks }), out, { rivers: MAPS[id].rivers }, geoOf(id))) : null;
  const m = MAPS[id], cv = Ink.canvas(2000, 1400), x = cv.getContext('2d'), r = Ink.seeded(id.length * 131 + 11);
  const pick = (kind) => STAMPS[kind][Math.floor(r() * STAMPS[kind].length)];
  x.drawImage(Ink.parchment(cv.width, cv.height, false, true), 0, 0);
  x.fillStyle = 'rgba(84,56,26,0.22)'; x.fillRect(0, 0, cv.width, cv.height);
  x.save(); x.scale(2, 2);
  x.lineCap = 'round'; x.lineJoin = 'round';
  const P = (d) => new Path2D(d);
  const rivers = m.rivers.map(P), roads = m.roads.map(P), trails = m.trails.map(P), sea = m.sea && P(m.sea);

  // broad soft washes give the land its relief
  for (let i = 0; i < 140; i++) {
    const px = r() * 1000, py = r() * 700, a = r() * Math.PI, l = 40 + r() * 150;
    x.strokeStyle = r() < 0.7 ? ink(0.02 + r() * 0.04) : `rgba(${PAPER},${0.04 + r() * 0.06})`; x.lineWidth = 14 + r() * 50;
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * l * 0.5 + (r() - 0.5) * 50, py + Math.sin(a) * l * 0.5 + (r() - 0.5) * 50, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }

  // sea: a dark wash deepening off the coast, ripple strokes, an inked shore
  if (sea) {
    x.fillStyle = ink(0.22); x.fill(sea);
    x.save(); x.clip(sea);
    for (let k = 6; k >= 1; k--) { x.strokeStyle = ink(0.05); x.lineWidth = k * 10; x.stroke(sea); }
    for (let i = 0; i < 300; i++) { const px = r() * 1000, py = r() * 700; x.strokeStyle = r() < 0.5 ? `rgba(${PAPER},0.2)` : ink(0.25); x.lineWidth = 0.9; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 7, py - 3, px + 14, py); x.stroke(); }
    x.restore();
    x.strokeStyle = ink(0.9); x.lineWidth = 2; x.stroke(sea);
  }

  // rivers: ink banks, pale water
  rivers.forEach((p) => { x.strokeStyle = ink(0.85); x.lineWidth = 6; x.stroke(p); x.strokeStyle = `rgba(${PAPER},0.9)`; x.lineWidth = 3.2; x.stroke(p); x.strokeStyle = ink(0.25); x.lineWidth = 0.8; x.stroke(p); });

  // every stamp is collected first, then drawn back to front so nearer ones overlap farther ones
  const items = [], hitWay = (px, py) => {
    x.lineWidth = 22;
    return rivers.some((p) => x.isPointInStroke(p, px * 2, py * 2)) || roads.some((p) => x.isPointInStroke(p, px * 2, py * 2)) || trails.some((p) => x.isPointInStroke(p, px * 2, py * 2));
  };
  const free = (px, py, room) => px > 24 && px < 976 && py > 34 && py < 680 && !hitWay(px, py) && !(sea && x.isPointInPath(sea, px * 2, py * 2))
    && !m.clear.some(([cx, cy]) => Math.hypot(cx - px, cy - py) < room) && Math.hypot(m.compass[0] - px, m.compass[1] - py) > 70;

  // mountains: rows of engraved ranges and peaks filling the box, front rows overlapping back ones
  const [bx, by, bw, bh] = m.peaks.box;
  for (let py = by + 30; py <= by + bh; py += 30 + r() * 10) {
    let px = bx - r() * 30;
    while (px < bx + bw) {
      const big = r() < 0.35, st = pick(big ? 'range' : 'mountain'), s = big ? 1.1 + r() * 0.4 : 1.5 + r() * 0.6;
      const cx = px + (st.w * s) / 4;
      if (cx > bx && free(cx, py, 40)) items.push([py, st, cx, py + (r() - 0.5) * 6, s, 0]);
      px += (st.w * s) / 2 * (0.55 + r() * 0.25);
    }
  }
  // hills: the smallest peaks, low and scattered
  const small = STAMPS.mountain.filter((st) => st.w < 90);
  (m.hills || []).forEach(([hx, hy, hr, n]) => {
    for (let i = 0; i < n / 2; i++) {
      const a = r() * Math.PI * 2, d = 10 + r() * hr, px = hx + Math.cos(a) * d, py = hy + Math.sin(a) * d * 0.6;
      if (free(px, py, 30)) items.push([py, small[Math.floor(r() * small.length)], px, py, 1.2 + r() * 0.4, 0]);
    }
  });
  // forests: clumps through the middle of each wood, single trees round its edge
  m.woods.forEach(([wx, wy, rx, ry]) => {
    const n = Math.round((rx * ry) / 330);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()), px = wx + Math.cos(a) * d * rx, py = wy + Math.sin(a) * d * ry;
      const clump = d < 0.8 && r() < 0.45, st = pick(clump ? 'forest' : 'tree'), s = clump ? 0.9 + r() * 0.4 : 1.4 + r() * 0.4;
      if (free(px, py, 26)) items.push([py, st, px, py, s, 0]);
    }
  });
  items.sort((a, b) => a[0] - b[0]).forEach(([, st, px, py, s, halo]) => stamp(x, st, px, py, s, halo));
  // roads and tracks over the land: white dashes on a dark bed, as on the HD maps
  const way = (p, w, dash) => { x.setLineDash([]); x.strokeStyle = ink(0.6); x.lineWidth = w + 3; x.stroke(p); x.setLineDash(dash); x.strokeStyle = 'rgba(255,248,228,0.95)'; x.lineWidth = w; x.stroke(p); x.setLineDash([]); };
  trails.forEach((p) => way(p, 2.2, [7, 6])); roads.forEach((p) => way(p, 3, [11, 6]));
  // settlements over the roads, drawn as the buildings of the Magnamund maps
  m.marks.forEach(([type, px, py]) => { const b = MARK_BUILDING[type]; if (b) drawBuilding(x, b[0], px, py + 8, b[1], px * 0.37 + py); });

  x.textAlign = 'center';
  m.labels.forEach(([text, px, py, size, rot, soft]) => {
    x.save(); x.translate(px, py); x.rotate(rot || 0);
    x.font = `${soft ? 'italic ' : ''}${size}px ${soft ? "'Charm', cursive" : "'Metamorphous', serif"}`;
    x.lineWidth = 4; x.strokeStyle = `rgba(${PAPER},0.85)`; if (!soft) x.strokeText(text, 0, 0);
    x.fillStyle = ink(soft ? 0.7 : 0.95); x.fillText(text, 0, 0); x.restore();
  });

  // compass, border, and a burnt edge
  x.save(); x.translate(m.compass[0], m.compass[1]); x.strokeStyle = ink(0.85); x.fillStyle = ink(0.9); x.lineWidth = 1.3;
  x.beginPath(); x.arc(0, 0, 30, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.arc(0, 0, 24, 0, Math.PI * 2); x.stroke();
  for (let i = 0; i < 8; i++) { x.rotate(Math.PI / 4); const l = i % 2 ? 42 : 22; x.beginPath(); x.moveTo(0, -l); x.lineTo(4.5, 0); x.lineTo(-4.5, 0); x.fill(); }
  x.restore();
  x.strokeStyle = ink(0.85); x.lineWidth = 3; x.strokeRect(14, 14, 972, 672); x.lineWidth = 1; x.strokeRect(21, 21, 958, 658);
  x.setLineDash([2, 5]); x.lineWidth = 3; x.strokeStyle = ink(0.5); x.strokeRect(17.5, 17.5, 965, 665); x.setLineDash([]);
  const g = x.createRadialGradient(500, 350, 260, 500, 350, 640);
  g.addColorStop(0, 'rgba(40,24,10,0)'); g.addColorStop(1, 'rgba(40,24,10,0.5)'); x.fillStyle = g; x.fillRect(0, 0, 1000, 700);
  x.restore();
  return (cache[key] = cv);
}

/* a point part-way along a polyline, 0..1 */
export function along(route, f) {
  const seg = route.slice(1).map((p, i) => Math.hypot(p[0] - route[i][0], p[1] - route[i][1]));
  let left = Math.max(0, Math.min(1, f)) * seg.reduce((a, b) => a + b, 0);
  const pts = [route[0]];
  for (let i = 0; i < seg.length; i++) {
    if (left <= seg[i]) { const k = seg[i] ? left / seg[i] : 0; pts.push([route[i][0] + (route[i + 1][0] - route[i][0]) * k, route[i][1] + (route[i + 1][1] - route[i][1]) * k]); break; }
    left -= seg[i]; pts.push(route[i + 1]);
  }
  return pts; // the walked part; its last point is where the figure stands
}

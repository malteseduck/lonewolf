/* Sepia ink maps in the Lone Wolf HD manner. Mountains, forests and settlements are stamped from
   engraved symbols (assets/map/widman, CC0, from a 1680 atlas) tinted to the ink; water, roads and
   washes are painted. Each map is a 1000x700 spec, painted at 2000x1400 so a stamp's own pixels
   land one to one on the canvas. */
import * as Ink from './shared/ink.js';
import { analyse, worldTerrain, toPath, toLine } from './replica.js';
import { drawBuilding } from './buildings.js';
import { CITIES, cityCanvas } from './city.js';
import { PLACES as BOOK1_PLACES, AT as BOOK1_AT, KNOWN as BOOK1_KNOWN, LEGS as BOOK1_LEGS } from './places-01fftd.js';
import { PLACES as BOOK2_PLACES, AT as BOOK2_AT, KNOWN as BOOK2_KNOWN, LEGS as BOOK2_LEGS } from './places-02fotw.js';
import { TOWNS as BOOK1_TOWNS } from './towns-01fftd.js';
import { TOWNS as BOOK2_TOWNS } from './towns-02fotw.js';

/* each book's town plans, under its own code so no two books share one: CITIES['02fotw/holmgard'] */
Object.entries({ '01fftd': BOOK1_TOWNS, '02fotw': BOOK2_TOWNS }).forEach(([b, t]) => Object.entries(t).forEach(([k, v]) => { CITIES[`${b}/${k}`] = v; }));

const INK = '38,26,16', PAPER = '226,212,176';
const ink = (a) => `rgba(${INK},${a})`;

/* points in the printed map's pixels to the 1000x700 grid of a 10:7 view of it */
const onView = (v, pts) => pts.map(([px, py]) => [((px - v[0]) / v[2]) * 1000, ((py - v[1]) / v[3]) * 700]);
const BOOK1_VIEW = [125, 446, 110, 77];
/* the road the figure walks in Book 1, in the printed map's pixels */
const BOOK1_TRAIL = [[168, 466], [176, 478], [186, 490], [198, 501], [211, 511], [222, 519]];

/* The Lastlands as printed in Book 1, redrawn. replica.js reads the coast and the terrain from
   the owner's copy of that map; the rest is set here by hand. All in that image's pixels
   (1024x793). frame: the drawn country inside the decorations. cover: boxes laid over the country
   (banners, title, key, compass rose, arms) and what lies under them. sea: points in open water. */
export const LASTLANDS = {
  frame: [22, 150, 966, 570],
  cover: [[0, 0, 390, 290, 'sea'], [370, 20, 330, 215, 'sea'], [680, 0, 344, 245, 'sea'], [548, 335, 140, 140, 'sea'], [855, 280, 115, 145, 'land'],
    [365, 250, 40, 40, 'sea'], [670, 265, 45, 45, 'sea'], [835, 230, 40, 40, 'sea'], [478, 196, 56, 30, 'sea'],
    [199, 463, 47, 61, 'land']], // Holmgard's castle, whose dark ink otherwise floods as an inlet of the Holmgulf
  sea: [[600, 240], [330, 430], [560, 500], [620, 300], [830, 700], [950, 665]],
  places: [
    ['Holmgard', 'city', 222, 520], ['Toran', 'city', 179, 404], ['Tyso', 'town', 260, 461], ['Anskaven', 'town', 306, 352],
    ['Kai Monastery', 'fort', 168, 466], ['Ragadorn', 'walled', 507, 569], ['Gorn Cove', 'village', 660, 607],
    ['Port Bax', 'city', 711, 577], ['Lof', 'town', 798, 343], ['Hammerdal', 'walled', 918, 487], ['Blave', 'town', 785, 627],
    ['Ryme', 'town', 757, 689], [null, 'village', 862, 641],
  ],
  roads: [
    [[183, 404], [190, 425], [196, 445], [203, 480], [213, 505], [220, 515]],
    [[188, 398], [215, 385], [242, 372], [270, 363], [304, 353]],
    [[258, 463], [248, 482], [238, 500], [228, 512]],
    [[232, 521], [270, 520], [310, 521], [360, 522], [400, 525], [440, 531], [478, 558], [503, 568]],
    [[305, 521], [301, 560], [299, 600], [297, 650]],
    [[512, 571], [560, 576], [598, 581], [650, 581], [675, 584], [700, 580]],
    [[714, 566], [728, 530], [740, 495], [748, 458], [756, 420], [765, 381], [790, 348]],
    [[722, 580], [752, 600], [781, 622]],
    [[795, 615], [840, 595], [871, 580], [895, 552], [915, 500]],
    [[795, 627], [830, 634], [860, 641], [895, 647], [940, 646], [985, 642]],
    [[783, 632], [772, 660], [762, 684]],
    [[770, 682], [810, 672], [838, 665], [860, 645]],
  ],
  rivers: [
    [[60, 421], [100, 422], [140, 418], [167, 408], [177, 400]],
    [[85, 482], [140, 486], [191, 483], [207, 484], [217, 495], [229, 499], [241, 498], [252, 495]],
    [[45, 549], [100, 539], [152, 531], [199, 521], [247, 515], [287, 511]],
    [[502, 583], [497, 607], [507, 631], [524, 655], [530, 700], [535, 740]],
    [[941, 562], [929, 605], [914, 620], [900, 639], [890, 663], [881, 682]],
    [[850, 425], [830, 445], [815, 460], [810, 491]],
    [[650, 612], [648, 650], [652, 700]],
  ],
  /* [text, x, y, size in map pixels, angle, kind] */
  labels: [
    ['The Kaltersee', 600, 245, 12, 0, 'sea'], ['The Holmgulf', 300, 465, 8, -0.75, 'sea'], ['The Gulf of Durenor', 560, 505, 10, 0, 'sea'],
    ['Kirlundin Isles', 432, 330, 7, -1.25, 'sea'], ['The Rymerift', 815, 722, 7, 0, 'sea'],
    ['Sommerlund', 245, 318, 12, 0.45, 'land'], ['Durenor', 770, 420, 13, -0.25, 'land'], ['The Wildlands', 455, 650, 16, 0.08, 'land'],
    ['Durncrag Mountains', 92, 640, 9, 0.95, 'land'], ['Pass of Moytura', 223, 618, 5, 0, 'land'],
  ],
  /* The owner's reference world map (data/reference, git-ignored; used only if present) fills in
     terrain the printed map leaves blank. anchors: the same four towns on both, [world, printed];
     crop: the part of the world map read; region: the printed area it may fill. */
  world: {
    file: 'data/reference/magnamund-world-goodwin.png',
    anchors: [[[2779, 1170], [168, 466]], [[2820, 1252], [222, 520]], [[2810, 1080], [179, 404]], [[2871, 1171], [260, 461]]],
    crop: [2560, 960, 480, 520], region: [40, 330, 300, 320],
  },
  /* Finer detail for the heart of Sommerlund, from the inset on sheet 1 of the Maps of Magnamund,
     in that inset's pixels (577x577). It is fitted to this map by two places both show, and drawn
     only when zoomed in far enough to have room for it. */
  detail: {
    anchors: [[[268, 150], [168, 466]], [[465, 505], [222, 520]]],
    places: [
      ['Tower Bern', 'fort', 75, 98], ['Fogwood', 'village', 195, 192], ['Malis Mound', 'fort', 128, 218], ['Oak Hill', 'village', 432, 35],
      ['Searsby', 'village', 420, 162], ['Deerley', 'village', 520, 162], ['Raumas T.', 'fort', 383, 192], ['Alema Mitre', 'fort', 385, 248],
      ['Alema Br.', 'bridge', 412, 295], ['Searsheld', 'fort', 283, 378], ['Graveyard of the Ancients', 'fort', 378, 392],
      ['Tower Zil', 'fort', 22, 402], ['Ft. Clanor', 'fort', 195, 548], [null, 'fort', 35, 268], [null, 'village', 550, 258],
    ],
    roads: [
      [[268, 150], [340, 148], [420, 148], [530, 150]], [[255, 150], [160, 120], [80, 100]], [[262, 160], [215, 180], [200, 195]],
      [[35, 240], [130, 285], [200, 340], [283, 375], [380, 450], [450, 500]], [[430, 40], [425, 160], [420, 290], [415, 360]],
    ],
    lakes: [[340, 85, 22, 12], [440, 330, 18, 14]],
  },
};

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
    MAPS[`${id}/${leg}`] = city ? { city: `${id}/${city}`, view: [0, 0, 1000, 700], places: own } : { replica: true, view, places: own, marks, rivers: MAPS[id].rivers };
    if (city) places.forEach((k) => inTown.add(k));
  }
  MAPS[id].wholePlaces = Object.fromEntries([...Object.entries(MAPS[id].places || {}).filter(([k]) => !inTown.has(k)), ...Object.entries(marks)]);
}

/* which building (buildings.js) and how tall a landmark in a spec is drawn with. Minor places (a
   cairn, a wagon) get none: the map's own place markers show them once visited. */
const MARK_BUILDING = { city: ['castle', 58], town: ['tower', 40], ruins: ['keep', 34], bridge: ['bridge', 16] };
/* the engraved symbols, one sheet built by tools/build_map_atlas.py: kind -> [{x, y, w, h}] */
const STAMPS = {};
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
function stamp(x, st, px, py, s, halo) {
  const w = st.w * s / 2, h = st.h * s / 2, put = (src) => x.drawImage(st.src || src, st.x, st.y, st.w, st.h, px - w / 2, py - h, w, h);
  if (halo && !st.src) {
    x.save(); x.shadowColor = `rgba(${PAPER},0.95)`; x.shadowBlur = halo;
    put(sheet.pale); put(sheet.pale);
    x.restore();
  }
  put(sheet.ink);
}

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

/* a settlement in LASTLANDS by kind, as a building (buildings.js); its height in printed pixels */
const BUILDING = { city: ['castle', 16], walled: ['castle', 12], town: ['tower', 10], fort: ['monastery', 12], village: ['house', 7] };
const ICON_HEIGHT = { castle: 12, monastery: 12, tower: 9, keep: 9, house: 7, temple: 8, obelisk: 7, bridge: 4 };
/* a building standing on (cx, cy), height canvas pixels tall; where it stands varies the hand */
const building = (x, r, key, cx, cy, height) => drawBuilding(x, key, cx, cy, height, cx * 0.37 + cy);

/* the similarity (move, turn, scale) that takes two points of one map onto the same two of another */
function fit([[a, A], [b, B]]) {
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
export function replicaModel(img, world) {
  const key = img.src + (world ? '+' + world.src : '');
  if (models[key]) return models[key];
  // the printed map is read once; the world map's terrain goes into copies of its grids
  const base = readings[img.src] || (readings[img.src] = analyse(img, LASTLANDS));
  const m = world ? { ...base, mountain: base.mountain.slice(), hill: base.hill.slice(), forest: base.forest.slice() } : base;
  if (world) {
    const S = LASTLANDS.world, t = worldTerrain(world, S.crop), toWorld = affine(S.anchors.map(([w, p]) => [p, w]));
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

/* Paint the replica: view is [x, y, w, h] in the printed map's pixels, W x H the canvas. Symbols
   keep roughly their own size on screen, so zooming in shows more of them, not bigger ones.
   extra: a book's own places ([name, symbol, x, y]); when given, they replace the Magnamund detail. */
const sheets = {};
/* out: the canvas is painted out times the size: the drawing is laid out for W x H and scaled onto
   it, so a smaller canvas looks the same, only with fewer pixels to paint */
export function replicaCanvas(model, view, W, H, extra, out = 1, own = {}) {
  // own: what one book adds to the shared Lastlands for itself (own.rivers), so the others are untouched
  const rivers = [...LASTLANDS.rivers, ...(own.rivers || [])];
  const [vx, vy, vw] = view, z = W / vw, R = LASTLANDS, cv = Ink.canvas(Math.round(W * out), Math.round(H * out)), x = cv.getContext('2d');
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

  // sea: a wash darkening along the shore, ripples, an inked coast
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
  if (D) D.lakes.forEach(([px, py, rx, ry]) => {
    const [cx, cy] = dt([px, py]); x.beginPath(); x.ellipse(cx, cy, rx * dt.scale, ry * dt.scale, 0, 0, Math.PI * 2);
    x.fillStyle = ink(0.24); x.fill(); x.strokeStyle = ink(0.85); x.lineWidth = 2.2 / z; x.stroke();
  });

  // rivers: ink banks and pale water, a fixed width on screen
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

  // land symbols on a jittered screen grid, read from the terrain the printed map shows there
  const roadPaths = roads.map((l) => toLine([l])), riverPaths = [...rivers, ...brooks].map((l) => toLine([l]));
  const spots = [...places, ...(extra || []).filter((e) => e[1])].map(([, , px, py]) => P([px, py])), items = [], tufts = [];
  // Where roads and rivers run, 44 px wide on screen, drawn once into a quarter-size mask and
  // looked up per spot: testing every path with isPointInStroke for every grid cell took seconds
  // a repaint and froze the page while zooming.
  const MS = 4, mw = Math.ceil(W / MS), mh = Math.ceil(H / MS), mc = Ink.canvas(mw, mh), mk = mc.getContext('2d', { willReadFrequently: true });
  mk.setTransform(z / MS, 0, 0, z / MS, (-vx * z) / MS, (-vy * z) / MS); mk.lineWidth = 44 / z; mk.lineCap = 'round'; mk.lineJoin = 'round';
  [...roadPaths, ...riverPaths].forEach((p) => mk.stroke(p));
  const md = mk.getImageData(0, 0, mw, mh).data;
  const onLine = (cx, cy) => { const ix = Math.floor(cx / MS), iy = Math.floor(cy / MS); return ix >= 0 && iy >= 0 && ix < mw && iy < mh && md[(iy * mw + ix) * 4 + 3] > 0; };
  const clear = (cx, cy) => !onLine(cx, cy) && !spots.some(([sx, sy]) => Math.hypot(sx - cx, sy - cy) < 60 * k);
  const g = 30;
  for (let cy = 0; cy < H + 80; cy += g * 0.75) for (let cx = -40; cx < W + 40; cx += g) {
    const jx = cx + (r() - 0.5) * g * 0.9, jy = cy + (r() - 0.5) * g * 0.6, mx = Math.floor(vx + jx / z), my = Math.floor(vy + jy / z);
    if (mx < 0 || my < 0 || mx >= model.W || my >= model.H) continue;
    const i = my * model.W + mx;
    if (model.land[i] < 0.6) continue;
    const m = model.mountain[i], f = model.forest[i], h = model.hill[i], roll = r();
    let st = null, s = 1;
    if (m > 0.2 && roll < 0.45) { const big = r() < 0.3; st = pick(r, big ? 'range' : 'mountain'); s = (big ? 1.1 + r() * 0.4 : 1.5 + r() * 0.6) * k * 0.8; }
    else if (f > 0.03 && roll < Math.min(0.6, f * 5)) { const clump = f > 0.09 && r() < 0.3; st = pick(r, clump ? 'forest' : 'tree'); s = (clump ? 0.8 + r() * 0.3 : 1.2 + r() * 0.4) * k * 0.8; }
    else if (h > 0.15 && roll < 0.35) { st = pick(r, 'mountain', 90); s = (1 + r() * 0.3) * k * 0.7; }
    // open country is not left bare: a lone tree now and then, and tufts of grass
    else if (z >= 4 && roll < 0.025) { st = pick(r, 'tree'); s = (1 + r() * 0.3) * k * 0.7; }
    else if (z >= 4 && roll < 0.3 && clear(jx, jy)) tufts.push([jx, jy]);
    if (st && clear(jx, jy)) items.push([jy, st, jx, jy, s]);
  }
  toCanvas();
  x.strokeStyle = ink(0.45); x.lineWidth = 1.4; x.lineCap = 'round';
  tufts.forEach(([px, py]) => { for (let j = -1; j <= 1; j++) { x.beginPath(); x.moveTo(px + j * 3, py); x.lineTo(px + j * 5 + (r() - 0.5) * 3, py - 6 - r() * 5); x.stroke(); } });
  items.sort((a, b) => a[0] - b[0]).forEach(([, st, px, py, s]) => stamp(x, st, px, py, s * 2, 0));

  // roads over the land, white dashes on a dark bed
  toMap();
  roadPaths.forEach((p) => {
    x.setLineDash([]); x.strokeStyle = ink(0.6); x.lineWidth = 6 / z; x.stroke(p);
    x.setLineDash([12 / z, 7 / z]); x.strokeStyle = 'rgba(255,248,228,0.95)'; x.lineWidth = 3 / z; x.stroke(p);
  });
  x.setLineDash([]);
  toCanvas();

  // the book's own places: a symbol each, no name until he has been there (the panel adds that)
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

  // settlements on a pale halo, with their names; then the names of seas and lands
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
  R.labels.forEach(([text, px, py, size, rot, kind]) => {
    const [cx, cy] = P([px, py]), s = Math.max(16, Math.min(110, size * z));
    x.save(); x.translate(cx, cy); x.rotate(rot);
    x.font = `${kind === 'sea' ? 'italic ' : ''}${s}px ${kind === 'sea' ? "'Charm', cursive" : "'Metamorphous', serif"}`;
    if ('letterSpacing' in x) x.letterSpacing = kind === 'land' ? `${s * 0.25}px` : '0px';
    x.fillStyle = ink(kind === 'sea' ? 0.55 : 0.4); x.fillText(kind === 'land' ? text.toUpperCase() : text, 0, 0); x.restore();
  });

  // border and a burnt edge
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
function pick(r, kind, maxW) {
  const list = maxW ? STAMPS[kind].filter((st) => st.w < maxW) : STAMPS[kind];
  return list[Math.floor(r() * list.length)];
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
  if (MAPS[id].replica) return img ? (cache[key] = replicaCanvas(replicaModel(img, world), MAPS[id].view, 3200, 2240, MAPS[id].places && Object.values({ ...MAPS[id].places, ...MAPS[id].marks }), out, { rivers: MAPS[id].rivers })) : null;
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

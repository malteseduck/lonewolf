/* Kalte as printed in Book 3, redrawn: the map Book 3 travels on, a frozen land. Its data and its
   own painter; what it shares with the other maps is in map-common.js. */
import * as Ink from './shared/ink.js';
import { ink, PAPER, pick, stamp, inside, begin, paintSea, paintRivers, landGrid, paintRoads, paintOwnPlaces, paintPlaces, paintLabels, finish } from './map-common.js';

/* The printed map is 1024x776, and all here is in its pixels. Its snow is left white like the sea,
   so the land is found from points on it (land) instead of from the sea. Its ice shelves, outlined
   by hand, are cut out of the land and painted as ice; the pack ice is a band drawn along its line. */
export const KALTE = {
  book: '03tcok',
  frame: [90, 34, 636, 706],
  cover: [[380, 505, 300, 185, 'sea'], [175, 510, 105, 100, 'sea'], [585, 415, 120, 50, 'sea']],
  land: [[230, 200], [500, 60], [180, 330], [620, 230], [345, 375], [140, 152]],
  // the grey-green of the glacier is no wood, nor is the same tint on the ice elsewhere in the north,
  // nor the green of the islands in the south (open ground)
  as: [['forest', 'glacier', [370, 80, 110, 200]], ['forest', 'pale', [90, 34, 636, 520]], ['forest', 'plain'], ['waste', 'mountain']],
  // a frozen land: snow drifts on open ground, no trees or grass; the glacier hatched across
  snow: true,
  // the ice shelves, outlined from the printed map's tint, and the limit of the winter pack ice, a band
  // of floes this wide along its middle
  shelves: [
    // the Ljuk Ice Shelf, traced round its printed outline
    [
      [321, 242], [323, 244], [321, 246], [319, 249], [319, 252], [320, 255], [322, 257], [324, 260], [327, 261], [329, 264], [330, 267], [331, 270], [331, 273], [333, 276],
      [335, 279], [337, 281], [340, 281], [343, 282], [346, 282], [349, 281], [352, 280], [354, 278], [355, 275], [356, 272], [358, 274], [359, 277], [361, 279], [364, 280],
      [367, 280], [370, 278], [373, 276], [376, 275], [379, 274], [382, 273], [385, 272], [388, 270], [391, 268], [394, 267], [397, 266], [400, 266], [403, 267], [406, 267],
      [409, 267], [412, 267], [413, 270], [415, 272], [417, 270], [418, 267], [421, 267], [424, 267], [427, 267], [429, 269], [432, 269], [435, 268], [437, 266], [440, 266],
      [443, 268], [445, 270], [447, 272], [449, 275], [452, 274], [452, 277], [452, 280], [450, 282], [447, 283], [444, 284], [442, 286], [440, 288], [438, 290], [435, 292],
      [434, 295], [434, 298], [433, 301], [433, 304], [433, 307], [433, 310], [433, 313], [431, 315], [428, 315], [425, 314], [422, 313], [419, 313], [416, 314], [413, 314],
      [410, 314], [407, 314], [404, 314], [401, 313], [398, 313], [396, 315], [395, 318], [392, 318], [389, 320], [386, 320], [383, 320], [380, 320], [377, 320], [374, 320],
      [371, 320], [368, 320], [365, 320], [362, 320], [359, 320], [356, 320], [353, 320], [350, 320], [347, 320], [344, 320], [341, 320], [338, 319], [335, 318], [332, 316],
      [329, 315], [326, 315], [323, 314], [320, 313], [317, 313], [314, 312], [311, 311], [308, 312], [305, 312], [302, 313], [299, 313], [296, 314], [293, 314], [290, 313],
      [287, 313], [284, 313], [281, 312], [278, 311], [275, 310], [272, 309], [269, 308], [266, 308], [265, 305], [265, 302], [265, 299], [265, 296], [265, 293], [265, 290],
      [265, 287], [265, 284], [265, 281], [265, 278], [265, 275], [265, 272], [265, 269], [263, 266], [262, 263], [262, 260], [262, 257], [262, 254], [262, 251], [263, 248],
      [263, 245], [266, 245], [266, 248], [268, 251], [271, 252], [274, 251], [277, 251], [280, 251], [283, 252], [285, 255], [287, 258], [289, 260], [290, 263], [292, 266],
      [295, 267], [298, 267], [301, 267], [304, 267], [306, 265], [307, 262], [308, 259], [309, 256], [309, 253], [309, 250], [312, 251], [315, 252], [317, 250], [318, 247],
      [319, 244],
    ],
    // the Kliu Ice Shelf, traced round its printed outline
    [
      [581, 262], [584, 262], [585, 265], [584, 268], [585, 271], [587, 273], [587, 276], [585, 278], [583, 280], [580, 280], [577, 281], [574, 282], [571, 282], [568, 283],
      [565, 284], [562, 285], [559, 286], [556, 287], [553, 289], [550, 289], [547, 289], [545, 291], [542, 292], [539, 292], [536, 293], [533, 294], [531, 296], [529, 298],
      [526, 300], [524, 302], [522, 305], [519, 306], [517, 308], [515, 311], [512, 313], [509, 315], [507, 317], [504, 318], [502, 320], [499, 321], [497, 319], [495, 321],
      [494, 324], [491, 325], [488, 326], [485, 325], [483, 327], [480, 327], [477, 327], [474, 327], [472, 325], [469, 326], [466, 327], [463, 328], [461, 326], [463, 323],
      [466, 321], [469, 319], [472, 317], [475, 316], [478, 315], [480, 313], [482, 311], [485, 311], [488, 310], [491, 309], [494, 307], [496, 305], [498, 303], [500, 300],
      [501, 297], [502, 294], [503, 291], [504, 288], [506, 286], [508, 283], [511, 283], [514, 282], [517, 280], [519, 278], [521, 276], [524, 274], [526, 271], [528, 268],
      [530, 265], [533, 264], [536, 264], [539, 265], [542, 265], [545, 266], [548, 264], [551, 264], [554, 265], [556, 267], [554, 270], [554, 273], [556, 276], [559, 277],
      [562, 277], [565, 275], [567, 273], [568, 270], [569, 267], [571, 265], [573, 263], [576, 263], [579, 263],
    ],
    // the Drygga Ice Shelf, traced round its printed outline
    [
      [724, 121], [727, 123], [726, 126], [727, 129], [724, 130], [722, 132], [720, 134], [718, 137], [716, 139], [714, 141], [712, 143], [710, 145], [707, 147], [705, 149],
      [702, 151], [700, 153], [698, 155], [696, 157], [694, 159], [692, 161], [690, 163], [688, 165], [686, 168], [684, 171], [683, 174], [681, 177], [680, 180], [680, 183],
      [679, 186], [678, 189], [677, 192], [677, 195], [676, 198], [676, 201], [676, 204], [673, 205], [676, 207], [676, 210], [675, 213], [674, 216], [673, 219], [671, 221],
      [672, 224], [671, 227], [670, 230], [669, 233], [668, 236], [666, 239], [664, 242], [662, 244], [660, 246], [658, 249], [656, 251], [654, 253], [652, 255], [650, 257],
      [648, 259], [645, 260], [642, 261], [639, 263], [636, 265], [633, 267], [630, 267], [627, 267], [624, 267], [624, 264], [623, 261], [624, 258], [625, 255], [624, 252],
      [624, 249], [623, 246], [626, 245], [629, 244], [632, 243], [634, 241], [636, 239], [639, 238], [642, 236], [643, 233], [644, 230], [645, 227], [646, 224], [648, 221],
      [649, 218], [651, 216], [651, 213], [648, 211], [645, 209], [643, 206], [643, 203], [642, 200], [642, 197], [641, 194], [640, 191], [638, 188], [636, 186], [635, 183],
      [637, 181], [640, 181], [643, 182], [646, 184], [649, 185], [652, 186], [655, 184], [658, 183], [661, 182], [664, 180], [666, 177], [669, 175], [671, 172], [673, 170],
      [675, 168], [677, 166], [677, 163], [675, 161], [672, 160], [671, 157], [673, 155], [676, 154], [679, 152], [682, 151], [684, 149], [686, 147], [687, 144], [686, 141],
      [686, 138], [685, 135], [685, 132], [687, 129], [690, 128], [693, 129], [695, 131], [698, 132], [701, 133], [704, 132], [706, 130], [708, 128], [711, 128], [714, 126],
      [717, 125], [720, 123], [723, 122],
    ],
    // the Hrod Ice Shelf and the bay round Hrod, traced round its printed outline
    [
      [118, 97], [121, 97], [122, 100], [124, 102], [126, 105], [127, 108], [128, 111], [129, 114], [130, 117], [131, 120], [133, 122], [135, 124], [138, 125], [141, 127],
      [144, 128], [147, 129], [150, 130], [153, 131], [156, 132], [159, 133], [162, 135], [162, 138], [162, 141], [164, 143], [164, 146], [165, 149], [165, 152], [165, 155],
      [164, 158], [164, 161], [164, 164], [164, 167], [166, 170], [168, 173], [168, 176], [165, 177], [162, 177], [159, 178], [156, 180], [153, 181], [150, 182], [147, 183],
      [144, 182], [141, 182], [139, 180], [136, 179], [133, 179], [131, 181], [131, 184], [130, 187], [129, 190], [129, 193], [129, 196], [129, 199], [129, 202], [129, 205],
      [129, 208], [126, 209], [123, 209], [120, 209], [117, 211], [114, 212], [111, 213], [108, 214], [105, 214], [102, 213], [99, 212], [98, 209], [100, 207], [103, 206],
      [105, 204], [106, 201], [108, 199], [110, 197], [110, 194], [111, 191], [111, 188], [110, 185], [110, 182], [110, 179], [109, 176], [110, 173], [109, 170], [109, 167],
      [109, 164], [109, 161], [109, 158], [109, 155], [111, 153], [112, 150], [112, 147], [112, 144], [113, 141], [113, 138], [115, 135], [115, 132], [116, 129], [116, 126],
      [116, 123], [117, 120], [117, 117], [116, 114], [116, 111], [116, 108], [117, 105], [117, 102], [118, 99],
    ],
  ],
  pack: { width: 28, line: [[90, 348], [120, 368], [145, 388], [170, 402], [195, 412], [220, 426], [245, 443], [270, 451], [295, 456], [320, 458], [345, 457], [370, 462], [395, 468], [420, 468], [445, 466], [470, 459], [495, 442], [520, 430], [545, 418], [570, 404], [595, 390], [620, 355], [645, 338], [670, 327], [695, 327], [726, 314]] },
  places: [['Ljuk', 'fort', 250, 285], ['Ikaya', 'city', 440, 62], ['Anskaven', 'town', 117, 712], ['Lof', 'town', 612, 712]],
  roads: [],
  rivers: [],
  labels: [
    ['The Kaltersee', 150, 480, 10, 0, 'sea'], ['Ljuk Sound', 272, 348, 7, 0, 'sea'], ['Limit of Winter Pack Ice', 392, 478, 6, -0.05, 'sea'],
    ['Ljuk Ice Shelf', 320, 300, 5, 0, 'sea'], ['Kliu Ice Shelf', 540, 290, 5, -0.35, 'sea'], ['Drygga Ice Shelf', 700, 200, 5, -1.1, 'sea'],
    ['Hrod Ice Shelf', 100, 120, 5, -1.57, 'sea'], ['The Uncharted Void', 570, 45, 7, 0, 'land'],
    ['Hrod Range', 225, 88, 8, 0.35, 'land'], ['Storm Giant Pass', 322, 135, 6, -0.1, 'land'], ['Viad Mountains', 318, 168, 6, 0, 'land'],
    ['Hrod Basin', 250, 196, 7, 0, 'land'], ['Myjavik Mountains', 565, 132, 7, -0.2, 'land'], ['Kliu Range', 540, 218, 6, -0.35, 'land'],
    ['Viad Glacier', 423, 185, 5, -1.3, 'land'], ['Cloudmaker Mtn', 380, 212, 4, 0, 'land'], ['Ljuk Range', 120, 275, 5, 0.8, 'land'],
    ['The Rock', 300, 276, 4, 0, 'land'], ['Gyem Island', 412, 287, 4, 0, 'land'], ['Halle Bluff', 418, 340, 5, -0.3, 'land'],
    ['Krie', 420, 370, 5, 0, 'land'], ['Tola', 345, 388, 5, 0, 'land'],
    ['Thet', 230, 712, 5, 0, 'land'], ['Egen', 265, 722, 5, 0, 'land'], ['Broka', 315, 686, 5, 0, 'land'],
  ],
};

/* The ice, in the printed map's pixels: the land a paler sheet of snow; the ice
   shelves pale over the dark sea, edged in broken ink and crossed by cracks; the pack ice a band of
   floes. Its own fixed seed, so the ice does not shift as the view repaints. */
function snowAndIce(x, R, land, sea, z) {
  const q = Ink.seeded(31);
  x.fillStyle = `rgba(${PAPER},0.3)`; x.fill(land);
  // a hand-drawn outline: each side broken into short wavering steps
  const jag = (pts) => {
    const p = new Path2D();
    pts.forEach(([ax, ay], i) => {
      const [bx, by] = pts[(i + 1) % pts.length], m = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 3));
      for (let j = 0; j < m; j++) { const px = ax + ((bx - ax) * j) / m + (q() - 0.5) * 1.6, py = ay + ((by - ay) * j) / m + (q() - 0.5) * 1.6; if (i || j) p.lineTo(px, py); else p.moveTo(px, py); }
    });
    p.closePath();
    return p;
  };
  (R.shelves || []).forEach((poly) => {
    const p = jag(poly), xs = poly.map((v) => v[0]), ys = poly.map((v) => v[1]), [x0, y0, x1, y1] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    x.fillStyle = `rgba(${PAPER},0.62)`; x.fill(p);
    x.save(); x.clip(p);
    x.strokeStyle = ink(0.32); x.lineWidth = 1.1 / z;
    for (let i = 0; i < ((x1 - x0) * (y1 - y0)) / 70; i++) { // cracks, a few short kinked runs
      let cx = x0 + q() * (x1 - x0), cy = y0 + q() * (y1 - y0), a = q() * Math.PI * 2;
      x.beginPath(); x.moveTo(cx, cy);
      for (let j = 0; j < 3; j++) { a += (q() - 0.5) * 1.4; const l = 2 + q() * 4; cx += Math.cos(a) * l; cy += Math.sin(a) * l; x.lineTo(cx, cy); }
      x.stroke();
    }
    x.restore();
    x.strokeStyle = ink(0.8); x.lineWidth = 1.8 / z; x.stroke(p);
  });
  x.save(); x.clip(sea, 'evenodd');
  // the pack ice, as printed: a band of packed floes between two broken edges
  const pk = R.pack;
  if (pk) {
    const L = pk.line, half = pk.width / 2, edges = [[], []];
    L.forEach(([px, py], i) => { // each point's normal: the average of its two sides'
      const [ax, ay] = L[Math.max(0, i - 1)], [bx, by] = L[Math.min(L.length - 1, i + 1)], d = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / d, ny = (bx - ax) / d;
      const w = half * (0.8 + q() * 0.4);
      edges[0].push([px + nx * w, py + ny * w]); edges[1].push([px - nx * w, py - ny * w]);
    });
    const wave = (pts) => { const p = new Path2D(); pts.forEach(([px, py], i) => (i ? p.lineTo(px + (q() - 0.5) * 2, py + (q() - 0.5) * 2) : p.moveTo(px, py))); return p; };
    const fine = (pts) => pts.flatMap(([ax, ay], i) => { if (!i) return [[ax, ay]]; const [bx, by] = pts[i - 1], m = Math.max(1, Math.round(Math.hypot(ax - bx, ay - by) / 3)); return Array.from({ length: m }, (_, j) => [bx + ((ax - bx) * (j + 1)) / m, by + ((ay - by) * (j + 1)) / m]); });
    const [e0, e1] = edges.map(fine), band = new Path2D(); [...e0, ...e1.slice().reverse()].forEach(([px, py], i) => (i ? band.lineTo(px, py) : band.moveTo(px, py))); band.closePath();
    x.fillStyle = `rgba(${PAPER},0.5)`; x.fill(band);
    // the floes: joints across the band, each kinked once, every few pixels along it
    x.strokeStyle = ink(0.72); x.lineWidth = 1.2 / z;
    for (let i = 0; i < Math.min(e0.length, e1.length); i += 1 + (q() < 0.5)) {
      const [ax, ay] = e0[i], [bx, by] = e1[Math.min(e1.length - 1, i + (q() < 0.5 ? 1 : 0))], t = 0.3 + q() * 0.4;
      x.beginPath(); x.moveTo(ax, ay); x.lineTo(ax + (bx - ax) * t + (q() - 0.5) * 3, ay + (by - ay) * t + (q() - 0.5) * 3); x.lineTo(bx, by); x.stroke();
      if (q() < 0.4) { const [cx, cy] = [ax + (bx - ax) * 0.5, ay + (by - ay) * 0.5], [dx, dy] = e0[Math.min(e0.length - 1, i + 2)]; x.beginPath(); x.moveTo(cx, cy); x.lineTo((cx + dx + bx) / 3, (cy + dy + by) / 3); x.stroke(); }
    }
    x.strokeStyle = ink(0.8); x.lineWidth = 1.6 / z; [e0, e1].forEach((e) => x.stroke(wave(e)));
  }
  x.restore();
}

/* paint a view of it: see begin in map-common.js for the arguments */
export function paint(model, view, W, H, extra, out, own) {
  const c = begin(model, view, W, H, extra, out, own, KALTE), { x, r, z, k, vx, vy } = c;
  paintSea(c);
  snowAndIce(x, KALTE, c.land, c.sea, z);
  paintRivers(c);

  // whether map pixel (mx, my) is glacier (and not an ice shelf below it)
  const glacier = (mx, my) => mx >= 0 && my >= 0 && mx < model.W && my < model.H && model.glacier[my * model.W + mx] > 0.12 && !KALTE.shelves.some((poly) => inside(poly, mx, my));
  // land symbols, read from the terrain the printed map shows there
  const items = [], drifts = [];
  landGrid(c, (i, mx, my, jx, jy) => {
    const m = model.mountain[i], h = model.hill[i], roll = r();
    let st = null, s = 1;
    // the glacier is hatched below, and nothing stands on it, nor close enough to overhang it
    if ([-4, 0, 4].some((d) => glacier(mx + d, my) || glacier(mx, my + d))) { /* hatched */ }
    else if (m > 0.2 && roll < 0.45) { const big = r() < 0.3; st = pick(r, big ? 'range' : 'mountain'); s = (big ? 1.1 + r() * 0.4 : 1.5 + r() * 0.6) * k * 0.8; }
    else if (h > 0.15 && roll < 0.35) { st = pick(r, 'mountain', 90); s = (1 + r() * 0.3) * k * 0.7; }
    // open country is not left bare: drifts of snow, no trees or grass
    else if (roll < 0.22 && c.clear(jx, jy)) drifts.push([jx, jy]);
    if (st && c.clear(jx, jy)) items.push([jy, st, jx, jy, s]);
  });
  c.toCanvas();
  x.lineCap = 'round';
  // a drift: a low ridge of snow, shaded under its crest and lit along it
  drifts.forEach(([px, py]) => {
    const w = 9 + r() * 8, lift = 3 + r() * 3;
    x.strokeStyle = ink(0.42); x.lineWidth = 1.3; x.beginPath(); x.moveTo(px - w, py); x.quadraticCurveTo(px - w * 0.2, py - lift, px + w, py + 1); x.stroke();
    x.strokeStyle = `rgba(${PAPER},0.7)`; x.beginPath(); x.moveTo(px - w * 0.8, py - 2); x.quadraticCurveTo(px - w * 0.2, py - lift - 2, px + w * 0.7, py - 1); x.stroke();
    if (r() < 0.5) { x.strokeStyle = ink(0.3); x.beginPath(); x.moveTo(px - w * 0.4, py + 5); x.quadraticCurveTo(px + w * 0.2, py + 5 - lift * 0.6, px + w * 0.9, py + 6); x.stroke(); }
  });
  // the glacier, as printed: close horizontal hatching across its whole breadth, each stroke broken
  // now and then and wavering a little
  x.strokeStyle = ink(0.5); x.lineWidth = 1.1;
  const on = (cx, cy) => glacier(Math.floor(vx + cx / z), Math.floor(vy + cy / z));
  for (let cy = 2; cy < H; cy += 4.5) {
    let run = false;
    for (let cx = -3; cx <= W + 3; cx += 3) {
      const here = cx >= 0 && cx < W && on(cx, cy) && r() > 0.03; // a gap now and then
      if (here && !run) { run = true; x.beginPath(); x.moveTo(cx, cy + (r() - 0.5) * 1.2); }
      else if (here) x.lineTo(cx, cy + (r() - 0.5) * 1.2);
      else if (run) { x.stroke(); run = false; }
    }
  }
  items.sort((a, b) => a[0] - b[0]).forEach(([, st, px, py, s]) => stamp(x, st, px, py, s * 2, 0));

  paintRoads(c);
  paintOwnPlaces(c);
  paintPlaces(c);
  // the sea is the dark part here: its names in paper, the land's in firmer ink, and all larger
  paintLabels(c, (s) => Math.max(22, Math.min(110, s * z * 1.2)), (kind) => (kind === 'sea' ? `rgba(${PAPER},0.85)` : ink(0.65)));
  return finish(c);
}

/* The Lastlands as printed in Book 1, redrawn: the map Books 1 and 2 travel on. Its data and its
   own painter; what it shares with the other maps is in map-common.js. */
import { ink, pick, stamp, begin, paintSea, paintRivers, landGrid, paintRoads, paintOwnPlaces, paintPlaces, paintLabels, finish } from './map-common.js';

/* replica.js reads the coast and the terrain from
   the owner's copy of that map; the rest is set here by hand. All in that image's pixels
   (1024x793). frame: the drawn country inside the decorations. cover: boxes laid over the country
   (banners, title, key, compass rose, arms) and what lies under them. sea: points in open water. */
export const LASTLANDS = {
  book: '01fftd',
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

/* paint a view of it: see begin in map-common.js for the arguments */
export function paint(model, view, W, H, extra, out, own) {
  const c = begin(model, view, W, H, extra, out, own, LASTLANDS), { x, r, z, k, D, dt } = c;
  paintSea(c);
  if (D) D.lakes.forEach(([px, py, rx, ry]) => {
    const [cx, cy] = dt([px, py]); x.beginPath(); x.ellipse(cx, cy, rx * dt.scale, ry * dt.scale, 0, 0, Math.PI * 2);
    x.fillStyle = ink(0.24); x.fill(); x.strokeStyle = ink(0.85); x.lineWidth = 2.2 / z; x.stroke();
  });
  paintRivers(c);

  // land symbols, read from the terrain the printed map shows there
  const items = [], tufts = [];
  landGrid(c, (i, mx, my, jx, jy) => {
    const m = model.mountain[i], f = model.forest[i], h = model.hill[i], roll = r();
    let st = null, s = 1;
    if (m > 0.2 && roll < 0.45) { const big = r() < 0.3; st = pick(r, big ? 'range' : 'mountain'); s = (big ? 1.1 + r() * 0.4 : 1.5 + r() * 0.6) * k * 0.8; }
    else if (f > 0.03 && roll < Math.min(0.6, f * 5)) { const clump = f > 0.09 && r() < 0.3; st = pick(r, clump ? 'forest' : 'tree'); s = (clump ? 0.8 + r() * 0.3 : 1.2 + r() * 0.4) * k * 0.8; }
    else if (h > 0.15 && roll < 0.35) { st = pick(r, 'mountain', 90); s = (1 + r() * 0.3) * k * 0.7; }
    // open country is not left bare: a lone tree now and then, and tufts of grass
    else if (z >= 4 && roll < 0.025) { st = pick(r, 'tree'); s = (1 + r() * 0.3) * k * 0.7; }
    else if (z >= 4 && roll < 0.3 && c.clear(jx, jy)) tufts.push([jx, jy]);
    if (st && c.clear(jx, jy)) items.push([jy, st, jx, jy, s]);
  });
  c.toCanvas();
  x.strokeStyle = ink(0.45); x.lineWidth = 1.4; x.lineCap = 'round';
  tufts.forEach(([px, py]) => { for (let j = -1; j <= 1; j++) { x.beginPath(); x.moveTo(px + j * 3, py); x.lineTo(px + j * 5 + (r() - 0.5) * 3, py - 6 - r() * 5); x.stroke(); } });
  items.sort((a, b) => a[0] - b[0]).forEach(([, st, px, py, s]) => stamp(x, st, px, py, s * 2, 0));

  paintRoads(c);
  paintOwnPlaces(c);
  paintPlaces(c);
  paintLabels(c, (s) => Math.max(16, Math.min(110, s * z)), (kind) => ink(kind === 'sea' ? 0.55 : 0.4));
  return finish(c);
}

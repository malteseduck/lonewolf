/* Sepia ink maps in the Lone Wolf HD manner: dark washes, hatched mountains, small firs,
   white dashed roads, and inked landmarks with a pale outline. Each map is a 1000x700 spec. */
import * as Ink from './shared/ink.js';

const INK = '38,26,16', PAPER = '226,212,176', RED = '140,28,18';
const ink = (a) => `rgba(${INK},${a})`;

export const MAPS = {
  /* the invented country of the demo chapter */
  demo: {
    sea: 'M1000 520 C950 580 990 640 940 700 L1000 700 Z',
    rivers: ['M600 0 C560 150 560 260 535 330 S470 470 420 540 S330 640 300 700', 'M1000 380 C900 430 860 500 840 550 S790 650 770 700'],
    roads: ['M550 468 Q640 425 735 470 T838 552 T915 628'],
    trails: ['M150 110 Q230 140 285 195 T350 320 T462 432', 'M150 110 Q110 200 140 280 T350 320', 'M462 432 Q500 370 540 318 T550 468', 'M462 432 Q430 490 418 548 T550 468'],
    woods: [[290, 215, 200, 125], [370, 430, 160, 125], [630, 230, 130, 115], [650, 580, 120, 70], [110, 540, 120, 130], [860, 330, 80, 70], [480, 90, 110, 70]],
    hills: [[140, 288, 95, 36]],
    peaks: { box: [740, 40, 230, 140], n: 20 },
    marks: [['ruins', 150, 104], ['cairn', 140, 272], ['wagon', 350, 314], ['posts', 462, 428], ['log', 540, 316], ['reeds', 418, 546], ['posts', 550, 466], ['tent', 735, 462], ['bridge', 838, 552], ['city', 915, 618]],
    clear: [[150, 110], [285, 195], [140, 280], [350, 320], [462, 432], [540, 318], [418, 548], [550, 468], [735, 470], [838, 552], [915, 628]],
    labels: [],
    compass: [84, 606],
  },
  /* Book 1: the country between the Kai Monastery and Holmgard, drawn fresh for this project */
  '01fftd': {
    sea: 'M560 0 C640 110 770 140 745 255 S800 450 752 548 S860 650 1000 640 L1000 0 Z',
    rivers: ['M60 330 C200 372 380 398 520 462 S690 540 748 560', 'M40 604 C250 628 520 650 748 566', 'M96 118 C190 142 270 112 332 96'],
    roads: ['M332 96 C420 250 560 380 742 556', 'M742 556 C700 420 688 300 702 204', 'M236 300 C320 330 410 332 462 318'],
    trails: ['M236 300 C300 350 380 392 470 440 S650 520 742 556'],
    woods: [[340, 410, 190, 110], [540, 290, 110, 90], [300, 205, 120, 70], [560, 610, 170, 50], [470, 545, 110, 50], [200, 470, 90, 70]],
    hills: [[170, 560, 90, 36], [420, 150, 70, 28]],
    peaks: { box: [20, 50, 130, 600], n: 34 },
    marks: [['ruins', 236, 292], ['town', 332, 88], ['town', 702, 196], ['city', 742, 546]],
    clear: [[236, 300], [332, 96], [702, 204], [742, 556]],
    labels: [['Kai Monastery', 236, 262, 17], ['Toran', 332, 58, 17], ['Tyso', 702, 166, 17], ['Holmgard', 742, 600, 20], ['The Holmgulf', 880, 330, 22, -1.1, true], ['R. Unoram', 400, 388, 12, 0.2, true], ['R. Eledil', 330, 622, 12, 0.08, true], ['Durncrag Mountains', 70, 370, 15, -1.5708, true]],
    compass: [910, 90],
    /* the pawn walks this line as the story nears its end */
    route: [[236, 300], [300, 350], [380, 392], [470, 440], [560, 480], [650, 520], [742, 556]],
    start: 'Kai Monastery', goal: 'Holmgard',
  },
};

/* small inked landmarks: a pale outline first, then the ink */
const GLYPHS = {
  city: [[[-26, 8], [26, 8], [26, -6], [-26, -6]], [[-30, 8], [-30, -16], [-25, -26], [-20, -16], [-20, 8]], [[20, 8], [20, -16], [25, -26], [30, -16], [30, 8]], [[-6, 8], [-6, -22], [0, -36], [6, -22], [6, 8]]],
  town: [[[-16, 8], [-16, -4], [-9, -12], [-2, -4], [-2, 8]], [[2, 8], [2, -16], [7, -26], [12, -16], [12, 8]], [[12, 8], [12, -2], [20, -2], [20, 8]]],
  ruins: [[[-20, 8], [-20, -14], [-16, -20], [-13, -12], [-10, -18], [-8, 8]], [[-8, 8], [-8, -4], [2, -6], [8, -2], [10, 8]], [[10, 8], [10, -22], [13, -28], [16, -20], [19, -26], [20, 8]]],
  bridge: [[[-22, 4], [-22, -4], [22, -4], [22, 4], [14, 4], [8, -1], [0, 4], [-8, -1], [-14, 4]]],
  tent: [[[-14, 8], [0, -14], [14, 8]], [[-2, 8], [0, 0], [2, 8]]],
  wagon: [[[-14, 2], [-14, -8], [12, -8], [12, 2]], [[-12, 8], [-7, 3], [-2, 8]], [[2, 8], [7, 3], [12, 8]]],
  posts: [[[-10, 8], [-10, -8], [-7, -8], [-7, 8]], [[-1, 8], [-1, -12], [2, -12], [2, 8]], [[8, 8], [8, -6], [11, -6], [11, 8]]],
  log: [[[-18, -2], [16, -8], [18, -3], [-16, 4]]],
  reeds: [[[-8, 8], [-10, -10], [-6, 8]], [[-1, 8], [0, -14], [2, 8]], [[6, 8], [10, -9], [9, 8]]],
  cairn: [[[-12, 8], [-8, 0], [8, 0], [12, 8]], [[-7, 0], [-4, -8], [5, -8], [7, 0]], [[-3, -8], [0, -15], [3, -8]]],
};
function glyph(x, type, px, py, s = 1) {
  const shapes = GLYPHS[type] || GLYPHS.posts;
  const path = (pts) => { x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(px + a * s, py + b * s) : x.moveTo(px + a * s, py + b * s))); x.closePath(); };
  x.lineJoin = 'round';
  shapes.forEach((pts) => { path(pts); x.strokeStyle = `rgba(${PAPER},0.95)`; x.lineWidth = 5; x.stroke(); });
  shapes.forEach((pts) => { path(pts); x.fillStyle = ink(0.92); x.fill(); });
  if (type === 'city') { x.fillStyle = `rgba(${RED},0.95)`; x.fillRect(px - 0.5 * s, py - 46 * s, 1.5 * s, 12 * s); x.beginPath(); x.moveTo(px + s, py - 46 * s); x.lineTo(px + 11 * s, py - 42 * s); x.lineTo(px + s, py - 38 * s); x.fill(); }
  if (type === 'ruins') for (let i = 0; i < 7; i++) { x.beginPath(); x.ellipse(px + i * 5 * s, py - (30 + i * 9) * s, (6 + i * 2) * s, (4 + i) * s, 0, 0, Math.PI * 2); x.fillStyle = ink(0.1); x.fill(); }
}

const cache = {};
export function mapCanvas(id) {
  if (cache[id]) return cache[id];
  const m = MAPS[id], cv = Ink.canvas(2000, 1400), x = cv.getContext('2d'), r = Ink.seeded(id.length * 131 + 11);
  x.drawImage(Ink.parchment(cv.width, cv.height, false, true), 0, 0);
  x.fillStyle = 'rgba(84,56,26,0.3)'; x.fillRect(0, 0, cv.width, cv.height);
  x.save(); x.scale(2, 2);
  x.lineCap = 'round'; x.lineJoin = 'round';
  const P = (d) => new Path2D(d);
  const rivers = m.rivers.map(P), roads = m.roads.map(P), trails = m.trails.map(P), sea = m.sea && P(m.sea);

  // broad brush washes give the land its relief
  for (let i = 0; i < 170; i++) {
    const px = r() * 1000, py = r() * 700, a = r() * Math.PI, l = 40 + r() * 150;
    x.strokeStyle = r() < 0.72 ? ink(0.025 + r() * 0.05) : `rgba(${PAPER},${0.04 + r() * 0.06})`; x.lineWidth = 10 + r() * 44;
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * l * 0.5 + (r() - 0.5) * 50, py + Math.sin(a) * l * 0.5 + (r() - 0.5) * 50, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  x.strokeStyle = ink(0.09); x.lineWidth = 0.7;
  for (let g = 100; g < 1000; g += 100) { x.beginPath(); x.moveTo(g, 0); x.lineTo(g, 700); x.stroke(); }
  for (let g = 100; g < 700; g += 100) { x.beginPath(); x.moveTo(0, g); x.lineTo(1000, g); x.stroke(); }

  if (sea) {
    x.fillStyle = ink(0.34); x.fill(sea);
    x.save(); x.clip(sea);
    for (let i = 0; i < 260; i++) { const px = r() * 1000, py = r() * 700; x.strokeStyle = r() < 0.5 ? `rgba(${PAPER},0.22)` : ink(0.3); x.lineWidth = 1; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 7, py - 3, px + 14, py); x.stroke(); }
    x.restore();
    x.strokeStyle = ink(0.9); x.lineWidth = 2.4; x.stroke(sea); x.strokeStyle = `rgba(${PAPER},0.5)`; x.lineWidth = 6; x.save(); x.clip(sea); x.stroke(sea); x.restore();
  }

  // mountains: a dark ridge, a lit face, and hatching down the shadow side
  const pk = m.peaks, peaks = [];
  for (let i = 0; i < pk.n; i++) peaks.push([pk.box[0] + r() * pk.box[2], pk.box[1] + r() * pk.box[3], 18 + r() * 26]);
  peaks.sort((a, b) => a[1] - b[1]).forEach(([px, py, s]) => {
    const lean = (r() - 0.5) * s * 0.4;
    x.beginPath(); x.moveTo(px - s * 1.1, py + s); x.lineTo(px + lean, py - s); x.lineTo(px + s * 1.1, py + s); x.closePath(); x.fillStyle = `rgba(${PAPER},0.9)`; x.fill(); x.fillStyle = ink(0.16); x.fill();
    x.beginPath(); x.moveTo(px + lean, py - s); x.lineTo(px + s * 1.1, py + s); x.lineTo(px + lean * 0.4 + s * 0.12, py + s); x.closePath(); x.fillStyle = ink(0.62); x.fill();
    x.strokeStyle = ink(0.92); x.lineWidth = 1.6; x.beginPath(); x.moveTo(px - s * 1.1, py + s); x.lineTo(px + lean, py - s); x.lineTo(px + s * 1.1, py + s); x.stroke();
    x.strokeStyle = ink(0.45); x.lineWidth = 0.9;
    for (let k = 1; k < 5; k++) { x.beginPath(); x.moveTo(px + lean - k * s * 0.2, py - s + k * s * 0.42); x.lineTo(px + lean - k * s * 0.3, py + s * 0.95); x.stroke(); }
  });
  (m.hills || []).forEach(([hx, hy, hr, n]) => {
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = 12 + r() * hr, px = hx + Math.cos(a) * d, py = hy + Math.sin(a) * d * 0.7, w = 9 + r() * 11;
      x.beginPath(); x.arc(px, py, w, Math.PI, 0); x.fillStyle = ink(0.1); x.fill(); x.strokeStyle = ink(0.75); x.lineWidth = 1.3; x.stroke();
      x.strokeStyle = ink(0.4); x.lineWidth = 0.9;
      for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(px + w * 0.25 + k * 3, py - w * 0.62 + k * 2.4); x.lineTo(px + w * 0.5 + k * 3, py); x.stroke(); }
    }
  });

  // rivers: ink banks, pale water
  rivers.forEach((p) => { x.strokeStyle = ink(0.9); x.lineWidth = 7.5; x.stroke(p); x.strokeStyle = `rgba(${PAPER},0.9)`; x.lineWidth = 4; x.stroke(p); x.strokeStyle = ink(0.3); x.lineWidth = 0.9; x.stroke(p); });

  // firs, back to front, kept clear of water, roads and places
  const trees = [], hit = (p, px, py) => x.isPointInStroke(p, px * 2, py * 2);
  x.lineWidth = 24;
  for (let i = 0; i < 1150; i++) {
    const w = m.woods[Math.floor(r() * m.woods.length)], a = r() * Math.PI * 2, d = Math.sqrt(r());
    const px = w[0] + Math.cos(a) * d * w[2], py = w[1] + Math.sin(a) * d * w[3];
    if (px < 26 || px > 974 || py < 30 || py > 676) continue;
    if (rivers.some((p) => hit(p, px, py)) || roads.some((p) => hit(p, px, py)) || trails.some((p) => hit(p, px, py))) continue;
    if (sea && x.isPointInPath(sea, px * 2, py * 2)) continue;
    if (m.clear.some(([cx, cy]) => Math.hypot(cx - px, cy - py) < 30)) continue;
    if ((m.hills || []).some(([hx, hy, hr]) => Math.hypot(hx - px, (hy - py) / 0.7) < hr)) continue;
    if (px > pk.box[0] && px < pk.box[0] + pk.box[2] && py > pk.box[1] && py < pk.box[1] + pk.box[3]) continue;
    trees.push([px, py, 4.2 + r() * 3.2]);
  }
  trees.sort((a, b) => a[1] - b[1]).forEach(([px, py, s]) => {
    x.fillStyle = ink(0.16); x.beginPath(); x.ellipse(px + s * 0.5, py + s * 0.9, s * 0.9, s * 0.3, 0, 0, Math.PI * 2); x.fill();
    for (let t = 0; t < 2; t++) {
      const top = py - s * (1.5 - t * 0.7), base = py + s * (0.1 + t * 0.7), hw = s * (0.55 + t * 0.2);
      x.beginPath(); x.moveTo(px, top); x.lineTo(px + hw, base); x.lineTo(px - hw, base); x.closePath(); x.fillStyle = ink(0.9); x.fill();
      x.beginPath(); x.moveTo(px, top); x.lineTo(px - hw, base); x.lineTo(px - hw * 0.25, base); x.closePath(); x.fillStyle = `rgba(${PAPER},0.3)`; x.fill();
    }
  });

  // roads and tracks: white dashes over a dark bed
  const way = (p, w, dash) => { x.setLineDash([]); x.strokeStyle = ink(0.6); x.lineWidth = w + 3; x.stroke(p); x.setLineDash(dash); x.strokeStyle = 'rgba(255,248,228,0.95)'; x.lineWidth = w; x.stroke(p); x.setLineDash([]); };
  trails.forEach((p) => way(p, 2.2, [7, 6])); roads.forEach((p) => way(p, 3, [11, 6]));

  m.marks.forEach(([type, px, py]) => glyph(x, type, px, py, type === 'city' ? 1.15 : 1));
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
  g.addColorStop(0, 'rgba(40,24,10,0)'); g.addColorStop(1, 'rgba(40,24,10,0.55)'); x.fillStyle = g; x.fillRect(0, 0, 1000, 700);
  x.restore();
  return (cache[id] = cv);
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
  return pts; // the walked part; its last point is where the pawn stands
}

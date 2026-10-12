/* Ink drawings that are redrawn every frame (battle plates) or once (map, figure). */
import * as Ink from './shared/ink.js';

const INK = '38,28,18', RED = '140,28,18', PAPER = '217,203,166';
const solid = `rgba(${INK},0.94)`;
const poly = (x, pts, fill) => { x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fillStyle = fill; x.fill(); };
const dot = (x, px, py, r, fill) => { x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fillStyle = fill; x.fill(); };
const oval = (x, px, py, rx, ry, fill, rot = 0) => { x.beginPath(); x.ellipse(px, py, rx, ry, rot, 0, Math.PI * 2); x.fillStyle = fill; x.fill(); };
const line = (x, pts, w, stroke) => { x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.lineWidth = w; x.strokeStyle = stroke; x.lineCap = 'round'; x.lineJoin = 'round'; x.stroke(); };
const mir = (pts) => pts.map(([a, b]) => [-a, b]);
const eye = (x, px, py, r) => { x.save(); x.shadowColor = `rgba(${RED},0.9)`; x.shadowBlur = 18; dot(x, px, py, r, `rgba(${RED},1)`); x.restore(); dot(x, px, py, r * 0.4, `rgba(255,190,150,0.9)`); };
const cut = (x, fn) => { x.save(); x.globalCompositeOperation = 'destination-out'; fn(); x.restore(); };

const CREATURES = {
  kraan(x, t) {
    const flap = Math.sin(t * 4) * 0.22, bob = Math.sin(t * 4) * 10;
    x.translate(0, -120 - bob);
    const W = [[0, 0.1], [0.9, 0.75], [1.7, 0.85], [2.5, 0.35], [2.05, 0.05], [1.85, 0.3], [1.45, -0.4], [1.2, 0.05], [0.8, -0.6], [0.5, -0.1], [0.15, -0.55], [0, -0.35]].map(([a, b]) => [a * 165, -b * 165]);
    [-1, 1].forEach((s) => {
      x.save(); x.translate(s * 34, -70); x.scale(s, 1); x.rotate(-0.12 - flap);
      poly(x, W, `rgba(${INK},0.55)`);
      x.translate(-5, 5); poly(x, W, solid);
      const bone = `rgba(${PAPER},0.34)`, wrist = [280, -140];
      line(x, [[0, -16], [148, -124], wrist], 5, bone);
      [[412, -58], [239, 66], [132, 99], [25, 91]].forEach((tip) => line(x, [wrist, tip], 2.5, bone));
      x.restore();
    });
    poly(x, [[-14, 150], [14, 150], [4, 330]], solid);
    oval(x, 0, 40, 52, 128, solid); oval(x, 0, -52, 84, 46, solid);
    [-1, 1].forEach((s) => {
      line(x, [[s * 22, 150], [s * 34, 262]], 9, solid);
      [-24, 0, 24].forEach((d) => line(x, [[s * 34, 262], [s * 34 + d, 300]], 4, solid));
    });
    const hy = -132 + Math.sin(t * 1.7) * 4;
    poly(x, [[-18, hy - 22], [-56, hy - 118], [-2, hy - 30]], solid); poly(x, mir([[-18, hy - 22], [-56, hy - 118], [-2, hy - 30]]), solid);
    oval(x, 0, hy, 34, 40, solid);
    poly(x, [[-15, hy + 10], [15, hy + 10], [7, hy + 86], [-1, hy + 108], [-5, hy + 80]], `rgba(${PAPER},0.85)`);
    line(x, [[-15, hy + 10], [-5, hy + 80], [-1, hy + 108], [7, hy + 86], [15, hy + 10]], 2.5, solid);
    eye(x, -15, hy - 6, 5.5); eye(x, 15, hy - 6, 5.5);
  },
  giak(x, t) {
    const sway = Math.sin(t * 1.3) * 5, breathe = Math.sin(t * 2.2) * 3;
    x.translate(sway, 40);
    line(x, [[128, 270], [150, -300]], 9, solid); poly(x, [[150, -372], [132, -296], [168, -296]], solid);
    poly(x, [[-52, 118], [-14, 118], [-22, 262], [-70, 262]], solid); poly(x, mir([[-52, 118], [-14, 118], [-22, 262], [-70, 262]]), solid);
    poly(x, [[-92, 262], [-16, 262], [-16, 284], [-104, 284]], solid); poly(x, mir([[-92, 262], [-16, 262], [-16, 284], [-104, 284]]), solid);
    poly(x, [[-88, -44 - breathe], [88, -44 - breathe], [104, 60], [76, 134], [-76, 134], [-104, 60]], solid);
    poly(x, [[78, -34], [132, 10], [150, 56], [116, 70], [70, 20]], solid);
    const hy = -104 - breathe;
    poly(x, [[-46, hy - 12], [-132, hy - 58], [-52, hy + 22]], solid); poly(x, mir([[-46, hy - 12], [-132, hy - 58], [-52, hy + 22]]), solid);
    dot(x, 0, hy, 58, solid);
    x.beginPath(); x.arc(0, hy - 10, 64, Math.PI, 0); x.closePath(); x.fillStyle = solid; x.fill();
    poly(x, [[-9, hy - 72], [9, hy - 72], [0, hy - 124]], solid);
    line(x, [[-64, hy - 10], [64, hy - 10]], 3, `rgba(${PAPER},0.4)`);
    cut(x, () => {
      poly(x, [[-40, hy + 2], [-10, hy + 14], [-38, hy + 20]], '#000'); poly(x, mir([[-40, hy + 2], [-10, hy + 14], [-38, hy + 20]]), '#000');
      poly(x, [[-24, hy + 36], [-14, hy + 36], [-19, hy + 54]], '#000'); poly(x, mir([[-24, hy + 36], [-14, hy + 36], [-19, hy + 54]]), '#000');
    });
    eye(x, -26, hy + 12, 3.5); eye(x, 26, hy + 12, 3.5);
    dot(x, -116, 44, 82, solid);
    cut(x, () => { x.beginPath(); x.arc(-116, 44, 62, 0, Math.PI * 2); x.lineWidth = 4; x.strokeStyle = 'rgba(0,0,0,0.7)'; x.stroke(); x.beginPath(); x.arc(-116, 44, 16, 0, Math.PI * 2); x.lineWidth = 3; x.stroke(); });
  },
  vordak(x, t) {
    const bob = Math.sin(t * 1.2) * 9, sw = Math.sin(t * 0.9) * 0.04;
    x.translate(0, -30 + bob); x.rotate(sw);
    for (let i = 0; i < 9; i++) oval(x, (i - 4) * 46, 300 + Math.sin(t + i) * 8, 70, 22, `rgba(${INK},0.06)`);
    line(x, [[168, -26], [222, -292]], 10, solid);
    dot(x, 226, -316, 34, solid);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; poly(x, [[226 + Math.cos(a - 0.22) * 30, -316 + Math.sin(a - 0.22) * 30], [226 + Math.cos(a) * 62, -316 + Math.sin(a) * 62], [226 + Math.cos(a + 0.22) * 30, -316 + Math.sin(a + 0.22) * 30]], solid); }
    const hem = Math.sin(t * 1.6) * 6;
    poly(x, [[-72, -150], [72, -150], [122, 100], [162, 296 + hem], [120, 280], [90, 308 - hem], [50, 284], [10, 312 + hem], [-30, 286], [-70, 310 - hem], [-110, 284], [-152, 300 + hem], [-116, 100]], solid);
    poly(x, [[-70, -132], [-192, -12], [-160, 42], [-58, -40]], solid);
    poly(x, [[70, -132], [178, -62], [162, -2], [58, -40]], solid);
    [[-218, 50], [-230, 26], [-224, 2], [-204, 62]].forEach((f) => line(x, [[-178, 16], f], 5, solid));
    oval(x, 0, -192, 78, 94, solid);
    oval(x, 0, -176, 44, 58, `rgba(10,6,4,0.98)`);
    line(x, [[-20, -150], [-12, -138], [12, -138], [20, -150]], 2, `rgba(${PAPER},0.28)`);
    line(x, [[-4, -176], [0, -164], [4, -176]], 2, `rgba(${PAPER},0.22)`);
    eye(x, -18, -188, 6); eye(x, 18, -188, 6);
    line(x, [[-16, -60], [-30, 260]], 2, `rgba(${PAPER},0.14)`); line(x, [[22, -60], [44, 270]], 2, `rgba(${PAPER},0.14)`);
  },
};

/* the drawn crossed swords (a game-icons.net glyph, 512 square) for foes with no picture, once loaded */
let EMBLEM = null;
export function setEmblem(d) { EMBLEM = new Path2D(d); }
CREATURES.emblem = (x) => {
  if (EMBLEM) {
    // a blot of wash behind, as if the plate were inked over a stain, then the blades in solid ink
    const r = Ink.seeded(7);
    for (let i = 0; i < 26; i++) oval(x, (r() - 0.5) * 260, (r() - 0.5) * 220, 90 + r() * 120, 70 + r() * 110, `rgba(${INK},0.035)`);
    x.save(); x.translate(-235, -235); x.scale(470 / 512, 470 / 512); x.fillStyle = solid; x.fill(EMBLEM); x.restore();
    return;
  }
  // until it loads: crossed blades in a ring
  x.beginPath(); x.arc(0, 0, 250, 0, Math.PI * 2); x.lineWidth = 10; x.strokeStyle = solid; x.stroke();
  x.beginPath(); x.arc(0, 0, 226, 0, Math.PI * 2); x.lineWidth = 2.5; x.stroke();
  [-1, 1].forEach((d) => {
    x.save(); x.rotate(d * 0.72);
    poly(x, [[-13, 150], [13, 150], [11, -170], [0, -212], [-11, -170]], solid);
    poly(x, [[-56, 150], [56, 150], [56, 168], [-56, 168]], solid);
    poly(x, [[-9, 168], [9, 168], [9, 224], [-9, 224]], solid); dot(x, 0, 236, 16, solid);
    x.restore();
  });
};

const bgCache = {}, ART = {};
/* A supplied illustration replaces the drawn creature of that kind. */
export function setArt(kind, img) { ART[kind] = img; }
/* Turn a black-on-white illustration into page ink: sepia line on clear ground, so the picture
   sits in the parchment instead of on it as a white rectangle.
   img.crop, if set, is the part to use, [x, y, w, h] as fractions of the image (a web engraving's
   caption, plate number or ruled frame). Nothing else is cut: what is set by hand is what shows.
   img.levels, if set, is [black, white]: the tones (0-255, after the paper lift) that become full ink
   and bare paper. A painting needs it: its mid-tones would otherwise all turn to solid ink.
   img.flip, if set, mirrors it left to right, after the crop (so a foe faces the hero). */
const inked = new Map();
/* keep: false for a preview that changes as it is dragged (tools/admin/fights.html), so the cache does not fill */
export function inkPlate(img, keep = true) {
  const key = img.src + (img.crop || '') + (img.levels || '') + (img.flip ? 'flip' : '');
  if (keep && inked.has(key)) return inked.get(key);
  const [cx, cy, cw, ch] = (img.crop || [0, 0, 1, 1]).map((f, i) => f * (i % 2 ? img.naturalHeight : img.naturalWidth));
  const S = Math.min(3, 1100 / cw);
  const w = Math.round(cw * S), h = Math.round(ch * S), c = Ink.canvas(w, h), x = c.getContext('2d');
  x.imageSmoothingQuality = 'high';
  if (img.flip) { x.translate(w, 0); x.scale(-1, 1); }
  x.drawImage(img, cx, cy, cw, ch, 0, 0, w, h);
  x.setTransform(1, 0, 0, 1, 0, 0);
  try {
    const d = x.getImageData(0, 0, w, h), p = d.data, A = new Float32Array(w * h);
    // an old scan's paper is grey or yellowed: take its tone (the brightest 5%, so a dark plate with
    // little bare paper is not washed out) as white
    const hist = new Uint32Array(256);
    for (let i = 0; i < p.length; i += 16) hist[Math.round(p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11)]++;
    let paper = 255;
    for (let v = 255, n = 0, all = p.length / 16; v >= 0; v--) if ((n += hist[v]) >= all * 0.05) { paper = v; break; }
    const lift = Math.min(1.6, 245 / Math.max(1, paper));
    for (let i = 0, j = 0; i < p.length; i += 4, j++) {
      const lum = (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) * lift;
      const [lo, hi] = img.levels || [75, 225];
      let a = Math.max(0, Math.min(1, (hi - lum) / (hi - lo))); a = a * a * (3 - 2 * a);
      A[j] = (p[i + 3] / 255) * a;
    }
    // a fine, grey drawing beside the books' solid pen work looks faint: if the middle of its ink is
    // below 80% strength, deepen its greys until it is
    const inkHist = new Uint32Array(101); let inkN = 0;
    for (let j = 0; j < A.length; j += 3) if (A[j] > 0.08) { inkHist[Math.round(A[j] * 100)]++; inkN++; }
    let mid = 1; for (let v = 0, n = 0; v <= 100; v++) if ((n += inkHist[v]) >= inkN / 2) { mid = Math.max(0.05, v / 100); break; }
    const deepen = mid < 0.8 && !img.levels ? Math.log(0.8) / Math.log(mid) : 1; // levels set by hand are left as set
    for (let i = 0, j = 0; i < p.length; i += 4, j++) {
      if (deepen !== 1) A[j] = Math.pow(A[j], deepen);
      p[i] = 46; p[i + 1] = 30; p[i + 2] = 18; p[i + 3] = A[j] * 240;
    }
    x.putImageData(d, 0, 0);
  } catch (e) { /* cross-origin image: leave it as drawn */ }
  // no fade at the edges: the owner wants the picture as drawn
  if (keep) inked.set(key, c);
  return c;
}
/* One still plate for the fight. The canvas fills the whole panel; the controls sit over its foot.
   fx: {lunge, hit, dead, wounds:[{x1,y1,x2,y2,k,spots}]} */
/* floor: where the fight's controls begin, as a fraction of the canvas height (the picture stays above) */
export function drawCreature(cv, kind, scene, t, fx, img, floor = 0.83) {
  const x = cv.getContext('2d'), w = cv.width, h = cv.height, u = w / 900, cy = h * 0.4;
  x.clearRect(0, 0, w, h);
  const art = img || ART[kind];
  if (scene && !art) {
    const key = scene + w + 'x' + h, bg = bgCache[key] || (bgCache[key] = Ink.inkScene(scene, w, h));
    x.globalAlpha = 0.34; x.drawImage(bg, 0, 0); x.globalAlpha = 1;
  }
  x.save();
  x.translate(w / 2 + (Math.random() - 0.5) * fx.hit * 22 * u, cy + fx.dead * 70 * u + (Math.random() - 0.5) * fx.hit * 14 * u);
  x.scale(1 + fx.lunge * 0.1, 1 + fx.lunge * 0.1); x.globalAlpha = 1 - fx.dead;
  if (art) {
    // the whole picture, a little smaller than the panel, centred between the name above and the controls below
    const room = Math.max(0.3, floor - 0.06), pl = inkPlate(art), sc = Math.min((w * 0.94) / pl.width, (h * room) / pl.height);
    x.drawImage(pl, (-pl.width * sc) / 2, -cy + h * 0.03 + (h * room - pl.height * sc) / 2, pl.width * sc, pl.height * sc);
  } else {
    const s = u * (kind === 'kraan' ? 1.05 : 1.2);
    x.save(); x.scale(s, s);
    if (kind !== 'emblem') oval(x, 0, 320, 210, 30, `rgba(${INK},0.16)`);
    (CREATURES[kind] || CREATURES.emblem)(x, t); x.restore();
  }
  // wounds stay on the plate, in red ink
  x.scale(u * 1.2, u * 1.2);
  fx.wounds.forEach((wd) => {
    const k = Math.min(1, wd.k), ex = wd.x1 + (wd.x2 - wd.x1) * k, ey = wd.y1 + (wd.y2 - wd.y1) * k;
    const nx = -(wd.y2 - wd.y1), ny = wd.x2 - wd.x1, nl = Math.hypot(nx, ny) || 1, wv = 7;
    const mx = (wd.x1 + ex) / 2, my = (wd.y1 + ey) / 2;
    poly(x, [[wd.x1, wd.y1], [mx + (nx / nl) * wv, my + (ny / nl) * wv], [ex, ey], [mx - (nx / nl) * wv, my - (ny / nl) * wv]], `rgba(${RED},0.92)`);
    wd.spots.forEach(([sx, sy, sr]) => dot(x, ex + sx * k, ey + sy * k, sr, `rgba(${RED},0.8)`));
  });
  x.restore();
}
export function newWound() {
  const a = Math.random() * Math.PI, len = 120 + Math.random() * 120, cx = (Math.random() - 0.5) * 120, cy = -40 + (Math.random() - 0.5) * 200;
  const spots = []; for (let i = 0; i < 9; i++) spots.push([(Math.random() - 0.3) * 90, (Math.random() - 0.3) * 90, 1.5 + Math.random() * 5]);
  return { x1: cx - Math.cos(a) * len / 2, y1: cy - Math.sin(a) * len / 2, x2: cx + Math.cos(a) * len / 2, y2: cy + Math.sin(a) * len / 2, k: 0, spots };
}

/* ---------- Lone Wolf as a figure standing on the maps ---------- */

/* under the feet, on a 300x460 canvas: a bronze arrowhead pointing down to the spot itself at
   (150, 456), after the map marker in Lone Wolf HD */
function pointer(x) {
  const g = x.createLinearGradient(0, 410, 0, 456); g.addColorStop(0, '#ead08c'); g.addColorStop(0.5, '#a07c3c'); g.addColorStop(1, '#3f2c12');
  x.beginPath(); x.moveTo(150, 456); x.lineTo(120, 412); x.lineTo(138, 417); x.lineTo(150, 431); x.lineTo(162, 417); x.lineTo(180, 412); x.closePath();
  x.fillStyle = g; x.fill(); x.lineJoin = 'round'; x.lineWidth = 2.5; x.strokeStyle = '#120b06'; x.stroke();
  x.beginPath(); x.moveTo(126, 415); x.lineTo(150, 449); x.lineWidth = 1.5; x.strokeStyle = 'rgba(255,240,200,0.6)'; x.stroke();
}

/* Cut a figure out of a picture of it standing on a plain, smoky ground (crop: [x, y, w, h] round
   the figure), tone it to sepia like the maps, and stand it on the pointer. The ground is
   flood-filled in from the crop's edges through pixels that are mid-toned, greyish and close in
   colour to their neighbour; the figure's outline stops the fill. Made at load from the owner's
   own image; never stored. bare: no pointer and no feet, for the inventory's paper doll. */
export function heroFromArt(img, crop, outline, bare = false) {
  const [cx, cy, W, H] = crop, cut = Ink.canvas(W, H), x = cut.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, cx, cy, W, H, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H), p = d.data, N = W * H, bg = new Uint8Array(N), stack = [];
  const ground = (i) => {
    const r = p[i * 4], g = p[i * 4 + 1], b = p[i * 4 + 2], mx = Math.max(r, g, b), l = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
    return l > 0.2 && l < 0.7 && (mx ? (mx - Math.min(r, g, b)) / mx : 0) < 0.35;
  };
  const near = (i, j) => Math.abs(p[i * 4] - p[j * 4]) + Math.abs(p[i * 4 + 1] - p[j * 4 + 1]) + Math.abs(p[i * 4 + 2] - p[j * 4 + 2]) < 24;
  for (let i = 0; i < W; i++) stack.push(i, (H - 1) * W + i);
  for (let i = 0; i < H; i++) stack.push(i * W, i * W + W - 1);
  stack.forEach((i) => { if (ground(i)) bg[i] = 1; });
  while (stack.length) {
    const i = stack.pop();
    if (!bg[i]) continue;
    const px = i % W;
    for (const j of [px > 0 ? i - 1 : -1, px < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < N && !bg[j] && ground(j) && near(i, j)) { bg[j] = 1; stack.push(j); }
  }
  // That fill is cautious, so it leaves ground behind and can stop short, or bite into steel and
  // leather that look like the ground. So model the ground from what it found: a smooth surface
  // per colour channel (least squares over x, y, xy, x², y²), and call figure whatever stands
  // clearly off that surface. Pixels the figure encloses are figure too.
  const terms = (u, v) => [1, u, v, u * v, u * u, v * v];
  const fitSurface = (ch) => {
    const A = Array.from({ length: 6 }, () => new Float64Array(6)), y = new Float64Array(6);
    for (let i = 0; i < N; i += 7) {
      if (!bg[i]) continue;
      const t = terms((i % W) / W, Math.floor(i / W) / H), val = p[i * 4 + ch];
      for (let a = 0; a < 6; a++) { y[a] += t[a] * val; for (let b = 0; b < 6; b++) A[a][b] += t[a] * t[b]; }
    }
    for (let c = 0; c < 6; c++) { // Gauss-Jordan
      let m = c; for (let r = c + 1; r < 6; r++) if (Math.abs(A[r][c]) > Math.abs(A[m][c])) m = r;
      [A[c], A[m]] = [A[m], A[c]]; [y[c], y[m]] = [y[m], y[c]];
      for (let r = 0; r < 6; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let b = c; b < 6; b++) A[r][b] -= f * A[c][b]; y[r] -= f * y[c]; }
    }
    return (u, v) => terms(u, v).reduce((s, t, a) => s + t * (y[a] / A[a][a]), 0);
  };
  const surf = [0, 1, 2].map(fitSurface), off = new Float32Array(N);
  let sum = 0, cnt = 0;
  for (let i = 0; i < N; i++) {
    const u = (i % W) / W, v = Math.floor(i / W) / H;
    off[i] = Math.max(...[0, 1, 2].map((ch) => Math.abs(p[i * 4 + ch] - surf[ch](u, v))));
    if (bg[i]) { sum += off[i]; cnt++; }
  }
  const T = Math.max(16, (sum / (cnt || 1)) * 2.6);
  // the ground is now what reaches the edge through pixels close to the surface
  bg.fill(0);
  const edge = [];
  for (let i = 0; i < W; i++) edge.push(i, (H - 1) * W + i);
  for (let i = 0; i < H; i++) edge.push(i * W, i * W + W - 1);
  edge.forEach((i) => { if (off[i] < T) bg[i] = 1; });
  while (edge.length) {
    const i = edge.pop();
    if (!bg[i]) continue;
    const px = i % W;
    for (const j of [px > 0 ? i - 1 : -1, px < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < N && !bg[j] && off[j] < T) { bg[j] = 1; edge.push(j); }
  }
  // An outline traced by hand round the figure (crop pixels) settles what keying cannot: steel the
  // colour of the smoke. Well inside it is figure; well outside is ground; near it, the keying decides.
  if (outline) {
    const m = Ink.canvas(W, H), mx = m.getContext('2d', { willReadFrequently: true }), path = new Path2D();
    outline.forEach(([a, b], i) => (i ? path.lineTo(a, b) : path.moveTo(a, b))); path.closePath();
    mx.fillStyle = '#f00'; mx.fill(path); mx.lineJoin = 'round';
    mx.strokeStyle = '#0f0'; mx.lineWidth = 10; mx.stroke(path); // band: green over the edge
    const md = mx.getImageData(0, 0, W, H).data;
    for (let i = 0; i < N; i++) {
      const inner = md[i * 4] > 128 && md[i * 4 + 1] < 128, band = md[i * 4 + 1] > 128;
      if (inner) bg[i] = 0; else if (!band) bg[i] = 1;
    }
  }
  // keep only the figure itself, the largest piece left: specks of frame and ground go
  const piece = new Int32Array(N).fill(-1), sizes = [];
  for (let i = 0; i < N; i++) {
    if (bg[i] || piece[i] >= 0) continue;
    const id = sizes.length, q = [i];
    piece[i] = id; let n0 = 0;
    while (q.length) {
      const j = q.pop(), px = j % W; n0++;
      for (const k of [px > 0 ? j - 1 : -1, px < W - 1 ? j + 1 : -1, j - W, j + W]) if (k >= 0 && k < N && !bg[k] && piece[k] < 0) { piece[k] = id; q.push(k); }
    }
    sizes.push(n0);
  }
  const keep = sizes.indexOf(Math.max(...sizes));
  if (!outline) for (let i = 0; i < N; i++) if (!bg[i] && piece[i] !== keep) bg[i] = 1; // a traced outline already bounds it
  // soften the cut by a pixel, and find where the figure stands: between its two feet
  let top = H, bottom = 0, left = W, right = 0;
  for (let i = 0; i < N; i++) {
    const px = i % W, py = (i - px) / W;
    let s = 0, k = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const qx = px + dx, qy = py + dy; if (qx >= 0 && qy >= 0 && qx < W && qy < H) { s += bg[qy * W + qx]; k++; } }
    p[i * 4 + 3] = Math.round(255 * (1 - s / k));
    if (!bg[i]) { top = Math.min(top, py); bottom = Math.max(bottom, py); }
    // sepia: lightness mapped from dark ink to warm paper, kept dark so he stands out on the map
    const v = Math.min(1, ((0.3 * p[i * 4] + 0.59 * p[i * 4 + 1] + 0.11 * p[i * 4 + 2]) / 255) * 1.05);
    p[i * 4] = 24 + 196 * v; p[i * 4 + 1] = 16 + 178 * v; p[i * 4 + 2] = 9 + 136 * v;
  }
  for (let i = (bottom - Math.round((bottom - top) * 0.12)) * W; i < (bottom + 1) * W; i++) if (!bg[i]) { left = Math.min(left, i % W); right = Math.max(right, i % W); }
  x.putImageData(d, 0, 0);

  // bare stops a little above the soles (the lowest tenth of him: boots and feet)
  const fig = Ink.canvas(300, bare ? 376 : 460), f = fig.getContext('2d'), s = 340 / (bottom - top), fx = right >= left ? (left + right) / 2 : W / 2;
  if (!bare) pointer(f);
  f.drawImage(cut, 150 - fx * s, 410 - bottom * s, W * s, H * s);
  return outlined(fig);
}

/* Lone Wolf's likeness at the head of the Kai panel, from an ink drawing of him in the owner's own
   image (crop: [x, y, w, h]). The paper is keyed out, so what is left is ink alone, laid on the
   page's own parchment, and the edges fade into it as a wash does. Scaled up 2x and smoothed:
   the screenshots are small. Made at load; never stored. */
export function portraitFromArt(img, crop, fade = 0.5) {
  const [cx, cy, W, H] = crop, k = 2, c = Ink.canvas(W * k, H * k), x = c.getContext('2d', { willReadFrequently: true });
  x.imageSmoothingQuality = 'high';
  x.drawImage(img, cx, cy, W, H, 0, 0, W * k, H * k);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data, lum = new Float32Array(p.length / 4);
  for (let i = 0; i < lum.length; i++) lum[i] = 0.3 * p[i * 4] + 0.59 * p[i * 4 + 1] + 0.11 * p[i * 4 + 2];
  // the paper is the light end of the picture, the ink its darkest few percent
  const sorted = Float32Array.from(lum).sort(), at = (q) => sorted[Math.floor(q * (sorted.length - 1))];
  const ink = at(0.03), paper = at(0.7);
  for (let i = 0; i < lum.length; i++) {
    const a = Math.max(0, Math.min(1, (paper - lum[i]) / (paper - ink)));
    p[i * 4] = 38; p[i * 4 + 1] = 28; p[i * 4 + 2] = 18; p[i * 4 + 3] = Math.round(255 * Math.pow(a, 0.85));
  }
  x.putImageData(d, 0, 0);
  // a wash fades out at its edges: solid out to `fade` of the way from the middle, then gone at the rim
  x.globalCompositeOperation = 'destination-in';
  x.translate(c.width / 2, c.height / 2); x.scale(c.width / 2, c.height / 2);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, '#000'); g.addColorStop(fade, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(-1, -1, 2, 2);
  return c;
}

/* a white outline round everything drawn on c, as the map's old pawn had */
function outlined(c, r = 4) {
  const white = Ink.canvas(c.width, c.height), w = white.getContext('2d'), out = Ink.canvas(c.width, c.height), o = out.getContext('2d');
  w.drawImage(c, 0, 0); w.globalCompositeOperation = 'source-in'; w.fillStyle = '#fff8e4'; w.fillRect(0, 0, c.width, c.height);
  for (let a = 0; a < 16; a++) o.drawImage(white, Math.cos((a / 16) * Math.PI * 2) * r, Math.sin((a / 16) * Math.PI * 2) * r);
  o.drawImage(c, 0, 0);
  return out;
}

/* ---------- Ornate ink frame for the story page, after the HD book ---------- */
/* A spiral that winds inwards from (cx, cy) + r0 at angle a0, the way an engraver ends a tendril */
function curl(x, cx, cy, r0, a0, turns, dir) {
  x.beginPath();
  for (let i = 0; i <= 48; i++) {
    const t = i / 48, a = a0 + dir * t * turns * Math.PI * 2, r = r0 * (1 - 0.78 * t);
    if (i) x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); else x.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  x.stroke();
}
/* A running vine along a band from x = 0 to len, centred on y = 0 and b high: a wavering stem, a
   tendril curling out of every crest and trough, a leaf beside it and a berry in the hollow. */
function vine(x, len, b, col) {
  const n = Math.max(2, Math.round(len / (b * 1.6))), p = len / n, A = b * 0.15, r0 = b * 0.19;
  x.strokeStyle = col; x.fillStyle = col; x.lineCap = 'round'; x.lineJoin = 'round';
  x.lineWidth = b * 0.1; x.beginPath(); x.moveTo(0, 0);
  for (let i = 0; i < n * 2; i++) x.quadraticCurveTo(((i + 0.5) * p) / 2, (i % 2 ? 1 : -1) * A * 2, ((i + 1) * p) / 2, 0);
  x.stroke();
  for (let i = 0; i < n * 2; i++) {
    const sgn = i % 2 ? 1 : -1, px = ((i + 0.5) * p) / 2, py = sgn * A, cx = px + r0 * 0.35, cy = sgn * (A + r0);
    x.lineWidth = b * 0.085; curl(x, cx, cy, r0, Math.atan2(py - cy, px - cx), 1.15, sgn > 0 ? -1 : 1);
    oval(x, px - p * 0.17, sgn * A * 1.7, b * 0.17, b * 0.065, col, sgn * 0.55);
    dot(x, px + p * 0.25, -sgn * b * 0.24, b * 0.06, col);
  }
}
/* opts.vine: the running vine in the border band (the page); without it, the beaded band of the
   small boxes such as the discipline grid */
export function drawFrame(w = 1000, h = 1480, opts = { vine: true }) {
  const c = Ink.canvas(w, h), x = c.getContext('2d'), col = 'rgba(58,38,24,0.86)', V = opts.vine, B = 40, mid = 8 + 5 + B / 2, T = V ? 92 : 76; // the band lies between the rules; T: the corner tile
  x.strokeStyle = col; x.fillStyle = col; x.lineCap = 'round';
  x.lineWidth = 5; x.strokeRect(8, 8, w - 16, h - 16);
  if (V) {
    x.lineWidth = 2.5; x.strokeRect(57, 57, w - 114, h - 114);
    x.lineWidth = 1; x.strokeRect(64, 64, w - 128, h - 128);
    const e = 8 + T;
    [[e, mid, 0, w - 2 * e], [w - e, h - mid, Math.PI, w - 2 * e], [mid, h - e, -Math.PI / 2, h - 2 * e], [w - mid, e, Math.PI / 2, h - 2 * e]].forEach(([tx, ty, a, len]) => {
      x.save(); x.translate(tx, ty); x.rotate(a); vine(x, len, B, col); x.restore();
    });
  } else {
    x.lineWidth = 1.5; x.strokeRect(31, 31, w - 62, h - 62);
    x.lineWidth = 8; x.setLineDash([3, 8]); x.lineCap = 'butt'; x.strokeRect(19.5, 19.5, w - 39, h - 39); x.setLineDash([]); x.lineCap = 'round';
  }
  x.strokeStyle = col; x.fillStyle = col;
  const flourish = () => {
    x.save(); if (V) x.translate(10, 10);
    x.lineWidth = 4.5; x.beginPath(); x.moveTo(78, 44); x.bezierCurveTo(140, 38, 206, 46, 190, 84); x.bezierCurveTo(181, 104, 150, 98, 157, 76); x.bezierCurveTo(162, 63, 180, 68, 175, 80); x.stroke();
    x.lineWidth = 3; x.beginPath(); x.moveTo(78, 62); x.bezierCurveTo(116, 74, 118, 116, 90, 114); x.bezierCurveTo(76, 112, 78, 96, 90, 98); x.stroke();
    x.beginPath(); x.ellipse(122, 56, 24, 7, 0.25, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.ellipse(214, 50, 16, 4.5, -0.1, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(246, 48, 4, 0, Math.PI * 2); x.fill();
    x.restore();
  };
  // corner bosses: a dark tile with an interlaced quatrefoil cut through it, as the HD corners
  [[8, 8, 1, 1], [w - 8, 8, -1, 1], [8, h - 8, 1, -1], [w - 8, h - 8, -1, -1]].forEach(([tx, ty, sx, sy]) => {
    x.save(); x.translate(tx, ty); x.scale(sx, sy);
    x.clearRect(-2, -2, T + 6, T + 6);
    x.fillRect(0, 0, T, T);
    x.save(); x.scale(T / 76, T / 76); x.globalCompositeOperation = 'destination-out'; x.strokeStyle = '#000'; x.fillStyle = '#000'; x.lineWidth = 2;
    x.strokeRect(6, 6, 64, 64);
    if (V) {
      x.lineWidth = 3.2; [[38, 25], [51, 38], [38, 51], [25, 38]].forEach(([qx, qy]) => { x.beginPath(); x.arc(qx, qy, 12.5, 0, Math.PI * 2); x.stroke(); });
      x.lineWidth = 2.4; x.beginPath(); x.arc(38, 38, 25, 0, Math.PI * 2); x.stroke();
      [[12, 12], [64, 12], [12, 64], [64, 64]].forEach(([qx, qy]) => { x.beginPath(); x.arc(qx, qy, 2.6, 0, Math.PI * 2); x.fill(); });
    } else poly(x, [[38, 10], [66, 38], [38, 66], [10, 38]], '#000');
    x.restore();
    const d = (V ? 7 : 16) * (T / 76), o = T / 2;
    poly(x, [[o, o - d], [o + d, o], [o, o + d], [o - d, o]], col);
    flourish(); x.save(); x.transform(0, 1, 1, 0, 0, 0); flourish(); x.restore();
    x.restore();
  });
  // the middle of each long side: a lozenge in the band with scrolls either way along it
  const lozenge = (tx, ty, a, size) => {
    x.save(); x.translate(tx, ty); x.rotate(a);
    x.clearRect(-size * 2.6, -B / 2 - 1, size * 5.2, B + 2);
    poly(x, [[0, -size], [size * 1.1, 0], [0, size], [-size * 1.1, 0]], col);
    x.save(); x.globalCompositeOperation = 'destination-out'; poly(x, [[0, -size * 0.45], [size * 0.5, 0], [0, size * 0.45], [-size * 0.5, 0]], '#000'); x.restore();
    x.strokeStyle = col; x.lineWidth = 3;
    [-1, 1].forEach((s) => {
      x.beginPath(); x.moveTo(s * size * 1.15, 0); x.bezierCurveTo(s * size * 1.6, -size * 0.9, s * size * 2.4, -size * 0.6, s * size * 2.3, 0); x.stroke();
      curl(x, s * size * 1.95, size * 0.05, size * 0.35, s > 0 ? 0 : Math.PI, 1, s > 0 ? 1 : -1);
    });
    x.restore();
  };
  if (V) { lozenge(mid, h / 2, Math.PI / 2, 17); lozenge(w - mid, h / 2, Math.PI / 2, 17); }
  // the top and bottom: a diamond with leaves swept out either side
  [[w / 2, V ? mid - 9 : 19.5, 1], [w / 2, V ? h - mid + 9 : h - 19.5, -1]].forEach(([tx, ty, sy]) => {
    x.save(); x.translate(tx, ty); x.scale(1, sy);
    x.clearRect(V ? -46 : -30, -14, V ? 92 : 60, V ? B : 28);
    poly(x, [[0, -13], [22, 8], [0, 29], [-22, 8]], col);
    x.save(); x.globalCompositeOperation = 'destination-out'; poly(x, [[0, -2], [10, 8], [0, 18], [-10, 8]], '#000'); x.restore();
    x.strokeStyle = col; x.fillStyle = col;
    [-1, 1].forEach((s) => { x.lineWidth = 3.5; x.beginPath(); x.moveTo(s * 24, 26); x.bezierCurveTo(s * 60, 44, s * 96, 30, s * 84, 46); x.bezierCurveTo(s * 76, 56, s * 64, 48, s * 72, 42); x.stroke(); x.beginPath(); x.ellipse(s * 52, 30, 14, 4, s * 0.2, 0, Math.PI * 2); x.fill(); });
    x.restore();
  });
  return c;
}

/* The ribbon that names the place at the head of the right page, after the HD banners: a pale
   band with scrolled ends. Drawn wide, then used as a border-image so the ends keep their shape
   and only the middle stretches; the crest above its middle is drawn apart (drawCrest) for the
   same reason. */
export function drawBanner(w = 900, h = 120) {
  const c = Ink.canvas(w, h), x = c.getContext('2d'), ink = 'rgba(52,34,20,0.9)', paper = 'rgba(228,214,180,0.8)';
  x.lineCap = 'round'; x.lineJoin = 'round';
  // the band
  const top = 42, bot = 98, l = 104, r = w - 104;
  x.fillStyle = paper; x.strokeStyle = ink; x.lineWidth = 3;
  x.beginPath(); x.moveTo(l, top); x.lineTo(r, top); x.lineTo(r, bot); x.lineTo(l, bot); x.closePath(); x.fill(); x.stroke();
  x.lineWidth = 1; x.strokeRect(l + 4, top + 5, r - l - 8, bot - top - 10);
  // the scrolled ends: the band rolls back on itself round a spindle, its tail curling away
  [-1, 1].forEach((s) => {
    const ex = s < 0 ? l : r, cx = ex + s * 26, cy = (top + bot) / 2;
    x.fillStyle = paper; x.strokeStyle = ink; x.lineWidth = 3;
    x.beginPath(); x.moveTo(ex, top); x.bezierCurveTo(ex + s * 30, top - 4, cx + s * 30, cy - 30, cx + s * 30, cy); x.bezierCurveTo(cx + s * 30, cy + 26, ex + s * 20, bot + 4, ex, bot); x.closePath(); x.fill(); x.stroke();
    x.lineWidth = 2.6; curl(x, cx + s * 6, cy, 20, s > 0 ? Math.PI : 0, 1.4, s > 0 ? 1 : -1);
    x.lineWidth = 2.4; x.beginPath(); x.moveTo(cx + s * 26, cy + 18); x.bezierCurveTo(cx + s * 50, cy + 30, cx + s * 70, cy + 14, cx + s * 66, cy - 2); x.stroke();
    curl(x, cx + s * 60, cy - 2, 7, s > 0 ? 0 : Math.PI, 1, s > 0 ? -1 : 1);
  });
  return c;
}
/* the pointed arch of flourish over the ribbon's middle, with a lozenge at its peak */
export function drawCrest(w = 360, h = 44) {
  const c = Ink.canvas(w, h), x = c.getContext('2d'), ink = 'rgba(52,34,20,0.9)', m = w / 2;
  x.lineCap = 'round'; x.strokeStyle = ink; x.lineWidth = 2.6;
  x.beginPath(); x.moveTo(m - 150, h - 4); x.bezierCurveTo(m - 80, h - 8, m - 30, h - 16, m, 14); x.bezierCurveTo(m + 30, h - 16, m + 80, h - 8, m + 150, h - 4); x.stroke();
  [-1, 1].forEach((s) => curl(x, m + s * 160, h - 11, 8, s > 0 ? Math.PI : 0, 1, s > 0 ? -1 : 1));
  [-1, 1].forEach((s) => oval(x, m + s * 58, h - 13, 13, 3.5, ink, s * -0.2));
  poly(x, [[m, 2], [m + 8, 11], [m, 20], [m - 8, 11]], ink);
  return c;
}

/* ---------- The bronze clockwork at the edge of the table ---------- */
export function gearSVG() {
  const teeth = (n, r0, r1) => { let d = ''; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, s = Math.PI / n; const p = (ang, r) => `${(Math.cos(ang) * r).toFixed(1)} ${(Math.sin(ang) * r).toFixed(1)}`; d += `${i ? 'L' : 'M'}${p(a - s * 0.5, r0)} L${p(a - s * 0.28, r1)} L${p(a + s * 0.28, r1)} L${p(a + s * 0.5, r0)} `; } return d + 'Z'; };
  let rivets = '', swirls = '', spokes = '';
  for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; rivets += `<circle cx="${Math.cos(a) * 415}" cy="${Math.sin(a) * 415}" r="8" fill="url(#gb)" stroke="#1c140a" stroke-width="2"/>`; }
  for (let i = 0; i < 14; i++) swirls += `<path transform="rotate(${i * (360 / 14)})" d="M0 -372 C 40 -372 58 -340 34 -326 C 18 -318 8 -334 20 -342" fill="none" stroke="#c9b884" stroke-width="5" stroke-linecap="round" opacity="0.55"/>`;
  for (let i = 0; i < 6; i++) spokes += `<path transform="rotate(${i * 60})" d="M-16 -120 L-26 -262 L26 -262 L16 -120Z" fill="url(#gb)" stroke="#1c140a" stroke-width="3"/>`;
  return `<defs>
    <radialGradient id="gb" cx="35%" cy="30%" r="90%"><stop offset="0" stop-color="#d9c794"/><stop offset="0.35" stop-color="#8f7c50"/><stop offset="0.75" stop-color="#4a3e28"/><stop offset="1" stop-color="#241b10"/></radialGradient>
    <radialGradient id="gd" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#2a2019"/><stop offset="1" stop-color="#0c0806"/></radialGradient></defs>
    <path d="${teeth(64, 462, 496)}" fill="url(#gb)" stroke="#1c140a" stroke-width="3"/>
    <circle r="464" fill="url(#gb)" stroke="#1c140a" stroke-width="4"/><circle r="392" fill="url(#gd)" stroke="#1c140a" stroke-width="4"/>${rivets}
    <circle r="358" fill="none" stroke="url(#gb)" stroke-width="40"/>${swirls}
    <path d="${teeth(40, 300, 326)}" fill="#5d5034" stroke="#1c140a" stroke-width="3"/><circle r="302" fill="url(#gd)"/>
    <circle r="268" fill="none" stroke="url(#gb)" stroke-width="16"/>${spokes}
    <circle r="126" fill="url(#gb)" stroke="#1c140a" stroke-width="4"/><circle r="84" fill="url(#gd)" stroke="#c9b884" stroke-width="3"/>
    <path d="M0 -60 L14 -14 L60 0 L14 14 L0 60 L-14 14 L-60 0 L-14 -14Z" fill="url(#gb)"/>`;
}

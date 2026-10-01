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

CREATURES.emblem = (x) => {
  // no portrait for this foe: crossed blades in a ring
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
/* Turn a black-on-white illustration into page ink: sepia line on clear ground, edges feathered
   so the picture sinks into the parchment instead of sitting on it as a white rectangle. */
const inked = new Map();
export function inkPlate(img) {
  if (inked.has(img.src)) return inked.get(img.src);
  const S = Math.max(1, Math.min(3, 1100 / img.width)), w = Math.round(img.width * S), h = Math.round(img.height * S);
  const c = Ink.canvas(w, h), x = c.getContext('2d');
  x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, w, h);
  try {
    const d = x.getImageData(0, 0, w, h), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const lum = p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11;
      let a = Math.max(0, Math.min(1, (225 - lum) / 150)); a = a * a * (3 - 2 * a);
      p[i] = 46; p[i + 1] = 30; p[i + 2] = 18; p[i + 3] = (p[i + 3] / 255) * a * 240;
    }
    x.putImageData(d, 0, 0);
  } catch (e) { /* cross-origin image: leave it as drawn */ }
  const m = Ink.canvas(w, h), mx = m.getContext('2d'), r = Ink.seeded(w + h), e = w * 0.07;
  mx.filter = `blur(${Math.round(w * 0.035)}px)`; mx.fillStyle = '#000';
  mx.fillRect(e, e, w - e * 2, h - e * 2);
  for (let i = 0; i < 46; i++) { const side = i % 4, t = r(); mx.beginPath(); mx.arc(side === 0 ? e : side === 1 ? w - e : t * w, side === 2 ? e : side === 3 ? h - e : t * h, e * (0.5 + r() * 0.9), 0, Math.PI * 2); mx.fill(); }
  x.globalCompositeOperation = 'destination-in'; x.drawImage(m, 0, 0);
  inked.set(img.src, c);
  return c;
}

/* One still plate for the fight. The canvas fills the whole panel; the controls sit over its foot.
   fx: {lunge, hit, dead, wounds:[{x1,y1,x2,y2,k,spots}]} */
export function drawCreature(cv, kind, scene, t, fx, img) {
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
    // show most of the picture, top-aligned; what is cropped lies under the controls
    const pl = inkPlate(art), sc = Math.min((w * 0.98) / pl.width, h / (pl.height * 0.8));
    x.drawImage(pl, (-pl.width * sc) / 2, -cy + h * 0.005, pl.width * sc, pl.height * sc);
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

/* ---------- The Kai lord on the Action Chart ---------- */
export function drawFigure(w = 520, h = 820) {
  const c = Ink.canvas(w, h), x = c.getContext('2d');
  oval(x, 260, 770, 190, 26, `rgba(${INK},0.18)`);
  for (let i = 0; i < 40; i++) oval(x, 260 + (Math.random() - 0.5) * 300, 420 + (Math.random() - 0.5) * 500, 60 + Math.random() * 80, 60 + Math.random() * 80, `rgba(${INK},0.012)`);
  poly(x, [[206, 690], [250, 690], [246, 772], [196, 772]], solid); poly(x, [[272, 690], [316, 690], [326, 772], [276, 772]], solid);
  poly(x, [[196, 190], [324, 190], [372, 300], [400, 520], [424, 712], [388, 694], [356, 722], [318, 696], [282, 720], [246, 696], [208, 722], [170, 694], [134, 716], [110, 708], [126, 520], [150, 300]], solid);
  oval(x, 260, 132, 66, 82, solid);
  poly(x, [[206, 170], [314, 170], [338, 236], [182, 236]], solid);
  oval(x, 260, 150, 36, 48, 'rgba(10,6,4,0.98)');
  cut(x, () => { poly(x, [[246, 250], [274, 250], [292, 690], [228, 690]], 'rgba(0,0,0,0.42)'); });
  line(x, [[228, 440], [292, 452]], 7, solid); dot(x, 262, 446, 9, `rgba(${PAPER},0.5)`);
  line(x, [[330, 430], [392, 700]], 8, solid); line(x, [[312, 442], [352, 424]], 8, solid); dot(x, 322, 410, 8, solid);
  line(x, [[176, 300], [156, 560]], 2, `rgba(${PAPER},0.16)`); line(x, [[346, 300], [372, 580]], 2, `rgba(${PAPER},0.16)`);
  x.globalCompositeOperation = 'source-atop'; x.strokeStyle = `rgba(${PAPER},0.12)`; x.lineWidth = 1.2;
  for (let i = -h; i < w; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + h, h); x.stroke(); }
  return c;
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
   own image; never stored. */
export function heroFromArt(img, crop, outline) {
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

  const fig = Ink.canvas(300, 460), f = fig.getContext('2d'), s = 340 / (bottom - top), fx = right >= left ? (left + right) / 2 : W / 2;
  pointer(f);
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

/* Without the owner's picture: a painted stand-in. Light from the upper left; every shape gets a
   gradient, an ink outline and a rim of light. */
export function drawHero(w = 300, h = 460) {
  const c = Ink.canvas(w, h), x = c.getContext('2d'), OUT = '#120b06';
  const shape = (pts, fill) => {
    x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      if (p.length === 4) x.quadraticCurveTo(p[0], p[1], p[2], p[3]); else x.lineTo(p[0], p[1]);
    }
    x.closePath(); x.fillStyle = fill; x.fill(); x.lineJoin = 'round'; x.lineWidth = 3; x.strokeStyle = OUT; x.stroke();
  };
  const grad = (x0, y0, x1, y1, stops) => { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
  const stroke = (pts, wid, col) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) { const p = pts[i]; if (p.length === 4) x.quadraticCurveTo(p[0], p[1], p[2], p[3]); else x.lineTo(p[0], p[1]); } x.lineWidth = wid; x.strokeStyle = col; x.lineCap = 'round'; x.stroke(); };

  pointer(x);

  // cloak behind, falling to a ragged hem
  shape([[104, 160], [66, 230, 58, 330], [50, 392], [80, 398, 96, 392], [120, 402, 150, 398], [182, 404, 204, 394], [226, 400, 248, 392], [246, 300, 234, 236], [214, 170, 196, 160]],
    grad(50, 0, 250, 0, [[0, '#4f7556'], [0.45, '#2e4a35'], [1, '#14231a']]));
  // boots
  shape([[124, 352], [146, 352], [148, 398], [116, 400], [118, 384]], grad(116, 0, 150, 0, [[0, '#6b4a2c'], [1, '#2c1c0e']]));
  shape([[158, 352], [180, 352], [186, 384], [190, 398], [156, 398]], grad(156, 0, 190, 0, [[0, '#5a3d22'], [1, '#22150a']]));
  // tunic and belt
  shape([[124, 176], [176, 176], [186, 356], [116, 356]], grad(116, 0, 186, 0, [[0, '#7a6040'], [0.5, '#56412a'], [1, '#2e2216']]));
  stroke([[132, 200], [128, 340]], 2, 'rgba(255,230,190,0.18)');
  shape([[118, 254], [182, 254], [183, 268], [117, 268]], '#2a1a0c');
  shape([[143, 252], [157, 252], [157, 270], [143, 270]], grad(143, 252, 157, 270, [[0, '#f0d58c'], [1, '#8a6a2a']]));
  // cloak front flaps
  shape([[104, 160], [130, 176], [124, 290, 112, 396], [80, 398], [80, 300, 92, 230]], grad(80, 0, 130, 0, [[0, '#5d8763'], [1, '#2c4632']]));
  shape([[196, 160], [172, 176], [178, 290, 194, 394], [232, 394], [226, 290, 214, 220]], grad(172, 0, 232, 0, [[0, '#2f4b36'], [1, '#15241a']]));
  stroke([[96, 240], [88, 320, 90, 380]], 2, 'rgba(10,20,12,0.55)'); stroke([[208, 230], [214, 320, 218, 380]], 2, 'rgba(6,12,8,0.6)');
  stroke([[100, 176], [84, 260, 84, 380]], 2.5, 'rgba(220,240,200,0.28)');
  // sword arm: sleeve, hand, and the blade held point-down
  shape([[104, 168], [120, 186], [114, 248, 104, 290], [86, 288], [88, 230, 92, 190]], grad(86, 0, 120, 0, [[0, '#5d8763'], [1, '#2a4430']]));
  shape([[57, 392], [92, 302], [100, 305], [63, 395]], grad(57, 0, 100, 0, [[0, '#f4f2ea'], [0.5, '#a9adb2'], [1, '#55595f']]));
  shape([[78, 296], [112, 306], [110, 313], [76, 303]], grad(76, 296, 112, 313, [[0, '#f0d58c'], [1, '#7a5a20']]));
  x.beginPath(); x.ellipse(96, 293, 9, 8, 0.3, 0, Math.PI * 2); x.fillStyle = '#c99a72'; x.fill(); x.lineWidth = 2.5; x.strokeStyle = OUT; x.stroke();
  shape([[98, 270], [104, 272], [101, 288], [95, 286]], '#3a2410');
  x.beginPath(); x.arc(102, 266, 5, 0, Math.PI * 2); x.fillStyle = '#d9b868'; x.fill(); x.lineWidth = 2; x.strokeStyle = OUT; x.stroke();
  // mantle over the shoulders
  shape([[100, 150], [150, 178, 200, 150], [210, 184], [150, 214, 92, 186]], grad(92, 0, 210, 0, [[0, '#6b956f'], [0.5, '#3c5e43'], [1, '#1b2e21']]));
  x.beginPath(); x.arc(150, 196, 7, 0, Math.PI * 2); x.fillStyle = '#d9b868'; x.fill(); x.lineWidth = 2; x.strokeStyle = OUT; x.stroke();
  // hood, the face in its shadow
  shape([[150, 58], [192, 82, 200, 140], [194, 172], [150, 186, 106, 172], [100, 140], [108, 82, 150, 58]], grad(100, 60, 200, 180, [[0, '#71a076'], [0.5, '#3a5c41'], [1, '#17271c']]));
  x.beginPath(); x.ellipse(152, 132, 22, 30, 0, 0, Math.PI * 2); x.fillStyle = '#0d0805'; x.fill();
  const face = x.createLinearGradient(0, 112, 0, 160); face.addColorStop(0, 'rgba(120,80,56,0)'); face.addColorStop(0.45, '#8a6248'); face.addColorStop(1, '#c4946c');
  x.beginPath(); x.ellipse(153, 142, 15, 18, 0, 0, Math.PI * 2); x.fillStyle = face; x.fill();
  stroke([[146, 152], [153, 155], [160, 152]], 1.5, 'rgba(40,20,10,0.7)');
  stroke([[116, 96], [106, 130, 110, 160]], 3, 'rgba(225,245,210,0.35)');
  stroke([[150, 64], [150, 100]], 1.5, 'rgba(10,20,12,0.4)');

  // a little grain over the paint
  x.globalCompositeOperation = 'source-atop';
  const r = Ink.seeded(77);
  for (let i = 0; i < 900; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,240,210,0.05)' : 'rgba(0,0,0,0.07)'; x.fillRect(r() * w, r() * h, 2, 2); }
  return outlined(c);
}

/* ---------- Ornate ink frame for the story page ---------- */
export function drawFrame(w = 1000, h = 1480) {
  const c = Ink.canvas(w, h), x = c.getContext('2d'), col = 'rgba(58,38,24,0.86)';
  x.strokeStyle = col; x.fillStyle = col; x.lineCap = 'round';
  x.lineWidth = 5; x.strokeRect(8, 8, w - 16, h - 16);
  x.lineWidth = 1.5; x.strokeRect(31, 31, w - 62, h - 62);
  x.lineWidth = 8; x.setLineDash([3, 8]); x.lineCap = 'butt'; x.strokeRect(19.5, 19.5, w - 39, h - 39); x.setLineDash([]); x.lineCap = 'round';
  const flourish = () => {
    x.lineWidth = 4.5; x.beginPath(); x.moveTo(78, 44); x.bezierCurveTo(140, 38, 206, 46, 190, 84); x.bezierCurveTo(181, 104, 150, 98, 157, 76); x.bezierCurveTo(162, 63, 180, 68, 175, 80); x.stroke();
    x.lineWidth = 3; x.beginPath(); x.moveTo(78, 62); x.bezierCurveTo(116, 74, 118, 116, 90, 114); x.bezierCurveTo(76, 112, 78, 96, 90, 98); x.stroke();
    x.beginPath(); x.ellipse(122, 56, 24, 7, 0.25, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.ellipse(214, 50, 16, 4.5, -0.1, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(246, 48, 4, 0, Math.PI * 2); x.fill();
  };
  [[8, 8, 1, 1], [w - 8, 8, -1, 1], [8, h - 8, 1, -1], [w - 8, h - 8, -1, -1]].forEach(([tx, ty, sx, sy]) => {
    x.save(); x.translate(tx, ty); x.scale(sx, sy);
    x.clearRect(-2, -2, 80, 80);
    x.fillRect(0, 0, 76, 76);
    x.globalCompositeOperation = 'destination-out'; poly(x, [[38, 10], [66, 38], [38, 66], [10, 38]], '#000'); x.globalCompositeOperation = 'source-over';
    poly(x, [[38, 22], [54, 38], [38, 54], [22, 38]], col); x.strokeStyle = col;
    flourish(); x.save(); x.transform(0, 1, 1, 0, 0, 0); flourish(); x.restore();
    x.restore();
  });
  [[w / 2, 19.5, 1], [w / 2, h - 19.5, -1]].forEach(([tx, ty, sy]) => {
    x.save(); x.translate(tx, ty); x.scale(1, sy);
    x.clearRect(-30, -14, 60, 28);
    poly(x, [[0, -13], [22, 8], [0, 29], [-22, 8]], col);
    x.globalCompositeOperation = 'destination-out'; poly(x, [[0, -2], [10, 8], [0, 18], [-10, 8]], '#000'); x.globalCompositeOperation = 'source-over';
    [-1, 1].forEach((s) => { x.lineWidth = 3.5; x.beginPath(); x.moveTo(s * 24, 26); x.bezierCurveTo(s * 60, 44, s * 96, 30, s * 84, 46); x.bezierCurveTo(s * 76, 56, s * 64, 48, s * 72, 42); x.stroke(); x.beginPath(); x.ellipse(s * 52, 30, 14, 4, s * 0.2, 0, Math.PI * 2); x.fill(); });
    x.restore();
  });
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

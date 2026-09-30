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

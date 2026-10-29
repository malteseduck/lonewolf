/* Canvas-drawn materials: parchment, wood, leather, ground, and the ink-wash plates. */

export function seeded(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
const INK = '38,28,18', RED = '132,30,20';

/* A picture on white paper (RGBA bytes, changed in place) turned to ink on clear: each pixel as
   clear as it is light, so on the page's paper grey ink looks as mix-blend-mode: multiply showed it.
   iPad browsers (WebKit) do not blend inside the scrolling text, which left the white showing. */
export function clearPaper(d) {
  for (let k = 0; k < d.length; k += 4) {
    const a = 1 - Math.min(d[k], d[k + 1], d[k + 2]) / 255;
    if (a === 0) { d[k + 3] = 0; continue; }
    for (let i = 0; i < 3; i++) d[k + i] = (d[k + i] - (1 - a) * 255) / a;
    d[k + 3] *= a;
  }
}

/* plain = a loose sheet (burnt on all four sides) instead of a bound page with a gutter */
export function parchment(w, h, mirror, plain) {
  const c = canvas(w, h), x = c.getContext('2d'), r = seeded(3);
  x.fillStyle = '#d9cba6'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) {
    const cx = r() * w, cy = r() * h, rad = 60 + r() * 260;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, r() < 0.55 ? 'rgba(120,88,48,0.05)' : 'rgba(255,246,222,0.06)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
  x.lineWidth = 1;
  for (let i = 0; i < 1100; i++) {
    const px = r() * w, py = r() * h, a = r() * Math.PI, l = 6 + r() * 22;
    x.strokeStyle = `rgba(90,68,38,${0.03 + r() * 0.05})`;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  for (let i = 0; i < 5; i++) {
    x.strokeStyle = 'rgba(110,78,38,0.06)'; x.lineWidth = 3 + r() * 6;
    x.beginPath(); x.ellipse(r() * w, r() * h, 40 + r() * 90, 30 + r() * 70, r() * 3, 0, Math.PI * 2); x.stroke();
  }
  const edge = (x0, y0, x1, y1, col) => {
    const g = x.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  };
  if (plain) { edge(0, 0, 150, 0, 'rgba(60,38,16,0.42)'); edge(w, 0, w - 150, 0, 'rgba(60,38,16,0.42)'); edge(0, 0, 0, 150, 'rgba(60,38,16,0.42)'); edge(0, h, 0, h - 150, 'rgba(60,38,16,0.42)'); return c; }
  edge(0, 0, 190, 0, 'rgba(36,24,12,0.62)'); // gutter
  edge(w, 0, w - 130, 0, 'rgba(96,68,34,0.28)');
  edge(0, 0, 0, 110, 'rgba(96,68,34,0.22)');
  edge(0, h, 0, h - 110, 'rgba(96,68,34,0.22)');
  if (!mirror) return c;
  const m = canvas(w, h), mx = m.getContext('2d');
  mx.translate(w, 0); mx.scale(-1, 1); mx.drawImage(c, 0, 0);
  return m;
}

export function wood(size = 1024) {
  const c = canvas(size, size), x = c.getContext('2d'), r = seeded(21);
  x.fillStyle = '#23150c'; x.fillRect(0, 0, size, size);
  const planks = 6, ph = size / planks;
  for (let p = 0; p < planks; p++) {
    const y0 = p * ph;
    x.fillStyle = `rgba(${r() < 0.5 ? '70,42,20' : '10,6,3'},${0.1 + r() * 0.18})`; x.fillRect(0, y0, size, ph);
    for (let i = 0; i < 70; i++) {
      const y = y0 + r() * ph, f = 0.004 + r() * 0.01, a = 2 + r() * 7, o = r() * 6;
      x.strokeStyle = r() < 0.7 ? `rgba(0,0,0,${0.08 + r() * 0.14})` : `rgba(200,140,80,${0.03 + r() * 0.04})`;
      x.lineWidth = 0.6 + r() * 1.6;
      x.beginPath();
      for (let px = 0; px <= size; px += 32) { const py = y + Math.sin(px * f + o) * a; px ? x.lineTo(px, py) : x.moveTo(px, py); }
      x.stroke();
    }
    x.fillStyle = 'rgba(0,0,0,0.75)'; x.fillRect(0, y0, size, 3);
  }
  return c;
}

export function leather(size = 512) {
  const c = canvas(size, size), x = c.getContext('2d'), r = seeded(8);
  x.fillStyle = '#34130f'; x.fillRect(0, 0, size, size);
  for (let i = 0; i < 9000; i++) {
    x.fillStyle = r() < 0.6 ? `rgba(0,0,0,${0.1 + r() * 0.2})` : `rgba(230,170,140,${0.03 + r() * 0.05})`;
    x.fillRect(r() * size, r() * size, 1 + r() * 2, 1 + r() * 2);
  }
  return c;
}

export function ground(size = 512, tint = '22,20,15') {
  const c = canvas(size, size), x = c.getContext('2d'), r = seeded(40);
  x.fillStyle = `rgb(${tint})`; x.fillRect(0, 0, size, size);
  for (let i = 0; i < 5000; i++) {
    x.fillStyle = r() < 0.6 ? `rgba(0,0,0,${0.15 + r() * 0.3})` : `rgba(120,100,70,${0.04 + r() * 0.08})`;
    x.beginPath(); x.ellipse(r() * size, r() * size, 1 + r() * 5, 1 + r() * 2.5, r() * 3, 0, Math.PI * 2); x.fill();
  }
  return c;
}

export function glow(size = 128, inner = 'rgba(255,255,255,1)') {
  const c = canvas(size, size), x = c.getContext('2d');
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner); g.addColorStop(0.35, 'rgba(255,190,110,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  return c;
}

/* ---------- Ink-wash plates ---------- */
function ridge(x, r, w, h, baseY, amp, alpha) {
  const ph = [r() * 6, r() * 6, r() * 6];
  x.beginPath(); x.moveTo(0, h);
  for (let i = 0; i <= w; i += 8) {
    x.lineTo(i, baseY + Math.sin(i * 0.006 + ph[0]) * amp + Math.sin(i * 0.017 + ph[1]) * amp * 0.45 + Math.sin(i * 0.043 + ph[2]) * amp * 0.18);
  }
  x.lineTo(w, h); x.closePath();
  x.fillStyle = `rgba(${INK},${alpha})`; x.fill();
}
const poly = (x, w, h, pts, fill) => {
  x.beginPath();
  pts.forEach(([px, py], i) => (i ? x.lineTo(px * w, py * h) : x.moveTo(px * w, py * h)));
  x.closePath(); x.fillStyle = fill; x.fill();
};
const dot = (x, px, py, rad, fill) => { x.beginPath(); x.arc(px, py, rad, 0, Math.PI * 2); x.fillStyle = fill; x.fill(); };
const smoke = (x, r, sx, sy, n, drift) => {
  for (let i = 0; i < n; i++) dot(x, sx + i * drift + (r() - 0.5) * (20 + i), sy - i * 3.4, 14 + i * 1.1, `rgba(${INK},0.04)`);
};
const strokes = (x, r, w, y0, y1, n) => {
  for (let i = 0; i < n; i++) {
    const px = r() * w, py = y0 + r() * (y1 - y0), l = 30 + r() * 160;
    x.strokeStyle = `rgba(${INK},${0.12 + r() * 0.22})`; x.lineWidth = 1.5 + r() * 3;
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + l / 2, py + (r() - 0.5) * 6, px + l, py); x.stroke();
  }
};
const solid = `rgba(${INK},0.93)`;

const PLATES = {
  ruins(x, r, w, h) {
    ridge(x, r, w, h, h * 0.62, 30, 0.16); ridge(x, r, w, h, h * 0.72, 20, 0.28);
    smoke(x, r, w * 0.3, h * 0.34, 95, 2.4); smoke(x, r, w * 0.67, h * 0.22, 70, 3);
    poly(x, w, h, [[0.24, 0.82], [0.24, 0.34], [0.27, 0.3], [0.29, 0.37], [0.31, 0.31], [0.33, 0.4], [0.36, 0.36], [0.36, 0.82]], solid);
    poly(x, w, h, [[0.36, 0.82], [0.36, 0.58], [0.42, 0.55], [0.47, 0.63], [0.52, 0.56], [0.58, 0.6], [0.62, 0.82]], solid);
    poly(x, w, h, [[0.62, 0.82], [0.62, 0.26], [0.64, 0.2], [0.66, 0.27], [0.68, 0.18], [0.7, 0.24], [0.72, 0.22], [0.72, 0.82]], solid);
    x.globalCompositeOperation = 'destination-out';
    [[0.295, 0.5], [0.665, 0.4], [0.665, 0.56], [0.45, 0.68]].forEach(([px, py]) => { x.fillStyle = 'rgba(0,0,0,0.85)'; x.fillRect(px * w - 7, py * h, 14, 30); dot(x, px * w, py * h, 7, 'rgba(0,0,0,0.85)'); });
    x.globalCompositeOperation = 'source-over';
    ridge(x, r, w, h, h * 0.85, 10, 0.95);
    for (let i = 0; i < 40; i++) dot(x, w * (0.22 + r() * 0.52), h * (0.15 + r() * 0.5), 1 + r() * 2.2, `rgba(${RED},${0.4 + r() * 0.5})`);
  },
  forest(x, r, w, h) {
    ridge(x, r, w, h, h * 0.5, 40, 0.1);
    const trunk = (px, tw, a, lean) => poly(x, w, h, [[px - tw / 2, 1], [px - tw * 0.35 + lean, 0], [px + tw * 0.35 + lean, 0], [px + tw / 2, 1]], `rgba(${INK},${a})`);
    for (let i = 0; i < 11; i++) trunk(r(), 0.012 + r() * 0.012, 0.2, (r() - 0.5) * 0.03);
    for (let i = 0; i < 7; i++) trunk(0.05 + i * 0.14 + r() * 0.05, 0.025 + r() * 0.02, 0.5, (r() - 0.5) * 0.05);
    [0.1, 0.34, 0.8, 0.95].forEach((px) => {
      const tw = 0.06 + r() * 0.05; trunk(px, tw, 0.94, (r() - 0.5) * 0.05);
      for (let b = 0; b < 3; b++) {
        const by = h * (0.15 + r() * 0.4), dir = r() < 0.5 ? -1 : 1;
        x.strokeStyle = solid; x.lineWidth = 3 + r() * 5;
        x.beginPath(); x.moveTo(px * w, by); x.quadraticCurveTo(px * w + dir * 60, by - 50, px * w + dir * (90 + r() * 80), by - 60 - r() * 60); x.stroke();
      }
    });
    poly(x, w, h, [[0.47, 0.2], [0.53, 0.16], [0.56, 0.21], [0.575, 0.19], [0.59, 0.21], [0.62, 0.16], [0.68, 0.2], [0.62, 0.195], [0.585, 0.24], [0.565, 0.24], [0.53, 0.195]], `rgba(${INK},0.8)`);
    ridge(x, r, w, h, h * 0.9, 9, 0.96);
  },
  hill(x, r, w, h) {
    ridge(x, r, w, h, h * 0.55, 50, 0.13); ridge(x, r, w, h, h * 0.66, 34, 0.26);
    smoke(x, r, w * 0.16, h * 0.5, 80, 1.2);
    x.beginPath(); x.moveTo(0, h); x.lineTo(0, h * 0.92); x.quadraticCurveTo(w * 0.5, h * 0.7, w, h * 0.74); x.lineTo(w, h); x.closePath(); x.fillStyle = solid; x.fill();
    x.strokeStyle = solid; x.lineWidth = 11; x.beginPath(); x.moveTo(w * 0.72, h * 0.77); x.quadraticCurveTo(w * 0.71, h * 0.6, w * 0.735, h * 0.44); x.stroke();
    for (let i = 0; i < 46; i++) dot(x, w * 0.735 + (r() - 0.5) * 170, h * 0.38 + (r() - 0.5) * 120, 16 + r() * 26, `rgba(${INK},0.42)`);
    poly(x, w, h, [[0.43, 0.815], [0.445, 0.735], [0.46, 0.81]], solid); dot(x, w * 0.445, h * 0.73, 6, solid);
  },
  river(x, r, w, h) {
    ridge(x, r, w, h, h * 0.42, 14, 0.34);
    for (let i = 0; i < 46; i++) dot(x, r() * w, h * (0.36 + r() * 0.06), 12 + r() * 20, `rgba(${INK},0.3)`);
    strokes(x, r, w, h * 0.5, h * 0.9, 80);
    x.beginPath(); x.moveTo(0, h); x.lineTo(0, h * 0.72); x.quadraticCurveTo(w * 0.3, h * 0.78, w * 0.55, h); x.closePath(); x.fillStyle = solid; x.fill();
    for (let i = 0; i < 30; i++) {
      const px = r() * w * 0.42, py = h * (0.78 + r() * 0.12);
      x.strokeStyle = solid; x.lineWidth = 1.5 + r() * 2.5;
      x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 6, py - 60, px + (r() - 0.3) * 40, py - 90 - r() * 80); x.stroke();
    }
    [[0.6, 0.47], [0.66, 0.475]].forEach(([px, py]) => { poly(x, w, h, [[px - 0.018, py + 0.05], [px, py - 0.02], [px + 0.018, py + 0.05]], solid); dot(x, px * w, (py - 0.03) * h, 7, solid); x.strokeStyle = solid; x.lineWidth = 2; x.beginPath(); x.moveTo((px + 0.022) * w, (py + 0.05) * h); x.lineTo((px + 0.022) * w, (py - 0.1) * h); x.stroke(); });
  },
  road(x, r, w, h) {
    ridge(x, r, w, h, h * 0.44, 30, 0.14); ridge(x, r, w, h, h * 0.54, 8, 0.2);
    x.strokeStyle = `rgba(${INK},0.6)`; x.lineWidth = 5;
    x.beginPath(); x.moveTo(w * 0.2, h); x.quadraticCurveTo(w * 0.42, h * 0.7, w * 0.5, h * 0.55); x.stroke();
    x.beginPath(); x.moveTo(w * 0.78, h); x.quadraticCurveTo(w * 0.6, h * 0.7, w * 0.53, h * 0.55); x.stroke();
    strokes(x, r, w * 0.2, h * 0.66, h * 0.98, 14);
    x.save(); x.translate(w * 0.8, 0); strokes(x, r, w * 0.2, h * 0.66, h * 0.98, 14); x.restore();
    x.fillStyle = solid; x.fillRect(w * 0.7, h * 0.56, 58, 92); dot(x, w * 0.7 + 29, h * 0.56, 29, solid);
    dot(x, w * 0.665, h * 0.6, 13, solid);
    poly(x, w, h, [[0.64, 0.7], [0.655, 0.615], [0.69, 0.62], [0.7, 0.7], [0.62, 0.71], [0.58, 0.7]], solid);
  },
  night(x, r, w, h) {
    x.fillStyle = `rgba(${INK},0.8)`; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'destination-out';
    dot(x, w * 0.72, h * 0.24, 46, 'rgba(0,0,0,0.92)');
    for (let i = 0; i < 90; i++) dot(x, r() * w, r() * h * 0.6, 0.8 + r() * 1.6, `rgba(0,0,0,${0.4 + r() * 0.5})`);
    x.globalCompositeOperation = 'source-over';
    dot(x, w * 0.745, h * 0.225, 40, `rgba(${INK},0.8)`);
    ridge(x, r, w, h, h * 0.7, 30, 0.5);
    for (let i = 0; i < 13; i++) { const px = r(), th = 0.16 + r() * 0.22; poly(x, w, h, [[px - 0.035, 0.9], [px, 0.9 - th], [px + 0.035, 0.9]], 'rgba(20,14,8,0.96)'); }
    ridge(x, r, w, h, h * 0.9, 8, 1);
  },
  bridge(x, r, w, h) {
    ridge(x, r, w, h, h * 0.4, 30, 0.14);
    strokes(x, r, w, h * 0.64, h * 0.97, 70);
    x.fillStyle = solid; x.fillRect(0, h * 0.42, w, h * 0.2);
    for (let i = 0; i < 30; i++) x.fillRect(i * (w / 30), h * 0.4, w / 60, h * 0.03);
    x.globalCompositeOperation = 'destination-out';
    [0.08, 0.36, 0.64, 0.92].forEach((px) => { x.beginPath(); x.ellipse(px * w, h * 0.625, w * 0.105, h * 0.115, 0, Math.PI, 0); x.fillStyle = '#000'; x.fill(); });
    x.globalCompositeOperation = 'source-over';
    [0.22, 0.5, 0.78].forEach((px) => { x.fillStyle = solid; x.fillRect(px * w - w * 0.035, h * 0.6, w * 0.07, h * 0.24); });
    x.fillStyle = solid; x.fillRect(w * 0.85, h * 0.2, w * 0.1, h * 0.25);
    poly(x, w, h, [[0.84, 0.2], [0.9, 0.1], [0.96, 0.2]], solid);
    poly(x, w, h, [[0.43, 0.42], [0.45, 0.31], [0.47, 0.42]], solid); dot(x, w * 0.45, h * 0.31, 9, solid);
    dot(x, w * 0.447, h * 0.31, 1.8, `rgba(${RED},1)`); dot(x, w * 0.455, h * 0.31, 1.8, `rgba(${RED},1)`);
  },
  city(x, r, w, h) {
    ridge(x, r, w, h, h * 0.5, 25, 0.14);
    x.fillStyle = `rgba(${INK},0.5)`; x.fillRect(w * 0.08, h * 0.5, w * 0.84, h * 0.24);
    for (let i = 0; i < 42; i++) x.fillRect(w * 0.08 + i * (w * 0.02), h * 0.48, w * 0.01, h * 0.025);
    [[0.12, 0.34], [0.34, 0.3], [0.64, 0.3], [0.86, 0.34]].forEach(([px, top]) => {
      x.fillStyle = `rgba(${INK},0.78)`; x.fillRect(px * w - 26, top * h, 52, (0.74 - top) * h);
      poly(x, w, h, [[px - 0.035, top], [px, top - 0.09], [px + 0.035, top]], solid);
      poly(x, w, h, [[px, top - 0.09], [px, top - 0.16], [px + 0.05, top - 0.135], [px + 0.003, top - 0.115]], `rgba(${RED},0.9)`);
    });
    x.fillStyle = solid; x.fillRect(w * 0.47, h * 0.18, 60, h * 0.4); poly(x, w, h, [[0.46, 0.18], [0.5, 0.04], [0.545, 0.18]], solid);
    x.fillRect(w * 0.47, h * 0.62, 60, h * 0.12); dot(x, w * 0.47 + 30, h * 0.62, 30, solid);
    ridge(x, r, w, h, h * 0.84, 10, 0.92);
  },
};

export function inkScene(name, w, h) {
  const c = canvas(w, h), x = c.getContext('2d'), r = seeded(hash(name));
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, `rgba(${INK},0.2)`); g.addColorStop(0.6, `rgba(${INK},0.04)`);
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  (PLATES[name] || PLATES.forest)(x, r, w, h);
  // hatching bites only into what is already painted
  x.globalCompositeOperation = 'source-atop';
  x.strokeStyle = 'rgba(217,203,166,0.16)'; x.lineWidth = 1.2;
  for (let i = -h; i < w; i += 7) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + h, h); x.stroke(); }
  x.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 60; i++) dot(x, r() * w, r() * h, 0.6 + r() * 2.4, `rgba(${INK},${0.2 + r() * 0.5})`);
  // soft irregular border so the plate bleeds into the page
  const m = canvas(w, h), mx = m.getContext('2d');
  mx.filter = 'blur(22px)'; mx.fillStyle = '#000';
  mx.fillRect(46, 46, w - 92, h - 92);
  for (let i = 0; i < 40; i++) { mx.beginPath(); const e = i % 4, t = r(); mx.arc(e === 0 ? 40 : e === 1 ? w - 40 : t * w, e === 2 ? 40 : e === 3 ? h - 40 : t * h, 20 + r() * 40, 0, Math.PI * 2); mx.fill(); }
  x.globalCompositeOperation = 'destination-in'; x.drawImage(m, 0, 0);
  return c;
}

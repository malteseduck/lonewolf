/* Reading a printed map. The printed map is only ~1000 px wide, so zooming into it blurs. Instead
   it is read once, on the owner's machine, for its geography: which pixels are land, mountains,
   forest (analyse). That becomes smooth vector outlines and terrain grids in the map's own pixel
   space, painted at any zoom by maps.js. trace() redraws the printed map itself as vector tones;
   it was tried for the replica and looked worse, and is kept for that comparison. Nothing derived
   from the image is stored. */

/* each pixel of the printed map sorted into a terrain class by its colour */
const C = { none: 0, ink: 1, pale: 2, water: 3, plain: 4, forest: 5, hill: 6, mountain: 7, waste: 8, red: 9, glacier: 10 }; // glacier: only by a map's `as`
function classify(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), v = mx / 255, s = mx ? (mx - mn) / mx : 0;
  let h = 0;
  if (mx !== mn) {
    if (mx === r) h = ((g - b) / (mx - mn)) % 6; else if (mx === g) h = (b - r) / (mx - mn) + 2; else h = (r - g) / (mx - mn) + 4;
    h *= 60; if (h < 0) h += 360;
  }
  if (v < 0.3) return C.ink;
  if (s < 0.12) return C.pale;
  if (h >= 160 && h <= 250) return C.water;
  if (h > 70 && h < 160) return v < 0.55 ? C.forest : s > 0.22 ? C.plain : C.pale;
  if (h >= 40 && h <= 70) return v < 0.6 ? C.hill : s > 0.22 ? C.plain : C.pale;
  if (h >= 15 && h < 40) return v < 0.62 ? C.mountain : C.waste;
  if (h < 15 || h > 330) return s > 0.5 ? C.red : C.mountain;
  return C.pale;
}

/* fraction of the pixels around each pixel that pass test, as a float grid (separable box blur) */
function density(cls, W, H, test, rad) {
  const a = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) a[i] = test(cls[i]) ? 1 : 0;
  return blurF(a, W, H, rad);
}
const area = (l) => { let s = 0; for (let i = 0; i < l.length; i++) { const a = l[i], b = l[(i + 1) % l.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s / 2); };

/* Read a fuller map (the owner's reference world map) for terrain: within crop [x, y, w, h] of its
   pixels, grids of how much is mountain, hill and forest. Its key draws plains green, hills as
   small brown marks on tan, mountains as peaks whose shaded faces are a dark brown that only
   mountains have, and forest as dark green tree marks. */
export function worldTerrain(img, crop) {
  const [cx, cy, W, H] = crop, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, cx, cy, W, H, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H).data, cls = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), v = mx / 255, s = mx ? (mx - mn) / mx : 0;
    if (g > r && g > b && v < 0.7 && s > 0.5) cls[i] = 3; // tree marks
    else if (r > g && g > b && s > 0.45 && v < 0.55) cls[i] = 1; // the shaded face of a peak
    else if (r > g && g > b && s > 0.3) cls[i] = 2; // tan hill country and its marks
  }
  return {
    crop, W, H,
    mountain: density(cls, W, H, (c) => c === 1, 8), hill: density(cls, W, H, (c) => c === 2 || c === 1, 6), forest: density(cls, W, H, (c) => c === 3, 8),
  };
}

/* Read the printed map. spec.frame is the drawn map's extent inside the decorations; spec.cover
   lists boxes (banners, key, compass rose, arms) that hide the country, each counted as sea or
   land; spec.sea gives points known to be open water. Returns the coast outlines and terrain
   grids, all in the image's pixels. */
export function analyse(img, spec) {
  const W = img.naturalWidth, H = img.naturalHeight, N = W * H, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, W, H).data, cls = new Uint8Array(N);
  for (let i = 0; i < N; i++) cls[i] = classify(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
  // a map's own palette: spec.as re-reads a class as another, [from, to, box?], the first that applies
  // (Kalte: its grey-green glacier is no wood, its peaks are painted paler than Book 1's)
  const as = (spec.as || []).map(([a, b, box]) => [C[a], C[b], box]);
  if (as.length) for (let i = 0; i < N; i++) {
    const px = i % W, py = (i / W) | 0;
    for (const [a, b, box] of as) if (cls[i] === a && (!box || (px >= box[0] && py >= box[1] && px < box[0] + box[2] && py < box[1] + box[3]))) { cls[i] = b; break; }
  }
  const [fx, fy, fw, fh] = spec.frame;
  for (let y = 0; y < H; y++) for (let x2 = 0; x2 < W; x2++) if (x2 < fx || y < fy || x2 >= fx + fw || y >= fy + fh) cls[y * W + x2] = C.none;
  (spec.cover || []).forEach(([bx, by, bw, bh, as]) => {
    for (let y = by; y < by + bh; y++) for (let x2 = bx; x2 < bx + bw; x2++) cls[y * W + x2] = as === 'land' ? C.plain : spec.land ? C.water : C.pale;
  });
  const isLand = (c) => c >= C.plain && c <= C.waste;
  const flood = (from, stop) => {
    const got = new Uint8Array(N), stack = from.map(([sx, sy]) => sy * W + sx);
    while (stack.length) {
      const i = stack.pop();
      if (got[i] || cls[i] === C.none || stop(cls[i])) continue;
      got[i] = 1;
      const px = i % W;
      if (px > 0) stack.push(i - 1);
      if (px < W - 1) stack.push(i + 1);
      if (i >= W) stack.push(i - W);
      if (i < N - W) stack.push(i + W);
    }
    return got;
  };
  const land = new Float32Array(N);
  if (spec.land) {
    // A map that leaves its snow white, like the sea, and draws its coasts as blue lines: the land is
    // what can be reached from points on it without crossing water. The ink of names and peaks on
    // it is closed over by the blur.
    // Land it colours (green shores) counts too.
    // Ice shelves, outlined by hand (spec.shelves), are no land: their tint is too pale to stop it.
    if (spec.shelves) {
      const sc = document.createElement('canvas'); sc.width = W; sc.height = H;
      const sx = sc.getContext('2d', { willReadFrequently: true }); sx.fillStyle = '#000';
      spec.shelves.forEach((p) => { sx.beginPath(); p.forEach(([px, py], i) => (i ? sx.lineTo(px, py) : sx.moveTo(px, py))); sx.fill(); });
      const sd = sx.getImageData(0, 0, W, H).data;
      for (let i = 0; i < N; i++) if (sd[i * 4 + 3] > 127) cls[i] = C.water;
    }
    const got = flood(spec.land, (c) => c === C.water);
    for (let i = 0; i < N; i++) if (isLand(cls[i])) got[i] = 1;
    const dry = density(got, W, H, (v) => v === 1, 3);
    for (let i = 0; i < N; i++) land[i] = cls[i] === C.none ? 0 : dry[i];
  } else {
    // The sea is everything not land that can be reached from open water. That leaves the ink of
    // names, castles and mountains drawn on land as land. Blurring it drops the thin rivers it
    // flooded into.
    const seaF = density(flood(spec.sea, isLand), W, H, (v) => v === 1, 3);
    for (let i = 0; i < N; i++) land[i] = cls[i] === C.none ? 0 : 1 - seaF[i];
  }
  const coast = contours(land, W, H, 0.5).filter((l) => area(l) > 40).map((l) => smooth(l, 2.5));
  const grid = (test, rad) => { const g = density(cls, W, H, test, rad); for (let i = 0; i < N; i++) if (land[i] < 0.5) g[i] = 0; return g; };
  return {
    W, H, coast, land,
    mountain: grid((c) => c === C.mountain, 6), forest: grid((c) => c === C.forest, 9), hill: grid((c) => c === C.hill, 6),
    glacier: grid((c) => c === C.glacier, 4),
  };
}

/* Marching squares: closed outlines where field f crosses t, as polylines in pixel coordinates.
   The edge of the grid counts as below t, so every outline closes. */
function contours(f, W, H, t) {
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : f[y * W + x]);
  const lerp = (a, b) => (t - a) / (b - a || 1e-6);
  const segs = new Map(), pts = new Map();
  const key = (x, y, d) => `${x},${y},${d}`; // d: h = edge from (x,y) to (x+1,y); v = (x,y) to (x,y+1)
  const pt = (x, y, d) => {
    const k = key(x, y, d);
    if (!pts.has(k)) pts.set(k, d === 'h' ? [x + lerp(at(x, y), at(x + 1, y)), y] : [x, y + lerp(at(x, y), at(x, y + 1))]);
    return k;
  };
  const link = (a, b) => { (segs.get(a) || segs.set(a, []).get(a)).push(b); (segs.get(b) || segs.set(b, []).get(b)).push(a); };
  for (let y = -1; y < H; y++) for (let x = -1; x < W; x++) {
    const tl = at(x, y) >= t, tr = at(x + 1, y) >= t, br = at(x + 1, y + 1) >= t, bl = at(x, y + 1) >= t;
    const n = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
    if (n === 0 || n === 15) continue;
    const T = () => pt(x, y, 'h'), B = () => pt(x, y + 1, 'h'), L = () => pt(x, y, 'v'), R = () => pt(x + 1, y, 'v');
    switch (n) {
      case 1: case 14: link(L(), B()); break;
      case 2: case 13: link(B(), R()); break;
      case 3: case 12: link(L(), R()); break;
      case 4: case 11: link(T(), R()); break;
      case 6: case 9: link(T(), B()); break;
      case 7: case 8: link(L(), T()); break;
      case 5: link(L(), T()); link(B(), R()); break;
      case 10: link(T(), R()); link(L(), B()); break;
    }
  }
  const lines = [], seen = new Set();
  for (const start of segs.keys()) {
    if (seen.has(start)) continue;
    const line = [];
    let prev = null, cur = start;
    while (cur && !seen.has(cur)) {
      seen.add(cur); line.push(pts.get(cur));
      const next = segs.get(cur).find((k) => k !== prev && !seen.has(k));
      prev = cur; cur = next;
    }
    if (line.length > 2) lines.push(line);
  }
  return lines;
}

/* drop points closer than `step`, so a traced outline is not a staircase of tiny segments */
function smooth(line, step) {
  const out = [line[0]];
  for (const p of line) { const q = out[out.length - 1]; if (Math.hypot(p[0] - q[0], p[1] - q[1]) >= step) out.push(p); }
  return out;
}
/* closed outlines as one path, rounded through their midpoints */
export function toPath(lines) {
  const p = new Path2D();
  lines.forEach((l) => {
    const n = l.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (n < 3) return;
    const m = mid(l[n - 1], l[0]);
    p.moveTo(m[0], m[1]);
    for (let i = 0; i < n; i++) { const a = l[i], b = mid(a, l[(i + 1) % n]); p.quadraticCurveTo(a[0], a[1], b[0], b[1]); }
    p.closePath();
  });
  return p;
}
/* open polylines (roads) as one smooth path through their midpoints */
export function toLine(lines) {
  const p = new Path2D();
  lines.forEach((l) => {
    if (l.length < 2) return;
    p.moveTo(l[0][0], l[0][1]);
    for (let i = 1; i < l.length - 1; i++) p.quadraticCurveTo(l[i][0], l[i][1], (l[i][0] + l[i + 1][0]) / 2, (l[i][1] + l[i + 1][1]) / 2);
    p.lineTo(l[l.length - 1][0], l[l.length - 1][1]);
  });
  return p;
}

/* box blur of a float grid */
function blurF(f, W, H, rad) {
  const a = Float32Array.from(f), b = new Float32Array(W * H), n = 2 * rad + 1;
  for (let y = 0; y < H; y++) {
    let s = 0;
    for (let x = -rad; x <= rad; x++) s += a[y * W + Math.min(W - 1, Math.max(0, x))];
    for (let x = 0; x < W; x++) { b[y * W + x] = s / n; s += a[y * W + Math.min(W - 1, x + rad + 1)] - a[y * W + Math.max(0, x - rad)]; }
  }
  for (let x = 0; x < W; x++) {
    let s = 0;
    for (let y = -rad; y <= rad; y++) s += b[Math.min(H - 1, Math.max(0, y)) * W + x];
    for (let y = 0; y < H; y++) { a[y * W + x] = s / n; s += b[Math.min(H - 1, y + rad + 1) * W + x] - b[Math.max(0, y - rad) * W + x]; }
  }
  return a;
}

/* Trace part of a printed map. Its ink depth (as in the sepia repaint: lightness, with water a
   shade darker) is upsampled `up` times, smoothed, and cut at each of `levels`; each level comes
   back as closed outlines in the image's own pixels. crop is [x, y, w, h] in those pixels. */
export function trace(img, crop, levels, up = 2) {
  const [cx, cy, cw, ch] = crop, W = cw * up, H = ch * up, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d', { willReadFrequently: true });
  x.imageSmoothingQuality = 'high';
  x.drawImage(img, cx, cy, cw, ch, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H).data, f = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2], water = Math.max(0, Math.min(1, (b - r - 25) / 110));
    f[i] = 1 - Math.max(0, Math.min(1, ((0.3 * r + 0.55 * g + 0.15 * b) / 255 - water * 0.24 - 0.5) * 1.3 + 0.56));
  }
  const s = blurF(f, W, H, Math.max(1, up >> 1));
  return levels.map((t) => contours(s, W, H, t).filter((l) => l.length > 3).map((l) => smooth(l, 0.8).map(([px, py]) => [cx + px / up, cy + py / up])));
}

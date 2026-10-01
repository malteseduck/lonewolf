/* Map buildings drawn as vectors, after the icons on the official Maps of Magnamund (a castle, the
   Kai Monastery, a tower, a keep, a house, a temple, an obelisk, a bridge), in pen and wash: pale walls, a
   wash and hatching on the shaded right-hand faces, dark openings, and a slightly unsteady ink
   line so they sit with the engraved symbols. Each is drawn in its own units (ground at y = 0, up
   is negative) and scaled to any height, so it stays crisp at every zoom. They are part of the
   map, so no rim lifts them off it. */
import * as Ink from './shared/ink.js';

/* Engraving, like the map's other symbols: the same sepia ink, walls the colour of the map's own
   paper (so they hide what stands behind them without showing as pale shapes), shade and roofs by
   hatching rather than wash, openings solid ink, and no colour at all. */
const INK = 'rgba(38,26,16,0.95)', LIT = 'rgb(198,182,145)', SHADE = LIT, ROOF = LIT, DARK = 'rgba(38,26,16,0.92)', RED = LIT;

/* a drawing kit bound to one canvas, one shaky hand (r) and one pen width (lw, in units) */
function kit(x, r, lw) {
  const wobble = (pts, closed) => {
    const out = [], n = pts.length, segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const a = pts[i], b = pts[(i + 1) % n], k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 5));
      for (let j = 0; j < k; j++) out.push([a[0] + ((b[0] - a[0]) * j) / k + (r() - 0.5) * 0.6, a[1] + ((b[1] - a[1]) * j) / k + (r() - 0.5) * 0.6]);
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
  };
  const path = (pts, closed) => { const p = new Path2D(); pts.forEach(([a, b], i) => (i ? p.lineTo(a, b) : p.moveTo(a, b))); if (closed) p.closePath(); return p; };
  const T = {
    fill(pts, col) { x.fillStyle = col; x.fill(path(pts, true)); },
    /* an engraver's line is cut twice, a hair apart, so it swells and thins along its length */
    line(pts, closed = false, w = 1) {
      x.strokeStyle = INK; x.lineJoin = 'round'; x.lineCap = 'round';
      x.lineWidth = lw * w; x.stroke(path(wobble(pts, closed), closed));
      x.lineWidth = lw * w * 0.6; x.stroke(path(wobble(pts, closed), closed));
    },
    /* a lit face gets fine, sparse vertical strokes, as the engraved symbols' walls have */
    shape(pts, col, w = 1) { T.fill(pts, col); if (col === LIT) T.hatch(pts, 4.5, 0.04, 0.3); T.line(pts, true, w); },
    /* parallel strokes clipped to a polygon; slope is dx per unit of rise */
    hatch(pts, gap = 3, slope = 0.6, w = 0.5) {
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), span = (y1 - y0) * slope;
      x.save(); x.clip(path(pts, true)); x.strokeStyle = INK; x.lineWidth = lw * w; x.lineCap = 'round';
      for (let c = x0 - Math.abs(span) - gap; c < x1 + Math.abs(span) + gap; c += gap) { x.beginPath(); x.moveTo(c + (r() - 0.5) * 0.4, y1); x.lineTo(c + span, y0); x.stroke(); }
      // the deep shade is cross-hatched
      if (gap <= 2.2) for (let c = x0 - Math.abs(span) - gap; c < x1 + Math.abs(span) + gap; c += gap * 1.6) { x.beginPath(); x.moveTo(c, y1); x.lineTo(c - span * 1.4, y0); x.stroke(); }
      x.restore();
    },
    /* a dark opening with a round head: centre x, foot y, width, height */
    arch(cx, y, w, h) {
      const pts = [[cx - w / 2, y], [cx - w / 2, y - h + w / 2]];
      for (let i = 1; i < 6; i++) { const a = Math.PI - (i / 6) * Math.PI; pts.push([cx + Math.cos(a) * w / 2, y - h + w / 2 - Math.sin(a) * w / 2]); }
      pts.push([cx + w / 2, y - h + w / 2], [cx + w / 2, y]);
      T.shape(pts, DARK, 0.8);
    },
    /* battlements along a top edge from xa to xb at height y */
    merlons(xa, xb, y, h, n) { const step = (xb - xa) / (2 * n - 1); for (let i = 0; i < n; i++) { const a = xa + i * 2 * step; T.shape([[a, y], [a + step, y], [a + step, y - h], [a, y - h]], LIT, 0.8); } },
    /* a cone roof with its shade and tiles hatched */
    cone(cx, y, w, h) { const pts = [[cx - w / 2, y], [cx, y - h], [cx + w / 2, y]]; T.fill(pts, ROOF); T.hatch(pts, 3.4, -0.22, 0.4); T.hatch([[cx, y - h], [cx + w / 2, y], [cx + w * 0.1, y]], 1.8, -0.25, 0.5); T.line(pts, true); },
    flag(cx, y) { T.line([[cx, y], [cx, y - 14]], false, 0.8); const f = [[cx, y - 14], [cx + 10, y - 11.5], [cx, y - 9]]; T.fill(f, RED); T.line(f, true, 0.7); },
    /* a few loose strokes of stone coursing on a wall */
    stones(xa, xb, ya, yb, n) { for (let i = 0; i < n; i++) { const y = ya + (yb - ya) * r(), a = xa + (xb - xa) * r() * 0.7; T.line([[a, y], [a + (xb - xa) * (0.15 + r() * 0.15), y]], false, 0.45); } },
  };
  return T;
}

const BUILDINGS = {
  tower: {
    h: 104,
    draw(T) {
      T.shape([[-15, 0], [-14, -74], [14, -74], [15, 0]], LIT);
      T.fill([[5, 0], [5, -74], [14, -74], [15, 0]], SHADE); T.hatch([[5, 0], [5, -74], [14, -74], [15, 0]], 2.2);
      T.line([[-15, 0], [-14, -74], [14, -74], [15, 0]], true);
      T.stones(-13, 4, -6, -70, 7);
      T.shape([[-19, -74], [19, -74], [19, -80], [-19, -80]], LIT);
      T.merlons(-19, 19, -80, 8, 4);
      T.arch(-1, -50, 6, 11); T.arch(-1, -28, 5, 8); T.arch(0, 0, 10, 16);
      T.flag(0, -88);
    },
  },
  keep: {
    h: 76,
    draw(T) {
      T.shape([[8, 0], [8, -30], [32, -30], [32, 0]], LIT);
      const roof = [[5, -28], [20, -44], [35, -28]]; T.fill(roof, ROOF); T.hatch(roof, 2.6, -0.2); T.line(roof, true);
      T.fill([[22, 0], [22, -30], [32, -30], [32, 0]], SHADE); T.hatch([[22, 0], [22, -30], [32, -30], [32, 0]], 2.2);
      T.line([[8, 0], [8, -30], [32, -30], [32, 0]], true);
      T.arch(18, 0, 7, 12);
      T.shape([[-26, 0], [-26, -52], [8, -52], [8, 0]], LIT);
      T.fill([[-2, 0], [-2, -52], [8, -52], [8, 0]], SHADE); T.hatch([[-2, 0], [-2, -52], [8, -52], [8, 0]], 2.2);
      T.line([[-26, 0], [-26, -52], [8, -52], [8, 0]], true);
      T.merlons(-27, 9, -52, 8, 4);
      T.stones(-24, -4, -6, -48, 6);
      T.arch(-9, -30, 5, 9); T.arch(-9, 0, 9, 15);
    },
  },
  house: {
    h: 58,
    draw(T) {
      T.shape([[-22, 0], [-22, -22], [22, -22], [22, 0]], LIT);
      T.fill([[8, 0], [8, -22], [22, -22], [22, 0]], SHADE); T.hatch([[8, 0], [8, -22], [22, -22], [22, 0]], 2.2);
      T.line([[-22, 0], [-22, -22], [22, -22], [22, 0]], true);
      T.shape([[10, -32], [10, -48], [16, -48], [16, -26]], LIT, 0.8); // chimney
      const roof = [[-27, -20], [0, -44], [27, -20]]; T.fill(roof, ROOF);
      for (let y = -24; y > -42; y -= 4) { const half = ((y + 44) / 24) * 27; T.line([[-half + 1, y], [half - 1, y]], false, 0.45); }
      T.hatch([[0, -44], [27, -20], [6, -20]], 2.4, -0.3, 0.45);
      T.line(roof, true);
      T.arch(-8, 0, 9, 15);
      T.shape([[4, -8], [12, -8], [12, -16], [4, -16]], DARK, 0.8); T.line([[8, -8], [8, -16]], false, 0.5); T.line([[4, -12], [12, -12]], false, 0.5);
    },
  },
  temple: {
    h: 60,
    draw(T) {
      T.fill([[-24, -9], [24, -9], [24, -36], [-24, -36]], DARK);
      T.shape([[-30, 0], [30, 0], [30, -5], [-30, -5]], LIT); T.shape([[-26, -5], [26, -5], [26, -9], [-26, -9]], LIT);
      [-18, -6, 6, 18].forEach((c) => { T.shape([[c - 3.2, -9], [c - 2.6, -36], [c + 2.6, -36], [c + 3.2, -9]], LIT, 0.8); T.line([[c + 1.4, -11], [c + 1.2, -34]], false, 0.45); });
      T.shape([[-27, -36], [27, -36], [27, -42], [-27, -42]], LIT);
      const ped = [[-29, -42], [0, -57], [29, -42]]; T.shape(ped, LIT); T.hatch([[0, -57], [29, -42], [4, -42]], 2.6, -0.3, 0.45);
    },
  },
  obelisk: {
    h: 62,
    draw(T) {
      T.shape([[-15, 0], [15, 0], [15, -7], [-15, -7]], LIT);
      const shaft = [[-8, -7], [-5, -51], [0, -59], [5, -51], [8, -7]];
      T.fill(shaft, LIT); T.fill([[1, -7], [1, -58], [5, -51], [8, -7]], SHADE); T.hatch([[1, -7], [1, -58], [5, -51], [8, -7]], 2.6);
      T.line(shaft, true); T.line([[0, -59], [1, -7]], false, 0.5);
      T.hatch([[2, 0], [15, 0], [15, -7], [2, -7]], 2.6);
    },
  },
  /* a stone bridge seen from the side: two arches over the water, a parapet along the top */
  bridge: {
    h: 34,
    draw(T) {
      // the water under the arches, in ripples
      for (const [y, a, b] of [[-3, -36, 34], [-7, -30, 28], [1, -40, 38]]) T.line([[a, y], [(a + b) / 2 - 6, y - 1.2], [(a + b) / 2 + 6, y + 0.8], [b, y]], false, 0.45);
      const span = [[-46, -14], [-34, -22], [0, -26], [34, -22], [46, -14], [46, -10], [-46, -10]];
      const body = [[-46, -10], [-46, -14], [-34, -22], [0, -26], [34, -22], [46, -14], [46, -10], [26, -10], [26, 0], [-26, 0], [-26, -10]];
      T.shape(body, LIT); T.hatch(span, 4.5, 0.04, 0.3);
      T.stones(-40, 30, -12, -22, 5);
      // the arches, dark, with the river through them
      [-13, 13].forEach((c) => { const pts = [[c - 10, 0], [c - 10, -8]]; for (let i = 1; i < 8; i++) { const a = Math.PI - (i / 8) * Math.PI; pts.push([c + Math.cos(a) * 10, -8 - Math.sin(a) * 8]); } pts.push([c + 10, -8], [c + 10, 0]); T.shape(pts, DARK, 0.8); });
      const end = [[30, -10], [30, -23], [34, -22], [46, -14], [46, -10]]; T.fill(end, SHADE); T.hatch(end, 2.2); T.line(end, true, 0.8);
      // the parapet
      T.line([[-48, -16], [-34, -25], [0, -29], [34, -25], [48, -16]], false, 0.9);
      T.line([[-46, -14], [-34, -22], [0, -26], [34, -22], [46, -14]], false, 0.8);
    },
  },
  monastery: {
    h: 112,
    draw(T) {
      // the hall on the left, the dormitory on the right, the great tower between
      T.shape([[-35, 0], [-35, -30], [-11, -30], [-11, 0]], LIT);
      const r1 = [[-38, -28], [-23, -46], [-8, -28]]; T.fill(r1, ROOF); T.hatch(r1, 2.6, -0.25, 0.45); T.line(r1, true);
      T.arch(-27, -12, 5, 9); T.arch(-18, -12, 5, 9);
      T.shape([[11, 0], [11, -24], [33, -24], [33, 0]], LIT);
      T.fill([[24, 0], [24, -24], [33, -24], [33, 0]], SHADE); T.hatch([[24, 0], [24, -24], [33, -24], [33, 0]], 2.2); T.line([[11, 0], [11, -24], [33, -24], [33, 0]], true);
      const r2 = [[8, -22], [22, -38], [36, -22]]; T.fill(r2, ROOF); T.hatch(r2, 2.6, -0.25, 0.45); T.line(r2, true);
      T.arch(18, -8, 4, 8);
      T.shape([[-11, 0], [-10, -70], [10, -70], [11, 0]], LIT);
      T.fill([[3, 0], [3, -70], [10, -70], [11, 0]], SHADE); T.hatch([[3, 0], [3, -70], [10, -70], [11, 0]], 2.2); T.line([[-11, 0], [-10, -70], [10, -70], [11, 0]], true);
      T.stones(-9, 2, -10, -66, 6);
      T.arch(-1, -48, 6, 12); T.arch(-1, -26, 5, 9);
      T.cone(0, -70, 28, 30);
      T.flag(0, -100);
      T.shape([[-40, 0], [40, 0], [40, -7], [-40, -7]], LIT); // the outer wall
      T.merlons(-40, 40, -7, 4, 9);
      T.arch(0, 0, 10, 12);
    },
  },
  castle: {
    h: 112,
    draw(T) {
      // the keep stands behind the curtain wall
      T.shape([[-16, -30], [-16, -72], [16, -72], [16, -30]], LIT);
      T.fill([[5, -30], [5, -72], [16, -72], [16, -30]], SHADE); T.hatch([[5, -30], [5, -72], [16, -72], [16, -30]], 2.2); T.line([[-16, -30], [-16, -72], [16, -72], [16, -30]], true);
      T.arch(-2, -48, 6, 11);
      T.cone(0, -72, 42, 32); T.flag(0, -104);
      // the curtain wall, battlemented, with its gate
      T.shape([[-44, 0], [-44, -34], [44, -34], [44, 0]], LIT);
      T.fill([[20, 0], [20, -34], [44, -34], [44, 0]], SHADE); T.hatch([[20, 0], [20, -34], [44, -34], [44, 0]], 2.2); T.line([[-44, 0], [-44, -34], [44, -34], [44, 0]], true);
      T.merlons(-44, 44, -34, 5, 9);
      T.stones(-40, 16, -4, -30, 9);
      T.arch(0, 0, 14, 22);
      // towers at either end, with cone roofs
      [-48, 48].forEach((c) => {
        T.shape([[c - 9, 0], [c - 9, -56], [c + 9, -56], [c + 9, 0]], LIT);
        T.fill([[c + 2, 0], [c + 2, -56], [c + 9, -56], [c + 9, 0]], SHADE); T.hatch([[c + 2, 0], [c + 2, -56], [c + 9, -56], [c + 9, 0]], 2.2);
        T.line([[c - 9, 0], [c - 9, -56], [c + 9, -56], [c + 9, 0]], true);
        T.arch(c - 2, -36, 4.5, 8);
        T.cone(c, -56, 24, 26);
      });
    },
  },
};
export const BUILDING_KINDS = Object.keys(BUILDINGS);

/* Draw a building standing on (cx, cy), height canvas pixels tall. seed varies the hand. */
export function drawBuilding(x, kind, cx, cy, height, seed = 1) {
  const B = BUILDINGS[kind];
  if (!B) return;
  const s = height / B.h, lw = Math.max(0.9, height * 0.011) / s; // as fine as the engraved symbols' lines
  x.save(); x.translate(cx, cy); x.scale(s, s);
  const T = kit(x, Ink.seeded(Math.round(seed * 97 + 13)), lw);
  B.draw(T);
  x.restore();
}

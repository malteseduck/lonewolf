// @vitest-environment jsdom
/* plates.js draws on canvas, which jsdom lacks: these run against a recording fake context
   (fake-canvas.js). They check what the code decides (sizes, what it draws, what pixels become),
   not how it looks; the look is checked in the browser. */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { installFakeCanvas, stubPath2D } from './fake-canvas.js';

let fc, P;
beforeAll(async () => {
  fc = installFakeCanvas();
  stubPath2D();
  P = await import('../../plates.js');
});
afterAll(() => { fc.restore(); vi.unstubAllGlobals(); });
afterEach(() => { fc.clear(); vi.restoreAllMocks(); });

const fx = (o = {}) => ({ lunge: 0, hit: 0, dead: 0, wounds: [], ...o });
const callsOf = (cv, name) => fc.ctxOf(cv).calls.filter((c) => c[0] === name);

describe('newWound', () => {
  it('makes a wound of length 120-240 with nine blood spots, not yet grown', () => {
    for (let i = 0; i < 20; i++) {
      const w = P.newWound();
      expect(w.k).toBe(0);
      expect(w.spots).toHaveLength(9);
      expect(Math.hypot(w.x2 - w.x1, w.y2 - w.y1)).toBeGreaterThanOrEqual(119.9);
      expect(Math.hypot(w.x2 - w.x1, w.y2 - w.y1)).toBeLessThanOrEqual(240.1);
      w.spots.forEach(([, , r]) => { expect(r).toBeGreaterThanOrEqual(1.5); expect(r).toBeLessThanOrEqual(6.5); });
    }
  });
  it('is centred on the random point it drew', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const w = P.newWound();
    expect((w.x1 + w.x2) / 2).toBeCloseTo(0);
    expect((w.y1 + w.y2) / 2).toBeCloseTo(-40);
    expect(Math.hypot(w.x2 - w.x1, w.y2 - w.y1)).toBeCloseTo(180);
  });
});

describe('gearSVG', () => {
  it('draws the toothed rim, twenty rivets and six spokes', () => {
    const s = P.gearSVG();
    expect(s.startsWith('<defs>')).toBe(true);
    expect((s.match(/r="8" fill="url\(#gb\)"/g) || []).length).toBe(20);
    expect((s.match(/M-16 -120/g) || []).length).toBe(6);
    expect((s.match(/rotate\(/g) || []).length).toBe(14 + 6);
    expect(s).toContain('id="gb"');
    expect(s).toContain('id="gd"');
  });
  it('is deterministic', () => {
    expect(P.gearSVG()).toBe(P.gearSVG());
  });
  it('writes no NaN into its paths', () => {
    expect(P.gearSVG()).not.toMatch(/NaN|undefined/);
  });
});

describe('inkPlate', () => {
  const img = (o = {}) => ({ src: 'a.png', naturalWidth: 400, naturalHeight: 200, ...o });

  it('scales a small picture up to 3x and a large one to 1100 wide', () => {
    const small = P.inkPlate(img({ src: 's.png' }), false);
    expect([small.width, small.height]).toEqual([1100, 550]); // 1100/400 = 2.75
    const tiny = P.inkPlate(img({ src: 't.png', naturalWidth: 100, naturalHeight: 50 }), false);
    expect([tiny.width, tiny.height]).toEqual([300, 150]); // capped at 3x
    const big = P.inkPlate(img({ src: 'b.png', naturalWidth: 3000, naturalHeight: 1500 }), false);
    expect([big.width, big.height]).toEqual([1100, 550]);
  });

  it('crops by fractions of the image', () => {
    const cv = P.inkPlate(img({ src: 'c.png', naturalWidth: 1000, naturalHeight: 800, crop: [0.1, 0.25, 0.5, 0.5] }), false);
    expect([cv.width, cv.height]).toEqual([1100, 880]);
    const draw = callsOf(cv, 'drawImage')[0];
    expect(draw.slice(2, 6)).toEqual([100, 200, 500, 400]);
  });

  it('keeps a plate in its cache unless told not to', () => {
    const a = P.inkPlate(img({ src: 'k.png' })), b = P.inkPlate(img({ src: 'k.png' }));
    expect(b).toBe(a);
    expect(P.inkPlate(img({ src: 'k.png' }), false)).not.toBe(a);
    expect(P.inkPlate(img({ src: 'k.png', crop: [0, 0, 1, 0.9] }))).not.toBe(a);
    expect(P.inkPlate(img({ src: 'k.png', levels: [10, 200] }))).not.toBe(a);
  });

  it('turns paper into clear ground and dark line into sepia ink', () => {
    // the scaled canvas is 1100x550: the picture is drawn into it, so the buffer is that size
    const W = 1100, H = 550, px = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < W * H; i++) { const dark = i % W < 100; const v = dark ? 0 : 255; px.set([v, v, v, 255], i * 4); }
    fc.pixels(`${W}x${H}`, px);
    P.inkPlate(img({ src: 'ink.png' }), false);
    expect(px[3]).toBeGreaterThan(200);                 // ink: alpha near 240
    expect([px[0], px[1], px[2]]).toEqual([46, 30, 18]); // sepia
    expect(px[(W - 1) * 4 + 3]).toBe(0);                 // paper: clear
  });

  it('lifts a yellowed scan: its paper tone counts as white', () => {
    const W = 1100, H = 550, px = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < W * H; i++) px.set([200, 200, 200, 255], i * 4); // grey paper, no ink
    fc.pixels(`${W}x${H}`, px);
    P.inkPlate(img({ src: 'grey.png' }), false);
    expect(px[3]).toBe(0);
  });

  it('uses the given levels for full ink and bare paper', () => {
    const W = 1100, H = 550, px = new Uint8ClampedArray(W * H * 4);
    // left half lum 100, right half paper
    for (let i = 0; i < W * H; i++) { const v = i % W < 550 ? 100 : 255; px.set([v, v, v, 255], i * 4); }
    fc.pixels(`${W}x${H}`, px);
    P.inkPlate(img({ src: 'lev.png', levels: [120, 200] }), false); // 100 is below the black point: solid
    expect(px[3]).toBe(Math.round(240));
    expect(px[(W - 1) * 4 + 3]).toBe(0);
  });

  it('leaves the picture as drawn when its pixels cannot be read (cross-origin)', () => {
    const proto = HTMLCanvasElement.prototype, orig = proto.getContext;
    proto.getContext = function () {
      const c = orig.call(this, '2d');
      return new Proxy(c, { get: (t, k) => (k === 'getImageData' ? () => { throw new Error('tainted'); } : t[k]) });
    };
    try {
      const cv = P.inkPlate(img({ src: 'taint.png' }), false);
      expect(cv.width).toBe(1100);
    } finally { proto.getContext = orig; }
  });
});

describe('drawCreature', () => {
  const canvas = (w = 900, h = 1000) => Object.assign(document.createElement('canvas'), { width: w, height: h });

  it('clears the canvas first', () => {
    const cv = canvas();
    P.drawCreature(cv, 'giak', null, 0, fx());
    expect(fc.ctxOf(cv).calls[0]).toEqual(['clearRect', 0, 0, 900, 1000]);
  });

  it.each(['kraan', 'giak', 'vordak', 'emblem', 'nobody-knows'])('draws the %s without a picture', (kind) => {
    const cv = canvas();
    expect(() => P.drawCreature(cv, kind, null, 1.5, fx())).not.toThrow();
    expect(callsOf(cv, 'fill').length + callsOf(cv, 'stroke').length).toBeGreaterThan(0);
    expect(callsOf(cv, 'drawImage')).toHaveLength(0);
  });

  it('draws the picture in place of the creature when art is given, inside the panel', () => {
    P.setArt('giak', undefined);
    const cv = canvas(900, 1000);
    P.drawCreature(cv, 'giak', null, 0, fx(), { src: 'p.png', naturalWidth: 400, naturalHeight: 800 });
    const d = callsOf(cv, 'drawImage');
    expect(d).toHaveLength(1);
    const [, plate, dx, dy, dw, dh] = d[0];
    expect(plate.width).toBeGreaterThan(0);
    expect(dw).toBeLessThanOrEqual(900 * 0.94 + 0.001);
    expect(dh).toBeLessThanOrEqual(1000 * (0.83 - 0.06) + 0.001);
    expect(dx).toBeCloseTo(-dw / 2);
    expect(Number.isFinite(dy)).toBe(true);
  });

  it('uses art registered with setArt for that kind', () => {
    P.setArt('kraan', { src: 'kraan.png', naturalWidth: 300, naturalHeight: 300 });
    const cv = canvas();
    P.drawCreature(cv, 'kraan', null, 0, fx());
    expect(callsOf(cv, 'drawImage')).toHaveLength(1);
    P.setArt('kraan', undefined);
  });

  it('fades the creature as it dies and sinks it', () => {
    const cv = canvas();
    P.drawCreature(cv, 'giak', null, 0, fx({ dead: 1 }));
    const sets = fc.ctxOf(cv).state;
    expect(sets.globalAlpha).toBeDefined();
    const tr = callsOf(cv, 'translate')[0];
    expect(tr[2]).toBeCloseTo(1000 * 0.4 + 70 * (900 / 900));
  });

  it('paints each wound as a red wedge plus its spots', () => {
    const cv = canvas();
    const wound = { ...P.newWound(), k: 1 };
    P.drawCreature(cv, 'giak', null, 0, fx());
    const before = callsOf(cv, 'arc').length;
    const cv2 = canvas();
    P.drawCreature(cv2, 'giak', null, 0, fx({ wounds: [wound] }));
    expect(callsOf(cv2, 'arc').length).toBe(before + wound.spots.length);
  });

  it('shakes only when hit', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    const calm = canvas(), hit = canvas();
    P.drawCreature(calm, 'giak', null, 0, fx());
    P.drawCreature(hit, 'giak', null, 0, fx({ hit: 1 }));
    expect(callsOf(calm, 'translate')[0][1]).toBeCloseTo(450);
    expect(callsOf(hit, 'translate')[0][1]).not.toBeCloseTo(450);
  });

  it('draws the loaded emblem glyph once setEmblem has been given a path', () => {
    P.setEmblem('M0 0L10 10');
    const cv = canvas();
    P.drawCreature(cv, 'emblem', null, 0, fx());
    expect(callsOf(cv, 'fill').some((c) => c[1] && c[1].d === 'M0 0L10 10')).toBe(true);
  });
});

describe('heroFromArt', () => {
  /* a grey ground with a dark figure standing in it: the figure must keep, the ground must go */
  function scene(W, H) {
    const p = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      const x = i % W, y = (i - x) / W, fig = x >= 15 && x < 25 && y >= 10 && y < 50;
      p.set(fig ? [20, 20, 20, 255] : [128, 128, 128, 255], i * 4);
    }
    return p;
  }

  it('cuts the figure out of its ground and returns the figure canvas (with or without the pointer)', () => {
    const W = 40, H = 60, px = scene(W, H);
    fc.pixels(`${W}x${H}`, px);
    const out = P.heroFromArt({}, [0, 0, W, H], null, false);
    expect([out.width, out.height]).toEqual([300, 460]);
    expect(px[(5 * W + 5) * 4 + 3]).toBe(0);        // ground: clear
    expect(px[(30 * W + 20) * 4 + 3]).toBe(255);    // figure: solid
    fc.pixels(`${W}x${H}`, scene(W, H));
    const bare = P.heroFromArt({}, [0, 0, W, H], null, true);
    expect([bare.width, bare.height]).toEqual([300, 376]);
  });

  it('tones the figure to sepia', () => {
    const W = 40, H = 60, px = scene(W, H);
    fc.pixels(`${W}x${H}`, px);
    P.heroFromArt({}, [0, 0, W, H]);
    const i = (30 * W + 20) * 4;
    expect(px[i]).toBeGreaterThan(px[i + 1]);
    expect(px[i + 1]).toBeGreaterThan(px[i + 2]);
  });
});

describe('portraitFromArt', () => {
  it('keys the paper out, leaving sepia ink, at twice the size', () => {
    const W = 20, H = 20, k = 2, px = new Uint8ClampedArray(W * k * H * k * 4);
    for (let i = 0; i < W * k * H * k; i++) { const dark = i % (W * k) < 4; px.set(dark ? [10, 10, 10, 255] : [240, 240, 240, 255], i * 4); }
    fc.pixels(`${W * k}x${H * k}`, px);
    const c = P.portraitFromArt({}, [0, 0, W, H]);
    expect([c.width, c.height]).toEqual([W * k, H * k]);
    expect([px[0], px[1], px[2]]).toEqual([38, 28, 18]);
    expect(px[3]).toBeGreaterThan(200);
    expect(px[(W * k - 1) * 4 + 3]).toBe(0);
  });
  it('fades the edges with a radial mask at the given fraction', () => {
    const W = 10, H = 10, px = new Uint8ClampedArray(W * 2 * H * 2 * 4).fill(200);
    fc.pixels(`${W * 2}x${H * 2}`, px);
    const c = P.portraitFromArt({}, [0, 0, W, H], 0.3);
    expect(fc.ctxOf(c).state.globalCompositeOperation).toBe('destination-in');
    const g = callsOf(c, 'createRadialGradient')[0];
    expect(g).toBeTruthy();
  });
});

describe('ornaments', () => {
  it('drawFrame returns a canvas of the size asked, vine or beaded', () => {
    const a = P.drawFrame(500, 700), b = P.drawFrame(300, 400, { vine: false });
    expect([a.width, a.height]).toEqual([500, 700]);
    expect([b.width, b.height]).toEqual([300, 400]);
    expect(callsOf(a, 'bezierCurveTo').length).toBeGreaterThan(callsOf(b, 'bezierCurveTo').length);
  });
  it('defaults to the page-sized frame', () => {
    const f = P.drawFrame();
    expect([f.width, f.height]).toEqual([1000, 1480]);
  });
  it('drawBanner and drawCrest return canvases of the size asked, with defaults', () => {
    expect([P.drawBanner().width, P.drawBanner().height]).toEqual([900, 120]);
    expect([P.drawBanner(600, 80).width, P.drawBanner(600, 80).height]).toEqual([600, 80]);
    expect([P.drawCrest().width, P.drawCrest().height]).toEqual([360, 44]);
  });
});

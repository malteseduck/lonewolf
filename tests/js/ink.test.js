// @vitest-environment jsdom
// shared/ink.js (an ES module): canvas-drawn materials. jsdom has no canvas, so every canvas gets a recording
// stand-in for its 2D context: each method call is written down, each property set too.
import { describe, it, expect, beforeEach } from 'vitest';
import { seeded, canvas, parchment, wood, leather, ground, glow, inkScene } from '../../shared/ink.js';

function recorder() {
  const calls = [], sets = [], target = {};
  const ctx = new Proxy(target, {
    get(t, prop) {
      if (prop === 'calls') return calls;
      if (prop === 'sets') return sets;
      if (prop in t) return t[prop];
      return (...args) => {
        calls.push([prop, ...args]);
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return { addColorStop: (...a) => calls.push(['addColorStop', ...a]) };
        return undefined;
      };
    },
    set(t, prop, v) { sets.push([prop, v]); t[prop] = v; return true; },
  });
  return ctx;
}

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = function () { return (this.__ctx = this.__ctx || recorder()); };
});

const ctxOf = (c) => c.getContext('2d');
const names = (c) => ctxOf(c).calls.map((x) => x[0]);
const callsTo = (c, m) => ctxOf(c).calls.filter((x) => x[0] === m);
const firstFill = (c) => ctxOf(c).sets.find((s) => s[0] === 'fillStyle')[1];

describe('seeded', () => {
  it('gives numbers in [0, 1), the same for the same seed', () => {
    const a = seeded(5), b = seeded(5);
    for (let i = 0; i < 500; i++) { const v = a(); expect(v).toBe(b()); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
  });
  it('differs between seeds', () => {
    expect(Array.from({ length: 8 }, seeded(1))).not.toEqual(Array.from({ length: 8 }, seeded(2)));
  });
  it('is spread evenly enough', () => {
    const r = seeded(99);
    let t = 0;
    for (let i = 0; i < 4000; i++) t += r();
    expect(t / 4000).toBeGreaterThan(0.45);
    expect(t / 4000).toBeLessThan(0.55);
  });
});

describe('canvas', () => {
  it('makes a canvas of the size', () => {
    const c = canvas(30, 20);
    expect(c.tagName).toBe('CANVAS');
    expect([c.width, c.height]).toEqual([30, 20]);
  });
});

describe('parchment', () => {
  it('is the size asked, painted a parchment colour first', () => {
    const c = parchment(200, 100);
    expect([c.width, c.height]).toEqual([200, 100]);
    expect(firstFill(c)).toBe('#d9cba6');
    expect(callsTo(c, 'fillRect')[0]).toEqual(['fillRect', 0, 0, 200, 100]);
  });
  it('scatters 260 stains and 1100 fibres', () => {
    const c = parchment(200, 100);
    expect(callsTo(c, 'createRadialGradient')).toHaveLength(260);
    expect(callsTo(c, 'lineTo').length).toBeGreaterThanOrEqual(1100);
  });
  it('burns the gutter side of a bound page, and all four sides of a plain sheet', () => {
    const bound = callsTo(parchment(500, 400), 'createLinearGradient');
    const plain = callsTo(parchment(500, 400, false, true), 'createLinearGradient');
    expect(bound[0].slice(1)).toEqual([0, 0, 190, 0]); // the gutter
    expect(plain[0].slice(1)).toEqual([0, 0, 150, 0]);
    expect(plain.map((c) => c.slice(1))).toEqual([[0, 0, 150, 0], [500, 0, 350, 0], [0, 0, 0, 150], [0, 400, 0, 250]]);
    expect(bound).toHaveLength(4);
  });
  it('returns the page itself, or a mirrored copy of it', () => {
    const page = parchment(200, 100);
    expect(callsTo(page, 'scale')).toHaveLength(0);
    const mirrored = parchment(200, 100, true);
    expect(callsTo(mirrored, 'translate')[0].slice(1)).toEqual([200, 0]);
    expect(callsTo(mirrored, 'scale')[0].slice(1)).toEqual([-1, 1]);
    expect(callsTo(mirrored, 'drawImage')).toHaveLength(1);
    expect([mirrored.width, mirrored.height]).toEqual([200, 100]);
  });
  it('does not mirror a plain sheet', () => {
    expect(callsTo(parchment(200, 100, true, true), 'scale')).toHaveLength(0);
  });
  it('paints the same page every time (its stains are seeded)', () => {
    const a = parchment(100, 80), b = parchment(100, 80);
    expect(ctxOf(a).calls).toEqual(ctxOf(b).calls);
  });
});

describe('wood', () => {
  it('is a square, dark wood ground with six planks of grain', () => {
    const c = wood(256);
    expect([c.width, c.height]).toEqual([256, 256]);
    expect(firstFill(c)).toBe('#23150c');
    // each plank ends in a dark seam, three pixels thick
    expect(callsTo(c, 'fillRect').filter((x) => x[4] === 3)).toHaveLength(6);
  });
  it('defaults to 1024', () => {
    expect(wood().width).toBe(1024);
  });
});

describe('leather', () => {
  it('is a square, reddish-brown ground flecked with grain', () => {
    const c = leather(128);
    expect([c.width, c.height]).toEqual([128, 128]);
    expect(firstFill(c)).toBe('#34130f');
    expect(callsTo(c, 'fillRect')).toHaveLength(9001);
  });
  it('defaults to 512', () => { expect(leather().height).toBe(512); });
});

describe('ground', () => {
  it('takes its tint from the argument', () => {
    expect(firstFill(ground(64))).toBe('rgb(22,20,15)');
    expect(firstFill(ground(64, '1,2,3'))).toBe('rgb(1,2,3)');
  });
  it('scatters 5000 pebbles', () => {
    expect(callsTo(ground(64), 'ellipse')).toHaveLength(5000);
  });
  it('is the size asked, 512 by default', () => {
    expect(ground(64).width).toBe(64);
    expect(ground().width).toBe(512);
  });
});

describe('glow', () => {
  it('is a radial gradient from the middle out, the inner colour first', () => {
    const c = glow(100, 'red');
    const g = callsTo(c, 'createRadialGradient')[0];
    expect(g.slice(1)).toEqual([50, 50, 0, 50, 50, 50]);
    const stops = callsTo(c, 'addColorStop').map((s) => s.slice(1));
    expect(stops[0]).toEqual([0, 'red']);
    expect(stops[stops.length - 1]).toEqual([1, 'rgba(0,0,0,0)']);
    expect([c.width, c.height]).toEqual([100, 100]);
  });
  it('defaults to a white centre', () => {
    const stops = callsTo(glow(), 'addColorStop');
    expect(stops[0].slice(1)).toEqual([0, 'rgba(255,255,255,1)']);
    expect(glow().width).toBe(128);
  });
});

describe('inkScene', () => {
  const PLATES = ['ruins', 'forest', 'hill', 'river', 'road', 'night', 'bridge', 'city'];
  for (const name of PLATES) {
    it(`draws the ${name} plate at the size asked, and softens its border`, () => {
      const c = inkScene(name, 320, 180);
      expect([c.width, c.height]).toEqual([320, 180]);
      expect(ctxOf(c).calls.length).toBeGreaterThan(100);
      // the border is a blurred mask kept with destination-in
      expect(ctxOf(c).sets).toContainEqual(['globalCompositeOperation', 'destination-in']);
      expect(callsTo(c, 'drawImage')).toHaveLength(1);
    });
  }
  it('hatches only into what is painted (source-atop)', () => {
    const c = inkScene('forest', 320, 180);
    const sets = ctxOf(c).sets.filter((s) => s[0] === 'globalCompositeOperation').map((s) => s[1]);
    expect(sets).toContain('source-atop');
    expect(sets.indexOf('source-atop')).toBeLessThan(sets.indexOf('destination-in'));
  });
  it('draws the same plate every time for a name (seeded by it)', () => {
    expect(ctxOf(inkScene('hill', 200, 100)).calls).toEqual(ctxOf(inkScene('hill', 200, 100)).calls);
  });
  it('draws different plates for different names', () => {
    expect(names(inkScene('hill', 200, 100))).not.toEqual(names(inkScene('city', 200, 100)));
  });
  it('draws a forest plate for a name it does not know', () => {
    expect(names(inkScene('mystery', 200, 100))).toEqual(names(inkScene('forest', 200, 100)));
  });
});

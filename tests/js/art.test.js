// @vitest-environment jsdom
// shared/art.js: the procedural sprites and scenes. jsdom has no canvas, so each canvas gets a small fake
// 2D context that really paints axis-aligned fillRect calls into a pixel buffer (enough to see the palette
// snapping work) and records the other drawing calls.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadShared } from './helpers.js';

let LW;
const hexOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function fakeContext(canvas) {
  const w = canvas.width, h = canvas.height;
  const data = new Uint8ClampedArray(w * h * 4);
  const calls = [];
  const ctx = {
    fillStyle: '#000000', calls, data,
    fillRect(x, y, rw, rh) {
      calls.push('fillRect');
      if (!/^#[0-9a-f]{6}$/i.test(ctx.fillStyle)) return;
      const [r, g, b] = hexOf(ctx.fillStyle);
      for (let j = Math.max(0, y); j < Math.min(h, y + rh); j++) {
        for (let i = Math.max(0, x); i < Math.min(w, x + rw); i++) { const o = (j * w + i) * 4; data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 255; }
      }
    },
    getImageData() { return { data, width: w, height: h }; },
    putImageData() { calls.push('putImageData'); },
  };
  for (const m of ['beginPath', 'moveTo', 'lineTo', 'closePath', 'fill', 'ellipse']) ctx[m] = () => { calls.push(m); };
  return ctx;
}

beforeEach(() => {
  LW = loadShared('art.js');
  HTMLCanvasElement.prototype.getContext = function () { return (this.__ctx = this.__ctx || fakeContext(this)); };
});

const pixels = (canvas) => { const d = canvas.getContext('2d').data, out = []; for (let i = 0; i < d.length; i += 4) out.push([d[i], d[i + 1], d[i + 2], d[i + 3]]); return out; };

describe('LW.Art.seeded', () => {
  it('gives numbers in [0, 1)', () => {
    const r = LW.Art.seeded(1);
    for (let i = 0; i < 1000; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
  });
  it('gives the same sequence for the same seed, and a different one for another', () => {
    const a = LW.Art.seeded(42), b = LW.Art.seeded(42), c = LW.Art.seeded(43);
    const sa = Array.from({ length: 10 }, a), sb = Array.from({ length: 10 }, b), sc = Array.from({ length: 10 }, c);
    expect(sa).toEqual(sb);
    expect(sa).not.toEqual(sc);
  });
  it('is spread evenly enough: mean near a half', () => {
    const r = LW.Art.seeded(7);
    let t = 0;
    for (let i = 0; i < 4000; i++) t += r();
    expect(t / 4000).toBeGreaterThan(0.45);
    expect(t / 4000).toBeLessThan(0.55);
  });
});

describe('LW.Art.sprite', () => {
  const PALS = {
    kraan: ['#3b2f4a', '#5a4668', '#8a6a86', '#1d1726', '#ff4a2e', '#d8b24a', '#c9c2b0'],
    giak: ['#7f8f5a', '#56653d', '#4a4038', '#9aa0a6', '#ffd23e', '#efe9d6', '#7a5230', '#22201c'],
    vordak: ['#7a1f24', '#4a1216', '#5c171b', '#d9d2b8', '#7dff5a', '#140a0c', '#8d8f96'],
  };
  it('is a 64 by 64 canvas', () => {
    const c = LW.Art.sprite('giak');
    expect([c.width, c.height]).toEqual([64, 64]);
  });
  for (const name of Object.keys(PALS)) {
    it(`snaps every pixel of the ${name} to its palette or to transparent`, () => {
      const pal = PALS[name].map(hexOf).map((x) => x.join(','));
      const px = pixels(LW.Art.sprite(name));
      for (const [r, g, b, a] of px) {
        if (a === 0) continue;
        expect(a).toBe(255);
        expect(pal).toContain([r, g, b].join(','));
      }
    });
  }
  it('keeps the drawn pixels and clears the rest (a cut-out)', () => {
    const px = pixels(LW.Art.sprite('giak'));
    const at = (x, y) => px[y * 64 + x];
    expect(at(51, 9)).toEqual([...hexOf('#7a5230'), 255]); // the spear shaft is drawn there
    expect(at(0, 0)[3]).toBe(0); // the corner is not
    expect(px.some((p) => p[3] === 255)).toBe(true);
    expect(px.some((p) => p[3] === 0)).toBe(true);
  });
  it('draws a polygon with moveTo, lineTo, closePath and fill', () => {
    const c = LW.Art.sprite('kraan');
    const calls = c.getContext('2d').calls;
    for (const m of ['moveTo', 'lineTo', 'closePath', 'fill', 'ellipse', 'fillRect', 'putImageData']) expect(calls).toContain(m);
  });
  it('gives the same picture each time', () => {
    expect(pixels(LW.Art.sprite('vordak'))).toEqual(pixels(LW.Art.sprite('vordak')));
  });
  it('draws a Giak for a name it does not know', () => {
    expect(pixels(LW.Art.sprite('unicorn'))).toEqual(pixels(LW.Art.sprite('giak')));
  });
  it('gives each foe a different picture', () => {
    expect(pixels(LW.Art.sprite('giak'))).not.toEqual(pixels(LW.Art.sprite('vordak')));
  });
});

describe('LW.Art.scene', () => {
  const SCENES = ['ruins', 'forest', 'hill', 'river', 'road', 'night', 'bridge', 'city'];
  it('is a 160 by 90 canvas, fully opaque', () => {
    const c = LW.Art.scene('forest');
    expect([c.width, c.height]).toEqual([160, 90]);
    expect(pixels(c).every((p) => p[3] === 255)).toBe(true);
  });
  it('paints its sky tone first: a pixel the sky alone covers has the sky colour', () => {
    // the forest's first fill is its sky (palette 0, #1f3a2d) over the whole canvas; the corner is left bare
    expect(pixels(LW.Art.scene('forest'))[0].slice(0, 3)).toEqual(hexOf('#1f3a2d'));
  });
  for (const name of SCENES) {
    it(`draws ${name} in colour from a five-tone palette`, () => {
      const px = pixels(LW.Art.scene(name));
      const tones = new Set(px.map((p) => p.slice(0, 3).join(',')));
      expect(tones.size).toBeLessThanOrEqual(5);
      expect(tones.size).toBeGreaterThan(0);
    });
    it(`draws ${name} as a woodcut in the book\'s ink tones when asked`, () => {
      const ink = ['#d9d3c1', '#a9a087', '#6e6450', '#26221b', '#8c2a1c'].map(hexOf).map((x) => x.join(','));
      for (const p of pixels(LW.Art.scene(name, true))) expect(ink).toContain(p.slice(0, 3).join(','));
    });
  }
  it('gives the same picture for the same name, and different pictures for different names', () => {
    expect(pixels(LW.Art.scene('hill'))).toEqual(pixels(LW.Art.scene('hill')));
    expect(pixels(LW.Art.scene('hill'))).not.toEqual(pixels(LW.Art.scene('night')));
  });
  it('draws a forest for a name it does not know', () => {
    const colours = (c) => new Set(pixels(c).map((p) => p.slice(0, 3).join(','))).size;
    expect(colours(LW.Art.scene('mystery'))).toBeLessThanOrEqual(5);
    expect(pixels(LW.Art.scene('mystery'))[0].slice(0, 3)).toEqual(hexOf('#1f3a2d'));
  });
});

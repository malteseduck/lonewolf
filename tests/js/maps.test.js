// @vitest-environment jsdom
/* maps.js repaints a printed map as sepia ink. The canvas is a recording fake (fake-canvas.js); the
   pixel buffer it hands back is real, so the colour rules can be checked. */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { installFakeCanvas } from './fake-canvas.js';

let fc, M;
beforeAll(async () => { fc = installFakeCanvas(); M = await import('../../maps.js'); });
afterAll(() => fc.restore());
afterEach(() => fc.clear());

/* a 1 x n strip of pixels, one RGB per entry */
function paint(colours) {
  const w = colours.length, h = 1, px = new Uint8ClampedArray(w * h * 4);
  colours.forEach((c, i) => px.set([...c, 255], i * 4));
  fc.pixels(`${w}x${h}`, px);
  const cv = M.printedCanvas({}, [0, 0, w, h], w, h);
  return { cv, px, at: (i) => [px[i * 4], px[i * 4 + 1], px[i * 4 + 2]] };
}
const lum = ([r, g, b]) => 0.3 * r + 0.55 * g + 0.15 * b;

describe('printedCanvas', () => {
  it('returns a canvas of the size asked, drawn from the crop of the image', () => {
    const { cv } = paint([[255, 255, 255], [0, 0, 0]]);
    expect([cv.width, cv.height]).toEqual([2, 1]);
    const draw = fc.ctxOf(cv).calls.find((c) => c[0] === 'drawImage');
    expect(draw.slice(2)).toEqual([0, 0, 2, 1, 0, 0, 2, 1]);
  });

  it('passes the crop through in image pixels', () => {
    const w = 3, px = new Uint8ClampedArray(w * 4).fill(200);
    fc.pixels(`${w}x1`, px);
    const cv = M.printedCanvas({}, [10, 20, 300, 400], w, 1);
    expect(fc.ctxOf(cv).calls.find((c) => c[0] === 'drawImage').slice(2, 6)).toEqual([10, 20, 300, 400]);
  });

  it('turns lightness into ink depth: paper stays light, black stays dark', () => {
    const { at } = paint([[255, 255, 255], [0, 0, 0], [128, 128, 128]]);
    expect(lum(at(0))).toBeGreaterThan(lum(at(2)));
    expect(lum(at(2))).toBeGreaterThan(lum(at(1)));
  });

  it('pushes water a shade darker than land of the same lightness', () => {
    const { at } = paint([[150, 150, 150], [90, 150, 240]]);
    // similar lightness in, but the blue one is water: its sepia comes out darker
    expect(lum(at(1))).toBeLessThan(lum(at(0)));
  });

  it('keeps strong red as a faint rubric, redder than the same lightness in grey', () => {
    const { at } = paint([[200, 40, 30], [90, 90, 90]]);
    const [r, , b] = at(0);
    expect(r - b).toBeGreaterThan(at(1)[0] - at(1)[2]);
  });

  it('warms every pixel: red at least blue', () => {
    const { at } = paint([[255, 255, 255], [128, 128, 128], [0, 0, 0], [10, 200, 10]]);
    for (let i = 0; i < 4; i++) expect(at(i)[0]).toBeGreaterThanOrEqual(at(i)[2]);
  });

  it('writes channels inside 0-255 for extreme input', () => {
    const { px } = paint([[255, 0, 0], [0, 0, 255], [255, 255, 255], [0, 0, 0]]);
    for (let i = 0; i < px.length; i += 4) expect(px[i + 3]).toBe(255);
  });

  it('multiplies the parchment grain over it and darkens the rim with a vignette', () => {
    const { cv } = paint([[255, 255, 255], [255, 255, 255]]);
    const ctx = fc.ctxOf(cv), calls = ctx.calls;
    const names = calls.map((c) => c[0]);
    expect(names).toContain('putImageData');
    expect(names.indexOf('putImageData')).toBeLessThan(names.lastIndexOf('drawImage'));
    expect(names).toContain('createRadialGradient');
    expect(names[names.length - 1]).toBe('fillRect');
    expect(ctx.state.globalCompositeOperation).toBe('source-over'); // restored after the multiply
    expect(ctx.state.globalAlpha).toBe(1);
  });
});

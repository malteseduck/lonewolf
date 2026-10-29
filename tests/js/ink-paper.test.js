import { describe, it, expect } from 'vitest';
import { clearPaper } from '../../shared/ink.js';

// a picture's pixels laid on paper must come out as the multiply blend would show them
const over = (px, paper) => px.slice(0, 3).map((k, i) => k * px[3] / 255 + paper[i] * (1 - px[3] / 255));
const multiply = (px, paper) => px.slice(0, 3).map((c, i) => c * paper[i] / 255);

describe('clearPaper', () => {
  it('makes white paper clear and keeps black ink solid', () => {
    const d = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]);
    clearPaper(d);
    expect(d[3]).toBe(0);
    expect([...d.slice(4)]).toEqual([0, 0, 0, 255]);
  });
  it('shows grey ink on paper as multiply did', () => {
    const paper = [222, 200, 160];
    for (const px of [[128, 128, 128, 255], [30, 30, 30, 255], [240, 240, 240, 255]]) {
      const d = new Uint8ClampedArray(px);
      clearPaper(d);
      over([...d], paper).forEach((v, i) => expect(v).toBeCloseTo(multiply(px, paper)[i], -1));
    }
  });
  it('keeps coloured ink its colour where it is solid', () => {
    const d = new Uint8ClampedArray([200, 90, 40, 255]);
    clearPaper(d);
    over([...d], [255, 255, 255]).forEach((v, i) => expect(v).toBeCloseTo([200, 90, 40][i], -1));
  });
  it('keeps a pixel that was already clear, clear', () => {
    const d = new Uint8ClampedArray([0, 0, 0, 0]);
    clearPaper(d);
    expect(d[3]).toBe(0);
  });
});

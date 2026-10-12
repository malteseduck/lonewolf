// @vitest-environment jsdom
/* tools/admin/parchment.js sets the tool pages' parchment and burn filter on import. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { installFakeCanvas } from './fake-canvas.js';

let fc;
beforeAll(async () => {
  fc = installFakeCanvas();
  document.body.innerHTML = '<main id="m"></main>';
  await import('../../tools/admin/parchment.js');
});
afterAll(() => fc.restore());

describe('parchment.js', () => {
  it('sets --parch on the root to a JPEG data URL', () => {
    expect(document.documentElement.style.getPropertyValue('--parch')).toBe('url(data:image/jpeg;base64,AAAA)');
  });

  it('puts the #burn filter first in the body, hidden from view and from screen readers', () => {
    const svg = document.body.firstElementChild;
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('width')).toBe('0');
    expect(document.body.lastElementChild.id).toBe('m');
  });

  it('defines a filter named burn with a turbulence and a displacement map', () => {
    const f = document.querySelector('filter#burn');
    expect(f).not.toBeNull();
    expect(f.querySelector('feTurbulence').getAttribute('type')).toBe('fractalNoise');
    expect(f.querySelector('feDisplacementMap').getAttribute('scale')).toBe('34');
  });
});

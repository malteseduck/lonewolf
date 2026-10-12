/* A stand-in for the canvas jsdom does not have: every 2D context method is a recorded no-op, gradients
   take colour stops, and getImageData hands back a real pixel buffer so the code that reads and
   rewrites pixels can run. Not a test file (vitest only runs *.test.js).

     const fc = installFakeCanvas();            // after jsdom is up
     fc.pixels('40x60', buffer)                 // what getImageData(0,0,40,60) returns, as RGBA
     fc.ctxOf(canvas).calls                     // [[method, ...args], ...]
     fc.restore()                               */
import { vi } from 'vitest';

export function installFakeCanvas() {
  const ctxs = new WeakMap(), buffers = new Map();
  const proto = HTMLCanvasElement.prototype, original = proto.getContext;
  const make = (cv) => {
    const calls = [], state = {};
    const ctx = new Proxy({ calls, canvas: cv, state }, {
      get(t, k) {
        if (k in t) return t[k];
        if (k === 'getImageData') {
          return (sx, sy, w, h) => {
            const key = `${w}x${h}`;
            if (!buffers.has(key)) buffers.set(key, new Uint8ClampedArray(w * h * 4).fill(255));
            calls.push(['getImageData', sx, sy, w, h]);
            return { data: buffers.get(key), width: w, height: h };
          };
        }
        if (k === 'putImageData') return (d, ...a) => { calls.push(['putImageData', d, ...a]); t.put = d; };
        if (k === 'createLinearGradient' || k === 'createRadialGradient') {
          return (...a) => { const g = { stops: [], addColorStop(o, c) { g.stops.push([o, c]); } }; calls.push([k, ...a]); return g; };
        }
        if (k === 'measureText') return (s) => ({ width: String(s).length * 8 });
        if (typeof k === 'symbol' || k === 'then') return undefined;
        return (...a) => { calls.push([k, ...a]); };
      },
      set(t, k, v) { state[k] = v; return true; },
    });
    ctxs.set(cv, ctx);
    return ctx;
  };
  proto.getContext = function (type) { return type === '2d' ? ctxs.get(this) || make(this) : null; };
  proto.toDataURL = function () { return 'data:image/jpeg;base64,AAAA'; };
  return {
    ctxOf: (cv) => ctxs.get(cv) || make(cv),
    pixels: (key, buf) => buffers.set(key, buf),
    clear: () => buffers.clear(),
    restore: () => { proto.getContext = original; },
  };
}

/* a Path2D for the code that builds one from an SVG path string */
export function stubPath2D() {
  vi.stubGlobal('Path2D', class { constructor(d) { this.d = d; this.pts = []; } moveTo(...a) { this.pts.push(['m', ...a]); } lineTo(...a) { this.pts.push(['l', ...a]); } });
}

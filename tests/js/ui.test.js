// @vitest-environment jsdom
// shared/ui.js: sound, the Random Number Table, character creation, the Action Chart, the toast.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadShared, dice } from './helpers.js';

let LW;
beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  delete window.AudioContext;
  LW = loadShared('core.js', 'ui.js');
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

/* an AudioContext that writes down what is played */
function fakeAudio() {
  const made = { oscillators: [], gains: [], contexts: 0 };
  window.AudioContext = class {
    constructor() { made.contexts++; this.currentTime = 10; this.destination = {}; }
    createOscillator() {
      const o = { type: '', frequency: { value: 0 }, started: null, stopped: null, connect(n) { return n; }, start(t) { o.started = t; }, stop(t) { o.stopped = t; } };
      made.oscillators.push(o); return o;
    }
    createGain() {
      const g = { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect(n) { return n; } };
      made.gains.push(g); return g;
    }
  };
  return made;
}

describe('LW.UI.esc', () => {
  it('escapes & < > and "', () => {
    expect(LW.UI.esc('<a href="x">Tom & Jerry</a>')).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&lt;/a&gt;');
  });
  it('turns non-strings into text and leaves apostrophes alone', () => {
    expect(LW.UI.esc(42)).toBe('42');
    expect(LW.UI.esc("it's")).toBe("it's");
    expect(LW.UI.esc('')).toBe('');
  });
});

describe('LW.UI.el', () => {
  it('makes an element with a class and inner HTML', () => {
    const n = LW.UI.el('p', 'note big', '<b>hi</b>');
    expect(n.tagName).toBe('P');
    expect(n.className).toBe('note big');
    expect(n.innerHTML).toBe('<b>hi</b>');
  });
});

describe('LW.UI.wait', () => {
  it('resolves after the time', async () => {
    vi.useFakeTimers();
    let done = false;
    LW.UI.wait(100).then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(99);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
  });
});


describe('LW.UI.toast', () => {
  it('shows a message in a status element, then hides it after 2.6 s', () => {
    vi.useFakeTimers();
    LW.UI.toast('Hello');
    const t = document.querySelector('.lw-toast');
    expect(t.textContent).toBe('Hello');
    expect(t.getAttribute('role')).toBe('status');
    expect(t.classList.contains('show')).toBe(true);
    vi.advanceTimersByTime(2599);
    expect(t.classList.contains('show')).toBe(true);
    vi.advanceTimersByTime(1);
    expect(t.classList.contains('show')).toBe(false);
  });
  it('shows text, not markup', () => {
    LW.UI.toast('<b>x</b>');
    expect(document.querySelector('.lw-toast b')).toBeNull();
  });
});





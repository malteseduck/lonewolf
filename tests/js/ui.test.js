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
  it('escapes ampersands first, so nothing is double-escaped', () => {
    expect(LW.UI.esc('&lt;')).toBe('&amp;lt;');
  });
});

describe('LW.UI.el', () => {
  it('makes an element with a class and inner HTML', () => {
    const n = LW.UI.el('p', 'note big', '<b>hi</b>');
    expect(n.tagName).toBe('P');
    expect(n.className).toBe('note big');
    expect(n.innerHTML).toBe('<b>hi</b>');
  });
  it('leaves the class and content alone when not given', () => {
    const n = LW.UI.el('div');
    expect(n.className).toBe('');
    expect(n.innerHTML).toBe('');
    expect(LW.UI.el('div', null, '').innerHTML).toBe('');
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

describe('sound', () => {
  it('is on unless the player turned it off', () => {
    expect(LW.sound.on).toBe(true);
    localStorage.setItem('lw-sound', 'off');
    expect(loadShared('core.js', 'ui.js').sound.on).toBe(false);
    localStorage.setItem('lw-sound', 'on');
    expect(loadShared('core.js', 'ui.js').sound.on).toBe(true);
  });
  it('setSound sets the flag and remembers it', () => {
    LW.setSound(false);
    expect(LW.sound.on).toBe(false);
    expect(localStorage.getItem('lw-sound')).toBe('off');
    LW.setSound(true);
    expect(localStorage.getItem('lw-sound')).toBe('on');
  });
  it('plays a sequence of tones one after the other, with their waveforms', () => {
    const made = fakeAudio();
    LW.sfx('heal'); // two triangle tones: 520 Hz for .08 s, 780 Hz for .14 s
    expect(made.oscillators).toHaveLength(2);
    const [a, b] = made.oscillators;
    expect([a.type, a.frequency.value, a.started, a.stopped]).toEqual(['triangle', 520, 10, 10.08]);
    expect([b.type, b.frequency.value]).toEqual(['triangle', 780]);
    expect(b.started).toBeCloseTo(10.08);
    expect(b.stopped).toBeCloseTo(10.22);
    expect(made.gains[0].gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, 10.08);
  });
  it('defaults to a square wave', () => {
    const made = fakeAudio();
    LW.sfx('select');
    expect(made.oscillators[0].type).toBe('square');
    expect(made.oscillators[0].frequency.value).toBe(660);
  });
  it('plays four tones for a win and three for a loss', () => {
    const made = fakeAudio();
    LW.sfx('win');
    expect(made.oscillators).toHaveLength(4);
    LW.sfx('lose');
    expect(made.oscillators).toHaveLength(7);
  });
  it('makes the audio context once and reuses it', () => {
    const made = fakeAudio();
    LW.sfx('select'); LW.sfx('roll');
    expect(made.contexts).toBe(1);
  });
  it('is silent when switched off, or for a name it does not know', () => {
    const made = fakeAudio();
    LW.sfx('nonsense');
    LW.setSound(false);
    LW.sfx('select');
    expect(made.contexts).toBe(0);
  });
  it('does not throw when audio is unavailable', () => {
    expect(() => LW.sfx('select')).not.toThrow();
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
  it('reuses the element and restarts the timer', () => {
    vi.useFakeTimers();
    LW.UI.toast('one');
    vi.advanceTimersByTime(2000);
    LW.UI.toast('two');
    expect(document.querySelectorAll('.lw-toast')).toHaveLength(1);
    vi.advanceTimersByTime(2000);
    expect(document.querySelector('.lw-toast').classList.contains('show')).toBe(true);
    vi.advanceTimersByTime(700);
    expect(document.querySelector('.lw-toast').classList.contains('show')).toBe(false);
    expect(document.querySelector('.lw-toast').textContent).toBe('two');
  });
  it('shows text, not markup', () => {
    LW.UI.toast('<b>x</b>');
    expect(document.querySelector('.lw-toast b')).toBeNull();
  });
});

describe('LW.UI.pickRandom', () => {
  beforeEach(() => { LW.sound.on = false; vi.useFakeTimers(); });

  it('opens a dialog with a hundred squares, the middle one focused', () => {
    LW.UI.pickRandom();
    const panel = document.querySelector('.lwo-panel');
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(panel.querySelector('h2').textContent).toBe('Random Number Table');
    expect(panel.querySelector('.lwo-note').textContent).toBe('Point at a square.');
    const cells = panel.querySelectorAll('.rnt-cell');
    expect(cells).toHaveLength(100);
    expect(document.activeElement).toBe(cells[44]);
  });
  it('shows the title and note given, escaped', () => {
    LW.UI.pickRandom({ title: 'A <b>', note: 'Go & pick' });
    expect(document.querySelector('.lwo-panel h2').innerHTML).toBe('A &lt;b&gt;');
    expect(document.querySelector('.lwo-note').innerHTML).toBe('Go &amp; pick');
  });
  it('reveals the Random Number under the square clicked, then resolves with it and closes', async () => {
    dice(LW, 7);
    const p = LW.UI.pickRandom();
    const cell = document.querySelectorAll('.rnt-cell')[10];
    cell.click();
    expect(cell.textContent).toBe('7');
    expect(cell.classList.contains('picked')).toBe(true);
    expect(document.querySelector('.rnt').classList.contains('done')).toBe(true);
    expect(document.querySelector('.lwo')).not.toBeNull(); // stays up while the number is shown
    await vi.advanceTimersByTimeAsync(850);
    expect(await p).toBe(7);
    expect(document.querySelector('.lwo')).toBeNull();
  });
  it('resolves 0 as 0', async () => {
    dice(LW, 0);
    const p = LW.UI.pickRandom();
    document.querySelectorAll('.rnt-cell')[0].click();
    await vi.advanceTimersByTimeAsync(850);
    expect(await p).toBe(0);
  });
  it('takes only the first click', async () => {
    dice(LW, 3); // a second draw would throw
    const p = LW.UI.pickRandom();
    const cells = document.querySelectorAll('.rnt-cell');
    cells[1].click(); cells[2].click();
    expect(cells[2].textContent).toBe('');
    await vi.advanceTimersByTimeAsync(850);
    expect(await p).toBe(3);
  });
});

describe('LW.UI.createHero', () => {
  beforeEach(() => { LW.sound.on = false; vi.useFakeTimers(); });
  const panel = () => document.querySelector('.lwo-hero');
  const disc = (id) => panel().querySelector(`.hero-disc[data-id=${id}]`);
  const go = () => panel().querySelector('[data-act=go]');
  const FIVE = ['camouflage', 'hunting', 'sixthSense', 'tracking', 'healing'];

  it('shows the book, a button for each Kai Discipline, and Begin disabled', () => {
    LW.UI.createHero({ title: 'The <Book>' });
    expect(panel().querySelector('.lwo-eyebrow').innerHTML).toBe('The &lt;Book&gt;');
    expect(panel().querySelectorAll('.hero-disc')).toHaveLength(10);
    expect(disc('healing').getAttribute('aria-pressed')).toBe('false');
    expect(go().disabled).toBe(true);
    expect(panel().querySelector('.hero-count').textContent).toBe('0 of 5 disciplines');
  });
  it('picks disciplines, counts them, and disables the rest at five', () => {
    LW.UI.createHero({ title: 'x' });
    FIVE.slice(0, 3).forEach((d) => disc(d).click());
    expect(panel().querySelector('.hero-count').textContent).toBe('3 of 5 disciplines');
    expect(disc('camouflage').getAttribute('aria-pressed')).toBe('true');
    FIVE.slice(3).forEach((d) => disc(d).click());
    expect(disc('mindblast').disabled).toBe(true);
    expect(disc('healing').disabled).toBe(false);
    disc('healing').click(); // un-pick
    expect(disc('healing').getAttribute('aria-pressed')).toBe('false');
    expect(disc('mindblast').disabled).toBe(false);
  });
  it('rolls a score by hand: shows the sum, locks the button', async () => {
    LW.UI.createHero({ title: 'x' });
    let n = 0;
    LW.rand10 = () => (n++ === 0 ? 4 : 0); // the first draw is the score, the rest the spinning
    const btn = panel().querySelector('[data-roll=cs]');
    btn.click();
    await vi.advanceTimersByTimeAsync(1000);
    expect(btn.querySelector('b').textContent).toBe('14');
    expect(btn.disabled).toBe(true);
    expect(btn.classList.contains('rolled')).toBe(true);
  });
  it('enables Begin only with five disciplines and both scores, and then returns the hero', async () => {
    const p = LW.UI.createHero({ title: 'x' });
    FIVE.forEach((d) => disc(d).click());
    expect(go().disabled).toBe(true);
    LW.rand10 = () => 5;
    panel().querySelector('[data-roll=cs]').click();
    panel().querySelector('[data-roll=ep]').click();
    await vi.advanceTimersByTimeAsync(1000);
    expect(go().disabled).toBe(false);
    go().click();
    const hero = await p;
    expect(hero.cs).toBe(15);
    expect(hero.ep).toBe(25);
    expect(hero.disciplines).toEqual(FIVE);
    expect(hero.gold).toBe(5);
    expect(document.querySelector('.lwo')).toBeNull();
  });
  it('"Choose for me" rolls both and picks five at random', async () => {
    const p = LW.UI.createHero({ title: 'x' });
    let k = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => (k++ % 10) / 10); // walks the discipline list
    LW.rand10 = () => 3;
    panel().querySelector('[data-act=auto]').click();
    expect(go().disabled).toBe(false);
    expect(panel().querySelector('.hero-count').textContent).toBe('5 of 5 disciplines');
    go().click();
    const hero = await p;
    expect(hero.disciplines).toHaveLength(5);
    expect(new Set(hero.disciplines).size).toBe(5);
    expect(hero.cs).toBe(13);
    expect(hero.ep).toBe(23);
  });
  it('keeps picks made before "Choose for me"', async () => {
    const p = LW.UI.createHero({ title: 'x' });
    disc('mindblast').click();
    let k = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => (k++ % 10) / 10);
    LW.rand10 = () => 0;
    panel().querySelector('[data-act=auto]').click();
    go().click();
    expect((await p).disciplines).toContain('mindblast');
  });
  it('gives the bonus item to the hero when the book has one', async () => {
    const p = LW.UI.createHero({ title: 'x', bonusItem: true });
    let k = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => (k++ % 10) / 10);
    LW.rand10 = () => 9; // gold 9; the bonus table's 9 is 12 more gold
    panel().querySelector('[data-act=auto]').click();
    go().click();
    const hero = await p;
    expect(hero.found).toBe('gold');
    expect(hero.gold).toBe(21);
  });
});

describe('LW.UI.chartHTML', () => {
  beforeEach(() => {
    LW = loadShared('core.js', 'rules-series.js', 'ui.js');
  });
  const game = (over = {}) => ({ hero: Object.assign({
    cs: 15, ep: 18, epMax: 25, disciplines: ['healing', 'weaponskill'], weaponskill: 'axe', weapons: ['axe'],
    backpack: [], special: ['map'], meals: 0, gold: 12,
  }, over) });
  const dom = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d; };

  it('shows COMBAT SKILL with its working, ENDURANCE out of its maximum, and gold', () => {
    const d = dom(LW.UI.chartHTML(game()));
    const stats = [...d.querySelectorAll('.chart-stat')];
    expect(stats[0].querySelector('.v').textContent).toBe('17');
    expect(stats[0].querySelector('.n').textContent).toBe('+2 Weaponskill');
    expect(stats[1].querySelector('.v').textContent).toBe('18/25');
    expect(stats[1].querySelector('.chart-bar i').getAttribute('style')).toBe('width:72%');
    expect(stats[2].querySelector('.v').textContent).toBe('12');
  });
  it('shows a fixed space when there is no modifier', () => {
    const d = dom(LW.UI.chartHTML(game({ weaponskill: null, disciplines: ['healing'] })));
    expect(d.querySelector('.chart-stat .n').textContent.trim()).toBe('');
  });
  it('never shows negative ENDURANCE or a negative bar', () => {
    const d = dom(LW.UI.chartHTML(game({ ep: -3 })));
    expect(d.querySelectorAll('.chart-stat .v')[1].textContent).toBe('0/25');
    expect(d.querySelector('.chart-bar i').getAttribute('style')).toBe('width:0%');
  });
  it('lists disciplines, with the Weaponskill weapon', () => {
    const d = dom(LW.UI.chartHTML(game()));
    const text = d.querySelector('.discs').textContent;
    expect(text).toContain('Healing');
    expect(text).toContain('Weaponskill (Axe)');
  });
  it('lists weapons with a Drop button, and says what no weapon costs', () => {
    const d = dom(LW.UI.chartHTML(game()));
    expect(d.querySelector('[data-act=drop]').dataset.id).toBe('axe');
    expect(d.querySelector('h3 small').textContent).toBeTruthy();
    const none = dom(LW.UI.chartHTML(game({ weapons: [], weaponskill: null, disciplines: ['healing'] })));
    expect(none.textContent).toContain('None: −4 Combat Skill');
    expect(none.querySelector('[data-act=drop]')).toBeNull();
  });
  it('counts the Backpack with Meals in it, and lists Meals and potions with counts', () => {
    const d = dom(LW.UI.chartHTML(game({ meals: 2, backpack: ['potion', 'potion', 'rope'] })));
    const headings = [...d.querySelectorAll('h3')].map((h) => h.textContent);
    expect(headings).toContain('Backpack 5/8');
    expect(d.textContent).toContain('Meal ×2');
    expect(d.textContent).toContain('Laumspur Potion ×2');
  });
  it('shows an empty Backpack as Empty and a single Meal without a count', () => {
    expect(dom(LW.UI.chartHTML(game())).textContent).toContain('Empty');
    expect(dom(LW.UI.chartHTML(game({ meals: 1 }))).textContent).not.toContain('×1');
  });
  it('offers Drink +4 when hurt and disables it at full ENDURANCE', () => {
    const hurt = dom(LW.UI.chartHTML(game({ backpack: ['potion'] })));
    expect(hurt.querySelector('[data-act=potion]').disabled).toBe(false);
    const full = dom(LW.UI.chartHTML(game({ backpack: ['potion'], ep: 25 })));
    expect(full.querySelector('[data-act=potion]').disabled).toBe(true);
    expect(dom(LW.UI.chartHTML(game())).querySelector('[data-act=potion]')).toBeNull();
  });
  it('lists Special Items by name', () => {
    expect(dom(LW.UI.chartHTML(game())).textContent).toContain('Map of Sommerlund');
  });
});

describe('LW.UI.bindChart', () => {
  function setup() {
    const node = document.createElement('div');
    node.innerHTML = '<button data-act="potion">p</button><button data-act="drop" data-id="axe">d</button><span class="plain">x</span>';
    document.body.appendChild(node);
    const game = { usePotion: vi.fn(() => true), dropWeapon: vi.fn() };
    const onChange = vi.fn();
    LW.UI.bindChart(node, game, onChange);
    LW.sound.on = false;
    return { node, game, onChange };
  }
  it('drinks a potion and tells the page', () => {
    const { node, game, onChange } = setup();
    node.querySelector('[data-act=potion]').click();
    expect(game.usePotion).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledTimes(1);
  });
  it('does not call onChange when no potion was drunk', () => {
    const { node, game, onChange } = setup();
    game.usePotion.mockReturnValue(false);
    node.querySelector('[data-act=potion]').click();
    expect(onChange).not.toHaveBeenCalled();
  });
  it('drops the weapon named by the button', () => {
    const { node, game, onChange } = setup();
    node.querySelector('[data-act=drop]').click();
    expect(game.dropWeapon).toHaveBeenCalledWith('axe');
    expect(onChange).toHaveBeenCalledTimes(1);
  });
  it('ignores clicks elsewhere', () => {
    const { node, game, onChange } = setup();
    node.querySelector('.plain').click();
    node.click();
    expect(game.usePotion).not.toHaveBeenCalled();
    expect(game.dropWeapon).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});

// @vitest-environment jsdom
// shared/battle.js: the menu-driven battle screen, played by clicking its menu with fake timers.
// The CRT cells used (core-crt.test.js checks the table): ratio 0 with a 5 gives foe -7 / hero -2,
// with a 1 foe -3 / hero -5.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadShared, dice } from './helpers.js';

let LW;
beforeEach(() => {
  document.body.innerHTML = '';
  LW = loadShared('core.js', 'rules-series.js', 'ui.js', 'battle.js');
  LW.sound.on = false;
  // no canvas in jsdom: the wipe only needs a context that takes fillRect, and the art is stubbed
  HTMLCanvasElement.prototype.getContext = () => ({ fillRect() {} });
  window.matchMedia = () => ({ matches: true }); // reduced motion: no typing, no spinning
  LW.Art = { scene: () => ({ toDataURL: () => 'data:,scene' }), sprite: (name) => { const d = document.createElement('div'); d.dataset.sprite = name; return d; } };
  vi.useFakeTimers();
});
afterEach(() => { vi.useRealTimers(); });

const mkHero = (over = {}) => Object.assign({
  name: 'Lone Wolf', cs: 15, ep: 20, epMax: 20, disciplines: [], weapons: ['axe'], backpack: [], special: [], meals: 0, gold: 0,
}, over);
const foe = (over = {}) => Object.assign({ name: 'Orc', cs: 15, ep: 6, sprite: 'giak' }, over);

/* Plays the screen: after each pause, reads the message and clicks the next scripted menu item
   (the first whose label starts with it), "Fight" when the script runs out. Returns what the run
   returned, the messages seen and the menus offered. */
async function play(opts, script = []) {
  const p = LW.Battle.run(opts);
  let done = false, result;
  p.then((r) => { done = true; result = r; });
  const said = [], menus = [], queue = script.slice();
  for (let i = 0; i < 800 && !done; i++) {
    await vi.advanceTimersByTimeAsync(400);
    const msg = document.querySelector('.lwb-msg');
    if (msg && msg.textContent && said[said.length - 1] !== msg.textContent) said.push(msg.textContent);
    const btns = [...document.querySelectorAll('.lwb-opt')];
    if (btns.some((b) => !b.disabled)) {
      menus.push(btns.map((b) => ({ label: b.textContent, disabled: b.disabled })));
      const want = queue.shift() || 'Fight';
      const b = btns.find((x) => !x.disabled && x.textContent.startsWith(want)) || btns.find((x) => !x.disabled);
      b.click();
    }
  }
  await p;
  return { result, said, menus };
}

describe('LW.Battle.run: a plain fight', () => {
  it('wins when the foe\'s ENDURANCE runs out, and both sides lose what the table says', async () => {
    dice(LW, 5);
    const hero = mkHero();
    const { result, said } = await play({ hero, enemies: [foe()], scene: 'forest' });
    expect(result).toEqual({ outcome: 'win', rounds: 1 });
    expect(hero.ep).toBe(18); // the foe's killing round still costs him 2
    expect(said).toContain('An Orc attacks!');
    expect(said.some((s) => s.startsWith('You strike! The Orc loses 6 Endurance.'))).toBe(true); // 7 dealt, 6 left
    expect(said).toContain('The Orc is slain.');
    expect(said[said.length - 1]).toBe('You have won the fight.');
  });
  it('removes the screen when done', async () => {
    dice(LW, 5);
    await play({ hero: mkHero(), enemies: [foe()], scene: 'forest' });
    expect(document.querySelector('.lwb')).toBeNull();
  });
  it('fights on, round after round, until one side is down', async () => {
    dice(LW, 1, 1, 5); // 3/5 twice: foe 10 -> 7 -> 4; hero 20 -> 15 -> 10; then 7/2 finishes it
    const hero = mkHero();
    const { result } = await play({ hero, enemies: [foe({ ep: 10 })], scene: 'forest' });
    expect(result).toEqual({ outcome: 'win', rounds: 3 });
    expect(hero.ep).toBe(8);
  });
  it('dies at 0 ENDURANCE and the fight ends', async () => {
    dice(LW, 1); // foe -3, hero -5
    const hero = mkHero({ ep: 4 });
    const { result, said } = await play({ hero, enemies: [foe({ ep: 20 })], scene: 'forest' });
    expect(result.outcome).toBe('dead');
    expect(hero.ep).toBeLessThanOrEqual(0);
    expect(said[said.length - 1]).toBe('Your life and your quest end here.');
  });
  it('takes only the ENDURANCE the hero has left, never below zero in the report', async () => {
    dice(LW, 1);
    const hero = mkHero({ ep: 4 });
    await play({ hero, enemies: [foe({ ep: 20 })], scene: 'forest' });
    expect(hero.ep).toBe(0);
  });
  it('uses "A" or "An" by the foe\'s name', async () => {
    dice(LW, 5);
    const { said } = await play({ hero: mkHero(), enemies: [foe({ name: 'Giak' })], scene: 'forest' });
    expect(said).toContain('A Giak attacks!');
  });
  it('shows the hero\'s ratio and scores on the HUD while the menu is up', async () => {
    dice(LW, 5);
    const seen = {};
    const p = LW.Battle.run({ hero: mkHero({ ep: 17 }), enemies: [foe({ cs: 13 })], scene: 'forest' });
    let done = false; p.then(() => { done = true; });
    for (let i = 0; i < 100 && !done; i++) {
      await vi.advanceTimersByTimeAsync(400);
      const b = document.querySelector('.lwb-opt:not(:disabled)');
      if (b) {
        seen.ep = document.querySelector('[data-h=ep]').textContent;
        seen.ratio = document.querySelector('[data-h=ratio]').textContent;
        seen.plate = document.querySelector('[data-f=name]').textContent;
        seen.foeEp = document.querySelector('[data-f=ep]').textContent;
        b.click();
      }
    }
    expect(seen).toEqual({ ep: '17/20', ratio: '+2', plate: 'Orc  CS 13', foeEp: 'EP 6' });
  });
  it('gives the scene and sprite to the Art module', async () => {
    dice(LW, 5);
    const sprite = vi.spyOn(LW.Art, 'sprite');
    const { result } = await play({ hero: mkHero(), enemies: [foe({ sprite: 'kraan' })], scene: 'night' });
    expect(sprite).toHaveBeenCalledWith('kraan');
    expect(result.outcome).toBe('win');
  });
});

describe('LW.Battle.run: several foes', () => {
  it('fights them one after the other', async () => {
    dice(LW, 5, 5); // each dies in one round
    const hero = mkHero();
    const { result, said } = await play({ hero, enemies: [foe({ name: 'Giak' }), foe({ name: 'Orc' })], scene: 'forest' });
    expect(result).toEqual({ outcome: 'win', rounds: 2 });
    expect(said).toContain('A Giak attacks!');
    expect(said).toContain('An Orc takes its place!');
    expect(hero.ep).toBe(16);
  });
  it('stops at the first death', async () => {
    dice(LW, 1);
    const { result, said } = await play({ hero: mkHero({ ep: 3 }), enemies: [foe({ ep: 30 }), foe({ name: 'Second' })], scene: 'forest' });
    expect(result.outcome).toBe('dead');
    expect(said.some((s) => /Second/.test(s))).toBe(false);
  });
});

describe('LW.Battle.run: modifiers', () => {
  it('announces and applies the fight\'s COMBAT SKILL modifier', async () => {
    dice(LW, 5);
    const { said } = await play({ hero: mkHero(), enemies: [foe()], scene: 'forest', csMod: -2, csNote: 'Caught in the mud' });
    expect(said).toContain('Caught in the mud: Combat Skill −2.');
  });
  it('announces a bonus with a plus sign', async () => {
    dice(LW, 5);
    const { said } = await play({ hero: mkHero(), enemies: [foe()], scene: 'forest', csMod: 2, csNote: 'Disarmed foe' });
    expect(said).toContain('Disarmed foe: Combat Skill +2.');
  });
  it('says a Mindforce attack breaks on Mindshield, or gnaws', async () => {
    dice(LW, 5);
    const shielded = await play({ hero: mkHero({ disciplines: ['mindshield'] }), enemies: [foe({ mindforce: 2 })], scene: 'forest' });
    expect(shielded.said).toContain('Its mind-attack breaks against your Mindshield.');
    dice(LW, 5);
    const open = await play({ hero: mkHero(), enemies: [foe({ mindforce: 2 })], scene: 'forest' });
    expect(open.said).toContain('Its mind-attack gnaws at your will. Combat Skill −2.');
  });
  it('lowers the ratio by Mindforce: the same roll costs the unshielded hero more', async () => {
    // ratio -2 with a 5 is 6/3 (ratio 0 gives 7/2): the hero ends on 17 where a shielded one ends on 18
    dice(LW, 5);
    const hurt = mkHero();
    await play({ hero: hurt, enemies: [foe({ mindforce: 2 })], scene: 'forest' });
    expect(hurt.ep).toBe(17);
    dice(LW, 5);
    const safe = mkHero({ disciplines: ['mindshield'] });
    await play({ hero: safe, enemies: [foe({ mindforce: 2 })], scene: 'forest' });
    expect(safe.ep).toBe(18);
  });
});

describe('LW.Battle.run: Mindblast', () => {
  it('is on from the start for a hero with it, and can be switched off', async () => {
    dice(LW, 5, 5, 5);
    const hero = mkHero({ disciplines: ['mindblast'] });
    const { menus, said } = await play({ hero, enemies: [foe({ ep: 20 })], scene: 'forest' }, ['Mindblast', 'Fight', 'Evade']);
    expect(menus[0].map((m) => m.label)).toEqual(['Fight', 'Mindblast: on', 'Laumspur', 'Evade']);
    expect(said).toContain('You let the Mindblast fade.');
    expect(menus[1][1].label).toBe('Mindblast: off');
  });
  it('has no Mindblast item without the discipline', async () => {
    dice(LW, 5);
    const { menus } = await play({ hero: mkHero(), enemies: [foe()], scene: 'forest' });
    expect(menus[0].map((m) => m.label)).toEqual(['Fight', 'Laumspur', 'Evade']);
  });
  it('cannot reach an immune foe, and does not count there', async () => {
    dice(LW, 5, 5, 5);
    const hero = mkHero({ disciplines: ['mindblast'] });
    const { menus, said } = await play({ hero, enemies: [foe({ immune: true, ep: 20 })], scene: 'forest' }, ['Mindblast', 'Fight']);
    expect(said).toContain('The Orc has no mind you can reach.');
    expect(menus[0][1].label).toBe('Mindblast: off');
  });
});

describe('LW.Battle.run: Laumspur', () => {
  it('is disabled without a potion or at full ENDURANCE', async () => {
    dice(LW, 5);
    const { menus } = await play({ hero: mkHero({ backpack: ['potion'] }), enemies: [foe()], scene: 'forest' });
    expect(menus[0][1]).toEqual({ label: 'Laumspur', disabled: true }); // full ENDURANCE
    dice(LW, 5);
    const none = await play({ hero: mkHero({ ep: 10 }), enemies: [foe()], scene: 'forest' });
    expect(none.menus[0][1].disabled).toBe(true);
  });
  it('heals 4 without costing a round, uses up the potion, and never above the maximum', async () => {
    dice(LW, 5);
    const hero = mkHero({ ep: 10, backpack: ['potion', 'potion'] });
    const { result, said } = await play({ hero, enemies: [foe()], scene: 'forest' }, ['Laumspur', 'Fight']);
    expect(said).toContain('You swallow the Laumspur. 4 Endurance restored.');
    expect(hero.backpack).toEqual(['potion']);
    expect(hero.ep).toBe(12); // 10 + 4 - 2 from the round
    expect(result.rounds).toBe(1);
    dice(LW, 5);
    const near = mkHero({ ep: 18, backpack: ['potion'] });
    await play({ hero: near, enemies: [foe()], scene: 'forest' }, ['Laumspur', 'Fight']);
    expect(near.ep).toBe(18); // 20 at most, then -2
  });
});

describe('LW.Battle.run: evading', () => {
  it('is closed until the round the book names', async () => {
    dice(LW, 5, 5);
    const hero = mkHero();
    const { menus } = await play({ hero, enemies: [foe({ ep: 30 })], scene: 'forest', evade: { after: 1, to: 'x' } }, ['Fight', 'Evade']);
    expect(menus[0].find((m) => m.label.startsWith('Evade'))).toEqual({ label: 'Evade (round 2)', disabled: true });
    expect(menus[1].find((m) => m.label === 'Evade').disabled).toBe(false);
  });
  it('is never open where the book offers no evasion', async () => {
    dice(LW, 5);
    const { menus } = await play({ hero: mkHero(), enemies: [foe()], scene: 'forest' });
    expect(menus[0].find((m) => m.label === 'Evade').disabled).toBe(true);
  });
  it('applies only the hero\'s loss and ends the fight with "evade"', async () => {
    dice(LW, 5, 5); // round 1 fought: foe 30 -> 23, hero 20 -> 18; round 2 evaded: hero -2 only
    const hero = mkHero();
    const { result, said } = await play({ hero, enemies: [foe({ ep: 30 })], scene: 'forest', evade: { after: 1, to: 'x' } }, ['Fight', 'Evade']);
    expect(result).toEqual({ outcome: 'evade', rounds: 2 });
    expect(hero.ep).toBe(16);
    expect(said).toContain('You break away. The Orc catches you for 2 as you turn.');
    expect(said[said.length - 1]).toBe('You escape the fight.');
  });
  it('can open from the first round (after: 0)', async () => {
    dice(LW, 8); // ratio 0, roll 8 is 11/0 in the table: he gets away untouched
    const hero = mkHero();
    const { result, said } = await play({ hero, enemies: [foe({ ep: 30 })], scene: 'forest', evade: { after: 0, to: 'x' } }, ['Evade']);
    expect(result.outcome).toBe('evade');
    expect(hero.ep).toBe(20);
    expect(said).toContain('You break away untouched.');
  });
  it('can kill him as he turns away', async () => {
    dice(LW, 1); // hero loses 5
    const hero = mkHero({ ep: 4 });
    const { result } = await play({ hero, enemies: [foe({ ep: 30 })], scene: 'forest', evade: { after: 0, to: 'x' } }, ['Evade']);
    expect(result.outcome).toBe('dead');
    expect(hero.ep).toBe(0);
  });
});

describe('LW.Battle.run: focus and keys', () => {
  it('gives focus back to what had it before', async () => {
    const before = document.createElement('button');
    document.body.appendChild(before);
    before.focus();
    dice(LW, 5);
    await play({ hero: mkHero(), enemies: [foe()], scene: 'forest' });
    expect(document.activeElement).toBe(before);
  });
  it('focuses the first live menu item, and arrow keys move between them', async () => {
    dice(LW, 5);
    const p = LW.Battle.run({ hero: mkHero({ ep: 10, backpack: ['potion'] }), enemies: [foe()], scene: 'forest' });
    let tries = 0;
    while (!document.querySelector('.lwb-opt') && tries++ < 50) await vi.advanceTimersByTimeAsync(400);
    const live = [...document.querySelectorAll('.lwb-opt:not(:disabled)')];
    expect(document.activeElement).toBe(live[0]);
    const cmd = document.querySelector('.lwb-cmd');
    cmd.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(live[1]);
    cmd.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement).toBe(live[0]);
    cmd.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement).toBe(live[live.length - 1]); // wraps
    live[0].click();
    for (let i = 0; i < 100; i++) { await vi.advanceTimersByTimeAsync(400); const b = document.querySelector('.lwb-opt:not(:disabled)'); if (b) b.click(); }
    await p;
  });
});

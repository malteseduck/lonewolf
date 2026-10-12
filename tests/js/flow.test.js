// shared/flow.js: taking a choice (maybe through the Random Number Table) and fighting a section's fight.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadShared } from './helpers.js';

let LW;
beforeEach(() => {
  LW = loadShared('core.js', 'rules-series.js', 'flow.js');
  LW.UI = { pickRandom: vi.fn(async () => 3), toast: vi.fn() };
  LW.sfx = vi.fn();
  LW.Battle = { run: vi.fn() };
});

function game(sections, disciplines = []) {
  const book = { start: '1', sections: Object.assign({ 1: { choices: [] }, 2: {}, a: {}, b: {} }, sections) };
  const g = new LW.Game(book, 'flow-test');
  g.start({ name: 'Lone Wolf', cs: 15, ep: 20, epMax: 20, disciplines, weapons: ['axe'], backpack: [], special: [], meals: 1, gold: 0 });
  return g;
}

describe('LW.Flow.pick', () => {
  it('takes a plain choice to its section and plays the page sound', async () => {
    const g = game({});
    await LW.Flow.pick(g, { text: 'On', to: '2' });
    expect(g.s.at).toBe('2');
    expect(g.s.trail[1].via).toBe('On');
    expect(LW.sfx).toHaveBeenCalledWith('page');
    expect(LW.UI.pickRandom).not.toHaveBeenCalled();
  });
  it('goes through the Random Number Table for a random choice and follows the table', async () => {
    const g = game({});
    const choice = { text: 'Leap', random: { table: [[4, 'a'], [9, 'b']] } };
    await LW.Flow.pick(g, choice);
    expect(LW.UI.pickRandom).toHaveBeenCalledWith({ note: 'Point at a square.' });
    expect(g.s.at).toBe('a');
    expect(LW.UI.toast).toHaveBeenCalledWith('You picked 3.');
  });
  it('follows a high roll to the later row', async () => {
    LW.UI.pickRandom = vi.fn(async () => 8);
    const g = game({});
    await LW.Flow.pick(g, { text: 'Leap', random: { table: [[4, 'a'], [9, 'b']] } });
    expect(g.s.at).toBe('b');
  });
  it('adds a discipline\'s bonus, says so in the note and in the toast', async () => {
    const g = game({}, ['camouflage', 'tracking']);
    const choice = { text: 'Creep', random: { table: [[4, 'a'], [9, 'b']], mod: [{ disc: 'camouflage', plus: 2 }, { disc: 'hunting', plus: 5 }] } };
    await LW.Flow.pick(g, choice);
    expect(LW.UI.pickRandom).toHaveBeenCalledWith({ note: 'Point at a square. Camouflage adds 2.' });
    expect(LW.UI.toast).toHaveBeenCalledWith('You picked 3, +2 makes 5.');
    expect(g.s.at).toBe('b'); // 3 + 2 = 5 is past the first row
  });
  it('lists several bonuses in the note', async () => {
    const g = game({}, ['camouflage', 'hunting']);
    await LW.Flow.pick(g, { text: 'x', random: { table: [[9, 'a']], mod: [{ disc: 'camouflage', plus: 2 }, { disc: 'hunting', plus: 1 }] } });
    expect(LW.UI.pickRandom.mock.calls[0][0].note).toBe('Point at a square. Camouflage adds 2. Hunting adds 1.');
  });
  it('does not wait for the table until it has resolved', async () => {
    let release;
    LW.UI.pickRandom = vi.fn(() => new Promise((r) => { release = r; }));
    const g = game({});
    const p = LW.Flow.pick(g, { text: 'x', random: { table: [[9, 'a']] } });
    await Promise.resolve();
    expect(g.s.at).toBe('1');
    release(1);
    await p;
    expect(g.s.at).toBe('a');
  });
});

describe('LW.Flow.fight', () => {
  const fightSec = { scene: 'forest', combat: { enemies: [{ name: 'Foe', cs: 10, ep: 10 }], evade: { after: 1, to: 'b' }, csMod: -2, csNote: 'Ambush' } };

  it('hands the fight to the battle screen with the hero, the foes, the scene, evasion and the modifier', async () => {
    LW.Battle.run.mockResolvedValue({ outcome: 'win', rounds: 3 });
    const g = game({ 2: fightSec });
    g.go('2');
    await LW.Flow.fight(g);
    expect(LW.Battle.run).toHaveBeenCalledWith({
      hero: g.hero, enemies: fightSec.combat.enemies, scene: 'forest', evade: { after: 1, to: 'b' }, csMod: -2, csNote: 'Ambush',
    });
  });
  it('marks the fight won on a win, and returns the outcome', async () => {
    LW.Battle.run.mockResolvedValue({ outcome: 'win', rounds: 3 });
    const g = game({ 2: fightSec });
    g.go('2');
    expect(await LW.Flow.fight(g)).toBe('win');
    expect(g.combatPending).toBe(false);
  });
  it('takes the evade route on an evasion, with the reason in the trail', async () => {
    LW.Battle.run.mockResolvedValue({ outcome: 'evade', rounds: 2 });
    const g = game({ 2: fightSec });
    g.go('2');
    expect(await LW.Flow.fight(g)).toBe('evade');
    expect(g.s.at).toBe('b');
    expect(g.s.trail[g.s.trail.length - 1].via).toBe('You break away from the fight');
  });
  it('on death leaves the fight unwon, in place, and saves', async () => {
    LW.Battle.run.mockImplementation(async ({ hero }) => { hero.ep = 0; return { outcome: 'dead', rounds: 4 }; });
    const g = game({ 2: fightSec });
    g.go('2');
    const save = vi.spyOn(g, 'save');
    expect(await LW.Flow.fight(g)).toBe('dead');
    expect(g.s.at).toBe('2');
    expect(g.combatPending).toBe(true);
    expect(g.dead).toBe(true);
    expect(save).toHaveBeenCalled();
  });
});

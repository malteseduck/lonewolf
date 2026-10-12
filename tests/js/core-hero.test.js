// shared/core.js: making a hero, the discipline hooks, imported conditions, and COMBAT SKILL.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadShared, dice } from './helpers.js';

let LW;
beforeEach(() => { LW = loadShared('core.js'); });

const hero = (over = {}) => Object.assign({
  cs: 15, ep: 20, epMax: 20, disciplines: [], weaponskill: null, weapons: ['axe'], backpack: [], special: [], meals: 0, gold: 0,
}, over);




describe('LW.makeHero', () => {
  it('sets COMBAT SKILL to 10 + roll and ENDURANCE to 20 + roll', () => {
    dice(LW, 0);
    const h = LW.makeHero({ csRoll: 7, epRoll: 3, disciplines: ['healing'] });
    expect(h.cs).toBe(17);
    expect(h.ep).toBe(23);
    expect(h.epMax).toBe(23);
  });
  it('gives Book 1\'s kit: an Axe, one Meal, the map, gold equal to a Random Number', () => {
    dice(LW, 6);
    const h = LW.makeHero({ csRoll: 0, epRoll: 0, disciplines: [] });
    expect(h.weapons).toEqual(['axe']);
    expect(h.meals).toBe(1);
    expect(h.special).toEqual(['map']);
    expect(h.backpack).toEqual([]);
    expect(h.gold).toBe(6);
    expect(h.name).toBe('Lone Wolf');
  });
});


describe('LW.meets', () => {
  it('wants any of a list of disciplines, or all with every', () => {
    const h = hero({ disciplines: ['healing'] });
    expect(LW.meets(h, { disc: 'healing' })).toBe(true);
    expect(LW.meets(h, { disc: 'hunting' })).toBe(false);
    expect(LW.meets(h, { disc: ['hunting', 'healing'] })).toBe(true);
    expect(LW.meets(h, { disc: ['hunting', 'healing'], every: true })).toBe(false);
    expect(LW.meets(hero({ disciplines: ['hunting', 'healing'] }), { disc: ['hunting', 'healing'], every: true })).toBe(true);
  });
  it('wants at least the rank', () => {
    const h = hero({ disciplines: ['a', 'b', 'c'] });
    expect(LW.meets(h, { rank: 3 })).toBe(true);
    expect(LW.meets(h, { rank: 4 })).toBe(false);
  });
  it('wants any one of the items held', () => {
    const h = hero({ backpack: ['rope'] });
    expect(LW.meets(h, { item: 'rope' })).toBe(true);
    expect(LW.meets(h, { item: ['lantern', 'rope'] })).toBe(true);
    expect(LW.meets(h, { item: ['lantern'] })).toBe(false);
  });
  it('wants Endurance within [lo, hi], both ends inclusive', () => {
    const h = hero({ ep: 10 });
    expect(LW.meets(h, { ep: [10, 12] })).toBe(true);
    expect(LW.meets(h, { ep: [5, 10] })).toBe(true);
    expect(LW.meets(h, { ep: [11, 20] })).toBe(false);
    expect(LW.meets(h, { ep: [1, 9] })).toBe(false);
  });
});


describe('LW.heroCS (the Kai default in core.js)', () => {
  it('is the base score with no modifiers and a weapon', () => {
    const cs = LW.heroCS(hero());
    expect(cs.total).toBe(15);
    expect(cs.parts).toEqual([{ label: 'Base', n: 15 }]);
  });
  it('takes 4 off with no weapon', () => {
    const cs = LW.heroCS(hero({ weapons: [] }));
    expect(cs.total).toBe(11);
    expect(cs.parts[1]).toEqual({ label: 'Unarmed', n: -4 });
  });
  it('adds 2 for Weaponskill only while he carries that weapon', () => {
    expect(LW.heroCS(hero({ weaponskill: 'axe' })).total).toBe(17);
    expect(LW.heroCS(hero({ weaponskill: 'sword' })).total).toBe(15);
  });
  it('takes off an enemy\'s Mindforce unless he has Mindshield', () => {
    const ctx = { enemy: { mindforce: 2 } };
    expect(LW.heroCS(hero(), ctx).total).toBe(13);
    expect(LW.heroCS(hero({ disciplines: ['mindshield'] }), ctx).total).toBe(15);
  });
  // rules-books.md, Book 2: the Sommerswerd "fights as a one-handed sword", so a Shield still counts beside it
});

// shared/core.js: the item tables and the carrying rules (docs/reference/rules-books.md, "Carrying").
import { describe, it, expect, beforeEach } from 'vitest';
import { loadShared } from './helpers.js';

let LW;
beforeEach(() => { LW = loadShared('core.js'); });

/* a hero with nothing but what the carrying rules look at */
const bare = (over = {}) => Object.assign({
  cs: 15, ep: 20, epMax: 20, disciplines: [], weapons: [], backpack: [], special: [], meals: 0, gold: 0,
}, over);

describe('item names and kinds', () => {
  it('names a known item from the table', () => {
    expect(LW.itemName('shortSword')).toBe('Short Sword');
    expect(LW.itemName('potion')).toBe('Laumspur Potion');
  });
  it('puts a hand-typed item in the Backpack unless it is spec:', () => {
    expect(LW.itemKind('pack:Key')).toBe('backpack');
    expect(LW.itemKind('whatever')).toBe('backpack');
    expect(LW.itemKind('spec:Pendant')).toBe('special');
  });
});



describe('LW.hasItem', () => {
  it('looks in the right list, and counts Meals', () => {
    const h = bare({ weapons: ['axe'], backpack: ['potion'], special: ['map'], meals: 1 });
    expect(LW.hasItem(h, 'axe')).toBe(true);
    expect(LW.hasItem(h, 'potion')).toBe(true);
    expect(LW.hasItem(h, 'map')).toBe(true);
    expect(LW.hasItem(h, 'meal')).toBe(true);
    expect(LW.hasItem(h, 'sword')).toBe(false);
    expect(LW.hasItem(bare(), 'meal')).toBe(false);
  });
});

describe('LW.putItem', () => {
  it('puts a weapon, a Backpack Item and a Special Item in their lists and returns null', () => {
    const h = bare();
    expect(LW.putItem(h, 'sword')).toBeNull();
    expect(LW.putItem(h, 'potion')).toBeNull();
    expect(LW.putItem(h, 'map')).toBeNull();
    expect(h.weapons).toEqual(['sword']);
    expect(h.backpack).toEqual(['potion']);
    expect(h.special).toEqual(['map']);
  });
  it('refuses a third weapon', () => {
    const h = bare({ weapons: ['axe', 'sword'] });
    expect(LW.putItem(h, 'mace')).toMatch(/only two weapons/);
    expect(h.weapons).toEqual(['axe', 'sword']);
  });
  it('counts Meals against the eight Backpack slots', () => {
    const h = bare({ backpack: ['potion', 'potion', 'potion', 'potion', 'potion'], meals: 3 });
    expect(LW.putItem(h, 'meal')).toMatch(/backpack is full/);
    expect(LW.putItem(h, 'rope')).toMatch(/backpack is full/);
    expect(h.meals).toBe(3);
    const h2 = bare({ backpack: ['potion', 'potion', 'potion', 'potion', 'potion'], meals: 2 });
    expect(LW.putItem(h2, 'meal')).toBeNull();
    expect(h2.meals).toBe(3);
  });
  it('refuses anything for the Backpack when the Backpack is lost, but not a weapon or a Special Item', () => {
    const h = bare({ noPack: true });
    expect(LW.putItem(h, 'potion')).toMatch(/no Backpack/);
    expect(LW.putItem(h, 'meal')).toMatch(/no Backpack/);
    expect(LW.putItem(h, 'sword')).toBeNull();
    expect(LW.putItem(h, 'map')).toBeNull();
  });
  it('refuses a thirteenth Special Item from Book 8 in the Magnakai series only', () => {
    LW.bookNumber = 8;
    const full = Array.from({ length: 12 }, (_, i) => 'spec:Thing' + i);
    const h = bare({ series: 'magnakai', special: full.slice() });
    expect(LW.putItem(h, 'map')).toMatch(/at most 12/);
    expect(h.special).toHaveLength(12);
    const kai = bare({ special: full.slice() });
    expect(LW.putItem(kai, 'map')).toBeNull();
    LW.bookNumber = 7;
    const early = bare({ series: 'magnakai', special: full.slice() });
    expect(LW.putItem(early, 'map')).toBeNull();
  });
});

describe('LW.dropItem', () => {
  it('removes one of an item and returns true; false if he has none', () => {
    const h = bare({ backpack: ['potion', 'potion'] });
    expect(LW.dropItem(h, 'potion')).toBe(true);
    expect(h.backpack).toEqual(['potion']);
    expect(LW.dropItem(h, 'rope')).toBe(false);
  });
  it('takes away the Endurance a Special Item gave, and caps current Endurance at the new maximum', () => {
    const h = bare({ ep: 24, epMax: 24, special: ['chainmail'] });
    LW.dropItem(h, 'chainmail');
    expect(h.epMax).toBe(20);
    expect(h.ep).toBe(20);
  });
});

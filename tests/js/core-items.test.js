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
  it('strips the pack:/spec: prefix of an item typed in by hand', () => {
    expect(LW.itemName('pack:Rusty Key')).toBe('Rusty Key');
    expect(LW.itemName('spec:Silver Pendant')).toBe('Silver Pendant');
  });
  it('knows the kind of a known item', () => {
    expect(LW.itemKind('axe')).toBe('weapon');
    expect(LW.itemKind('potion')).toBe('backpack');
    expect(LW.itemKind('map')).toBe('special');
  });
  it('puts a hand-typed item in the Backpack unless it is spec:', () => {
    expect(LW.itemKind('pack:Key')).toBe('backpack');
    expect(LW.itemKind('whatever')).toBe('backpack');
    expect(LW.itemKind('spec:Pendant')).toBe('special');
  });
  it('lists every weapon in LW.WEAPONS', () => {
    expect(LW.WEAPONS).toContain('axe');
    expect(LW.WEAPONS).toContain('broadsword');
    expect(LW.WEAPONS).not.toContain('potion');
    expect(LW.WEAPONS.every((w) => LW.ITEMS[w].kind === 'weapon')).toBe(true);
  });
  it('has the limits the books state', () => {
    expect(LW.MAX_WEAPONS).toBe(2);
    expect(LW.MAX_BACKPACK).toBe(8);
    expect(LW.MAX_ARROWS).toBe(6);
  });
  it('gives the Padded Leather Waistcoat 2 and the Chainmail Waistcoat 4 ENDURANCE, the Shield +2 COMBAT SKILL', () => {
    expect(LW.ITEMS.leatherWaistcoat.ep).toBe(2);
    expect(LW.ITEMS.chainmail.ep).toBe(4);
    expect(LW.ITEMS.shield.fightCs).toBe(2);
    expect(LW.ITEMS.potion.heal).toBe(4);
  });
});

describe('LW.addItems', () => {
  it('adds a book\'s own items and refreshes the weapon list', () => {
    LW.addItems({ moonblade: { name: 'Moonblade', kind: 'weapon' }, locket: { name: 'Locket', kind: 'special' } });
    expect(LW.itemName('moonblade')).toBe('Moonblade');
    expect(LW.itemKind('locket')).toBe('special');
    expect(LW.WEAPONS).toContain('moonblade');
    expect(LW.WEAPONS).not.toContain('locket');
  });
  it('replaces an item of the same id', () => {
    LW.addItems({ potion: { name: 'Strong Potion', kind: 'backpack', heal: 6 } });
    expect(LW.ITEMS.potion.heal).toBe(6);
  });
});

describe('LW.specialLimit', () => {
  it('is 12 for a Magnakai hero from Book 8, otherwise no limit', () => {
    LW.bookNumber = 8;
    expect(LW.specialLimit({ series: 'magnakai' })).toBe(12);
    LW.bookNumber = 7;
    expect(LW.specialLimit({ series: 'magnakai' })).toBe(Infinity);
    LW.bookNumber = 9;
    expect(LW.specialLimit({ series: 'kai' })).toBe(Infinity);
    expect(LW.specialLimit({})).toBe(Infinity);
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
  it('puts a Meal in the count, not in the list', () => {
    const h = bare();
    LW.putItem(h, 'meal');
    expect(h.meals).toBe(1);
    expect(h.backpack).toEqual([]);
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
  it('raises Endurance and its maximum for a Special Item that gives some', () => {
    const h = bare({ ep: 18, epMax: 20 });
    LW.putItem(h, 'chainmail');
    expect(h.ep).toBe(22);
    expect(h.epMax).toBe(24);
  });
  it('does not give Endurance for a Backpack Item or a weapon with an ep value', () => {
    LW.addItems({ odd: { name: 'Odd', kind: 'backpack', ep: 3 } });
    const h = bare();
    LW.putItem(h, 'odd');
    expect(h.epMax).toBe(20);
  });
  it('remembers every item he has ever been given, but not Meals', () => {
    const h = bare();
    LW.putItem(h, 'sword');
    LW.putItem(h, 'meal');
    LW.putItem(h, 'potion');
    expect(h.had).toEqual(['sword', 'potion']);
    LW.dropItem(h, 'sword');
    expect(h.had).toContain('sword');
  });
  it('does not list an item twice in had', () => {
    const h = bare();
    LW.putItem(h, 'potion');
    LW.putItem(h, 'potion');
    expect(h.had).toEqual(['potion']);
  });
  it('does not record had when the item did not fit', () => {
    const h = bare({ weapons: ['axe', 'sword'] });
    LW.putItem(h, 'mace');
    expect(h.had || []).not.toContain('mace');
  });
});

describe('LW.dropItem', () => {
  it('removes one of an item and returns true; false if he has none', () => {
    const h = bare({ backpack: ['potion', 'potion'] });
    expect(LW.dropItem(h, 'potion')).toBe(true);
    expect(h.backpack).toEqual(['potion']);
    expect(LW.dropItem(h, 'rope')).toBe(false);
  });
  it('drops a Meal', () => {
    const h = bare({ meals: 1 });
    expect(LW.dropItem(h, 'meal')).toBe(true);
    expect(h.meals).toBe(0);
    expect(LW.dropItem(h, 'meal')).toBe(false);
    expect(h.meals).toBe(0);
  });
  it('takes away the Endurance a Special Item gave, and caps current Endurance at the new maximum', () => {
    const h = bare({ ep: 24, epMax: 24, special: ['chainmail'] });
    LW.dropItem(h, 'chainmail');
    expect(h.epMax).toBe(20);
    expect(h.ep).toBe(20);
  });
  it('leaves current Endurance alone if it is under the new maximum', () => {
    const h = bare({ ep: 10, epMax: 24, special: ['chainmail'] });
    LW.dropItem(h, 'chainmail');
    expect(h.epMax).toBe(20);
    expect(h.ep).toBe(10);
  });
});

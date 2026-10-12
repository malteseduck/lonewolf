// shared/core.js: making a hero, the discipline hooks, imported conditions, and COMBAT SKILL.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadShared, dice } from './helpers.js';

let LW;
beforeEach(() => { LW = loadShared('core.js'); });

const hero = (over = {}) => Object.assign({
  cs: 15, ep: 20, epMax: 20, disciplines: [], weaponskill: null, weapons: ['axe'], backpack: [], special: [], meals: 0, gold: 0,
}, over);

describe('LW.rand10', () => {
  it('gives whole numbers 0 to 9', () => {
    const seen = new Set();
    for (let i = 0; i < 400; i++) { const n = LW.rand10(); expect(Number.isInteger(n)).toBe(true); seen.add(n); }
    expect(Math.min(...seen)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...seen)).toBeLessThanOrEqual(9);
    expect(seen.size).toBeGreaterThan(5);
  });
});

describe('LW.DISCIPLINES', () => {
  it('holds the ten Kai Disciplines, each with a name and a blurb', () => {
    const ids = Object.keys(LW.DISCIPLINES);
    expect(ids).toHaveLength(10);
    for (const id of ids) {
      expect(LW.DISCIPLINES[id].name).toBeTruthy();
      expect(LW.DISCIPLINES[id].blurb).toBeTruthy();
    }
  });
});

describe('LW.WEAPONSKILL_TABLE', () => {
  it('is the books\' table: the Sword twice, no Bow', () => {
    expect(LW.WEAPONSKILL_TABLE).toEqual(['dagger', 'spear', 'mace', 'shortSword', 'warhammer', 'sword', 'axe', 'sword', 'quarterstaff', 'broadsword']);
  });
});

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
  it('copies the disciplines rather than sharing the array', () => {
    dice(LW, 0);
    const list = ['healing'];
    const h = LW.makeHero({ csRoll: 0, epRoll: 0, disciplines: list });
    h.disciplines.push('hunting');
    expect(list).toEqual(['healing']);
  });
  it('draws Weaponskill\'s weapon from the table after the gold, only with Weaponskill', () => {
    dice(LW, 2, 5); // gold, then the table row
    const h = LW.makeHero({ csRoll: 0, epRoll: 0, disciplines: ['weaponskill'] });
    expect(h.gold).toBe(2);
    expect(h.weaponskill).toBe('sword');
    dice(LW, 2);
    expect(LW.makeHero({ csRoll: 0, epRoll: 0, disciplines: ['healing'] }).weaponskill).toBeNull();
  });
  describe('the bonus item found in the ruins', () => {
    const bonus = (n) => { dice(LW, 0, n); return LW.makeHero({ csRoll: 0, epRoll: 0, disciplines: [], bonusItem: true }); };
    it('is a weapon for 0, 1, 5, 7 and 8', () => {
      expect(bonus(0).weapons).toEqual(['axe', 'broadsword']);
      expect(bonus(1).weapons).toEqual(['axe', 'sword']);
      expect(bonus(5).weapons).toEqual(['axe', 'mace']);
      expect(bonus(7).weapons).toEqual(['axe', 'quarterstaff']);
      expect(bonus(8).weapons).toEqual(['axe', 'spear']);
    });
    it('is a Helmet (+2 ENDURANCE) for 2 and Chainmail (+4) for 4, as Special Items', () => {
      const helm = bonus(2);
      expect(helm.special).toEqual(['map', 'helmet']);
      expect([helm.ep, helm.epMax]).toEqual([22, 22]);
      const mail = bonus(4);
      expect(mail.special).toEqual(['map', 'chainmail']);
      expect([mail.ep, mail.epMax]).toEqual([24, 24]);
    });
    it('is two more Meals for 3', () => { expect(bonus(3).meals).toBe(3); });
    it('is a Laumspur Potion in the Backpack for 6', () => { expect(bonus(6).backpack).toEqual(['potion']); });
    it('is 12 more Gold Crowns for 9', () => { expect(bonus(9).gold).toBe(12); });
    it('records what was found, and is absent without bonusItem', () => {
      expect(bonus(3).found).toBe('meals');
      dice(LW, 0);
      expect(LW.makeHero({ csRoll: 0, epRoll: 0, disciplines: [] }).found).toBeUndefined();
    });
  });
});

describe('the Kai default hooks', () => {
  it('has() tests the Kai list', () => {
    expect(LW.has(hero({ disciplines: ['healing'] }), 'healing')).toBe(true);
    expect(LW.has(hero(), 'healing')).toBe(false);
  });
  it('heals() and hunts() name the discipline, or are false', () => {
    const h = hero({ disciplines: ['healing', 'hunting'] });
    expect(LW.heals(h)).toBe('Healing');
    expect(LW.hunts(h)).toBe('Hunting');
    expect(LW.heals(hero())).toBe(false);
    expect(LW.hunts(hero())).toBe(false);
  });
  it('huntNote() says nothing, and the rank is the number of disciplines', () => {
    expect(LW.huntNote(hero())).toBe('');
    expect(LW.rankCount(hero({ disciplines: ['a', 'b', 'c'] }))).toBe(3);
  });
});

describe('LW.meets', () => {
  it('accepts an empty condition', () => { expect(LW.meets(hero(), {})).toBe(true); });
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
  it('fails a Lore-circle condition while no circle rules are loaded', () => {
    expect(LW.meets(hero(), { circle: ['Circle of Fire'] })).toBe(false);
  });
  it('needs every part of a combined condition', () => {
    const h = hero({ disciplines: ['healing'], ep: 5 });
    expect(LW.meets(h, { disc: 'healing', ep: [1, 9] })).toBe(true);
    expect(LW.meets(h, { disc: 'healing', ep: [6, 9] })).toBe(false);
  });
});

describe('LW.condName', () => {
  it('reads disciplines as "or", or "and" with every', () => {
    expect(LW.condName({ disc: 'healing' })).toBe('Healing');
    expect(LW.condName({ disc: ['healing', 'hunting'] })).toBe('Healing or Hunting');
    expect(LW.condName({ disc: ['healing', 'hunting'], every: true })).toBe('Healing and Hunting');
  });
  it('falls back to the id of an unknown discipline', () => {
    expect(LW.condName({ disc: 'mystery' })).toBe('mystery');
  });
  it('names rank, circles, items and Endurance', () => {
    expect(LW.condName({ rank: 5 })).toBe('your rank');
    expect(LW.condName({ circle: ['Circle of Fire', 'Circle of Light'] })).toBe('Circle of Fire and Circle of Light');
    expect(LW.condName({ item: ['rope', 'lantern'] })).toBe('Rope or Lantern');
    expect(LW.condName({ ep: [1, 5] })).toBe('your Endurance');
    expect(LW.condName({ each: true })).toBe('your Magnakai Disciplines');
  });
  it('joins several parts with commas, and is empty for nothing', () => {
    expect(LW.condName({ disc: 'healing', ep: [1, 5] })).toBe('Healing, your Endurance');
    expect(LW.condName({})).toBe('');
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
  it('adds 2 for a Shield', () => {
    expect(LW.heroCS(hero({ special: ['shield'] })).total).toBe(17);
  });
  it('adds Mindblast\'s 2 when the fight says so', () => {
    expect(LW.heroCS(hero(), { mindblast: true }).total).toBe(17);
  });
  it('takes off an enemy\'s Mindforce unless he has Mindshield', () => {
    const ctx = { enemy: { mindforce: 2 } };
    expect(LW.heroCS(hero(), ctx).total).toBe(13);
    expect(LW.heroCS(hero({ disciplines: ['mindshield'] }), ctx).total).toBe(15);
  });
  it('adds the fight\'s circumstance modifier with its note', () => {
    const cs = LW.heroCS(hero(), { csMod: -3, csNote: 'Ambush' });
    expect(cs.total).toBe(12);
    expect(cs.parts[1]).toEqual({ label: 'Ambush', n: -3 });
    expect(LW.heroCS(hero(), { csMod: 1 }).parts[1].label).toBe('Circumstance');
  });
  it('sums every part into the total', () => {
    const cs = LW.heroCS(hero({ weaponskill: 'axe', special: ['shield'] }), { mindblast: true, csMod: -1 });
    expect(cs.total).toBe(15 + 2 + 2 + 2 - 1);
    expect(cs.parts.reduce((t, p) => t + p.n, 0)).toBe(cs.total);
  });
  // rules-books.md, Book 2: the Sommerswerd "fights as a one-handed sword", so a Shield still counts
  // beside it. core.js's default calls it two-handed and cancels the Shield (the page loads
  // rules-series.js, which replaces this function, so the player is not affected).
  it.fails('still counts a Shield beside the Sommerswerd (a one-handed sword)', () => {
    const cs = LW.heroCS(hero({ special: ['sommerswerd', 'shield'] }));
    expect(cs.total).toBe(17);
  });
});

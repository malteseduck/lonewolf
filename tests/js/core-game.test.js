// @vitest-environment jsdom
// shared/core.js: the book runner (class Game), on a stand-in book with made-up sections.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadShared, dice } from './helpers.js';

let LW;
beforeEach(() => {
  LW = loadShared('core.js', 'rules-series.js');
  localStorage.clear();
});

const mkHero = (over = {}) => Object.assign({
  name: 'Lone Wolf', cs: 15, ep: 20, epMax: 25, disciplines: [], weaponskill: null,
  weapons: ['axe'], backpack: [], special: ['map'], meals: 1, gold: 10,
}, over);

/* a game at section `at` of a book made of `sections` (the start is '1' unless given) */
function play(sections, hero = mkHero(), start = '1') {
  const book = { start, sections: Object.assign({ 1: { text: ['x'], choices: [{ text: 'go', to: '2' }] }, 2: { text: ['y'] } }, sections) };
  const g = new LW.Game(book, 'test-save');
  g.start(hero);
  return g;
}

describe('start and go', () => {
  it('starts at the book\'s start section with a trail and an empty history', () => {
    const g = play({});
    expect(g.s.at).toBe('1');
    expect(g.s.trail).toEqual([{ id: '1', via: null }]);
    expect(g.history).toEqual([]);
    expect(g.section).toBe(g.book.sections['1']);
    expect(g.hero.cs).toBe(15);
  });
  it('moves, records the trail and the way taken, and pushes a snapshot of where it was', () => {
    const g = play({});
    g.go('2', 'go');
    expect(g.s.at).toBe('2');
    expect(g.s.trail.map((t) => t.id)).toEqual(['1', '2']);
    expect(g.s.trail[1].via).toBe('go');
    expect(g.history).toHaveLength(1);
    expect(JSON.parse(g.history[0]).at).toBe('1');
  });
});

describe('arriving: ENDURANCE', () => {
  it('applies a loss and a gain, never above the maximum', () => {
    const g = play({ 2: { ep: -4 }, 3: { ep: 10 } });
    g.go('2');
    expect(g.hero.ep).toBe(16);
    expect(g.s.events).toContain('You lose 4 ENDURANCE.');
    g.go('3');
    expect(g.hero.ep).toBe(25);
    expect(g.s.events).toContain('You regain 10 ENDURANCE.');
  });
  it('brings ENDURANCE down to a cap (epCap) only when it is above it', () => {
    const g = play({ 2: { epCap: 15 } });
    g.go('2');
    expect(g.hero.ep).toBe(15);
    expect(g.s.events).toContain('Your ENDURANCE is brought down to 15.');
    const h = play({ 2: { epCap: 15 } }, mkHero({ ep: 9 }));
    h.go('2');
    expect(h.hero.ep).toBe(9);
    expect(h.s.events).toEqual([]);
  });
});

describe('a Condition on the weapon in hand (wield)', () => {
  it('"special" is met by a weapon-like Special Item, which also counts as its kinds', () => {
    LW.ITEMS.oldBlade = { name: 'Old Blade', kind: 'special', weapon: ['dagger'] };
    const h = mkHero({ weapons: ['axe'], special: ['oldBlade'] });
    expect(LW.meets(h, { wield: ['special'] }, { weapon: 'oldBlade' })).toBe(true);
    expect(LW.meets(h, { wield: ['dagger'] }, { weapon: 'oldBlade' })).toBe(true);
    expect(LW.meets(h, { wield: ['special'] }, { weapon: 'axe' })).toBe(false);
  });
});

describe('arriving: what the section gives and takes (once only)', () => {
  it('hands over gifts that fit, and leaves behind those that do not, with the reason', () => {
    const g = play({ 2: { give: [{ item: 'sword' }, { gold: 5 }, { item: 'mace' }] } });
    g.go('2');
    expect(g.hero.weapons).toEqual(['axe', 'sword']);
    expect(g.hero.gold).toBe(15);
    expect(g.s.events.some((e) => /^Mace: left here for now\. You can carry only two weapons/.test(e))).toBe(true);
    expect(g.loot().find((l) => l.i === 'give2').taken).toBe(false);
    expect(g.loot().find((l) => l.i === 'give0').taken).toBe(true);
  });
  it('does not give a gift twice on a second visit', () => {
    const g = play({ 2: { give: [{ gold: 5 }], choices: [{ text: 'b', to: '3' }] }, 3: { choices: [{ text: 'b', to: '2' }] } });
    g.go('2'); g.go('3'); g.go('2');
    expect(g.hero.gold).toBe(15);
  });
});

describe('arriving: Meals, Hunting and Healing', () => {
  it('eats a Meal when told to eat', () => {
    const g = play({ 2: { meal: true } });
    g.go('2');
    expect(g.hero.meals).toBe(0);
    expect(g.hero.ep).toBe(20);
    expect(g.s.events).toContain('You eat a Meal.');
  });
  it('loses 3 ENDURANCE when told to eat with nothing to eat', () => {
    const g = play({ 2: { meal: true } }, mkHero({ meals: 0 }));
    g.go('2');
    expect(g.hero.ep).toBe(17);
    expect(g.s.events).toContain('You have nothing to eat. You lose 3 ENDURANCE.');
  });
  it('noHunt: \'Hunting\' fails only Kai Hunting; Huntmastery still spares the Meal', () => {
    const veteran = (magnakai) => mkHero({ series: 'magnakai', disciplines: ['hunting'], magnakai, completed: ['01a', '02b', '03c', '04d', '05e'] });
    const kai = play({ 2: { meal: true, noHunt: 'Hunting' }, 3: { meal: true } }, veteran(['nexus']));
    kai.go('2');
    expect(kai.hero.meals).toBe(0);
    kai.hero.meals = 1; kai.go('3');
    expect(kai.hero.meals).toBe(1);
    const magnakai = play({ 2: { meal: true, noHunt: 'Hunting' } }, veteran(['huntmastery']));
    magnakai.go('2');
    expect(magnakai.hero.meals).toBe(1);
  });
  it('Healing gives +1 ENDURANCE in a section without a fight, up to the maximum', () => {
    const g = play({ 2: {} }, mkHero({ disciplines: ['healing'] }));
    g.hero.ep = 20; // starting at section 1 already healed once
    g.go('2');
    expect(g.hero.ep).toBe(21);
    expect(g.s.events).toContain('Healing: you regain 1 ENDURANCE.');
    g.hero.ep = 25;
    g.go('2');
    expect(g.hero.ep).toBe(25);
  });
});

describe('combat gating', () => {
  const fight = { combat: { enemies: [{ name: 'Foe', cs: 10, ep: 10 }] }, choices: [{ text: 'on', to: '3' }, { text: 'run', to: '4', evade: true }] };
  it('blocks the way on until the fight is won', () => {
    const g = play({ 2: fight });
    g.go('2');
    expect(g.combatPending).toBe(true);
    expect(g.choices()).toEqual([]);
    g.wonCombat();
    expect(g.combatPending).toBe(false);
    expect(g.s.fought['2']).toBe(true);
  });
  it('hides evade choices in a section with a fight once it is won', () => {
    const g = play({ 2: fight });
    g.go('2'); g.wonCombat();
    expect(g.choices().map((c) => c.text)).toEqual(['on']);
  });
});

describe('the adventure lost', () => {
  it('at no Endurance, or at a death or failed ending; not at the quest\'s own end', () => {
    const g = play({ 2: { end: 'death' }, 3: { end: 'failed' }, 4: { end: 'victory' } });
    expect(g.lost).toBe(false);
    for (const [at, lost] of [['2', true], ['3', true], ['4', false]]) { g.go(at); expect(g.lost).toBe(lost); }
    g.go('1'); g.hero.ep = 0;
    expect(g.lost).toBe(true);
  });
});

describe('choices()', () => {
  const ch = (g, i = 0) => g.choices()[i];
  it('keeps a choice with a discipline need disabled until he has it, saying which', () => {
    const sec = { choices: [{ text: 'a', to: '2', need: { disc: 'tracking' } }] };
    const g = play({ 1: sec });
    expect(ch(g).enabled).toBe(false);
    expect(ch(g).why).toBe('Needs Tracking');
    g.hero.disciplines.push('tracking');
    expect(ch(g).enabled).toBe(true);
  });
  it('gates on Endurance, rank, gold', () => {
    const g = play({ 1: { choices: [
      { text: 'ep', to: '2', need: { ep: [1, 10] } },
      { text: 'rank', to: '2', need: { rank: 3 } },
      { text: 'gold', to: '2', need: { gold: 11 } },
    ] } });
    const c = g.choices();
    expect(c[0]).toMatchObject({ enabled: false, why: 'Your ENDURANCE is 20' });
    expect(c[1]).toMatchObject({ enabled: false, why: 'Needs a higher rank' });
    expect(c[2]).toMatchObject({ enabled: false, why: 'Needs 11 Gold Crowns' });
    g.hero.ep = 10; g.hero.disciplines = ['a', 'b', 'c']; g.hero.gold = 11;
    expect(g.choices().every((x) => x.enabled)).toBe(true);
  });
  it('gates on an item, any of a list, and on not having it', () => {
    const g = play({ 1: { choices: [
      { text: 'has', to: '2', need: { item: 'rope' } },
      { text: 'either', to: '2', need: { item: ['rope', 'lantern'] } },
      { text: 'not', to: '2', need: { item: 'rope', not: true } },
    ] } });
    expect(g.choices().map((c) => c.enabled)).toEqual([false, false, true]);
    expect(g.choices()[0].why).toBe('Needs Rope');
    expect(g.choices()[1].why).toBe('Needs Rope or Lantern');
    g.hero.backpack.push('lantern');
    expect(g.choices().map((c) => c.enabled)).toEqual([false, true, true]);
    g.hero.backpack.push('rope');
    expect(g.choices().map((c) => c.enabled)).toEqual([true, true, false]);
    expect(g.choices()[2].why).toBe('You have the Rope');
  });
  it('holds choices with a range until the number is drawn, then only the one in range', () => {
    const g = play({ 1: { rnt: 'auto', choices: [
      { text: 'low', to: '2', range: [0, 4] },
      { text: 'high', to: '2', range: [5, 9] },
      { text: 'free', to: '2' },
    ] } });
    expect(g.choices().map((c) => c.enabled)).toEqual([false, false, true]);
    expect(g.choices()[0].why).toBe('Spin the medallion first');
    g.s.rolled = 7;
    expect(g.choices().map((c) => c.enabled)).toEqual([false, true, true]);
    expect(g.choices()[0].why).toBe('You drew 7');
    g.s.rolled = 4;
    expect(g.choices().map((c) => c.enabled)).toEqual([true, false, true]);
  });
});

describe('resolveRandom and choose', () => {
  const table = { random: { table: [[4, 'a'], [9, 'b']], mod: [{ disc: 'camouflage', plus: 2 }] } };
  it('finds the first row the roll fits', () => {
    const g = play({});
    expect(g.resolveRandom(table, 3)).toMatchObject({ roll: 3, mod: 0, total: 3, to: 'a' });
    expect(g.resolveRandom(table, 4).to).toBe('a');
    expect(g.resolveRandom(table, 5).to).toBe('b');
  });
  it('choose() moves along the choice, or to the given destination', () => {
    const g = play({});
    g.choose({ text: 'go', to: '2' });
    expect(g.s.at).toBe('2');
    const h = play({ 3: { text: [] } });
    h.choose({ text: 'rnd', random: {} }, '3');
    expect(h.s.at).toBe('3');
  });
});

describe('loot and takeLoot', () => {
  it('takes an item, marks it taken, and does not take it twice', () => {
    const g = play({ 2: { loot: [{ item: 'potion' }] } });
    g.go('2');
    expect(g.takeLoot(0)).toBeNull();
    expect(g.hero.backpack).toEqual(['potion']);
    expect(g.loot()[0].taken).toBe(true);
    expect(g.takeLoot(0)).toBeNull();
    expect(g.hero.backpack).toEqual(['potion']);
  });
  it('returns why an item does not fit, and leaves it to take later', () => {
    const g = play({ 2: { loot: [{ item: 'sword' }] } }, mkHero({ weapons: ['axe', 'mace'] }));
    g.go('2');
    expect(g.takeLoot(0)).toMatch(/only two weapons/);
    expect(g.loot()[0].taken).toBe(false);
  });
  it('takes gold up to 50', () => {
    const g = play({ 2: { loot: [{ gold: 30 }] } }, mkHero({ gold: 40 }));
    g.go('2');
    g.takeLoot(0);
    expect(g.hero.gold).toBe(50);
  });
});

describe('the Random Number drawn in a section (setRolled)', () => {
  it('applies the matching rolls entry once: ENDURANCE, gold, losses', () => {
    const g = play({ 2: { rolls: [
      { range: [0, 4], ep: -3 },
      { range: [5, 9], ep: 2, gold: 7, take: [{ item: 'axe' }] },
    ] } });
    g.go('2');
    g.setRolled(2);
    expect(g.hero.ep).toBe(17);
    g.setRolled(8);
    expect(g.hero.ep).toBe(17); // once only
    const h = play({ 2: { rolls: [{ range: [5, 9], ep: 2, gold: 7, take: [{ item: 'axe' }] }] } });
    h.go('2');
    h.setRolled(8);
    expect(h.hero.ep).toBe(22);
    expect(h.hero.gold).toBe(17);
    expect(h.hero.weapons).toEqual([]);
    expect(h.s.events).toContain('You win 7 Gold Crowns.');
    expect(h.s.events).toContain('You regain 2 ENDURANCE.');
  });
  it('takes the first entry for the number whose if / unless he meets', () => {
    const rolls = [{ range: [0, 9], unless: { disc: 'hunting' }, ep: -6 }, { range: [0, 9], ep: -3 }];
    const g = play({ 2: { rolls } });
    g.go('2');
    g.setRolled(3);
    expect(g.hero.ep).toBe(14);
    const h = play({ 2: { rolls } }, mkHero({ disciplines: ['hunting'] }));
    h.go('2');
    h.setRolled(3);
    expect(h.hero.ep).toBe(17);
  });
});



describe('rewind, back, backs and trim', () => {
  /* a chain 1 -> 2 -> 3 -> 4 with a change made at each stop */
  function chain() {
    const g = play({ 3: { text: [] }, 4: { text: [] } });
    g.go('2'); g.adjust('gold', 1);
    g.go('3'); g.adjust('gold', 1);
    g.go('4');
    return g;
  }
  it('goes back k steps to the section as it stood when its choice was made, with the number cleared', () => {
    const g = chain();
    g.s.rolled = 3;
    g.back(1);
    expect(g.s.at).toBe('3');
    expect(g.hero.gold).toBe(12);
    expect(g.s.rolled).toBeNull();
    expect(g.s.events).toEqual([]);
    expect(g.s.trail.map((t) => t.id)).toEqual(['1', '2', '3']);
    expect(g.history).toHaveLength(2);
  });
  it('rewind(n) restores the nth snapshot and ignores n past the history', () => {
    const g = chain();
    g.rewind(1);
    expect(g.s.at).toBe('2');
    expect(g.history).toHaveLength(1);
    g.rewind(5);
    expect(g.s.at).toBe('2');
  });
});

describe('save, load, clear', () => {
  it('saves after each step and loads it back, with history', () => {
    const g = play({});
    g.go('2');
    const again = new LW.Game(g.book, 'test-save');
    expect(again.load()).toBe(true);
    expect(again.s.at).toBe('2');
    expect(again.history).toHaveLength(1);
    expect(again.hero.cs).toBe(15);
  });
  it('does not load when nothing is saved, or the saved section is not in the book', () => {
    const g = new LW.Game({ start: '1', sections: { 1: {} } }, 'nothing-here');
    expect(g.load()).toBe(false);
    localStorage.setItem('nothing-here', JSON.stringify({ s: { at: '99' }, history: [] }));
    expect(g.load()).toBe(false);
    localStorage.setItem('nothing-here', 'not json');
    expect(g.load()).toBe(false);
  });
});

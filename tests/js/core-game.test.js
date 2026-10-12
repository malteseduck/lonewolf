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
  it('clears the drawn number on arriving', () => {
    const g = play({});
    g.s.rolled = 4;
    g.go('2');
    expect(g.s.rolled).toBeNull();
  });
  it('says the hero is dead at 0 ENDURANCE or below', () => {
    const g = play({});
    expect(g.dead).toBe(false);
    g.hero.ep = 0;
    expect(g.dead).toBe(true);
    g.hero.ep = -2;
    expect(g.dead).toBe(true);
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
  it('lets a loss take him to zero or below', () => {
    const g = play({ 2: { ep: -30 } });
    g.go('2');
    expect(g.hero.ep).toBe(-10);
    expect(g.dead).toBe(true);
  });
  it('restores in full for ep: "full", and says so only if it changed anything', () => {
    const g = play({ 2: { ep: 'full' }, 3: { ep: 'full' } });
    g.go('2');
    expect(g.hero.ep).toBe(25);
    expect(g.s.events).toContain('Your ENDURANCE is restored in full.');
    g.go('3');
    expect(g.s.events).not.toContain('Your ENDURANCE is restored in full.');
  });
});

describe('arriving: what the section gives and takes (once only)', () => {
  it('changes COMBAT SKILL for good, once even if he comes back', () => {
    const g = play({ 2: { cs: -1 }, 3: { choices: [{ text: 'back', to: '2' }] } });
    g.go('2');
    expect(g.hero.cs).toBe(14);
    expect(g.s.events[0]).toMatch(/reduced by 1/);
    g.go('3'); g.go('2');
    expect(g.hero.cs).toBe(14);
  });
  it('says "raised" for a gain', () => {
    const g = play({ 2: { cs: 2 } });
    g.go('2');
    expect(g.hero.cs).toBe(17);
    expect(g.s.events[0]).toMatch(/raised by 2/);
  });
  it('takes a named item, gold (capped at what he has), weapons, Special Items', () => {
    const g = play({ 2: { take: [{ item: 'axe' }, { gold: 15 }, { special: 'all' }] } });
    g.go('2');
    expect(g.hero.weapons).toEqual([]);
    expect(g.hero.gold).toBe(0);
    expect(g.hero.special).toEqual([]);
    expect(g.s.events).toContain('The Axe is gone.');
    expect(g.s.events).toContain('You lose 10 Gold Crowns.');
    expect(g.s.events).toContain('Your Special Items are gone.');
  });
  it('takes "all" gold, and says nothing when he has none', () => {
    const g = play({ 2: { take: [{ gold: 'all' }] } }, mkHero({ gold: 0 }));
    g.go('2');
    expect(g.hero.gold).toBe(0);
    expect(g.s.events.some((e) => /Gold/.test(e))).toBe(false);
  });
  it('takes all weapons', () => {
    const g = play({ 2: { take: [{ weapons: 'all' }] } }, mkHero({ weapons: ['axe', 'sword'] }));
    g.go('2');
    expect(g.hero.weapons).toEqual([]);
    expect(g.s.events).toContain('Your weapons are gone.');
  });
  it('takes Arrows, limited to those he has', () => {
    const g = play({ 2: { take: [{ arrows: 4 }] } }, mkHero({ arrows: 3 }));
    g.go('2');
    expect(g.hero.arrows).toBe(0);
    expect(g.s.events).toContain('You lose 3 Arrows.');
    const g1 = play({ 2: { take: [{ arrows: 'all' }] } }, mkHero({ arrows: 1 }));
    g1.go('2');
    expect(g1.s.events).toContain('You lose 1 Arrow.');
  });
  it('loses one weapon outright if he has only one, and leaves the choice to him if he has two', () => {
    const one = play({ 2: { take: [{ weapons: 'one' }] } });
    one.go('2');
    expect(one.hero.weapons).toEqual([]);
    expect(one.s.events).toContain('Your Axe is lost.');
    const two = play({ 2: { take: [{ weapons: 'one' }] } }, mkHero({ weapons: ['axe', 'sword'] }));
    two.go('2');
    expect(two.hero.weapons).toHaveLength(2);
    expect(two.s.events[0]).toMatch(/^By hand: one weapon/);
  });
  it('empties the Backpack, Meals too; "all" loses the Backpack itself', () => {
    const some = play({ 2: { take: [{ backpack: true }] } }, mkHero({ backpack: ['potion'], meals: 2 }));
    some.go('2');
    expect(some.hero.backpack).toEqual([]);
    expect(some.hero.meals).toBe(0);
    expect(some.hero.noPack).toBeUndefined();
    expect(some.s.events).toContain('Everything in your Backpack is gone.');
    const all = play({ 2: { take: [{ backpack: 'all' }] } }, mkHero({ backpack: ['potion'] }));
    all.go('2');
    expect(all.hero.noPack).toBe(true);
    expect(all.s.events).toContain('Your Backpack and all in it are gone.');
  });
  it('says only "Your Backpack is gone" if it was already empty', () => {
    const g = play({ 2: { take: [{ backpack: 'all' }] } }, mkHero({ meals: 0 }));
    g.go('2');
    expect(g.s.events).toContain('Your Backpack is gone.');
    expect(g.hero.noPack).toBe(true);
  });
  it('shows a todo as a By hand event', () => {
    const g = play({ 2: { todo: 'choose one item' } });
    g.go('2');
    expect(g.s.events).toContain('By hand: choose one item');
  });
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
  it('a section that costs a Meal (lose.meal) takes one if he has any', () => {
    const g = play({ 2: { lose: { meal: 1 } } }, mkHero({ meals: 2 }));
    g.go('2');
    expect(g.hero.meals).toBe(1);
    expect(g.s.events).toContain('A Meal is lost from your pack.');
    const none = play({ 2: { lose: { meal: 1 } } }, mkHero({ meals: 0 }));
    none.go('2');
    expect(none.hero.meals).toBe(0);
  });
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
  it('Hunting spares the Meal', () => {
    const g = play({ 2: { meal: true } }, mkHero({ disciplines: ['hunting'] }));
    g.go('2');
    expect(g.hero.meals).toBe(1);
    expect(g.hero.ep).toBe(20);
    expect(g.s.events[0]).toMatch(/^Hunting: you catch what you need/);
  });
  it('Hunting does not spare it where the section is wasteland (noHunt)', () => {
    const g = play({ 2: { meal: true, noHunt: true } }, mkHero({ disciplines: ['hunting'] }));
    g.go('2');
    expect(g.hero.meals).toBe(0);
  });
  it('eats food with meal: true from the Backpack when he has no Meal, regaining its heal', () => {
    LW.addItems({ bread: { name: 'Honey Bread', kind: 'backpack', meal: true, heal: 2 } });
    const g = play({ 2: { meal: true } }, mkHero({ meals: 0, backpack: ['bread'], ep: 10 }));
    g.go('2');
    expect(g.hero.backpack).toEqual([]);
    expect(g.hero.ep).toBe(12);
    expect(g.s.events).toContain('You eat the Honey Bread as a Meal and regain 2 ENDURANCE.');
  });
  it('eats real Meals before such food', () => {
    LW.addItems({ bread: { name: 'Honey Bread', kind: 'backpack', meal: true } });
    const g = play({ 2: { meal: true } }, mkHero({ meals: 1, backpack: ['bread'] }));
    g.go('2');
    expect(g.hero.meals).toBe(0);
    expect(g.hero.backpack).toEqual(['bread']);
  });
  it('takes food found in the same section and eats it (gifts come before the Meal)', () => {
    const g = play({ 2: { give: [{ meal: 1 }], meal: true } }, mkHero({ meals: 0 }));
    g.go('2');
    expect(g.hero.ep).toBe(20);
    expect(g.hero.meals).toBe(0);
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
  it('Healing does nothing in a section with a fight, or for the dead', () => {
    const fight = play({ 2: { combat: { enemies: [] } } }, mkHero({ disciplines: ['healing'] }));
    fight.hero.ep = 20;
    fight.go('2');
    expect(fight.hero.ep).toBe(20);
    const dead = play({ 2: { ep: -30 } }, mkHero({ disciplines: ['healing'] }));
    dead.hero.ep = 20;
    dead.go('2');
    expect(dead.hero.ep).toBe(-10);
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
  it('is not pending in a section with no fight', () => {
    const g = play({});
    expect(g.combatPending).toBe(false);
  });
  it('gives a single Continue for an authored fight with a destination', () => {
    const g = play({ 2: { combat: { enemies: [], to: '3' } } });
    g.go('2');
    expect(g.choices()).toEqual([]);
    g.wonCombat();
    expect(g.choices()).toEqual([{ text: 'Continue', to: '3', enabled: true }]);
  });
});

describe('choices()', () => {
  const ch = (g, i = 0) => g.choices()[i];
  it('returns the section\'s choices, enabled', () => {
    const g = play({});
    expect(g.choices()).toEqual([{ text: 'go', to: '2', enabled: true, why: '' }]);
  });
  it('returns none at an ending or when dead', () => {
    const end = play({ 2: { end: 'victory', choices: [{ text: 'x', to: '1' }] } });
    end.go('2');
    expect(end.choices()).toEqual([]);
    const g = play({});
    g.hero.ep = 0;
    expect(g.choices()).toEqual([]);
  });
  it('returns none for a section with no choices', () => {
    const g = play({});
    g.go('2');
    expect(g.choices()).toEqual([]);
  });
  it('keeps a choice with a discipline need disabled until he has it, saying which', () => {
    const sec = { choices: [{ text: 'a', to: '2', need: { disc: 'tracking' } }] };
    const g = play({ 1: sec });
    expect(ch(g).enabled).toBe(false);
    expect(ch(g).why).toBe('Needs Tracking');
    g.hero.disciplines.push('tracking');
    expect(ch(g).enabled).toBe(true);
  });
  it('wants all the disciplines with every, any otherwise', () => {
    const any = play({ 1: { choices: [{ text: 'a', to: '2', need: { disc: ['tracking', 'hunting'] } }] } }, mkHero({ disciplines: ['hunting'] }));
    expect(ch(any).enabled).toBe(true);
    const all = play({ 1: { choices: [{ text: 'a', to: '2', need: { disc: ['tracking', 'hunting'], every: true } }] } }, mkHero({ disciplines: ['hunting'] }));
    expect(ch(all).enabled).toBe(false);
    expect(ch(all).why).toBe('Needs Tracking and Hunting');
  });
  it('opens a need.any choice when any one condition is met', () => {
    const sec = { choices: [{ text: 'a', to: '2', need: { any: [{ disc: 'tracking' }, { item: 'rope' }] } }] };
    const g = play({ 1: sec });
    expect(ch(g).enabled).toBe(false);
    expect(ch(g).why).toBe('Needs Tracking, or Rope');
    g.hero.backpack.push('rope');
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
  it('lets having once been given an item count with need.ever', () => {
    const g = play({ 1: { choices: [{ text: 'a', to: '2', need: { item: 'rope', ever: true } }] } });
    expect(ch(g).enabled).toBe(false);
    LW.putItem(g.hero, 'rope');
    LW.dropItem(g.hero, 'rope');
    expect(ch(g).enabled).toBe(true);
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
  it('treats a drawn 0 as drawn', () => {
    const g = play({ 1: { rnt: 'auto', choices: [{ text: 'low', to: '2', range: [0, 4] }] } });
    g.s.rolled = 0;
    expect(ch(g).enabled).toBe(true);
  });
  it('ignores ranges when the section is not rnt: auto', () => {
    const g = play({ 1: { choices: [{ text: 'low', to: '2', range: [0, 4] }] } });
    expect(ch(g).enabled).toBe(true);
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
  it('adds a discipline\'s bonus and notes it', () => {
    const g = play({}, mkHero({ disciplines: ['camouflage'] }));
    const r = g.resolveRandom(table, 3);
    expect(r).toMatchObject({ mod: 2, total: 5, to: 'b' });
    expect(r.notes).toEqual(['Camouflage +2']);
  });
  it('falls to the last row when the total is past the table', () => {
    const g = play({});
    expect(g.resolveRandom(table, 12).to).toBe('b');
  });
  it('choose() moves along the choice, or to the given destination', () => {
    const g = play({});
    g.choose({ text: 'go', to: '2' });
    expect(g.s.at).toBe('2');
    const h = play({ 3: { text: [] } });
    h.choose({ text: 'rnd', random: {} }, '3');
    expect(h.s.at).toBe('3');
  });
  it('choose() spends the first item he has of need.item with spend, and the gold of need.gold', () => {
    const g = play({}, mkHero({ backpack: ['lantern'], gold: 10 }));
    g.choose({ text: 'pay', to: '2', need: { item: ['rope', 'lantern'], spend: true, gold: 4 } });
    expect(g.hero.backpack).toEqual([]);
    expect(g.hero.gold).toBe(6);
  });
  it('choose() does not spend without spend', () => {
    const g = play({}, mkHero({ backpack: ['rope'], gold: 10 }));
    g.choose({ text: 'show', to: '2', need: { item: 'rope', gold: 4 } });
    expect(g.hero.backpack).toEqual(['rope']);
    expect(g.hero.gold).toBe(10);
  });
});

describe('loot and takeLoot', () => {
  it('lists gifts and finds with labels', () => {
    const g = play({ 2: { give: [{ gold: 5 }], loot: [{ item: 'sword' }, { meal: 1 }, { meal: 3 }, { pack: true }, { arrows: 2 }, { arrows: 1 }] } });
    g.go('2');
    expect(g.loot().map((l) => l.label)).toEqual(['5 Gold Crowns', 'Sword', 'a Meal', '3 Meals', 'a Backpack', '2 Arrows', '1 Arrow']);
    expect(g.loot().map((l) => l.i)).toEqual(['give0', 0, 1, 2, 3, 4, 5]);
  });
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
  it('takes Meals if the Backpack has room for all of them, else says how many fit', () => {
    const g = play({ 2: { loot: [{ meal: 3 }] } }, mkHero({ backpack: ['rope', 'rope', 'rope', 'rope', 'rope'], meals: 1 }));
    g.go('2');
    expect(g.takeLoot(0)).toBe('Your backpack has room for only 2.');
    expect(g.hero.meals).toBe(1);
    g.hero.backpack.pop();
    expect(g.takeLoot(0)).toBeNull();
    expect(g.hero.meals).toBe(4);
  });
  it('says the backpack is full, or missing, for a Meal', () => {
    const full = play({ 2: { loot: [{ meal: 1 }] } }, mkHero({ backpack: ['rope', 'rope', 'rope', 'rope', 'rope', 'rope', 'rope'], meals: 1 }));
    full.go('2');
    expect(full.takeLoot(0)).toBe('Your backpack is full.');
    const lost = play({ 2: { loot: [{ meal: 1 }] } }, mkHero({ noPack: true }));
    lost.go('2');
    expect(lost.takeLoot(0)).toBe('You have no Backpack to carry it in.');
  });
  it('finding a Backpack ends noPack', () => {
    const g = play({ 2: { loot: [{ pack: true }] } }, mkHero({ noPack: true }));
    g.go('2');
    expect(g.takeLoot(0)).toBeNull();
    expect(g.hero.noPack).toBe(false);
  });
  it('Arrows need a Quiver and stop at six', () => {
    const g = play({ 2: { loot: [{ arrows: 4 }] } });
    g.go('2');
    expect(g.takeLoot(0)).toBe('You need a Quiver to carry Arrows.');
    g.hero.special.push('quiver');
    g.hero.arrows = 4;
    expect(g.takeLoot(0)).toBeNull();
    expect(g.hero.arrows).toBe(6);
    g.s.looted['2:0'] = false;
    expect(g.takeLoot(0)).toBe('Your Quiver is full.');
  });
  it('only one of an "or" group may be taken (pick 1 by default)', () => {
    const g = play({ 2: { loot: [{ item: 'sword', or: 'w' }, { item: 'mace', or: 'w' }, { gold: 3 }] } });
    g.go('2');
    expect(g.takeLoot(0)).toBeNull();
    expect(g.loot().map((l) => !!l.closed)).toEqual([false, true, false]);
    expect(g.takeLoot(1)).toBe('You may take only one of these.');
    expect(g.hero.weapons).toEqual(['axe', 'sword']);
    expect(g.takeLoot(2)).toBeNull();
  });
  it('lets pick: 2 take two of a group', () => {
    const g = play({ 2: { loot: [{ item: 'rope', or: 'k', pick: 2 }, { item: 'lantern', or: 'k', pick: 2 }, { item: 'tinderbox', or: 'k', pick: 2 }] } });
    g.go('2');
    expect(g.takeLoot(0)).toBeNull();
    expect(g.takeLoot(1)).toBeNull();
    expect(g.takeLoot(2)).toBe('You may take only 2 of these.');
  });
  it('sells goods for gold (cost), as often as he likes', () => {
    const g = play({ 2: { loot: [{ item: 'potion', cost: 4 }] } }, mkHero({ gold: 10 }));
    g.go('2');
    expect(g.takeLoot(0)).toBeNull();
    expect(g.takeLoot(0)).toBeNull();
    expect(g.hero.backpack).toEqual(['potion', 'potion']);
    expect(g.hero.gold).toBe(2);
    expect(g.loot()[0].taken).toBe(false);
    expect(g.takeLoot(0)).toBe('It costs 4 Gold Crowns.');
    expect(g.hero.gold).toBe(2);
  });
  it('does not charge when the bought item does not fit', () => {
    const g = play({ 2: { loot: [{ item: 'sword', cost: 4 }] } }, mkHero({ weapons: ['axe', 'mace'], gold: 10 }));
    g.go('2');
    expect(g.takeLoot(0)).toMatch(/only two weapons/);
    expect(g.hero.gold).toBe(10);
  });
  it('sells a Backpack only to one who has none', () => {
    const g = play({ 2: { loot: [{ pack: true, cost: 2 }] } });
    g.go('2');
    expect(g.takeLoot(0)).toBe('You have a Backpack already.');
    g.hero.noPack = true;
    expect(g.takeLoot(0)).toBeNull();
    expect(g.hero.noPack).toBe(false);
    expect(g.hero.gold).toBe(8);
  });
  it('ignores a loot index that does not exist', () => {
    const g = play({ 2: { loot: [] } });
    g.go('2');
    expect(g.takeLoot(5)).toBeNull();
  });
  it('lets a gift be taken later by its give index', () => {
    const g = play({ 2: { give: [{ item: 'sword' }] } }, mkHero({ weapons: ['axe', 'mace'] }));
    g.go('2');
    expect(g.loot()[0].taken).toBe(false);
    g.removeItem('mace');
    expect(g.takeLoot('give0')).toBeNull();
    expect(g.hero.weapons).toEqual(['axe', 'sword']);
  });
});

describe('the Random Number drawn in a section (setRolled)', () => {
  it('records the number', () => {
    const g = play({});
    expect(g.setRolled(6)).toBeNull();
    expect(g.s.rolled).toBe(6);
    expect(g.s.drawn).toBe(6);
  });
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
  it('caps gold at 50 and ENDURANCE at the maximum, and floors them at 0', () => {
    const g = play({ 2: { rolls: [{ range: [0, 9], ep: 99, gold: 99 }] } }, mkHero({ gold: 45 }));
    g.go('2');
    g.setRolled(1);
    expect(g.hero.gold).toBe(50);
    expect(g.hero.ep).toBe(25);
    expect(g.s.events).toContain('You win 5 Gold Crowns.');
    const l = play({ 2: { rolls: [{ range: [0, 9], ep: -99, gold: -99 }] } });
    l.go('2');
    l.setRolled(1);
    expect(l.hero.ep).toBe(0);
    expect(l.hero.gold).toBe(0);
    expect(l.s.events).toContain('You lose 10 Gold Crowns.');
  });
  it('adds the text\'s own bonuses (rntMod) for a discipline he has, to the number', () => {
    const g = play({ 2: { rntMod: [{ disc: 'camouflage', plus: 2 }, { disc: 'tracking', plus: 1 }] } }, mkHero({ disciplines: ['camouflage'] }));
    g.go('2');
    expect(g.bonuses()).toEqual([{ label: 'Camouflage', n: 2 }]);
    g.setRolled(5);
    expect(g.s.rolled).toBe(7);
    expect(g.s.drawn).toBe(5);
    expect(g.s.shot).toEqual([{ label: 'Camouflage', n: 2 }]);
  });
  it('adds a bonus per Magnakai Discipline over the first few (each/over)', () => {
    const hero = mkHero({ series: 'magnakai', magnakai: ['curing', 'nexus', 'divination', 'psiScreen'] });
    const g = play({ 2: { rntMod: [{ each: 'magnakai', over: 1, plus: 1 }] } }, hero);
    g.go('2');
    expect(g.bonuses()).toEqual([{ label: 'your Magnakai Disciplines', n: 3 }]);
  });
  it('spends an Arrow on a bow shot and adds the bow\'s bonus', () => {
    const hero = mkHero({ series: 'magnakai', magnakai: ['weaponmastery', 'curing', 'nexus'], mastery: ['bow'], weapons: ['bow'], arrows: 2 });
    const g = play({ 2: { bowShot: true } }, hero);
    g.go('2');
    expect(g.shot()).toMatchObject({ plus: 3 });
    expect(g.setRolled(4)).toBeNull();
    expect(g.hero.arrows).toBe(1);
    expect(g.s.rolled).toBe(7);
    expect(g.s.drawn).toBe(4);
  });
  it('says why he cannot shoot, and changes nothing', () => {
    const g = play({ 2: { bowShot: true } });
    g.go('2');
    expect(g.setRolled(4)).toBe('You need a Bow to shoot.');
    expect(g.s.rolled).toBeNull();
    const h = play({ 2: { bowShot: true } }, mkHero({ weapons: ['bow'], arrows: 0 }));
    h.go('2');
    expect(h.setRolled(4)).toBe('You have no Arrows left.');
  });
  it('has no shot in a section that is not a bow shot', () => {
    expect(play({}).shot()).toBeNull();
  });
});

describe('by-hand bookkeeping', () => {
  it('addItem returns the error and saves nothing on failure; removeItem takes away', () => {
    const g = play({});
    expect(g.addItem('potion')).toBeNull();
    expect(g.hero.backpack).toEqual(['potion']);
    g.hero.weapons = ['axe', 'mace'];
    expect(g.addItem('sword')).toMatch(/two weapons/);
    g.removeItem('potion');
    expect(g.hero.backpack).toEqual([]);
  });
  it('adjusts COMBAT SKILL (not below 0), ENDURANCE (0 to max), gold (0 to 50) and Arrows (0 to 6)', () => {
    const g = play({});
    g.adjust('cs', -99); expect(g.hero.cs).toBe(0);
    g.adjust('cs', 3); expect(g.hero.cs).toBe(3);
    g.adjust('ep', 99); expect(g.hero.ep).toBe(25);
    g.adjust('ep', -99); expect(g.hero.ep).toBe(0);
    g.adjust('gold', 99); expect(g.hero.gold).toBe(50);
    g.adjust('gold', -99); expect(g.hero.gold).toBe(0);
    g.adjust('arrows', 9); expect(g.hero.arrows).toBe(6);
    g.adjust('arrows', -9); expect(g.hero.arrows).toBe(0);
  });
  it('ignores an unknown field', () => {
    const g = play({});
    g.adjust('luck', 5);
    expect(g.hero.luck).toBeUndefined();
  });
  it('drops a weapon', () => {
    const g = play({}, mkHero({ weapons: ['axe', 'mace'] }));
    g.dropWeapon('axe');
    expect(g.hero.weapons).toEqual(['mace']);
  });
});

describe('usePotion', () => {
  it('drinks a Laumspur Potion: +4, never above the maximum, and the potion is gone', () => {
    const g = play({}, mkHero({ backpack: ['potion'], ep: 10 }));
    expect(g.usePotion()).toBe(true);
    expect(g.hero.ep).toBe(14);
    expect(g.hero.backpack).toEqual([]);
    const h = play({}, mkHero({ backpack: ['potion'], ep: 23 }));
    h.usePotion();
    expect(h.hero.ep).toBe(25);
  });
  it('does nothing without a potion, at full ENDURANCE, or for an item that does not heal', () => {
    expect(play({}).usePotion()).toBe(false);
    const full = play({}, mkHero({ backpack: ['potion'], ep: 25 }));
    expect(full.usePotion()).toBe(false);
    expect(full.hero.backpack).toEqual(['potion']);
    const rope = play({}, mkHero({ backpack: ['rope'], ep: 10 }));
    expect(rope.usePotion('rope')).toBe(false);
  });
  it('drinks any item with a heal value', () => {
    LW.addItems({ herb: { name: 'Herb', kind: 'backpack', heal: 2 } });
    const g = play({}, mkHero({ backpack: ['herb'], ep: 10 }));
    expect(g.usePotion('herb')).toBe(true);
    expect(g.hero.ep).toBe(12);
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
  it('lists the steps back it can take, newest first', () => {
    const g = chain();
    expect(g.backs()).toEqual([{ k: 1, id: '3' }, { k: 2, id: '2' }, { k: 3, id: '1' }]);
  });
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
  it('goes back several steps at once', () => {
    const g = chain();
    g.back(3);
    expect(g.s.at).toBe('1');
    expect(g.hero.gold).toBe(10);
    expect(g.history).toEqual([]);
  });
  it('does nothing for k < 1 or more steps than there are', () => {
    const g = chain();
    g.back(0); g.back(4); g.back(-1);
    expect(g.s.at).toBe('4');
    expect(g.history).toHaveLength(3);
  });
  it('rewind(n) restores the nth snapshot and ignores n past the history', () => {
    const g = chain();
    g.rewind(1);
    expect(g.s.at).toBe('2');
    expect(g.history).toHaveLength(1);
    g.rewind(5);
    expect(g.s.at).toBe('2');
  });
  it('can undo a death by going back', () => {
    const g = play({ 2: { ep: -99 } });
    g.go('2');
    expect(g.dead).toBe(true);
    g.back(1);
    expect(g.dead).toBe(false);
    expect(g.s.at).toBe('1');
  });
  it('keeps only `keep` snapshots', () => {
    const g = play({ 3: { text: [] }, 4: { text: [] } });
    g.keep = 2;
    g.go('2'); g.go('3'); g.go('4');
    expect(g.history).toHaveLength(2);
    expect(g.backs()).toEqual([{ k: 1, id: '3' }, { k: 2, id: '2' }]);
    g.keep = 0;
    g.trim();
    expect(g.history).toEqual([]);
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
  it('trims the loaded history to keep', () => {
    const g = play({ 3: { text: [] } });
    g.go('2'); g.go('3');
    const again = new LW.Game(g.book, 'test-save');
    again.keep = 1;
    again.load();
    expect(again.history).toHaveLength(1);
  });
  it('clears the save', () => {
    const g = play({});
    expect(localStorage.getItem('test-save')).not.toBeNull();
    g.clear();
    expect(localStorage.getItem('test-save')).toBeNull();
  });
  it('plays on when storage fails', () => {
    const g = play({});
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('full'); };
    try { expect(() => g.go('2')).not.toThrow(); } finally { Storage.prototype.setItem = real; }
    expect(g.s.at).toBe('2');
  });
});

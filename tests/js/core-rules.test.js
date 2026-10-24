// @vitest-environment jsdom
// shared/core.js: what the item tables now ask of a section: Endurance changes under a condition,
// losses chosen or counted by place, equipment taken and given back, other coins, stakes and selling,
// gates that need more than one item, Random Number changes, and lasting conditions.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadShared, dice } from './helpers.js';

let LW;
beforeEach(() => {
  LW = loadShared('core.js', 'rules-series.js');
  localStorage.clear();
  LW.addItems({ torch: { name: 'Torch', kind: 'backpack' }, ring: { name: 'Ring', kind: 'special' }, gem: { name: 'Gem', kind: 'special' }, rope2: { name: 'Rope', kind: 'backpack' } },
    { poison: { name: 'Poisoned', ep: -2, until: 'potion' }, deadArm: { name: 'A dead arm', cs: -3, noShield: true }, weak: { name: 'Weakened', cs: -2, book: true } });
});

const mkHero = (over = {}) => Object.assign({
  name: 'Lone Wolf', cs: 15, ep: 20, epMax: 25, disciplines: [], weaponskill: null, series: 'kai',
  weapons: ['sword'], backpack: [], special: [], meals: 0, gold: 10,
}, over);
/* section 1 leads to 2; 2's fields are the test's; 2 leads on to 3 and 4 */
function at2(sec2, hero = mkHero(), more = {}) {
  const book = { id: 'test', start: '1', sections: Object.assign({
    1: { text: ['a'], choices: [{ text: 'on', to: '2' }] },
    2: Object.assign({ text: ['b'], choices: [{ text: 'x', to: '3' }, { text: 'y', to: '4' }] }, sec2),
    3: { text: ['c'], choices: [] }, 4: { text: ['d'], choices: [] },
  }, more) };
  const g = new LW.Game(book, 'test-save');
  g.start(hero);
  g.choose(g.choices()[0]);
  return g;
}

describe('Endurance changed unless (or if) he has something', () => {
  it('unless a discipline, an item; a discipline at a rank; any of several', () => {
    expect(at2({ when: [{ unless: { disc: 'mindshield' }, ep: -2 }] }).hero.ep).toBe(18);
    expect(at2({ when: [{ unless: { disc: 'mindshield' }, ep: -2 }] }, mkHero({ disciplines: ['mindshield'] })).hero.ep).toBe(20);
    const ring = [{ unless: { item: 'ring' }, ep: -8 }, { if: { item: 'ring' }, ep: -3 }];
    expect([at2({ when: ring }).hero.ep, at2({ when: ring }, mkHero({ special: ['ring'] })).hero.ep]).toEqual([12, 17]);
    const rank = { when: [{ unless: { any: [{ disc: 'psiScreen', rank: 7 }, { disc: 'nexus', rank: 4 }] }, ep: -5 }] };
    const mk = (m) => mkHero({ series: 'magnakai', magnakai: m });
    expect(at2(rank, mk(['psiScreen', 'nexus', 'a', 'b'])).hero.ep).toBe(20);
    expect(at2(rank, mk(['psiScreen', 'x', 'a', 'b'])).hero.ep).toBe(15);
  });
  it('unless he has just eaten', () => {
    const more = { 1: { text: ['a'], meal: true, choices: [{ text: 'on', to: '2' }] } };
    expect(at2({ when: [{ ate: false, ep: -3 }] }, mkHero({ meals: 1 }), more).hero.ep).toBe(20);
    expect(at2({ when: [{ ate: false, ep: -3 }] }, mkHero({ meals: 0 }), more).hero.ep).toBe(14); // hungry at 1, then 3 more
  });
  it('a drawn loss made smaller by what he has, never below its floor', () => {
    const sec = { rnt: 'auto', rolls: [{ range: [0, 9], ep: -3 }], lessen: [{ n: 2, if: { disc: 'hunting' } }] };
    let g = at2(sec, mkHero({ disciplines: ['hunting'] }));
    g.setRolled(5);
    expect(g.hero.ep).toBe(19);
    g = at2(Object.assign({}, sec, { lessen: [{ n: 3, min: 1, if: { disc: 'hunting' } }] }), mkHero({ disciplines: ['hunting'] }));
    g.setRolled(5);
    expect(g.hero.ep).toBe(19);
  });
  it('losing the number drawn, and a draw that is the end of him', () => {
    let g = at2({ rnt: 'auto', rolls: [{ range: [0, 9], ep: 'drawn' }] });
    g.setRolled(0);
    expect(g.hero.ep).toBe(10);
    g = at2({ rnt: 'auto', rolls: [{ range: [7, 9], dead: true }] });
    g.setRolled(8);
    expect(g.dead).toBe(true);
  });
});

describe('losing items by his choice, or by place in the list', () => {
  it('he picks N, the way on waits until he has; with no more than N they all go; with none, the text\'s other loss', () => {
    let g = at2({ take: [{ pick: 'backpack', n: 2 }] }, mkHero({ backpack: ['torch', 'rope2', 'potion'] }));
    expect(g.choices()[0]).toMatchObject({ enabled: false, why: 'Choose what you lose first' });
    expect(g.pickable()).toEqual(['torch', 'rope2', 'potion']);
    g.pickLoss('rope2'); g.pickLoss('potion');
    expect([g.hero.backpack, g.choices()[0].enabled]).toEqual([['torch'], true]);
    g = at2({ take: [{ pick: 'backpack', n: 2 }] }, mkHero({ backpack: ['torch'] }));
    expect([g.hero.backpack, g.s.picks || []]).toEqual([[], []]);
    g = at2({ take: [{ pick: 'backpack', n: 1, else: [{ weapons: 'one' }] }] }, mkHero({ backpack: [], weapons: ['axe'] }));
    expect(g.hero.weapons).toEqual([]);
  });
  it('by position, as the Action Chart lists them (Meals first); the last when the list is shorter', () => {
    let g = at2({ take: [{ at: [2, 4] }] }, mkHero({ meals: 1, backpack: ['torch', 'rope2', 'potion'] }));
    expect([g.hero.meals, g.hero.backpack]).toEqual([1, ['rope2']]);
    g = at2({ take: [{ at: [4], from: 'special', last: true, else: [{ at: [1] }] }] }, mkHero({ special: ['ring', 'gem'] }));
    expect(g.hero.special).toEqual(['ring']);
    g = at2({ take: [{ at: [1], from: 'special', min: 2, else: [{ at: [1], from: 'packItems' }] }] }, mkHero({ special: ['ring'], backpack: ['torch'] }));
    expect([g.hero.special, g.hero.backpack]).toEqual([['ring'], []]);
  });
  it('half his Meals or gold, the weapon he used, and a weapon-like Special Item when it is his only weapon', () => {
    const g = at2({ take: [{ meals: 'half' }, { gold: 'half' }, { weapons: 'used' }] }, mkHero({ meals: 5, gold: 9, weapons: ['sword', 'dagger'] }));
    expect([g.hero.meals, g.hero.gold, g.hero.weapons]).toEqual([3, 5, ['dagger']]);
    LW.addItems({ bladeS: { name: 'Bone Sword', kind: 'special', weapon: ['sword'] } });
    const h = at2({ take: [{ weapons: 'one', special: true }] }, mkHero({ weapons: [], special: ['bladeS'] }));
    expect(h.hero.special).toEqual([]);
  });
});

describe('equipment taken away and given back later', () => {
  it('kept under a name, and given back in a later section, all or in part', () => {
    const more = { 3: { text: ['c'], back: [{ stash: 'cell', only: ['special', 'backpack'] }], choices: [{ text: 'on', to: '4' }] }, 4: { text: ['d'], back: ['cell'], choices: [] } };
    const g = at2({ take: [{ weapons: 'all', stash: 'cell' }, { special: 'all', stash: 'cell' }, { backpack: 'items', stash: 'cell' }, { gold: 'all', stash: 'cell' }] },
      mkHero({ special: ['ring'], backpack: ['torch'], meals: 1, gold: 7 }), more);
    expect([g.hero.weapons, g.hero.special, g.hero.backpack, g.hero.gold]).toEqual([[], [], [], 0]);
    g.choose(g.choices()[0]);
    expect([g.hero.weapons, g.hero.special, g.hero.backpack, g.hero.meals, g.hero.gold]).toEqual([[], ['ring'], ['torch'], 1, 0]);
    g.choose(g.choices()[0]);
    expect([g.hero.weapons, g.hero.gold, g.hero.stash]).toEqual([['sword'], 7, {}]);
  });
  it('what a pickpocket takes by place is kept too', () => {
    const g = at2({ take: [{ at: [2], from: 'special', stash: 'thief' }] }, mkHero({ special: ['ring', 'gem'] }));
    expect(g.hero.stash.thief.items).toEqual(['gem']);
  });
});

describe('other coins, stakes, selling and paying what he can', () => {
  it('Kika found, spent at a gate, and half lost', () => {
    const more = { 3: { text: ['c'], take: [{ coin: 'kika', n: 'half' }], choices: [] } };
    const g = at2({ give: [{ coin: 'kika', n: 30 }], need: undefined, choices: [{ text: 'pay', to: '3', need: { coin: 'kika', n: 10, spend: true } }, { text: 'y', to: '4', need: { coin: 'kika', n: 99 } }] }, mkHero(), more);
    expect(g.hero.coins.kika).toBe(30);
    expect(g.choices().map((c) => c.enabled)).toEqual([true, false]);
    g.choose(g.choices()[0]);
    expect(g.hero.coins.kika).toBe(10);
  });
  it('a stake set before the way on opens, then won twice over or lost in the next section', () => {
    const more = { 3: { text: ['c'], settle: { bet: 2 }, choices: [] }, 4: { text: ['d'], settle: { bet: -1 }, choices: [] } };
    let g = at2({ stake: { key: 'bet', min: 1, max: 10 } }, mkHero(), more);
    expect(g.choices()[0].why).toBe('Set your stake first');
    expect(g.setStake(11)).toMatch(/between 1 and 10/);
    g.setStake(4);
    g.choose(g.choices()[0]);
    expect(g.hero.gold).toBe(18);
    g = at2({ stake: { key: 'bet', min: 1, max: 10 } }, mkHero(), more);
    g.setStake(4); g.choose(g.choices()[1]);
    expect(g.hero.gold).toBe(6);
  });
  it('a gift of what he likes is paid at once', () => {
    const g = at2({ stake: { spend: true } });
    g.setStake(3);
    expect([g.hero.gold, g.choices()[0].enabled]).toEqual([7, true]);
  });
  it('selling to a trader, and a price "or all you have"', () => {
    let g = at2({ sell: { sword: 3 } });
    expect(g.sell('dagger')).toBeTruthy();
    g.sell('sword');
    expect([g.hero.weapons, g.hero.gold]).toEqual([[], 13]);
    g = at2({ choices: [{ text: 'pay', to: '3', need: { gold: 6, spend: true, orAll: true } }] }, mkHero({ gold: 4 }));
    g.choose(g.choices()[0]);
    expect(g.hero.gold).toBe(0);
  });
  it('a shop: one ware of several (or), at most N of one (max), Arrows sold by the four', () => {
    let g = at2({ loot: [{ item: 'torch', cost: 2, or: 'ticket' }, { item: 'rope2', cost: 3, or: 'ticket' }] });
    expect(g.takeLoot(0)).toBe(null);
    expect(g.takeLoot(1)).toMatch(/only one/);
    expect([g.hero.backpack, g.hero.gold, g.loot().map((l) => [l.taken, l.closed])]).toEqual([['torch'], 8, [[true, false], [false, true]]]);
    g = at2({ loot: [{ item: 'torch', cost: 1, max: 2 }] });
    g.takeLoot(0);
    expect(g.loot()[0]).toMatchObject({ taken: false, left: 1 });
    g.takeLoot(0); g.takeLoot(0);
    expect([g.hero.backpack, g.hero.gold, g.loot()[0].taken]).toEqual([['torch', 'torch'], 8, true]);
    g = at2({ sell: { arrows: { n: 4, gold: 1 } } }, mkHero({ special: ['quiver'], arrows: 9 }));
    g.sell('arrows'); g.sell('arrows');
    expect(g.sell('arrows')).toMatch(/4 Arrows/);
    expect([g.hero.arrows, g.hero.gold]).toEqual([1, 12]);
  });
  it('a price in gold, or in items: when short of gold only, or as he chooses', () => {
    // short: one Backpack Item or Weapon in lieu of 2 Gold Crowns, only when he cannot pay
    const lieu = { choices: [{ text: 'x', to: '3', need: { gold: 2, spend: true, instead: { pick: ['backpack', 'weapons'], n: 1, short: true } } }] };
    const on = { 3: { text: ['c'], choices: [{ text: 'on', to: '4' }] } };
    let g = at2(lieu);
    expect(g.choices()).toHaveLength(1);
    g.choose(g.choices()[0]);
    expect([g.hero.gold, g.hero.weapons]).toEqual([8, ['sword']]);
    g = at2(lieu, mkHero({ gold: 1, backpack: ['torch'] }), on);
    expect(g.choices()[0]).toMatchObject({ enabled: true, pay: 'items' });
    g.choose(g.choices()[0]);
    expect([g.pickable(), g.choices()[0].enabled]).toEqual([['torch', 'sword'], false]);
    g.pickLoss('torch');
    expect([g.hero.gold, g.hero.backpack, g.hero.weapons]).toEqual([1, [], ['sword']]);
    expect(at2(lieu, mkHero({ gold: 1, weapons: [] })).choices()[0].enabled).toBe(false);
    // either: 20 Gold Crowns or 2 Special Items, both offered
    const either = { choices: [{ text: 'x', to: '3', need: { gold: 20, spend: true, instead: { pick: ['special'], n: 2 } } }] };
    g = at2(either, mkHero({ gold: 25, special: ['ring', 'gem', 'quiver'] }));
    expect(g.choices().map((c) => [c.enabled, c.pay])).toEqual([[true, undefined], [true, 'items']]);
    g.choose(g.choices()[1]);
    g.pickLoss('ring'); g.pickLoss('quiver');
    expect([g.hero.gold, g.hero.special, g.s.picks]).toEqual([25, ['gem'], []]);
    g = at2(either, mkHero({ gold: 5, special: ['ring', 'gem'] }));
    expect(g.choices().map((c) => c.enabled)).toEqual([false, true]);
    g.choose(g.choices()[1]);
    expect([g.hero.gold, g.hero.special]).toEqual([5, []]); // no more than he must give: both go
  });
  it('a price that depends on where he came from', () => {
    const g = at2({ choices: [{ text: 'x', to: '3', need: { came: ['1'] } }, { text: 'y', to: '4', need: { came: ['9'] } }] });
    expect(g.choices().map((c) => c.enabled)).toEqual([true, false]);
  });
  it('an exchange: his only for one of his, chosen when he has several', () => {
    let g = at2({ loot: [{ item: 'warhammer', for: 'weapon' }] });
    g.takeLoot(0);
    expect(g.hero.weapons).toEqual(['warhammer']);
    g = at2({ loot: [{ item: 'warhammer', for: 'weapon' }] }, mkHero({ weapons: ['sword', 'axe'] }));
    g.takeLoot(0);
    expect(g.pickable()).toEqual(['sword', 'axe']);
    g.pickLoss('axe');
    expect(g.hero.weapons).toEqual(['sword', 'warhammer']);
  });
});

describe('gates that need more than one of anything', () => {
  it('two items together, a count, any weapon of a kind', () => {
    const light = { any: [{ item: 'lantern' }, { items: ['torch', 'tinderbox'] }] };
    const g = (hero) => at2({ choices: [{ text: 'x', to: '3', need: light }, { text: 'm', to: '4', need: { any: [{ meals: 4 }] } }] }, hero).choices().map((c) => c.enabled);
    expect(g(mkHero({ backpack: ['torch'] }))).toEqual([false, false]);
    expect(g(mkHero({ backpack: ['torch', 'tinderbox'], meals: 4 }))).toEqual([true, true]);
    const sword = (w) => at2({ choices: [{ text: 'x', to: '3', need: { any: [{ weapon: ['sword', 'shortSword', 'broadsword'] }] } }] }, mkHero({ weapons: w })).choices()[0].enabled;
    expect([sword(['broadsword']), sword(['axe'])]).toEqual([true, false]);
  });
});

describe('Random Number changes', () => {
  it('for an item carried, his skill with the weapon in hand, and against his COMBAT SKILL', () => {
    let g = at2({ rnt: 'auto', rntMod: [{ item: 'rope2', plus: 1 }, { skilled: true, plus: 3 }] }, mkHero({ backpack: ['rope2'], disciplines: ['weaponskill'], weaponskill: 'sword' }));
    g.setRolled(2);
    expect(g.s.rolled).toBe(6);
    g = at2({ rnt: 'auto', rntMod: [{ plus: 10 }, { vsCS: true }] });
    g.setRolled(4);
    expect(g.s.rolled).toBe(4 + 10 - 15);
  });
  it('a penalty unless he has a discipline, and ranges for the total', () => {
    const g = at2({ ranges: { 3: [-9, 5], 4: [6, 99] }, rntMod: [{ plus: -3, not: { any: [{ mastery: 'bow' }, { disc: 'nexus' }] } }] });
    LW.applyItems(g.book, { SECTIONS: {} });
    // ranges are laid on by applyItems; here set by hand as it would
    g.section.choices[0].range = [-9, 5]; g.section.choices[1].range = [6, 99]; g.section.rnt = 'auto';
    g.setRolled(8);
    expect(g.choices().map((c) => c.enabled)).toEqual([true, false]);
  });
});

describe('lasting conditions', () => {
  it('Endurance lost in every section until a Laumspur potion is drunk', () => {
    const more = { 3: { text: ['c'], choices: [{ text: 'on', to: '4' }] } };
    const g = at2({ mark: 'poison' }, mkHero({ backpack: ['potion'] }), more);
    expect(g.hero.ep).toBe(20); // from the next section on
    g.choose(g.choices()[0]);
    expect(g.hero.ep).toBe(18);
    g.usePotion('potion');
    g.choose(g.choices()[0]);
    expect([g.hero.ep, g.hero.marks.poison]).toEqual([22, undefined]);
  });
  it('a dead arm: no Shield and less COMBAT SKILL until cured; a weakness for this adventure only', () => {
    const g = at2({ mark: 'deadArm' }, mkHero({ special: ['shield'] }));
    expect(LW.heroCS(g.hero).total).toBe(12);
    g.effects({ unmark: 'deadArm' }, []);
    expect(LW.heroCS(g.hero).total).toBe(17);
    LW.bookNumber = 8;
    g.effects({ mark: 'weak' }, []);
    expect(LW.heroCS(g.hero).total).toBe(15);
    LW.bookNumber = 9;
    expect(LW.heroCS(g.hero).total).toBe(17);
  });
  it('half of what the last fight cost given back, all with Healing', () => {
    const sec = { when: [{ unless: { disc: 'healing' }, healLost: 0.5 }, { if: { disc: 'healing' }, healLost: 1 }] };
    expect(at2(sec, mkHero({ ep: 10, lastLoss: 9 })).hero.ep).toBe(14);
    expect(at2(sec, mkHero({ ep: 10, lastLoss: 9, disciplines: ['healing'] })).hero.ep).toBe(21); // and Healing's 1 in each section
  });
  it('a mark from an earlier book opens a gate in a later one', () => {
    const g = at2({ choices: [{ text: 'x', to: '3', need: { any: [{ mark: 'foughtElix' }] } }] }, mkHero({ marks: { foughtElix: true } }));
    expect(g.choices()[0].enabled).toBe(true);
  });
});

describe('small item rules', () => {
  it('items with doses, two Meals asked for, a meal bought on the spot', () => {
    LW.addItems({ flask: { name: 'Flask', kind: 'backpack', heal: 2, doses: 2 } });
    const g = at2({ loot: [{ item: 'flask' }] }, mkHero({ ep: 10 }));
    g.takeLoot(0); g.usePotion('flask');
    expect([g.hero.backpack, g.hero.ep]).toEqual([['flask'], 12]);
    g.usePotion('flask');
    expect(g.hero.backpack).toEqual([]);
    expect(at2({ meal: 2 }, mkHero({ meals: 1 })).hero.ep).toBe(17);
    expect(at2({ meal: true, mealCost: 1 }, mkHero({ gold: 3 })).hero).toMatchObject({ gold: 2, ep: 20 });
  });
  it('a Special Item outside the limit, and one that rides in the Quiver', () => {
    LW.bookNumber = 10;
    LW.addItems({ signet: { name: 'Signet', kind: 'special', free: true }, dart: { name: 'Dart', kind: 'special', arrow: true } });
    const full = Array.from({ length: 12 }, (_, i) => 'x' + i);
    LW.addItems(Object.fromEntries(full.map((x) => [x, { name: x, kind: 'special' }])));
    const hero = mkHero({ series: 'magnakai', magnakai: [], special: full.slice() });
    expect(LW.putItem(hero, 'gem')).toMatch(/12 Special Items/);
    expect(LW.putItem(hero, 'signet')).toBe(null);
    const archer = mkHero({ special: ['quiver'], arrows: 6 });
    expect(LW.putItem(archer, 'dart')).toMatch(/Quiver is full/);
    archer.arrows = 5;
    expect(LW.putItem(archer, 'dart')).toBe(null);
  });
  it('a note for the Action Chart', () => {
    expect(at2({ note: 'the number 123' }).hero.notes).toEqual(['the number 123']);
  });
});

describe('a draw of several numbers added', () => {
  it('the page draws the others and adds them', () => {
    const g = at2({ rnt: 'auto', draws: 3 });
    dice(LW, 4, 6);
    g.setRolled(2);
    expect([g.s.drawn, g.s.rolled]).toEqual([2, 12]);
  });
});

describe('gaps the books showed', () => {
  it('a when entry may restore Endurance in full, and test where he came from', () => {
    expect(at2({ when: [{ if: { disc: 'healing' }, ep: 'full' }] }, mkHero({ ep: 5, disciplines: ['healing'] })).hero.ep).toBe(25);
    expect(at2({ when: [{ came: ['1'], ep: 1 }] }).hero.ep).toBe(21);
    expect(at2({ when: [{ came: ['9'], ep: 1 }] }).hero.ep).toBe(20);
  });
  it('a price "or all you have if that is less" on something bought', () => {
    const g = at2({ loot: [{ item: 'rope2', cost: 6, orAll: true }] }, mkHero({ gold: 4 }));
    expect(g.takeLoot(0)).toBe(null);
    expect([g.hero.gold, g.hero.backpack]).toEqual([0, ['rope2']]);
  });
});

describe('more gaps the books showed', () => {
  it('a defined mark is named by its name in a closed choice', () => {
    expect(LW.condName({ mark: 'deadArm' })).toBe('A dead arm');
  });
  it('a condition cured by any of several items, and its loss starts from the next section', () => {
    LW.addItems({ herb: { name: 'Herb', kind: 'backpack', heal: 1 } }, { fever: { name: 'Fever', ep: -2, until: ['potion', 'herb'] } });
    const more = { 3: { text: ['c'], choices: [{ text: 'on', to: '4' }] } };
    const g = at2({ mark: 'fever' }, mkHero({ backpack: ['herb'] }), more);
    expect(g.hero.ep).toBe(20);
    g.choose(g.choices()[0]);
    expect(g.hero.ep).toBe(18);
    g.usePotion('herb');
    expect(g.hero.marks.fever).toBe(undefined);
  });
  it('a stake is asked again when he comes back to the section', () => {
    const more = { 3: { text: ['c'], choices: [{ text: 'back', to: '2' }] } };
    const g = at2({ stake: { key: 'throw', spend: true } }, mkHero(), more);
    g.setStake(2); g.choose(g.choices()[0]); g.choose(g.choices()[0]);
    expect(g.choices()[0].why).toBe('Give what you will first');
  });
  it('one dose taken of an item that has several', () => {
    LW.addItems({ pills: { name: 'Pills', kind: 'backpack', doses: 2 } });
    const hero = mkHero(); LW.putItem(hero, 'pills');
    const g = at2({ take: [{ item: 'pills', dose: true }] }, hero);
    expect([g.hero.backpack, g.hero.doses.pills]).toEqual([['pills'], 1]);
  });
  it('the Backpack itself, taken into a stash, comes back with it', () => {
    const more = { 3: { text: ['c'], back: ['cell'], choices: [] } };
    const g = at2({ take: [{ backpack: 'all', stash: 'cell' }] }, mkHero({ backpack: ['torch'] }), more);
    expect(g.hero.noPack).toBe(true);
    g.choose(g.choices()[0]);
    expect([g.hero.noPack, g.hero.backpack]).toEqual([false, ['torch']]);
  });
  it('what a give-back cannot fit is offered there, to take once he has made room', () => {
    const more = { 3: { text: ['c'], back: ['cell'], choices: [] } };
    const g = at2({ take: [{ weapons: 'all', stash: 'cell' }] }, mkHero({ weapons: ['sword', 'bow'] }), more);
    g.hero.weapons = ['axe', 'mace']; // found on the way
    g.choose(g.choices()[0]);
    expect(g.hero.weapons).toEqual(['axe', 'mace']);
    const left = g.loot().filter((l) => /^back:/.test(l.i));
    expect(left.map((l) => l.label)).toEqual(['Sword', 'Bow']);
    expect(g.takeLoot(left[1].i)).toMatch(/./); // no room yet
    LW.dropItem(g.hero, 'mace');
    expect(g.takeLoot(left[1].i)).toBeFalsy();
    expect(g.hero.weapons).toEqual(['axe', 'bow']);
    expect(g.loot().filter((l) => /^back:/.test(l.i)).map((l) => l.label)).toEqual(['Sword']);
  });
});

describe('flags', () => {
  it('a flag has a name for a closed choice, and is not listed among his conditions', () => {
    LW.addItems({}, { visitedTown: { name: 'having been to the town', flag: true } });
    expect(LW.condName({ mark: 'visitedTown' })).toBe('having been to the town');
    expect(LW.marksOf(mkHero({ marks: { visitedTown: true, deadArm: true } }))).toEqual(['deadArm']);
  });
});

describe('flags from an earlier book, for an adventure saved before they existed', () => {
  it('are read from that book\'s trail: set where he passed, and not if cleared later', () => {
    LW.addItems({}, { visitedTown: { name: 'having been to the town', flag: true }, ateHere: { name: 'having eaten', flag: true }, deadArm: { name: 'A dead arm', cs: -3 } });
    const sections = { 5: { mark: 'visitedTown' }, 6: { mark: ['ateHere', 'deadArm'] }, 7: { unmark: 'ateHere' } };
    expect(LW.flagsFrom(sections, ['1', '5', '6', '7'])).toEqual(['visitedTown']);
    expect(LW.flagsFrom(sections, ['1', '6'])).toEqual(['ateHere']); // a lasting condition is no flag
    expect(LW.flagsFrom(sections, ['1', '2'])).toEqual([]);
  });
});

describe('the item tables\' last cases', () => {
  it('a Helmet is not worn with a Silver Helm, either way round', () => {
    LW.addItems({ silverHelm: { name: 'Silver Helm', kind: 'special', fightCs: 2, apart: ['helmet'] } });
    const h = mkHero({ special: ['silverHelm'] });
    expect(LW.putItem(h, 'helmet')).toMatch(/Silver Helm/);
    const k = mkHero({ special: ['helmet'] });
    expect(LW.putItem(k, 'silverHelm')).toMatch(/Helmet/);
    expect([h.special, k.special]).toEqual([['silverHelm'], ['helmet']]);
  });
  it('a stake of one Special Item or three Backpack Items: the first pick decides which, and it comes back or is forfeit', () => {
    const more = { 3: { text: ['c'], back: ['bet'], choices: [] }, 4: { text: ['d'], forfeit: 'bet', choices: [] } };
    const stake = { take: [{ pick: ['special', 'backpack'], n: { special: 1, backpack: 3 }, stash: 'bet' }] };
    let g = at2(stake, mkHero({ special: ['ring'], backpack: ['torch', 'rope2', 'potion', 'gem2'] }), more);
    expect(g.pickable()).toEqual(['ring', 'torch', 'rope2', 'potion', 'gem2']);
    g.pickLoss('torch');
    expect(g.pickable()).toEqual(['rope2', 'potion', 'gem2']);
    g.pickLoss('potion'); g.pickLoss('rope2');
    expect([g.hero.backpack, g.hero.special, g.choices()[0].enabled]).toEqual([['gem2'], ['ring'], true]);
    g.choose(g.choices()[0]);
    expect(g.hero.backpack.sort()).toEqual(['gem2', 'potion', 'rope2', 'torch']);
    g = at2(stake, mkHero({ special: ['ring', 'gem'], backpack: ['torch'] }), more);
    expect(g.pickable()).toEqual(['ring', 'gem']); // two Backpack Items short of a stake of three
    g.pickLoss('gem');
    expect(g.s.picks).toEqual([]);
    g.choose(g.choices()[1]);
    expect([g.hero.special, g.hero.stash.bet]).toEqual([['ring'], undefined]);
  });
  it('half the Backpack lost on a coin: the last dropped if they are odd, then the first or the second half', () => {
    const hero = () => mkHero({ meals: 1, backpack: ['torch', 'rope2', 'potion', 'gem2'] });
    dice(LW, 2);
    let g = at2({ take: [{ halve: 'backpack' }] }, hero());
    expect([g.hero.meals, g.hero.backpack]).toEqual([0, ['rope2', 'potion']]);
    dice(LW, 7);
    g = at2({ take: [{ halve: 'backpack' }] }, hero());
    expect([g.hero.meals, g.hero.backpack]).toEqual([1, ['torch']]);
  });
  it('the one of several things he used: the only one held goes, of more he chooses', () => {
    const sec = { take: [{ item: ['potion', 'torch', 'rope2'], choose: true, label: 'Choose the one you used' }] };
    let g = at2(sec, mkHero({ backpack: ['torch', 'gem2'] }));
    expect(g.hero.backpack).toEqual(['gem2']);
    g = at2(sec, mkHero({ backpack: ['torch', 'gem2', 'rope2'] }));
    expect([g.pickable(), g.s.picks[0].label]).toEqual([['torch', 'rope2'], 'Choose the one you used']);
    g.pickLoss('rope2');
    expect(g.hero.backpack).toEqual(['torch', 'gem2']);
  });
  it('a draw against the stake: 0 counts as 10, and the stake must be set first', () => {
    const sec = { stake: { min: 1, spend: true }, rnt: 'auto', zeroTen: true, against: 'stake',
      choices: [{ text: 'no more', to: '3', range: [-99, 0] }, { text: 'more', to: '4', range: [1, 99] }] };
    const g = at2(sec);
    expect(g.setRolled(3)).toMatch(/stake/);
    g.setStake(4);
    g.setRolled(0);
    expect([g.s.drawn, g.s.rolled, g.hero.gold, g.choices().map((c) => c.enabled)]).toEqual([0, 6, 6, [false, true]]);
    g.s.rolled = null; g.setRolled(4);
    expect(g.choices().map((c) => c.enabled)).toEqual([true, false]);
  });
  it('a second number drawn and compared: lower, higher or the same, the first with a bonus', () => {
    const sec = { rnt: 'auto', against: 'draw', rntMod: [{ disc: 'hunting', plus: 1 }],
      choices: [{ text: 'lower', to: '3', range: [1, 99] }, { text: 'higher', to: '4', range: [-99, -1] }, { text: 'same', to: '5', range: [0, 0] }] };
    const more = { 5: { text: ['e'], choices: [] } };
    const open = (g) => g.choices().filter((c) => c.enabled).map((c) => c.to);
    let g = at2(sec, mkHero({ disciplines: ['hunting'] }), more);
    dice(LW, 5);
    g.setRolled(4);
    expect([g.s.rolled, open(g)]).toEqual([0, ['5']]);
    g = at2(sec, mkHero(), more);
    dice(LW, 5);
    g.setRolled(4);
    expect(open(g)).toEqual(['4']);
  });
  it('a Meal due unless he meets a condition, which Hunting does not stand in for', () => {
    const sec = { meal: true, mealUnless: { disc: ['hunting', 'healing'], every: true } };
    expect(at2(sec, mkHero({ meals: 1, disciplines: ['hunting'] })).hero.meals).toBe(0);
    expect(at2(sec, mkHero({ meals: 1, disciplines: ['hunting', 'healing'] })).hero.meals).toBe(1);
  });
});

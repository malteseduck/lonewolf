// @vitest-environment jsdom
// shared/rules-series.js: Kai and Magnakai rules (docs/reference/rules-books.md), the carried character,
// setting out, and the books' starting kits.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadShared, dice } from './helpers.js';

let LW;
beforeEach(() => {
  LW = loadShared('core.js', 'rules-series.js');
  localStorage.clear();
});

const KAI = () => LW.SERIES.kai.list.slice();
const kaiHero = (over = {}) => Object.assign({
  cs: 15, ep: 20, epMax: 20, disciplines: ['camouflage', 'hunting', 'sixthSense', 'tracking', 'healing'], weaponskill: null,
  weapons: ['axe'], backpack: [], special: [], meals: 0, gold: 0,
}, over);
const mkHero = (magnakai, over = {}) => Object.assign({
  cs: 20, ep: 30, epMax: 30, series: 'magnakai', disciplines: KAI(), magnakai, mastery: [],
  weapons: ['sword'], backpack: [], special: [], meals: 0, gold: 0, completed: [],
}, over);
const NINE = ['weaponmastery', 'animalControl', 'curing', 'invisibility', 'huntmastery', 'pathsmanship', 'psiSurge', 'psiScreen', 'nexus'];
const EIGHT = ['weaponmastery', 'animalControl', 'curing', 'invisibility', 'pathsmanship', 'psiScreen', 'nexus', 'divination']; // no Lore-circle that adds COMBAT SKILL
const names = (cs) => cs.parts.map((p) => p.label);

describe('the series tables', () => {
  it('tags the ten Kai Disciplines kai and adds the ten Magnakai ones', () => {
    expect(LW.SERIES.kai.list).toHaveLength(10);
    expect(LW.SERIES.magnakai.list).toHaveLength(10);
    expect(LW.SERIES.magnakai.list).toContain('psiSurge');
    expect(LW.DISCIPLINES.healing.series).toBe('kai');
    expect(LW.DISCIPLINES.curing.series).toBe('magnakai');
  });
  it('starts a new Kai character with five disciplines and a Magnakai one with three', () => {
    expect(LW.SERIES.kai.first).toBe(5);
    expect(LW.SERIES.magnakai.first).toBe(3);
    expect(LW.SERIES.kai.field).toBe('disciplines');
    expect(LW.SERIES.magnakai.field).toBe('magnakai');
  });
  it('has the books\' ranks (index = number of disciplines)', () => {
    expect(LW.SERIES.kai.ranks[1]).toBe('Novice');
    expect(LW.SERIES.kai.ranks[5]).toBe('Initiate');
    expect(LW.SERIES.kai.ranks[8]).toBe('Warmarn');
    expect(LW.SERIES.kai.ranks[10]).toBe('Master');
    expect(LW.SERIES.magnakai.ranks[1]).toBe('Kai Master');
    expect(LW.SERIES.magnakai.ranks[3]).toBe('Kai Master Superior');
    expect(LW.SERIES.magnakai.ranks[5]).toBe('Tutelary');
    expect(LW.SERIES.magnakai.ranks[8]).toBe('Scion-kai');
    expect(LW.SERIES.magnakai.ranks[9]).toBe('Archmaster');
    expect(LW.SERIES.magnakai.ranks[10]).toBe('Kai Grand Master');
  });
  it('has the Lore-circles of rules-books.md', () => {
    const by = Object.fromEntries(LW.CIRCLES.map((c) => [c.name, c]));
    expect(by['Circle of Fire']).toMatchObject({ needs: ['weaponmastery', 'huntmastery'], cs: 1, ep: 2 });
    expect(by['Circle of Light']).toMatchObject({ needs: ['animalControl', 'curing'], cs: 0, ep: 3 });
    expect(by['Circle of Solaris']).toMatchObject({ needs: ['invisibility', 'huntmastery', 'pathsmanship'], cs: 1, ep: 3 });
    expect(by['Circle of the Spirit']).toMatchObject({ needs: ['psiSurge', 'psiScreen', 'nexus', 'divination'], cs: 3, ep: 3 });
  });
  it('adds the Bow (ranged) and the Quiver', () => {
    expect(LW.ITEMS.bow).toMatchObject({ kind: 'weapon', ranged: true });
    expect(LW.ITEMS.quiver.kind).toBe('special');
    expect(LW.WEAPONS).toContain('bow');
    expect(LW.WEAPONS).toHaveLength(10);
  });
});

describe('disciplines and ranks', () => {
  it('owned() reads the series\' list: by the hero\'s series, or the one asked for', () => {
    const h = mkHero(['curing'], { disciplines: ['healing'] });
    expect(LW.owned(h)).toEqual(['curing']);
    expect(LW.owned(h, 'kai')).toEqual(['healing']);
    expect(LW.owned(kaiHero())).toHaveLength(5);
    expect(LW.owned({ series: 'magnakai' })).toEqual([]);
  });
  it('has() looks in both lists', () => {
    const h = mkHero(['curing'], { disciplines: ['healing'] });
    expect(LW.has(h, 'curing')).toBe(true);
    expect(LW.has(h, 'healing')).toBe(true);
    expect(LW.has(h, 'nexus')).toBe(false);
    expect(LW.has(kaiHero(), 'hunting')).toBe(true);
  });
  it('rankCount and rankOf go by the number of disciplines in the hero\'s series', () => {
    expect(LW.rankCount(kaiHero())).toBe(5);
    expect(LW.rankOf(kaiHero())).toBe('Initiate');
    expect(LW.rankOf(kaiHero({ disciplines: KAI() }))).toBe('Master');
    expect(LW.rankCount(mkHero(['curing', 'nexus', 'divination']))).toBe(3);
    expect(LW.rankOf(mkHero(['curing', 'nexus', 'divination']))).toBe('Kai Master Superior');
    expect(LW.rankOf(mkHero([]))).toBe('');
    expect(LW.rankOf(kaiHero({ disciplines: [] }))).toBe('');
  });
  it('mkRank is the number of Magnakai Disciplines, and 0 for a Kai hero', () => {
    expect(LW.mkRank(mkHero(NINE))).toBe(9);
    expect(LW.mkRank(kaiHero({ magnakai: ['curing'] }))).toBe(0);
    expect(LW.mkRank(mkHero(undefined))).toBe(0);
  });
  it('circlesOf finds the circles whose disciplines he holds, only in the Magnakai series', () => {
    const h = mkHero(['weaponmastery', 'huntmastery', 'curing', 'animalControl']);
    expect(LW.circlesOf(h).map((c) => c.name)).toEqual(['Circle of Fire', 'Circle of Light']);
    expect(LW.circlesOf(mkHero(['weaponmastery'])).length).toBe(0);
    expect(LW.circlesOf(kaiHero({ magnakai: ['weaponmastery', 'huntmastery'] }))).toEqual([]);
  });
  it('completedAll tells whether books from..to are all done, reading the leading number of an id', () => {
    const h = { completed: ['01fftd', '02fotw', '03tcok', '04tcod', '05sots'] };
    expect(LW.completedAll(h, 1, 5)).toBe(true);
    expect(LW.completedAll(h, 1, 6)).toBe(false);
    expect(LW.completedAll({ completed: ['01fftd', '03tcok'] }, 1, 3)).toBe(false);
    expect(LW.completedAll({}, 1, 5)).toBe(false);
    expect(LW.completedAll({}, 3, 2)).toBe(true);
  });
});

describe('the discipline effects by series', () => {
  it('heals: Kai Healing in a Kai book', () => {
    expect(LW.heals(kaiHero())).toBe('Healing');
    expect(LW.heals(kaiHero({ disciplines: ['hunting'] }))).toBe(false);
  });
  it('heals: in a Magnakai book Curing does, and Healing only for one who completed Books 1-5', () => {
    expect(LW.heals(mkHero(['curing']))).toBe('Curing');
    expect(LW.heals(mkHero(['nexus']))).toBe(false); // has Healing as a Kai Discipline but is no veteran
    const veteran = mkHero(['nexus'], { completed: ['01a', '02b', '03c', '04d', '05e'] });
    expect(LW.heals(veteran)).toBe('Healing');
    // never added to Curing's
    expect(LW.heals(mkHero(['curing'], { completed: ['01a', '02b', '03c', '04d', '05e'] }))).toBe('Curing');
    // a veteran who lacks Healing gets nothing from it
    expect(LW.heals(mkHero(['nexus'], { disciplines: ['hunting'], completed: ['01a', '02b', '03c', '04d', '05e'] }))).toBe(false);
  });
  it('hunts: Hunting in Kai; Huntmastery in Magnakai, with Hunting for a veteran only', () => {
    expect(LW.hunts(kaiHero())).toBe('Hunting');
    expect(LW.hunts(mkHero(['huntmastery']))).toBe('Huntmastery');
    expect(LW.hunts(mkHero(['nexus']))).toBe(false);
    expect(LW.hunts(mkHero(['nexus'], { completed: ['01a', '02b', '03c', '04d', '05e'] }))).toBe('Hunting');
    expect(LW.hunts(mkHero(['huntmastery'], { completed: ['01a', '02b', '03c', '04d', '05e'] }))).toBe('Huntmastery');
  });
  it('huntNote reminds a Magnakai veteran that Hunting fails in desert and wasteland, and no one else', () => {
    const v = mkHero(['nexus'], { completed: ['01a', '02b', '03c', '04d', '05e'] });
    expect(LW.huntNote(v)).toMatch(/desert and wasteland/);
    expect(LW.huntNote(mkHero(['huntmastery']))).toBe('');
    expect(LW.huntNote(kaiHero())).toBe('');
  });
  it('shielded: Mindshield in Kai, Psi-screen in Magnakai (and not the Kai one there)', () => {
    expect(LW.shielded(kaiHero({ disciplines: ['mindshield'] }))).toBe(true);
    expect(LW.shielded(kaiHero())).toBe(false);
    expect(LW.shielded(mkHero(['psiScreen']))).toBe(true);
    expect(LW.shielded(mkHero(['nexus'], { disciplines: KAI() }))).toBe(false);
  });
  it('mindPower: 1 Mindblast in Kai, 2 Psi-surge in Magnakai, else 0', () => {
    expect(LW.mindPower(kaiHero({ disciplines: ['mindblast'] }))).toBe(1);
    expect(LW.mindPower(kaiHero())).toBe(0);
    expect(LW.mindPower(mkHero(['psiSurge']))).toBe(2);
    expect(LW.mindPower(mkHero(['nexus']))).toBe(0); // the Kai Mindblast is not used in a Magnakai book
  });
  it('psi: 4 for 2 a round, floor 6, Mindblast 2; an Archmaster 6 for 1, floor 4, Mindblast 3', () => {
    expect(LW.psi(mkHero(['psiSurge']))).toEqual({ surge: 4, cost: 2, floor: 6, blast: 2 });
    expect(LW.psi(mkHero(NINE))).toEqual({ surge: 6, cost: 1, floor: 4, blast: 3 });
    // eight disciplines is only Scion-kai
    expect(LW.psi(mkHero(NINE.slice(0, 8).concat([])))).toEqual({ surge: 4, cost: 2, floor: 6, blast: 2 });
    // an Archmaster without Psi-surge has the ordinary figures
    expect(LW.psi(mkHero(NINE.filter((d) => d !== 'psiSurge').concat('divination')))).toEqual({ surge: 4, cost: 2, floor: 6, blast: 2 });
  });
  it('canCure: an Archmaster with Curing, once a book', () => {
    const arch = mkHero(NINE);
    expect(LW.canCure(arch, '12') ).toBe(true);
    arch.cured = '12';
    expect(LW.canCure(arch, '12')).toBe(false);
    expect(LW.canCure(arch, '13')).toBe(true);
    expect(LW.canCure(mkHero(NINE.slice(0, 8)), '12')).toBe(false);
    expect(LW.canCure(mkHero(NINE.filter((d) => d !== 'curing').concat('divination')), '12')).toBe(false);
  });
});

describe('LW.armedWith', () => {
  it('is null with no weapons', () => { expect(LW.armedWith(kaiHero({ weapons: [] }))).toBeNull(); });
  it('is the one weapon he has', () => { expect(LW.armedWith(kaiHero())).toBe('axe'); });
  it('prefers the weapon his Weaponskill is in', () => {
    const h = kaiHero({ weapons: ['axe', 'sword'], weaponskill: 'sword' });
    expect(LW.armedWith(h)).toBe('sword');
  });
  it('prefers a Weaponmastery weapon', () => {
    const h = mkHero(['weaponmastery'], { weapons: ['axe', 'sword'], mastery: ['sword'] });
    expect(LW.armedWith(h)).toBe('sword');
  });
  it('keeps the first when none adds more', () => {
    expect(LW.armedWith(kaiHero({ weapons: ['mace', 'axe'] }))).toBe('mace');
  });
  it('is null for ctx.with "none" (bare-handed)', () => {
    expect(LW.armedWith(kaiHero(), { with: 'none' })).toBeNull();
  });
  it('is only the named item for ctx.with, if he has it', () => {
    const h = kaiHero({ weapons: ['axe', 'sword'], weaponskill: 'sword' });
    expect(LW.armedWith(h, { with: 'axe' })).toBe('axe');
    expect(LW.armedWith(h, { with: 'spear' })).toBeNull();
  });
  it('never uses a Bow hand to hand, but does where the fight names it', () => {
    const h = kaiHero({ weapons: ['bow'] });
    expect(LW.armedWith(h)).toBeNull();
    expect(LW.armedWith(h, { with: 'bow' })).toBe('bow');
    expect(LW.armedWith(kaiHero({ weapons: ['bow', 'axe'] }))).toBe('axe');
  });
  it('counts a Special Item that is a weapon (the Sommerswerd\'s 8)', () => {
    LW.addItems({ sommerswerd: { name: 'Sommerswerd', kind: 'special', cs: 8, weapon: ['sword', 'shortSword', 'broadsword'] } });
    expect(LW.armedWith(kaiHero({ special: ['sommerswerd'] }))).toBe('sommerswerd');
    expect(LW.armedWith(kaiHero({ special: ['map'] }))).toBe('axe');
    expect(LW.armedWith(kaiHero({ weapons: [], special: ['sommerswerd'] }))).toBe('sommerswerd');
  });
});

describe('LW.heroCS (the series version)', () => {
  it('is the base score with a weapon and no modifiers', () => {
    const cs = LW.heroCS(kaiHero());
    expect(cs.total).toBe(15);
    expect(cs.parts).toEqual([{ label: 'Base', n: 15 }]);
  });
  it('takes 4 off unarmed, and labels bare-handed when the text says so', () => {
    expect(LW.heroCS(kaiHero({ weapons: [] })).parts[1]).toEqual({ label: 'Unarmed', n: -4 });
    expect(LW.heroCS(kaiHero({ weapons: [] })).total).toBe(11);
    const bare = LW.heroCS(kaiHero(), { with: 'none' });
    expect(bare.parts[1]).toEqual({ label: 'Bare-handed', n: -4 });
    expect(bare.total).toBe(11);
  });
  it('is unarmed with only a Bow', () => {
    expect(LW.heroCS(kaiHero({ weapons: ['bow'] })).total).toBe(11);
  });
  it('adds 2 for Kai Weaponskill with that weapon', () => {
    const cs = LW.heroCS(kaiHero({ weapons: ['sword'], weaponskill: 'sword' }));
    expect(cs.total).toBe(17);
    expect(names(cs)).toEqual(['Base', 'Weaponskill']);
  });
  it('ignores Kai Weaponskill in a Magnakai book', () => {
    const cs = LW.heroCS(mkHero(['nexus'], { weaponskill: 'sword' }));
    expect(cs.total).toBe(20);
  });
  it('adds Weaponmastery +3 with a mastered weapon, +4 from Scion-kai (8 disciplines)', () => {
    const h = mkHero(['weaponmastery', 'curing', 'nexus'], { mastery: ['sword'] });
    expect(LW.heroCS(h).total).toBe(23);
    expect(names(LW.heroCS(h))).toEqual(['Base', 'Weaponmastery']);
    const scion = mkHero(EIGHT, { mastery: ['sword'] });
    expect(LW.heroCS(scion).total).toBe(24);
    expect(LW.heroCS(mkHero(['weaponmastery'], { mastery: ['axe'] })).total).toBe(20); // not mastered
    expect(LW.heroCS(mkHero(['curing'], { mastery: ['sword'] })).total).toBe(20); // no Weaponmastery
  });
  it('takes unarmed -4, -2 from Tutelary (5), -1 from Scion-kai (8) with Weaponmastery, -4 without', () => {
    const unarmed = (disc) => LW.heroCS(mkHero(disc, { weapons: [] })).total;
    expect(unarmed(['weaponmastery', 'curing', 'nexus', 'divination'])).toBe(16); // 4 disciplines: -4
    expect(unarmed(['weaponmastery', 'curing', 'nexus', 'divination', 'psiScreen'])).toBe(18); // Tutelary -2
    expect(unarmed(EIGHT)).toBe(19); // Scion-kai -1
    expect(unarmed(['curing', 'nexus', 'divination', 'psiScreen', 'invisibility'])).toBe(16); // no Weaponmastery
  });
  it('adds a Sommerswerd\'s 8 and Weaponskill with it for +10 in all, and a Shield still counts beside it', () => {
    LW.addItems({ sommerswerd: { name: 'Sommerswerd', kind: 'special', cs: 8, weapon: ['sword', 'shortSword', 'broadsword'] } });
    const h = kaiHero({ weaponskill: 'sword', special: ['sommerswerd'] });
    const cs = LW.heroCS(h);
    expect(cs.total).toBe(25);
    expect(names(cs)).toEqual(['Base', 'Sommerswerd', 'Weaponskill']);
    h.special.push('shield');
    expect(LW.heroCS(h).total).toBe(27);
  });
  it('adds a carried Shield\'s 2, unless the fight cannot use it', () => {
    const h = kaiHero({ special: ['shield'] });
    expect(LW.heroCS(h).total).toBe(17);
    expect(names(LW.heroCS(h))).toContain('Shield');
    expect(LW.heroCS(h, { noShield: true }).total).toBe(15);
  });
  it('adds the Lore-circles\' COMBAT SKILL', () => {
    const cs = LW.heroCS(mkHero(['weaponmastery', 'huntmastery'], { mastery: [] }));
    expect(cs.total).toBe(21); // Circle of Fire +1
    expect(names(cs)).toContain('Lore-circles');
    const spirit = LW.heroCS(mkHero(['psiSurge', 'psiScreen', 'nexus', 'divination']));
    expect(spirit.total).toBe(23);
  });
  it('adds Psi-surge\'s +4 or Mindblast\'s +2 (not both), an Archmaster\'s +6 and +3', () => {
    const h = mkHero(['psiSurge']);
    expect(LW.heroCS(h, { psiSurge: true }).total).toBe(24);
    expect(LW.heroCS(h, { mindblast: true }).total).toBe(22);
    expect(LW.heroCS(h, { psiSurge: true, mindblast: true }).total).toBe(24);
    const arch = mkHero(NINE);
    expect(LW.heroCS(arch, { psiSurge: true }).total).toBeGreaterThanOrEqual(20 + 6);
    expect(names(LW.heroCS(arch, { psiSurge: true }))).toContain('Psi-surge');
    expect(LW.heroCS(arch, { psiSurge: true }).parts.find((p) => p.label === 'Psi-surge').n).toBe(6);
    expect(LW.heroCS(arch, { mindblast: true }).parts.find((p) => p.label === 'Mindblast').n).toBe(3);
  });
  it('adds Mindblast\'s 2 to a Kai hero', () => {
    expect(LW.heroCS(kaiHero(), { mindblast: true }).total).toBe(17);
  });
  it('subtracts an enemy\'s Mindforce unless shielded (Mindshield in Kai, Psi-screen in Magnakai)', () => {
    const ctx = { enemy: { mindforce: 3 } };
    expect(LW.heroCS(kaiHero(), ctx).total).toBe(12);
    expect(LW.heroCS(kaiHero({ disciplines: ['mindshield'] }), ctx).total).toBe(15);
    expect(LW.heroCS(mkHero(['nexus']), ctx).total).toBe(17);
    expect(LW.heroCS(mkHero(['psiScreen']), ctx).total).toBe(20);
  });
  it('adds the fight\'s modifier and its note', () => {
    const cs = LW.heroCS(kaiHero(), { csMod: -2, csNote: 'Ambush' });
    expect(cs.parts[cs.parts.length - 1]).toEqual({ label: 'Ambush', n: -2 });
    expect(cs.total).toBe(13);
    expect(LW.heroCS(kaiHero(), { csMod: 2 }).parts[1].label).toBe('Circumstance');
  });
  it('totals its parts', () => {
    const cs = LW.heroCS(mkHero(['weaponmastery', 'huntmastery', 'psiSurge'], { mastery: ['sword'], special: ['shield'] }), { psiSurge: true, csMod: -1, enemy: { mindforce: 2 } });
    expect(cs.parts.reduce((t, p) => t + p.n, 0)).toBe(cs.total);
  });
});

describe('LW.bowShot', () => {
  it('says why he cannot shoot', () => {
    expect(LW.bowShot(kaiHero())).toEqual({ why: 'You need a Bow to shoot.' });
    expect(LW.bowShot(kaiHero({ weapons: ['bow'] }))).toEqual({ why: 'You have no Arrows left.' });
    expect(LW.bowShot(kaiHero({ weapons: ['bow'], arrows: 0 })).why).toMatch(/no Arrows/);
  });
  it('adds nothing for a plain bow', () => {
    expect(LW.bowShot(kaiHero({ weapons: ['bow'], arrows: 3 }))).toEqual({ bow: 'bow', parts: [], plus: 0 });
  });
  it('adds 3 with Weaponmastery when the Bow is mastered, and 2 more from Mentora (7)', () => {
    const seven = mkHero(['weaponmastery', 'curing', 'nexus', 'divination', 'psiScreen', 'invisibility', 'pathsmanship'], { weapons: ['bow'], arrows: 2, mastery: ['bow'] });
    const shot = LW.bowShot(seven);
    expect(shot.plus).toBe(5);
    expect(shot.parts.map((p) => p.n)).toEqual([3, 2]);
    const three = mkHero(['weaponmastery', 'curing', 'nexus'], { weapons: ['bow'], arrows: 2, mastery: ['bow'] });
    expect(LW.bowShot(three).plus).toBe(3);
  });
  it('adds nothing if the Bow is not among the mastered weapons, or he lacks Weaponmastery', () => {
    expect(LW.bowShot(mkHero(['weaponmastery', 'curing', 'nexus'], { weapons: ['bow'], arrows: 2, mastery: ['sword'] })).plus).toBe(0);
    expect(LW.bowShot(mkHero(['curing', 'nexus', 'divination'], { weapons: ['bow'], arrows: 2, mastery: ['bow'] })).plus).toBe(0);
  });
  it('adds a book\'s own bow\'s shot bonus, and uses the best bow', () => {
    LW.addItems({ elfbow: { name: 'Elven Bow', kind: 'weapon', ranged: true, shot: 3 } });
    const shot = LW.bowShot(kaiHero({ weapons: ['bow', 'elfbow'], arrows: 1 }));
    expect(shot.bow).toBe('elfbow');
    expect(shot.parts).toEqual([{ label: 'Elven Bow', n: 3 }]);
    expect(shot.plus).toBe(3);
  });
});

describe('settleCircles through LW.readyHero', () => {
  it('adds a completed circle\'s ENDURANCE once and fills Endurance to the maximum', () => {
    const h = mkHero(['weaponmastery', 'huntmastery'], { ep: 10, epMax: 30 });
    LW.readyHero(h);
    expect(h.epMax).toBe(32);
    expect(h.ep).toBe(32);
    expect(h.circleEp).toBe(2);
    LW.readyHero(h);
    expect(h.epMax).toBe(32);
  });
  it('adds a further circle\'s when a discipline completes it later', () => {
    const h = mkHero(['weaponmastery', 'huntmastery']);
    LW.readyHero(h);
    h.magnakai.push('invisibility', 'pathsmanship'); // Solaris joins Fire
    LW.readyHero(h);
    expect(h.circleEp).toBe(5);
    expect(h.epMax).toBe(35);
  });
  it('gives a Kai hero nothing but a full Endurance', () => {
    const h = kaiHero({ ep: 5 });
    LW.readyHero(h);
    expect(h.ep).toBe(20);
    expect(h.epMax).toBe(20);
  });
});

describe('LW.Character (the carried hero)', () => {
  it('is empty at first, and keeps the hero with the book he came from', () => {
    expect(LW.Character.load()).toBeNull();
    LW.Character.save(kaiHero(), { id: '01fftd', title: 'Flight' });
    const c = LW.Character.load();
    expect(c.from).toBe('01fftd');
    expect(c.fromTitle).toBe('Flight');
    expect(c.hero.cs).toBe(15);
    expect(c.completed).toEqual(['01fftd']);
  });
  it('accumulates the books completed, once each', () => {
    LW.Character.save(kaiHero(), { id: '01fftd', title: 'One' });
    LW.Character.save(kaiHero(), { id: '02fotw', title: 'Two' });
    LW.Character.save(kaiHero(), { id: '02fotw', title: 'Two' });
    expect(LW.Character.load().completed).toEqual(['01fftd', '02fotw']);
    expect(LW.Character.load().from).toBe('02fotw');
  });
  it('clears', () => {
    LW.Character.save(kaiHero(), { id: '01fftd', title: 'One' });
    LW.Character.clear();
    expect(LW.Character.load()).toBeNull();
  });
  it('uses the key it is pointed at, one per adventure', () => {
    LW.Character.key = 'lw-character-a';
    LW.Character.save(kaiHero(), { id: '01', title: 'x' });
    LW.Character.key = 'lw-character-b';
    expect(LW.Character.load()).toBeNull();
    LW.Character.key = 'lw-character-a';
    expect(LW.Character.load().from).toBe('01');
    expect(localStorage.getItem('lw-character-a')).not.toBeNull();
  });
  it('loads null from damaged storage', () => {
    localStorage.setItem(LW.Character.key, '{broken');
    expect(LW.Character.load()).toBeNull();
  });
});

describe('LW.HeroSetup: a new character', () => {
  const book1 = { number: 1, series: 'kai' };
  it('picks five Kai Disciplines, and no more', () => {
    const s = LW.HeroSetup(book1, null);
    expect(s.pick).toBe(5);
    expect(s.hero).toBeNull();
    for (const d of ['camouflage', 'hunting', 'sixthSense', 'tracking', 'healing', 'weaponskill']) s.toggle(d);
    expect([...s.picked]).toEqual(['camouflage', 'hunting', 'sixthSense', 'tracking', 'healing']);
    expect(s.canPick('weaponskill')).toBe(false);
    expect(s.canPick('healing')).toBe(true); // already picked: may be un-picked
    s.toggle('healing');
    expect(s.picked.has('healing')).toBe(false);
    expect(s.canPick('weaponskill')).toBe(true);
  });
  it('is not ready until it has rolled both scores and picked all', () => {
    const s = LW.HeroSetup(book1, null);
    expect(s.ready()).toBe(false);
    ['camouflage', 'hunting', 'sixthSense', 'tracking', 'healing'].forEach((d) => s.toggle(d));
    expect(s.ready()).toBe(false);
    s.roll('cs', 4);
    expect(s.ready()).toBe(false);
    s.roll('ep', 6);
    expect(s.ready()).toBe(true);
  });
  it('keeps the first roll of a score', () => {
    const s = LW.HeroSetup(book1, null);
    expect(s.roll('cs', 4)).toBe(4);
    expect(s.roll('cs', 9)).toBe(4);
    dice(LW, 7);
    expect(s.roll('ep')).toBe(7);
  });
  it('chooses for him with auto: both rolls, five disciplines, ready', () => {
    const s = LW.HeroSetup(book1, null);
    s.toggle('tracking');
    s.auto();
    expect(s.picked.size).toBe(5);
    expect(s.picked.has('tracking')).toBe(true);
    expect(s.rolls.cs).not.toBeNull();
    expect(s.ready()).toBe(true);
  });
  it('builds Book 1\'s hero: scores, kit, series, and the disciplines', () => {
    const s = LW.HeroSetup(book1, null);
    ['camouflage', 'hunting', 'sixthSense', 'tracking', 'healing'].forEach((d) => s.toggle(d));
    s.roll('cs', 4); s.roll('ep', 6);
    dice(LW, 3);
    const h = s.build();
    expect(h.cs).toBe(14);
    expect(h.ep).toBe(26);
    expect(h.series).toBe('kai');
    expect(h.disciplines).toEqual(['camouflage', 'hunting', 'sixthSense', 'tracking', 'healing']);
    expect(h.weapons).toEqual(['axe']);
    expect(h.meals).toBe(1);
    expect(h.gold).toBe(3);
    expect(h.mastery).toEqual([]);
    expect(h.completed).toEqual([]);
    expect(h.found).toBeUndefined();
    expect(s.kit).toBeNull();
  });
  it('draws the weapon for Weaponskill when it is picked', () => {
    const s = LW.HeroSetup(book1, null);
    ['weaponskill', 'hunting', 'sixthSense', 'tracking', 'healing'].forEach((d) => s.toggle(d));
    s.roll('cs', 0); s.roll('ep', 0);
    dice(LW, 2, 3); // gold, then the table
    expect(s.build().weaponskill).toBe('shortSword');
  });
  it('gives a new Book 2 character nothing but that book\'s kit', () => {
    const s = LW.HeroSetup({ number: 2, series: 'kai' }, null);
    ['camouflage', 'hunting', 'sixthSense', 'tracking', 'healing'].forEach((d) => s.toggle(d));
    s.roll('cs', 0); s.roll('ep', 0);
    dice(LW, 5);
    const h = s.build();
    expect(h.weapons).toEqual([]);
    expect(h.special).toEqual([]);
    expect(h.backpack).toEqual([]);
    expect(h.meals).toBe(0);
    expect(h.gold).toBe(0);
    expect(s.kit).toBe(LW.KITS[2]);
  });
  it('makes a new Magnakai character a Kai Master with all ten Kai Disciplines and three Magnakai ones', () => {
    const book = { number: 6, series: 'magnakai' };
    const s = LW.HeroSetup(book, null);
    expect(s.pick).toBe(3);
    ['curing', 'nexus', 'divination', 'psiScreen'].forEach((d) => s.toggle(d));
    expect(s.picked.size).toBe(3);
    s.roll('cs', 1); s.roll('ep', 2);
    dice(LW, 0, 0);
    const h = s.build();
    expect(h.series).toBe('magnakai');
    expect(h.disciplines).toEqual(KAI());
    expect(h.magnakai).toEqual(['curing', 'nexus', 'divination']);
    expect(h.weaponskill).toBeNull();
    expect(h.cs).toBe(11);
    expect(h.ep).toBe(22);
    expect(h.weapons).toEqual([]);
  });
  it('asks three weapons for Weaponmastery, and clears them when it is un-picked', () => {
    const s = LW.HeroSetup({ number: 6, series: 'magnakai' }, null);
    expect(s.need()).toBe(0);
    s.toggle('weaponmastery');
    expect(s.need()).toBe(3);
    ['sword', 'axe', 'bow', 'mace'].forEach((w) => s.toggleWeapon(w));
    expect([...s.weapons]).toEqual(['sword', 'axe', 'bow']);
    expect(s.canWeapon('mace')).toBe(false);
    s.toggleWeapon('axe');
    expect(s.weapons.has('axe')).toBe(false);
    s.toggle('weaponmastery');
    expect(s.weapons.size).toBe(0);
    expect(s.need()).toBe(0);
  });
  it('is not ready for Weaponmastery until its weapons are chosen, and builds them into mastery', () => {
    const s = LW.HeroSetup({ number: 6, series: 'magnakai' }, null);
    ['weaponmastery', 'curing', 'nexus'].forEach((d) => s.toggle(d));
    s.roll('cs', 0); s.roll('ep', 0);
    expect(s.ready()).toBe(false);
    ['sword', 'axe', 'bow'].forEach((w) => s.toggleWeapon(w));
    expect(s.ready()).toBe(true);
    dice(LW, 0, 0);
    expect(s.build().mastery).toEqual(['sword', 'axe', 'bow']);
  });
  it('auto picks the weapons too', () => {
    const s = LW.HeroSetup({ number: 6, series: 'magnakai' }, null);
    s.toggle('weaponmastery');
    s.auto();
    expect(s.weapons.size).toBe(3);
    expect(s.ready()).toBe(true);
  });
});

describe('LW.HeroSetup: a carried character', () => {
  const carried = () => ({ hero: kaiHero({ backpack: ['potion'], meals: 3, noPack: true, special: ['map'], gold: 22 }), completed: ['01fftd'] });
  it('picks one more discipline and needs no rolls', () => {
    const s = LW.HeroSetup({ number: 2, series: 'kai' }, carried());
    expect(s.pick).toBe(1);
    expect(s.rolls).toEqual({ cs: 0, ep: 0 });
    expect(s.canPick('healing')).toBe(false); // already has it
    s.toggle('mindblast');
    expect(s.ready()).toBe(true);
  });
  it('does not pick more than the series holds (a Kai Master has all ten)', () => {
    const s = LW.HeroSetup({ number: 5, series: 'kai' }, { hero: kaiHero({ disciplines: KAI() }), completed: [] });
    expect(s.pick).toBe(0);
  });
  it('builds a copy: Weapons, Special Items and gold carry; the Backpack and Meals do not', () => {
    const c = carried();
    const s = LW.HeroSetup({ number: 2, series: 'kai' }, c);
    s.toggle('mindblast');
    const h = s.build();
    expect(h.disciplines).toHaveLength(6);
    expect(h.disciplines).toContain('mindblast');
    expect(h.weapons).toEqual(['axe']);
    expect(h.special).toEqual(['map']);
    expect(h.gold).toBe(22);
    expect(h.backpack).toEqual([]);
    expect(h.meals).toBe(0);
    expect(h.noPack).toBe(false);
    expect(h.completed).toEqual(['01fftd']);
    expect(c.hero.backpack).toEqual(['potion']); // the saved record is untouched
    expect(c.hero.disciplines).toHaveLength(5);
  });
  it('draws a Weaponskill weapon for a carried hero who picks it', () => {
    const s = LW.HeroSetup({ number: 2, series: 'kai' }, carried());
    s.toggle('weaponskill');
    dice(LW, 6);
    expect(s.build().weaponskill).toBe('axe');
  });
  it('enters the Magnakai series choosing three, and keeps his Kai Disciplines', () => {
    const c = { hero: kaiHero({ disciplines: KAI() }), completed: ['01', '02', '03', '04', '05'] };
    const s = LW.HeroSetup({ number: 6, series: 'magnakai' }, c);
    expect(s.pick).toBe(3);
    ['curing', 'nexus', 'divination'].forEach((d) => s.toggle(d));
    const h = s.build();
    expect(h.series).toBe('magnakai');
    expect(h.disciplines).toEqual(KAI());
    expect(h.magnakai).toEqual(['curing', 'nexus', 'divination']);
  });
  it('picks one Magnakai Discipline and one more mastered weapon in the next book', () => {
    const had = mkHero(['weaponmastery', 'curing', 'nexus'], { mastery: ['sword', 'axe', 'bow'] });
    const s = LW.HeroSetup({ number: 7, series: 'magnakai' }, { hero: had, completed: [] });
    expect(s.pick).toBe(1);
    expect(s.need()).toBe(1);
    expect(s.canWeapon('sword')).toBe(false); // already mastered
    expect(s.canPick('weaponmastery')).toBe(false);
    s.toggle('divination');
    s.toggleWeapon('mace');
    s.toggleWeapon('spear');
    expect(s.weapons.size).toBe(1);
    expect(s.ready()).toBe(true);
    const h = s.build();
    expect(h.magnakai).toEqual(['weaponmastery', 'curing', 'nexus', 'divination']);
    expect(h.mastery).toEqual(['sword', 'axe', 'bow', 'mace']);
  });
  it('asks nothing of Weaponmastery for one who has none and does not pick it', () => {
    const had = mkHero(['curing', 'nexus', 'divination']);
    const s = LW.HeroSetup({ number: 7, series: 'magnakai' }, { hero: had, completed: [] });
    expect(s.need()).toBe(0);
  });
  it('picks Weaponmastery late: three weapons', () => {
    const had = mkHero(['curing', 'nexus', 'divination']);
    const s = LW.HeroSetup({ number: 7, series: 'magnakai' }, { hero: had, completed: [] });
    s.toggle('weaponmastery');
    expect(s.need()).toBe(3);
  });
  it('gives a carried character no kit in Book 11, but a new one yes', () => {
    const had = mkHero(['curing', 'nexus', 'divination']);
    expect(LW.HeroSetup({ number: 11, series: 'magnakai' }, { hero: had, completed: [] }).kit).toBeNull();
    expect(LW.HeroSetup({ number: 11, series: 'magnakai' }, null).kit).toBe(LW.KITS[11]);
    expect(LW.HeroSetup({ number: 10, series: 'magnakai' }, { hero: had, completed: [] }).kit).toBe(LW.KITS[10]);
  });
});

describe('the starting kits', () => {
  it('has a kit for Books 2 to 12, not 1', () => {
    expect(LW.KITS[1]).toBeUndefined();
    for (let n = 2; n <= 12; n++) {
      expect(LW.KITS[n].give.length).toBeGreaterThan(0);
      expect(LW.KITS[n].choose).toBeGreaterThan(0);
      expect(LW.KITS[n].from.length).toBeGreaterThanOrEqual(LW.KITS[n].choose);
    }
  });
  it('lets Book 5 on leave Special Items at the Monastery, Book 6 on gold too', () => {
    expect(LW.KITS[4].store).toBeUndefined();
    expect(LW.KITS[5].store).toBe(true);
    expect(LW.KITS[5].storeGold).toBeUndefined();
    expect(LW.KITS[6]).toMatchObject({ store: true, storeGold: true });
    expect(LW.KITS[12]).toMatchObject({ store: true, storeGold: true });
  });
  it('makes Book 11\'s kit for a new character only', () => {
    expect(LW.KITS[11].newOnly).toBe(true);
    expect(LW.KITS[10].newOnly).toBeUndefined();
  });
  it('offers Book 2\'s choose-2 list as the rules page prints it', () => {
    expect(LW.KITS[2].choose).toBe(2);
    expect(LW.KITS[2].give).toEqual(['map', 'seal']);
    expect(LW.KITS[2].from).toHaveLength(10);
  });
  it('names the entries', () => {
    expect(LW.kitEntryName({ item: 'sword', n: 1 })).toBe('Sword');
    expect(LW.kitEntryName({ item: 'potion', n: 2 })).toBe('2 × Laumspur Potion');
    expect(LW.kitEntryName({ meal: 1 })).toBe('a Meal');
    expect(LW.kitEntryName({ meal: 3 })).toBe('3 Meals');
    expect(LW.kitEntryName({ meal: 5, name: 'five Special Rations' })).toBe('five Special Rations');
  });
});

describe('LW.KitSetup', () => {
  const setup = (n, hero, book = {}) => LW.KitSetup(book, LW.KITS[n], hero);
  const empty = (over = {}) => Object.assign({ cs: 15, ep: 20, epMax: 20, weapons: [], backpack: [], special: [], meals: 0, gold: 0, series: 'kai', disciplines: [] }, over);
  beforeEach(() => { LW.addItems({ seal: { name: 'Seal of Hammerdal', kind: 'special' } }); });

  it('lists the gifts, and those he already has apart', () => {
    const k = setup(2, empty({ special: ['map'] }));
    expect(k.gifts.map((g) => g.item)).toEqual(['seal']);
    expect(k.had.map((g) => g.item)).toEqual(['map']);
    expect(setup(2, empty()).gifts.map((g) => g.item)).toEqual(['map', 'seal']);
  });
  it('always hands over meals in a kit\'s gifts', () => {
    const k = setup(11, empty());
    expect(k.gifts).toEqual([{ meal: 2, n: 1 }]);
  });
  it('rolls the gold once', () => {
    const k = setup(2, empty());
    expect(k.rollGold(6)).toBe(6);
    expect(k.rollGold(2)).toBe(6);
    expect(k.ready()).toBe(true);
    expect(setup(2, empty()).ready()).toBe(false);
  });
  it('adds 10 and the roll to his gold, up to 50', () => {
    const k = setup(2, empty({ gold: 5 }));
    k.rollGold(7);
    expect(k.gold()).toEqual({ purse: 22, over: 0, bank: 0 });
    const rich = setup(2, empty({ gold: 40 }));
    rich.rollGold(7);
    expect(rich.gold()).toEqual({ purse: 50, over: 7, bank: 0 }); // Book 2 does not keep it
  });
  it('keeps the gold over 50 at the Monastery from Book 6, with what was there already', () => {
    const k = setup(6, empty({ gold: 40, storedGold: 3 }));
    k.rollGold(7);
    expect(k.gold()).toEqual({ purse: 50, over: 7, bank: 10 });
  });
  it('draws on the stored gold, within the purse\'s room and what is there', () => {
    const k = setup(6, empty({ gold: 0, storedGold: 20 }));
    expect(k.canDraw(1)).toBe(false); // not rolled yet
    k.rollGold(0);
    expect(k.gold()).toEqual({ purse: 10, over: 0, bank: 20 });
    expect(k.canDraw(1)).toBe(true);
    expect(k.canDraw(-1)).toBe(false);
    k.draw = 20;
    expect(k.canDraw(1)).toBe(false); // none left
    expect(k.canDraw(-1)).toBe(true);
    k.draw = 40;
    expect(k.canDraw(1)).toBe(false);
  });
  it('lets him choose only as many as the kit allows', () => {
    const k = setup(2, empty());
    k.choose(0); k.choose(4); k.choose(5);
    expect([...k.chosen]).toEqual([0, 4]);
    expect(k.canChoose(5)).toBe(false);
    k.choose(0);
    expect([...k.chosen]).toEqual([4]);
    expect(k.canChoose(5)).toBe(true);
  });
  it('flags too many weapons, Backpack Items and Special Items', () => {
    const w = setup(2, empty({ weapons: ['axe'] }));
    w.choose(0); w.choose(4); // Sword and Mace beside the Axe
    expect(w.totals().weapon).toBe(3);
    expect(w.problems()).toEqual(['Two Weapons at most: leave one behind.']);
    expect(w.ready()).toBe(false);
    w.rollGold(0);
    expect(w.ready()).toBe(false);
    w.flip(w.dropW, 0); // leave the Axe behind
    expect(w.totals().weapon).toBe(2);
    expect(w.problems()).toEqual([]);
    expect(w.ready()).toBe(true);
    // the Backpack is empty at this step (a carried hero's was emptied); a custom kit overfills it
    const b = LW.KitSetup({}, { give: [], choose: 3, from: [{ meal: 5 }, { meal: 4 }, 'rope'] }, empty());
    b.choose(0); b.choose(1);
    expect(b.totals().backpack).toBe(9);
    expect(b.problems()).toEqual(['Eight Backpack Items at most, Meals included.']);
  });
  it('flags too many Special Items in a Magnakai book from Book 8', () => {
    LW.bookNumber = 8;
    const full = Array.from({ length: 12 }, (_, i) => 'spec:T' + i);
    const k = setup(8, mkHero(['curing'], { special: full }));
    expect(k.limit).toBe(12);
    expect(k.totals().special).toBe(13); // plus the map
    expect(k.problems()).toEqual(['12 Special Items at most: leave some at the Monastery.']);
    k.flip(k.leave, 0);
    expect(k.problems()).toEqual([]);
  });
  it('offers the Monastery only when the kit allows and he has something to leave or fetch', () => {
    expect(setup(5, empty({ special: ['map'] })).store).toBe(true);
    expect(setup(5, empty()).store).toBe(false);
    expect(setup(5, empty({ stored: ['spec:Thing'] })).store).toBe(true);
    expect(setup(2, empty({ special: ['map'] })).store).toBeFalsy();
  });
  it('does not offer a Special Item he has a second time (held)', () => {
    const k = setup(2, empty({ special: ['shield'] }));
    expect(k.held(8)).toBe(true); // the Shield
    expect(k.canChoose(8)).toBe(false);
    k.choose(8);
    expect(k.chosen.size).toBe(0);
    k.flip(k.leave, 0); // leaving it at the Monastery makes it available again
    expect(k.held(8)).toBe(false);
    expect(k.held(0)).toBe(false);
  });
  it('chooses for him with auto: rolls the gold and fills the choices, within the limits', () => {
    const k = setup(2, empty({ weapons: ['axe', 'mace'] }));
    k.auto();
    expect(k.roll).not.toBeNull();
    expect(k.problems()).toEqual([]);
    expect(k.chosen.size).toBeLessThanOrEqual(2);
    // both hands full, so no weapon can have been chosen
    expect([...k.chosen].every((i) => LW.itemKind(k.from[i].item || 'meal') !== 'weapon' || k.from[i].meal)).toBe(true);
    expect(k.ready()).toBe(true);
  });
  it('finishes: puts gifts and picks in his pack, the purse and Meals', () => {
    const hero = empty({ gold: 4 });
    const k = setup(2, hero);
    k.rollGold(3);
    k.choose(0); // Sword
    k.choose(2); // two Meals
    const out = k.finish();
    expect(out).toBe(hero);
    expect(hero.weapons).toEqual(['sword']);
    expect(hero.special).toEqual(['map', 'seal']);
    expect(hero.meals).toBe(2);
    expect(hero.gold).toBe(17);
    expect(hero.storedGold).toBeUndefined();
  });
  it('finishes: gives several of an item at a time, a full Quiver, and stores the gold over 50', () => {
    const hero = empty({ gold: 45 });
    const k = setup(6, hero);
    k.rollGold(5);
    k.choose(1); // Laumspur
    k.choose(4); // Quiver
    k.choose(3); // Bow
    const bank = k.gold().bank;
    expect(bank).toBe(10);
    k.finish();
    expect(hero.backpack).toEqual(['potion']);
    expect(hero.special).toContain('quiver');
    expect(hero.arrows).toBe(6);
    expect(hero.weapons).toEqual(['bow']);
    expect(hero.gold).toBe(50);
    expect(hero.storedGold).toBe(10);
  });
  it('finishes: three Fireseeds in a Magnakai kit', () => {
    const hero = mkHero(['curing', 'nexus', 'divination'], { weapons: [] });
    const k = setup(7, hero);
    k.rollGold(0);
    const i = k.from.findIndex((x) => x.item === 'fireseed');
    expect(k.from[i].n).toBe(3);
    k.choose(i);
    k.finish();
    expect(hero.special.filter((s) => s === 'fireseed')).toHaveLength(3);
  });
  it('finishes: draws gold from the Monastery', () => {
    const hero = empty({ gold: 0, storedGold: 20 });
    const k = setup(6, hero);
    k.rollGold(0);
    k.draw = 15;
    k.finish();
    expect(hero.gold).toBe(25);
    expect(hero.storedGold).toBe(5);
    const all = empty({ gold: 0, storedGold: 10 });
    const k2 = setup(6, all);
    k2.rollGold(0);
    k2.draw = 10;
    k2.finish();
    expect(all.storedGold).toBeUndefined();
  });
  it('finishes: leaves weapons and Special Items behind, and fetches stored ones back', () => {
    const hero = empty({ weapons: ['axe', 'mace'], special: ['map', 'chainmail'], ep: 24, epMax: 24, stored: ['spec:Old Badge', 'spec:Pendant'] });
    const k = setup(5, hero);
    k.rollGold(0);
    k.flip(k.dropW, 1); // the Mace
    k.flip(k.leave, 1); // the Chainmail Waistcoat
    k.flip(k.fetch, 0); // the Old Badge
    k.finish();
    expect(hero.weapons).toEqual(['axe']);
    expect(hero.special).toContain('map');
    expect(hero.special).toContain('spec:Old Badge');
    expect(hero.special).not.toContain('chainmail');
    expect(hero.stored).toEqual(['spec:Pendant', 'chainmail']);
    expect(hero.epMax).toBe(20); // the Chainmail's 4 went with it
    expect(hero.ep).toBe(20);
  });
  it('finishes: removes the stored list when nothing is left', () => {
    const hero = empty({ stored: ['spec:Pendant'] });
    const k = setup(5, hero);
    k.rollGold(0);
    k.flip(k.fetch, 0);
    k.finish();
    expect(hero.stored).toBeUndefined();
  });
});

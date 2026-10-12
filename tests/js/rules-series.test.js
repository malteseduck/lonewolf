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
});

describe('disciplines and ranks', () => {
  it('rankCount and rankOf go by the number of disciplines in the hero\'s series', () => {
    expect(LW.rankCount(kaiHero())).toBe(5);
    expect(LW.rankOf(kaiHero())).toBe('Initiate');
    expect(LW.rankOf(kaiHero({ disciplines: KAI() }))).toBe('Master');
    expect(LW.rankCount(mkHero(['curing', 'nexus', 'divination']))).toBe(3);
    expect(LW.rankOf(mkHero(['curing', 'nexus', 'divination']))).toBe('Kai Master Superior');
    expect(LW.rankOf(mkHero([]))).toBe('');
    expect(LW.rankOf(kaiHero({ disciplines: [] }))).toBe('');
  });
});

describe('the discipline effects by series', () => {
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
  it('mindPower: 1 Mindblast in Kai, 2 Psi-surge in Magnakai, else 0', () => {
    expect(LW.mindPower(kaiHero({ disciplines: ['mindblast'] }))).toBe(1);
    expect(LW.mindPower(kaiHero())).toBe(0);
    expect(LW.mindPower(mkHero(['psiSurge']))).toBe(2);
    expect(LW.mindPower(mkHero(['nexus']))).toBe(0); // the Kai Mindblast is not used in a Magnakai book
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
  it('subtracts an enemy\'s Mindforce unless shielded (Mindshield in Kai, Psi-screen in Magnakai)', () => {
    const ctx = { enemy: { mindforce: 3 } };
    expect(LW.heroCS(kaiHero(), ctx).total).toBe(12);
    expect(LW.heroCS(kaiHero({ disciplines: ['mindshield'] }), ctx).total).toBe(15);
    expect(LW.heroCS(mkHero(['nexus']), ctx).total).toBe(17);
    expect(LW.heroCS(mkHero(['psiScreen']), ctx).total).toBe(20);
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
  it('carries into a book he has not completed, not into one he has', () => {
    LW.Character.save(kaiHero(), { id: '01fftd', title: 'One' });
    const kept = LW.Character.load();
    expect(LW.Character.carries(kept, '02fotw')).toBe(true);
    expect(LW.Character.carries(kept, '01fftd')).toBe(false);
    expect(LW.Character.carries(null, '02fotw')).toBe(false);
  });
});

describe('LW.HeroSetup: a new character', () => {
  const book1 = { number: 1, series: 'kai' };
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
});

describe('LW.HeroSetup: a carried character', () => {
  const carried = () => ({ hero: kaiHero({ backpack: ['potion'], meals: 3, noPack: true, special: ['map'], gold: 22 }), completed: ['01fftd'] });
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
  it('offers Book 2\'s choose-2 list as the rules page prints it', () => {
    expect(LW.KITS[2].choose).toBe(2);
    expect(LW.KITS[2].give).toEqual(['map', 'seal']);
    expect(LW.KITS[2].from).toHaveLength(10);
  });
});

describe('LW.KitSetup', () => {
  const setup = (n, hero, book = {}) => LW.KitSetup(book, LW.KITS[n], hero);
  const empty = (over = {}) => Object.assign({ cs: 15, ep: 20, epMax: 20, weapons: [], backpack: [], special: [], meals: 0, gold: 0, series: 'kai', disciplines: [] }, over);
  beforeEach(() => { LW.addItems({ seal: { name: 'Seal of Hammerdal', kind: 'special' } }); });

  it('lets him choose only as many as the kit allows', () => {
    const k = setup(2, empty());
    k.choose(0); k.choose(4); k.choose(5);
    expect([...k.chosen]).toEqual([0, 4]);
    expect(k.canChoose(5)).toBe(false);
    k.choose(0);
    expect([...k.chosen]).toEqual([4]);
    expect(k.canChoose(5)).toBe(true);
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
});

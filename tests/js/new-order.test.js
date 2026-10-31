// @vitest-environment jsdom
// The New Order series (Books 21 on; rules-books.md, ADR 0047): its rules in the engine, the hero of the
// player's own, the Kai Weapon. Stand-in data only.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadShared } from './helpers.js';

let LW;
beforeEach(() => {
  LW = loadShared('core.js', 'rules-series.js', 'fight.js');
  localStorage.clear();
});

const FIVE = ['grandWeaponmastery', 'deliverance', 'kaiSurge', 'astrology', 'herbmastery'];
const noHero = (newOrder = FIVE, over = {}) => Object.assign({
  name: 'Sunblade', cs: 30, ep: 35, epMax: 35, series: 'neworder', disciplines: LW.SERIES.kai.list.slice(), newOrder, grandMastery: ['sword'],
  weapons: ['sword'], backpack: [], special: [], meals: 0, gold: 0, completed: [],
}, over);
const book = (n = 21, id = `${n}test`) => ({ id, number: n, series: 'neworder', title: 'Stand-in', start: '1', sections: {} });
const names = (cs) => cs.parts.map((p) => p.label);

describe('the series', () => {
  it('has sixteen disciplines, five at first, and twelve ranks from five to sixteen', () => {
    const S = LW.SERIES.neworder;
    expect(S.list).toHaveLength(16);
    expect(S.list).toEqual(expect.arrayContaining(['astrology', 'herbmastery', 'elementalism', 'bardsmanship', 'kaiSurge']));
    expect(S.first).toBe(5);
    expect(S.base).toEqual({ cs: 25, ep: 30 });
    expect(S.shelf).toEqual({ name: 'The New Order', from: 21, to: 28 });
    expect(LW.rankOf(noHero())).toBe('Kai Grand Master Senior');
    expect(LW.rankOf(noHero(LW.SERIES.neworder.list))).toBe('Kai Supreme Master');
  });
  it('leaves the Grand Master ranks as they were', () => {
    expect(LW.rankOf({ series: 'grandmaster', disciplines: [], grandmaster: ['kaiSurge'] })).toBe('Kai Grand Master Senior');
  });
  it('holds every Kai and Magnakai Discipline for the gates, the others only as chosen', () => {
    const h = noHero();
    expect(LW.has(h, 'tracking')).toBe(true);
    expect(LW.has(h, 'pathsmanship')).toBe(true);
    expect(LW.has(h, 'astrology')).toBe(true);
    expect(LW.has(h, 'bardsmanship')).toBe(false);
    expect(LW.has(h, 'telegnosis')).toBe(false);
  });
  it('spares a Meal only with Grand Huntmastery', () => {
    expect(LW.hunts(noHero())).toBe(false);
    expect(LW.hunts(noHero(['grandHuntmastery']))).toBe('Grand Huntmastery');
  });
  it('shields with Kai-screen', () => {
    expect(LW.shielded(noHero())).toBe(false);
    expect(LW.shielded(noHero(['kaiScreen']))).toBe(true);
  });
  it('has Kai-surge as chosen, and no mind attack without it', () => {
    expect(LW.mindPower(noHero())).toBe(2);
    expect(LW.psi(noHero()).surge).toBe(8);
    expect(LW.mindPower(noHero(['astrology']))).toBe(0);
  });
  it('loses nothing bare-handed', () => {
    const h = noHero(FIVE, { weapons: [] });
    expect(LW.heroCS(h).total).toBe(30);
    expect(names(LW.heroCS(h))).not.toContain('Unarmed');
    expect(LW.heroCS(h, { with: 'none' }).total).toBe(30);
  });
  it('gives Grand Weaponmastery +5 with the one weapon mastered, and +5 or the section\'s number with the Bow', () => {
    expect(LW.heroCS(noHero()).total).toBe(35);
    expect(LW.heroCS(noHero(FIVE, { weapons: ['axe'] })).total).toBe(30);
    const h = noHero(FIVE, { grandMastery: ['bow'], weapons: ['bow'], special: ['quiver'], arrows: 3 });
    expect(LW.bowShot(h).plus).toBe(5);
    expect(LW.bowShot(h, 3).plus).toBe(3); // ruling R10, as ADR 0047 has it
  });
  it('uses Deliverance once a book', () => {
    const h = noHero();
    expect(LW.cureOf(h)).toEqual({ name: 'Deliverance', at: 8 });
    expect(LW.canCure(h, '21test')).toBe(true);
    h.cured = '21test';
    expect(LW.canCure(h, '21test')).toBe(false);
    expect(LW.canCure(h, '22test')).toBe(true);
  });
  it('adds +1 COMBAT SKILL and +2 ENDURANCE for each Discipline past five, once', () => {
    const h = LW.readyHero(noHero([...FIVE, 'bardsmanship', 'elementalism'], { cs: 30, epMax: 35 }));
    expect([h.cs, h.epMax, h.ep]).toEqual([32, 39, 39]);
    LW.readyHero(h);
    expect([h.cs, h.epMax]).toEqual([32, 39]);
  });
  it('gives no bonus at five', () => {
    const h = LW.readyHero(noHero());
    expect([h.cs, h.epMax]).toEqual([30, 35]);
  });
});

describe('Curing: 1 a section without a fight, 10 a book', () => {
  const walk = (hero, n, id = '21test') => {
    const sections = {};
    for (let i = 1; i <= n + 1; i++) sections[i] = { text: ['x'], choices: i <= n ? [{ text: 'on', to: String(i + 1) }] : [] };
    const g = new LW.Game({ id, start: '1', sections }, 'test-save');
    g.start(hero);
    for (let i = 2; i <= n + 1; i++) g.go(String(i));
    return g;
  };
  it('every New Order hero has it, up to 10 in a book', () => {
    const g = walk(noHero(FIVE, { ep: 5 }), 14);
    expect(g.hero.ep).toBe(15);
  });
  it('starts again in the next book', () => {
    const g = walk(noHero(FIVE, { ep: 5 }), 14);
    const h = walk(g.hero, 3, '22test'); // the first section counts too
    expect(h.hero.ep).toBe(19);
  });
  it('leaves other series without a cap', () => {
    const g = walk({ name: 'Lone Wolf', cs: 15, ep: 5, epMax: 30, disciplines: ['healing'], series: 'kai', weapons: [], backpack: [], special: [], meals: 0, gold: 0 }, 14);
    expect(g.hero.ep).toBe(20);
  });
});

describe('always a new Kai, and carried on from book to book (ADR 0047)', () => {
  const kept = (hero, completed) => ({ hero, from: completed[completed.length - 1], completed });
  it('nothing from Books 1-20 comes in', () => {
    const lone = { series: 'grandmaster', disciplines: [], grandmaster: FIVE, weapons: [], backpack: [], special: [], meals: 0, gold: 0 };
    expect(LW.Character.carries(kept(lone, ['20naar']), '21votm')).toBe(false);
    expect(LW.Character.carries(kept(lone, ['19wb']), '20naar')).toBe(true);
  });
  it('a New Order hero goes on to the next book, and not back', () => {
    expect(LW.Character.carries(kept(noHero(), ['21votm']), '22tbos')).toBe(true);
    expect(LW.Character.carries(kept(noHero(), ['21votm']), '21votm')).toBe(false);
    expect(LW.Character.carries(kept(noHero(), ['21votm']), '05sots')).toBe(false);
    expect(LW.Character.carries(kept(noHero(), ['21votm']), '20naar')).toBe(false);
  });
  it('a new character is rolled at 25 and 30, with his or her choices', () => {
    const su = LW.HeroSetup(book(), null);
    expect(su.pick).toBe(5);
    su.roll('cs', 4); su.roll('ep', 6);
    FIVE.forEach((d) => su.toggle(d));
    su.toggleWeapon('sword');
    expect(su.need()).toBe(1);
    su.setKaiWeapon('valiance');
    su.setName('Stormheart', 'she');
    expect(su.ready()).toBe(true);
    const h = LW.readyHero(su.build());
    expect([h.cs, h.epMax, h.series]).toEqual([29, 36, 'neworder']);
    expect(h.newOrder).toEqual(FIVE);
    expect(h.grandMastery).toEqual(['sword']);
    expect(h.special).toContain('valiance');
    expect(LW.heroName(h)).toBe('Stormheart');
    expect(h.pronoun).toBe('she');
  });
  it('is carried with disciplines, Kai Weapon, Weapons, Special Items, Backpack Items and gold, not Meals', () => {
    const hero = noHero(FIVE, { special: ['valiance', 'rope'], backpack: ['potion'], meals: 2, gold: 30, weapons: ['sword', 'axe'] });
    const su = LW.HeroSetup(book(22), { hero, completed: ['21test'] });
    expect(su.pick).toBe(1);
    expect(su.needsKaiWeapon()).toBe(false);
    su.toggle('bardsmanship');
    su.toggleWeapon('axe');
    expect(su.ready()).toBe(true);
    const h = LW.readyHero(su.build());
    expect(h.special).toEqual(['valiance', 'rope']);
    expect(h.backpack).toEqual(['potion']);
    expect(h.weapons).toEqual(['sword', 'axe']);
    expect(h.meals).toBe(0);
    expect(h.gold).toBe(30);
    expect(h.grandMastery).toEqual(['sword', 'axe']);
    expect(h.name).toBe('Sunblade');
    expect([h.cs, h.epMax]).toEqual([31, 37]);
  });
  it('Book 21 sets out with its kit: 20 + the number, five of ten, no Monastery', () => {
    const kit = LW.KITS[21];
    expect(kit.gold).toBe(20);
    expect(kit.choose).toBe(5);
    expect(kit.from).toHaveLength(10);
    expect(kit.store).toBeFalsy();
    expect(kit.storeGold).toBeFalsy();
  });
});

describe('the hero of the player\'s own', () => {
  it('draws a Kai name from the two tables', () => {
    expect(LW.kaiName(0, 0)).toBe('Swiftblade');
    expect(LW.kaiName(7, 3)).toBe('Stormheart');
    expect(LW.kaiName()).toMatch(/^[A-Z][a-z]+$/);
  });
  it('a typed name stands, and a name is asked for only in the series that asks', () => {
    const su = LW.HeroSetup(book(), null);
    expect(su.needsName()).toBe(true);
    su.setName('  Ana  ', 'they');
    expect(su.name).toBe('Ana');
    expect(LW.HeroSetup({ id: '13test', number: 13, series: 'grandmaster' }, null).needsName()).toBe(false);
  });
  it('choose for me draws a name, a Kai Weapon and everything else', () => {
    const su = LW.HeroSetup(book(), null);
    expect(su.ready()).toBe(false);
    su.auto();
    expect(su.ready()).toBe(true);
    expect(LW.KAI_WEAPONS.map((w) => w.id)).toContain(su.kaiWeapon);
    expect(su.name).toMatch(/^[A-Z]/);
    expect(LW.PRONOUNS).toHaveProperty(su.pronoun);
  });
  it('anyone else is Lone Wolf, as before', () => {
    expect(LW.heroName({ series: 'kai' })).toBe('Lone Wolf');
    expect(LW.heroPronoun({ series: 'kai' })).toEqual(LW.PRONOUNS.he);
    expect(LW.heroPronoun(noHero(FIVE, { pronoun: 'she' })).obj).toBe('her');
  });
});

describe('the Kai Weapon', () => {
  const fightWith = (combat, hero) => {
    const b = { id: '21test', start: '1', sections: { 1: { text: ['x'], combat: Object.assign({ enemies: [{ name: 'Foe', cs: 20, ep: 20 }], to: '2' }, combat), choices: [] }, 2: { text: ['y'] } } };
    const g = new LW.Game(b, 'test-save');
    g.start(hero);
    return new LW.Fight(g, 'test');
  };
  const armed = (over = {}) => noHero(['astrology', 'herbmastery', 'bardsmanship', 'elementalism', 'telegnosis'], Object.assign({ cs: 30, weapons: [], special: ['alema'], grandMastery: [] }, over));

  it('lists ten, each a Special Item that fights as its kind for +5', () => {
    expect(LW.KAI_WEAPONS).toHaveLength(10);
    expect(LW.KAI_WEAPONS[0]).toMatchObject({ id: 'spawnsmite', kind: 'axe', vs: 'reptile', more: 6 });
    const it = LW.ITEMS.ulnarias;
    expect(it).toMatchObject({ kind: 'special', weapon: ['sword'], cs: 5, more: 9, vs: 'water' });
    expect(LW.armedWith(armed())).toBe('alema');
    expect(LW.heroCS(armed()).total).toBe(35);
  });
  it('is carried beside two ordinary Weapons', () => {
    const h = armed({ weapons: ['sword', 'axe'] });
    expect(LW.armedWith(h)).toBe('alema');
    expect(LW.putItem(h, 'dagger')).toBeTruthy(); // a third is refused
    expect(h.weapons).toEqual(['sword', 'axe']);
  });
  it('adds Grand Weaponmastery\'s +5 beside it when the kind is mastered', () => {
    const h = armed({ grandMastery: ['axe'] });
    h.newOrder = ['grandWeaponmastery'];
    expect(LW.heroCS(h).total).toBe(40);
  });
  it('has the higher bonus in place of the +5 where the fight is marked', () => {
    const f = fightWith({ kaiWeapon: ['undead'] }, armed());
    expect(f.cs()).toBe(37);
    expect(f.kaiWeaponNow()).toMatchObject({ id: 'alema', more: 7, marked: true, on: true });
  });
  it('keeps the +5 where the mark names something else, until the player claims it', () => {
    const f = fightWith({ kaiWeapon: ['night'] }, armed());
    expect(f.cs()).toBe(35);
    expect(f.kaiWeaponNow()).toMatchObject({ marked: false, on: false });
    f.claimKaiWeapon();
    expect(f.cs()).toBe(37);
    expect(f.kaiWeaponNow().on).toBe(true);
    f.claimKaiWeapon();
    expect(f.cs()).toBe(35);
  });
  it('a marked fight cannot be let go, and a claim does not raise an ordinary weapon', () => {
    const f = fightWith({ kaiWeapon: ['undead'] }, armed());
    f.claimKaiWeapon();
    expect(f.cs()).toBe(37);
    const g = fightWith({}, noHero(['grandWeaponmastery'], { cs: 30 }));
    expect(g.kaiWeaponNow()).toBe(null);
    g.claimKaiWeapon();
    expect(g.cs()).toBe(35);
  });
  it('a fight with no use for it offers no claim', () => {
    const f = fightWith({ with: 'none' }, armed());
    expect(f.kaiWeaponNow()).toBe(null);
  });
});

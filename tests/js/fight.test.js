// @vitest-environment jsdom
// shared/fight.js: whole fights on a stand-in section, as the page plays them (round = roll, strike,
// suffer, advance; the page only animates between those steps).
import { describe, it, expect, beforeEach } from 'vitest';
import { loadShared } from './helpers.js';

let LW;
beforeEach(() => {
  LW = loadShared('core.js', 'rules-series.js', 'fight.js');
  localStorage.clear();
});

const mkHero = (over = {}) => Object.assign({
  name: 'Lone Wolf', cs: 15, ep: 25, epMax: 25, disciplines: [], weaponskill: null, series: 'kai',
  weapons: ['sword'], backpack: [], special: [], meals: 0, gold: 0,
}, over);
const foe = (over = {}) => Object.assign({ name: 'Giak', cs: 10, ep: 12 }, over);
/* a fight in section 1 of a stand-in book; 2 and 3 are ways on */
function fightAt(combat, hero = mkHero()) {
  const book = { id: 'test', start: '1', sections: { 1: { text: ['x'], combat, choices: [{ text: 'on', to: '2' }] }, 2: { text: ['y'] }, 3: { text: ['z'] } } };
  const g = new LW.Game(book, 'test-save');
  g.start(hero);
  return { g, f: new LW.Fight(g, 'test') };
}
/* the first Random Number whose result at this ratio passes the test */
const drawWhere = (ratio, ok) => [...Array(10).keys()].find((n) => ok(LW.combatRound(ratio, n)));

describe('a fight to the end', () => {
  it('is won round by round by the table, and takes the way on', () => {
    const { g, f } = fightAt({ enemies: [foe()], to: '3' });
    expect(f.ratio()).toBe(5); // 15 with a sword, against 10
    let hero = 25, enemy = 12, n = 0;
    while (!f.over) {
      const res = LW.combatRound(5, n % 10);
      enemy -= Math.min(res.enemy, enemy); hero -= Math.min(res.hero, hero);
      f.round(n % 10); n++;
      expect([f.foe.ep, g.hero.ep]).toEqual([Math.max(enemy, 0), hero]);
    }
    expect(f.over).toBe('win');
    expect(f.rounds).toBe(n);
    expect(f.log[0]).toMatch(/^I\. You drew 0\./);
    f.finish();
    expect(g.s.fought['1']).toBe(true);
    expect(g.s.at).toBe('3');
  });
  it('without a way on of its own, leaves him in the section with its choices open', () => {
    const { g, f } = fightAt({ enemies: [foe({ ep: 1 })] });
    f.round(drawWhere(5, (r) => r.enemy > 0));
    f.finish();
    expect(g.s.at).toBe('1');
    expect(g.combatPending).toBe(false);
    expect(g.choices().map((c) => c.enabled)).toEqual([true]);
  });
  it('ends his adventure when his Endurance runs out, never below 0', () => {
    const { g, f } = fightAt({ enemies: [foe({ cs: 40 })] }, mkHero({ ep: 1 }));
    f.round(drawWhere(f.ratio(), (r) => r.hero > 0));
    expect(f.over).toBe('dead');
    expect(g.hero.ep).toBe(0);
    f.finish();
    expect(g.s.at).toBe('1');
    expect(g.combatPending).toBe(true);
  });
  it('brings on the next foe when one falls, leaving the book\'s numbers as printed', () => {
    const { g, f } = fightAt({ enemies: [foe({ ep: 1 }), foe({ name: 'Kraan', ep: 5 })] });
    const o = f.round(drawWhere(5, (r) => r.enemy > 0));
    expect(o.down).toBe(true);
    expect(f.over).toBe(null);
    expect([f.i, f.foe.name, f.foe.ep, f.foe.max]).toEqual([1, 'Kraan', 5, 5]);
    expect(f.log).toContain('Giak falls. Kraan takes its place.');
    expect(g.section.combat.enemies[0].ep).toBe(1);
  });
});

describe('the Combat Ratio', () => {
  it('counts for at most +10 (the house rule against the Sommerswerd, ADR 0023)', () => {
    const { f } = fightAt({ enemies: [foe()] }, mkHero({ cs: 40 }));
    expect(f.ratio()).toBe(10);
    expect(LW.crtColumn(10)).not.toBe(LW.crtColumn(11)); // so the last column is never reached
  });
  it('is not capped below', () => {
    const { f } = fightAt({ enemies: [foe({ cs: 40 })] });
    expect(f.ratio()).toBe(-25);
  });
});

describe('the fight\'s own Combat Skill change', () => {
  const magnakai = (over) => mkHero(Object.assign({ series: 'magnakai', magnakai: ['huntmastery'] }, over));
  it('applies, and is named in the log', () => {
    const { f } = fightAt({ enemies: [foe()], csMod: -2, csNote: 'In the dark' });
    expect(f.cs()).toBe(13);
    expect(f.log).toContain('In the dark: Combat Skill less 2.');
  });
  it('is spared by carrying every item the text names', () => {
    const { f } = fightAt({ enemies: [foe()], csMod: -2, unless: ['pack:Torch'] }, mkHero({ backpack: ['pack:Torch'] }));
    expect(f.cs()).toBe(15);
    expect(f.log).toContain('Your Torch spare you the penalty.');
  });
  it('an ambush is no surprise to Huntmastery in a Magnakai book, and is to a Kai Lone Wolf', () => {
    expect(fightAt({ enemies: [foe()], csMod: -3, ambush: true }, magnakai()).f.cs()).toBe(15);
    expect(fightAt({ enemies: [foe()], csMod: -3, ambush: true }).f.cs()).toBe(12);
  });
  it('a bonus "if you have" is missed without it; a penalty "unless you have" is excused with it', () => {
    expect(fightAt({ enemies: [foe()], csMod: 2, csIf: { disc: 'animalKinship' } }).f.cs()).toBe(15);
    expect(fightAt({ enemies: [foe()], csMod: 2, csIf: { disc: 'animalKinship' } }, mkHero({ disciplines: ['animalKinship'] })).f.cs()).toBe(17);
    const { f } = fightAt({ enemies: [foe()], csMod: -2, csUnless: { disc: 'mindshield' } }, mkHero({ disciplines: ['mindshield'] }));
    expect(f.cs()).toBe(15);
    expect(f.log.join(' ')).toMatch(/spared the penalty/);
  });
  it('the text\'s "unarmed" penalty is not added to the engine\'s own -4', () => {
    const { f } = fightAt({ enemies: [foe()], csMod: -4, unarmed: true }, mkHero({ weapons: [] }));
    expect(f.cs()).toBe(11);
  });
});

describe('evading', () => {
  const big = () => mkHero({ ep: 100, epMax: 100 });
  it('opens after the rounds the text asks, and closes when it says', () => {
    const { f } = fightAt({ enemies: [foe({ ep: 100 })], evade: { after: 2, within: 3, to: '2' } }, big());
    expect(f.evadeOpen).toBe(false);
    f.round(0); f.round(0);
    expect(f.evadeOpen).toBe(true);
    f.round(0);
    expect([f.evadeOpen, f.evadeLate]).toEqual([false, true]);
  });
  it('costs only his own loss, and takes the way out', () => {
    const { g, f } = fightAt({ enemies: [foe({ ep: 100 })], evade: { after: 0, to: '2' } }, big());
    const n = drawWhere(5, (r) => r.hero > 0), res = LW.combatRound(5, n);
    f.round(n, 'evade');
    expect([f.over, f.foe.ep, g.hero.ep]).toEqual(['evade', 100, 100 - res.hero]);
    f.finish();
    expect(g.s.at).toBe('2');
  });
});

describe('the mind', () => {
  it('Mindblast adds 2, unless the foe is immune to it', () => {
    const hero = () => mkHero({ disciplines: ['mindblast'] });
    expect(fightAt({ enemies: [foe()] }, hero()).f.cs()).toBe(17);
    const { f } = fightAt({ enemies: [foe({ immune: 'mindblast' })] }, hero());
    expect([f.cs(), f.deaf()]).toEqual([15, true]);
    f.focus();
    expect(f.log.at(-1)).toBe('Giak is immune to Mindblast.');
  });
  it('Psi-surge adds 4 at 2 Endurance a round, and falls back on Mindblast at 6', () => {
    const hero = mkHero({ series: 'magnakai', magnakai: ['psiSurge'], cs: 30, ep: 10 });
    const { g, f } = fightAt({ enemies: [foe({ ep: 999 })] }, hero);
    expect([f.power, f.mind, f.cs()]).toEqual([2, 1, 32]); // Mindblast through Psi-surge: +2
    f.focus();
    expect([f.mind, f.cs()]).toEqual([2, 34]);
    const unhurt = drawWhere(10, (r) => r.hero === 0 && r.enemy < 50); // not a killing blow: the fight goes on
    f.round(unhurt);
    expect([g.hero.ep, f.mind]).toEqual([8, 2]);
    f.round(unhurt);
    expect([g.hero.ep, f.mind]).toEqual([6, 1]);
    expect(f.log.at(-1)).toBe('Too weak to hold it, you fall back on Mindblast.');
    f.focus();
    expect(f.mind).toBe(0);
    expect(f.log.at(-1)).toBe('You are too weak to Psi-surge.');
  });
  it('a foe\'s mind attack drains every round, unless he is shielded', () => {
    const hero = (d) => mkHero({ cs: 30, disciplines: d });
    let { g, f } = fightAt({ enemies: [foe({ ep: 999, drain: 2 })] }, hero([]));
    const unhurt = drawWhere(10, (r) => r.hero === 0 && r.enemy < 50); // not a killing blow: the fight goes on
    f.round(unhurt); f.round(unhurt);
    expect(g.hero.ep).toBe(21);
    ({ g, f } = fightAt({ enemies: [foe({ ep: 999, drain: 2 })] }, hero(['mindshield'])));
    f.round(unhurt); f.round(unhurt);
    expect(g.hero.ep).toBe(25);
    expect(f.log).toContain('Its mind attack breaks against your shield.');
  });
});

describe('doubled blows', () => {
  it('against the undead with a blade that doubles against them, and where the text doubles them', () => {
    LW.addItems({ brightBlade: { name: 'Bright Blade', kind: 'special', weapon: ['sword'], cs: 8, undead: 2 } });
    const n = drawWhere(10, (r) => r.enemy > 0 && r.enemy < 50), res = LW.combatRound(10, n);
    let { f } = fightAt({ enemies: [foe({ ep: 99, undead: true })] }, mkHero({ special: ['brightBlade'] }));
    expect(f.weapon).toBe('brightBlade');
    expect(f.log).toContain('You fight with the Bright Blade.');
    f.round(n);
    expect(f.foe.ep).toBe(99 - 2 * res.enemy);
    ({ f } = fightAt({ enemies: [foe({ ep: 99 })], double: true }, mkHero({ cs: 23 })));
    f.round(n);
    expect(f.foe.ep).toBe(99 - 2 * res.enemy);
  });
});

describe('healing mid-fight', () => {
  it('Laumspur gives 4 back (the house rule), never past the maximum', () => {
    const { g, f } = fightAt({ enemies: [foe()] }, mkHero({ ep: 10, backpack: ['potion', 'pack:Rope'] }));
    f.drink();
    expect([g.hero.ep, g.hero.backpack]).toEqual([14, ['pack:Rope']]);
  });
  it('an Archmaster\'s Curing gives 20 back, once a book', () => {
    const nine = ['curing', 'psiSurge', 'weaponmastery', 'animalControl', 'invisibility', 'huntmastery', 'pathsmanship', 'psiScreen', 'nexus'];
    const { g, f } = fightAt({ enemies: [foe()] }, mkHero({ series: 'magnakai', magnakai: nine, ep: 5, epMax: 40 }));
    expect(LW.canCure(g.hero, 'test')).toBe(true);
    f.cure();
    expect(g.hero.ep).toBe(25);
    expect(LW.canCure(g.hero, 'test')).toBe(false);
  });
});

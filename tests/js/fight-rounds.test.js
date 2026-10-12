// @vitest-environment jsdom
// shared/fight.js: what the item tables now ask of a fight: changes for some rounds only, the fight's
// length deciding the way on or ending it, multiplied or extra losses, whole-fight conditions, psychic
// changes, fights of the mind, draughts before a fight, and breaking off by hand.
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
const foe = (over = {}) => Object.assign({ name: 'Giak', cs: 10, ep: 99 }, over);
/* a fight in section 1; 2, 3 and 4 are ways on */
function fightAt(combat, hero = mkHero()) {
  const book = { id: 'test', start: '1', sections: { 1: { text: ['x'], combat, choices: [{ text: 'a', to: '2' }, { text: 'b', to: '3' }] }, 2: { text: ['y'] }, 3: { text: ['z'] }, 4: { text: ['w'] } } };
  const g = new LW.Game(book, 'test-save');
  g.start(hero);
  return { g, f: new LW.Fight(g, 'test') };
}
const drawWhere = (ratio, ok) => [...Array(10).keys()].find((n) => ok(LW.combatRound(ratio, n)));
const wounding = (ratio) => drawWhere(ratio, (r) => r.hero > 0 && r.hero < 50 && r.enemy > 0 && r.enemy < 50);

describe('changes for some rounds only', () => {
  it('a Combat Skill change lasts the rounds the text gives, and the log says when it ends', () => {
    const { f } = fightAt({ enemies: [foe()], rounds: [{ upTo: 2, csMod: -4, note: 'Weapon not drawn' }] });
    expect([f.cs(1), f.cs(2), f.cs(3)]).toEqual([11, 11, 15]);
    expect(f.log).toContain('Weapon not drawn: Combat Skill less 4 (to round II).');
    f.round(wounding(1)); f.round(wounding(1)); f.round(wounding(5));
    expect(f.log.join(' ')).toMatch(/Weapon not drawn: that is over\./);
  });
  it('a surprise penalty is spared by Huntmastery in a Magnakai book, or by the discipline the text names', () => {
    const r = [{ upTo: 1, csMod: -3, ambush: true }];
    expect(fightAt({ enemies: [foe()], rounds: r }).f.cs()).toBe(12);
    expect(fightAt({ enemies: [foe()], rounds: r }, mkHero({ series: 'magnakai', magnakai: ['huntmastery'] })).f.cs()).toBe(15);
    const div = [{ upTo: 2, csMod: -2, unless: { disc: ['huntmastery', 'divination'] } }];
    expect(fightAt({ enemies: [foe()], rounds: div }, mkHero({ series: 'magnakai', magnakai: ['divination'] })).f.cs()).toBe(15);
  });
  it('fighting bare-handed for the first rounds, then with his weapon', () => {
    const { f } = fightAt({ enemies: [foe()], rounds: [{ upTo: 2, unarmed: true }] });
    expect([f.cs(1), f.cs(2), f.cs(3)]).toEqual([11, 11, 15]);
  });
  it('his losses ignored in the first rounds, and the enemy\'s', () => {
    const n = wounding(5), res = LW.combatRound(5, n);
    let { g, f } = fightAt({ enemies: [foe()], rounds: [{ upTo: 1, heroLoss: 0 }] });
    f.round(n);
    expect(g.hero.ep).toBe(25);
    f.round(n);
    expect(g.hero.ep).toBe(25 - res.hero);
    ({ g, f } = fightAt({ enemies: [foe()], rounds: [{ upTo: 1, foeLoss: 0 }] }));
    f.round(n);
    expect(f.foe.ep).toBe(99);
  });
  it('a killing blow ignored is no blow at all', () => {
    const k = drawWhere(-12, (r) => r.hero === Infinity);
    const { g, f } = fightAt({ enemies: [foe({ cs: 40 })], rounds: [{ upTo: 1, heroLoss: 0 }] });
    f.round(k);
    expect([g.hero.ep, f.over]).toEqual([25, null]);
  });
  it('a change that begins later, and one for the later foes only', () => {
    const { f } = fightAt({ enemies: [foe({ ep: 1 }), foe({ name: 'Kraan' })], rounds: [{ from: 2, csMod: -2 }, { fromFoe: 1, csMod: 2, note: 'Sogh' }] });
    expect(f.cs(1)).toBe(15);
    f.round(drawWhere(5, (r) => r.enemy > 0 && r.enemy < 50));
    expect(f.foe.name).toBe('Kraan');
    expect(f.cs()).toBe(15); // round II: -2, and +2 for the second foe
  });
});

describe('the fight\'s length', () => {
  it('only N rounds are fought: then the fight ends, and leads where the text says', () => {
    const { g, f } = fightAt({ enemies: [foe()], stop: { after: 2, to: '3' } });
    f.round(wounding(5));
    expect(f.over).toBe(null);
    f.round(wounding(5));
    expect([f.over, f.way()]).toEqual(['stop', '3']);
    f.finish();
    expect(g.s.at).toBe('3');
  });
  it('N rounds without a way of its own open the section\'s choices', () => {
    const { g, f } = fightAt({ enemies: [foe()], stop: { after: 1 } });
    f.round(wounding(5));
    f.finish();
    expect([g.s.at, g.choices().every((c) => c.enabled)]).toEqual(['1', true]);
  });
  it('one round, the way on by who lost more', () => {
    const n = wounding(5), res = LW.combatRound(5, n);
    const { f } = fightAt({ enemies: [foe()], stop: { after: 1, by: { hero: '2', foe: '3', even: '4' } } });
    f.round(n);
    expect(f.way()).toBe(res.hero > res.enemy ? '2' : res.enemy > res.hero ? '3' : '4');
  });
  it('stops at his first wound', () => {
    const { f } = fightAt({ enemies: [foe()], stop: { wound: true, to: '3' } });
    f.round(drawWhere(5, (r) => r.hero === 0 && r.enemy < 50));
    expect(f.over).toBe(null);
    f.round(wounding(5));
    expect([f.over, f.way()]).toEqual(['stop', '3']);
  });
  it('breaks off when the enemy is down to so much', () => {
    const { f } = fightAt({ enemies: [foe({ ep: 30 })], stop: { foeAt: 25, to: '2' } });
    while (!f.over) f.round(wounding(5));
    expect(f.foe.ep).toBeLessThanOrEqual(25);
    expect([f.over, f.way()]).toEqual(['stop', '2']);
  });
  it('a number drawn ends the fight at once, before any blow', () => {
    const { g, f } = fightAt({ enemies: [foe()], stop: { drawn: [1], to: '4' } });
    f.round(1);
    expect([f.over, f.foe.ep, g.hero.ep, f.way()]).toEqual(['stop', 99, 25, '4']);
  });
  it('a win within N rounds goes one way, a longer one the other', () => {
    const kill = drawWhere(10, (r) => r.enemy === Infinity), slow = drawWhere(10, (r) => r.enemy > 0 && r.enemy < 50);
    let { f } = fightAt({ enemies: [foe()], won: { within: 1, to: '2', else: '3' } }, mkHero({ cs: 30 }));
    f.round(kill);
    expect(f.way()).toBe('2');
    ({ f } = fightAt({ enemies: [foe({ ep: 20 })], won: { within: 1, to: '2', else: '3' } }, mkHero({ cs: 30 })));
    while (!f.over) f.round(slow);
    expect(f.way()).toBe('3');
  });
  it('once wounded, the way on changes, won or evaded', () => {
    const { f } = fightAt({ enemies: [foe()], evade: { after: 0, to: '2' }, wounded: '4' });
    f.round(wounding(5));
    f.round(drawWhere(5, () => true), 'evade');
    expect(f.way()).toBe('4');
  });
});

describe('losses multiplied, and losses every round', () => {
  it('his losses doubled unless he has the discipline; halved by an ally; one more a wound', () => {
    const n = wounding(5), res = LW.combatRound(5, n);
    const lost = (rounds, hero) => { const { g, f } = fightAt({ enemies: [foe()], rounds }, hero); f.round(n); return 25 - g.hero.ep; };
    expect(lost([{ heroLoss: 2, unless: { disc: 'curing' } }])).toBe(2 * res.hero);
    expect(lost([{ heroLoss: 2, unless: { disc: 'curing' } }], mkHero({ series: 'magnakai', magnakai: ['curing'] }))).toBe(res.hero);
    expect(lost([{ heroLoss: 0.5 }])).toBe(Math.floor(res.hero / 2));
    expect(lost([{ heroPlus: 2 }])).toBe(res.hero + 2);
  });
  it('a loss every round the dice do not give (the cold), and the enemy\'s extra wound from an ally', () => {
    const n = drawWhere(5, (r) => r.hero === 0 && r.enemy > 0 && r.enemy < 50), res = LW.combatRound(5, n);
    const { g, f } = fightAt({ enemies: [foe()], rounds: [{ heroEach: 2, unless: { disc: 'nexus' } }, { foeEach: 3 }] });
    f.round(n);
    expect([g.hero.ep, f.foe.ep]).toEqual([23, 99 - res.enemy - 3]);
  });
  it('the enemy\'s losses doubled only while his mind attacks it', () => {
    const n = drawWhere(7, (r) => r.enemy > 0 && r.enemy < 50), res = LW.combatRound(7, n);
    const { f } = fightAt({ enemies: [foe()], rounds: [{ foeLoss: 2, mind: true }] }, mkHero({ disciplines: ['mindblast'] }));
    f.round(n);
    expect(f.foe.ep).toBe(99 - 2 * res.enemy);
  });
});

describe('whole-fight conditions', () => {
  it('a weapon\'s bonus against one foe, in place of its own', () => {
    LW.addItems({ mace5: { name: 'Jewelled Mace', kind: 'special', weapon: ['mace'], cs: 0 }, dagger12: { name: 'Dagger of Vashna', kind: 'special', weapon: ['dagger'], cs: 3 } });
    expect(fightAt({ enemies: [foe()], weaponCs: { mace5: 5 } }, mkHero({ special: ['mace5'] })).f.cs()).toBe(20);
    const { f } = fightAt({ enemies: [foe()], weaponCs: { dagger12: 7 } }, mkHero({ weapons: [], special: ['dagger12'] }));
    expect([f.weapon, f.cs()]).toEqual(['dagger12', 22]);
  });
  it('a penalty by the kind of weapon in hand', () => {
    const r = [{ csMod: -2, if: { wield: true, not: { wield: ['broadsword', 'spear', 'quarterstaff'] } } }];
    expect(fightAt({ enemies: [foe()], rounds: r }).f.cs()).toBe(13);
    expect(fightAt({ enemies: [foe()], rounds: r }, mkHero({ weapons: ['spear'] })).f.cs()).toBe(15);
  });
  it('no Shield, and no two-handed weapon', () => {
    const hero = () => mkHero({ weapons: ['broadsword', 'dagger'], special: ['shield'] });
    expect(fightAt({ enemies: [foe()] }, hero()).f.cs()).toBe(17);
    const { f } = fightAt({ enemies: [foe()], noShield: true, barred: ['broadsword', 'spear', 'quarterstaff'] }, hero());
    expect([f.weapon, f.cs()]).toEqual(['dagger', 15]);
  });
  it('bare-handed, but a discipline spares the penalty', () => {
    expect(fightAt({ enemies: [foe()], with: 'none' }).f.cs()).toBe(11);
    expect(fightAt({ enemies: [foe()], with: 'none', noUnarmed: { disc: 'nexus' } }, mkHero({ series: 'magnakai', magnakai: ['nexus'] })).f.cs()).toBe(15);
  });
  it('fighting with a weapon not yet his', () => {
    LW.addItems({ helshezag: { name: 'Helshezag', kind: 'special', weapon: ['sword'], cs: 5 } });
    const { f } = fightAt({ enemies: [foe()], lend: 'helshezag' });
    expect([f.weapon, f.cs()]).toEqual(['helshezag', 20]);
  });
  it('no evading, and an evasion only with a discipline, taken without a blow', () => {
    expect(fightAt({ enemies: [foe()], evade: { after: 0, to: '2' }, noEvade: true }).f.evadeOpen).toBe(false);
    expect(fightAt({ enemies: [foe()], evade: { after: 0, to: '2', if: { disc: 'invisibility' } } }).f.evadeOpen).toBe(false);
    const { g, f } = fightAt({ enemies: [foe()], evade: { after: 0, to: '2', if: { disc: 'invisibility' }, free: true } }, mkHero({ series: 'magnakai', magnakai: ['invisibility'] }));
    f.round(wounding(5), 'evade');
    expect([f.over, g.hero.ep]).toEqual(['evade', 25]);
  });
  it('the same foes fought again keep their wounds, and those already dead stay so', () => {
    const { g, f } = fightAt({ enemies: [foe({ name: 'K1', ep: 1 }), foe({ name: 'K2', ep: 9 })], keep: 'kalkoth', evade: { after: 1, to: '2' } });
    f.round(drawWhere(5, (r) => r.enemy > 0 && r.enemy < 50));
    expect(f.foe.name).toBe('K2');
    f.round(drawWhere(5, (r) => r.enemy < 50), 'evade');
    const again = new LW.Fight(g, 'test');
    expect(again.foes.map((x) => x.name)).toEqual(['K2']);
    expect(again.log[0]).toMatch(/still carry the wounds/);
  });
  it('a Shield and a helm that adds to the fight both count', () => {
    LW.addItems({ silverHelm: { name: 'Silver Helm', kind: 'special', fightCs: 2 } });
    expect(fightAt({ enemies: [foe()] }, mkHero({ special: ['shield', 'silverHelm'] })).f.cs()).toBe(19);
  });
});

describe('the mind', () => {
  it('Mindblast doubled against a foe that takes it badly, tripled with the Lore-circle', () => {
    const r = [{ psi: 2 }];
    expect(fightAt({ enemies: [foe()], rounds: r }, mkHero({ disciplines: ['mindblast'] })).f.cs()).toBe(19);
  });
  it('a fight of the mind: a fixed score, or his own with what the text adds, and no weapon', () => {
    expect(fightAt({ enemies: [foe()], mind: { cs: 15 } }, mkHero({ cs: 22, special: ['shield'] })).f.cs()).toBe(15);
    LW.addItems({ psychicRing: { name: 'Psychic Ring', kind: 'special' } });
    const hero = mkHero({ series: 'magnakai', magnakai: ['psiSurge', 'nexus', 'curing', 'divination', 'huntmastery'], special: ['psychicRing', 'shield'] });
    const { f } = fightAt({ enemies: [foe()], mind: { each: 1, over: 3, items: { psychicRing: 3 } } }, hero);
    expect([f.cs(), f.power]).toEqual([15 + 2 + 3, 0]);
  });
});

describe('after the fight', () => {
  it('half of what it cost him comes back, rounded down', () => {
    const n = wounding(5), res = LW.combatRound(5, n);
    const { g, f } = fightAt({ enemies: [foe()], healLost: 0.5, stop: { after: 1 } });
    f.round(n);
    expect(g.hero.ep).toBe(25 - res.hero + Math.floor(res.hero / 2));
  });
  it('a contest gives his Endurance back as it was', () => {
    const { g, f } = fightAt({ enemies: [foe()], restore: true, stop: { after: 1 } });
    f.round(wounding(5));
    expect(g.hero.ep).toBe(25);
  });
  it('broken off by hand where the text allows: no blow, and the section\'s choices open', () => {
    const { g, f } = fightAt({ enemies: [foe()], byHand: 'the text ends it' });
    f.round(wounding(5));
    const ep = g.hero.ep;
    f.stopHere(); f.finish();
    expect([f.over, g.hero.ep, g.combatPending]).toEqual(['stop', ep, false]);
  });
});

describe('a draught before the fight', () => {
  beforeEach(() => { LW.addItems({ adgana: { name: 'Adgana', kind: 'backpack', boost: 6, boostAgain: 3, addict: { key: 'adgana', upTo: 1, again: 3, epMax: -4 } }, alether: { name: 'Alether', kind: 'backpack', boost: 2 } }); });
  it('adds to his Combat Skill for that fight, only before the first round, and not where the text forbids it', () => {
    let { f } = fightAt({ enemies: [foe()] }, mkHero({ backpack: ['alether'] }));
    expect(f.boosts()).toEqual(['alether']);
    f.boost('alether');
    expect([f.cs(), f.hero.backpack, f.boosts()]).toEqual([17, [], []]);
    expect(fightAt({ enemies: [foe()], noBoost: true }, mkHero({ backpack: ['alether'] })).f.boosts()).toEqual([]);
  });
  it('an addictive one draws when the fight is over: the second dose weaker and riskier', () => {
    const { g, f } = fightAt({ enemies: [foe({ ep: 1 })] }, mkHero({ backpack: ['adgana', 'adgana'] }));
    f.boost('adgana');
    expect(f.cs()).toBe(21);
    LW.rand10 = () => 1;
    f.round(drawWhere(11, (r) => r.enemy > 0));
    expect([f.over, g.hero.epMax]).toEqual(['win', 21]);
    g.s.fought = {};
    const again = new LW.Fight(g, 'test');
    again.boost('adgana');
    expect(again.boosted.n).toBe(3);
  });
});

describe('a contest by points (Book 6\'s archery)', () => {
  it('fought with target points in place of Endurance: his own untouched, and losing leads where the text says', () => {
    const { g, f } = fightAt({ enemies: [foe({ ep: 50 })], points: { n: 50, lose: '4' } }, mkHero({ cs: 5 }));
    while (!f.over) f.round(drawWhere(-5, (r) => r.hero > 0 && r.hero < 50));
    expect([f.over, f.way(), g.hero.ep]).toEqual(['stop', '4', 25]);
  });
});

describe('gaps the books showed', () => {
  it('a foe killed outright is a win, not a stop at "down to N"', () => {
    const kill = drawWhere(10, (r) => r.enemy === Infinity);
    const { f } = fightAt({ enemies: [foe({ ep: 30 })], stop: { foeAt: 20, to: '3' }, to: '2' }, mkHero({ cs: 30 }));
    f.round(kill);
    expect([f.over, f.way()]).toEqual(['win', '2']);
  });
  it('a contest lost at 0 Endurance is no death: his Endurance comes back and it leads where the text says', () => {
    const { g, f } = fightAt({ enemies: [foe({ cs: 40 })], restore: true, lose: '4' }, mkHero({ ep: 3 }));
    while (!f.over) f.round(drawWhere(-25, (r) => r.hero > 0 && r.hero < 50));
    expect([f.over, f.way(), g.hero.ep]).toEqual(['stop', '4', 3]);
  });
});

describe('more gaps the books showed', () => {
  it('two ways to evade, one only with a discipline and without a blow', () => {
    const ev = [{ after: 1, to: '2' }, { after: 0, to: '3', if: { disc: 'invisibility' }, free: true }];
    let { f } = fightAt({ enemies: [foe()], evade: ev });
    expect([f.evadeOpen, f.evades().map((e) => e.open)]).toEqual([false, [false, false]]);
    const hero = mkHero({ series: 'magnakai', magnakai: ['invisibility'] });
    ({ f } = fightAt({ enemies: [foe()], evade: ev }, hero));
    f.round(wounding(5), 'evade', 1);
    expect([f.over, f.way(), f.hero.ep]).toEqual(['evade', '3', 25]);
  });
  it('a stop rule that holds only under a condition', () => {
    const stop = { drawn: [0], to: '4', if: { mark: 'jakan' } };
    expect(fightAt({ enemies: [foe()], stop }).f.round(0) && 1).toBe(1);
    let { f } = fightAt({ enemies: [foe()], stop });
    f.round(0);
    expect(f.over).not.toBe('stop');
    ({ f } = fightAt({ enemies: [foe()], stop }, mkHero({ marks: { jakan: true } })));
    f.round(0);
    expect([f.over, f.way()]).toEqual(['stop', '4']);
  });
  it('a weapon barred for some rounds only', () => {
    LW.addItems({ bright: { name: 'Bright Blade', kind: 'special', weapon: ['sword'], cs: 8 } });
    const { f } = fightAt({ enemies: [foe()], rounds: [{ upTo: 3, barred: ['bright'] }] }, mkHero({ weapons: ['dagger'], special: ['bright'] }));
    expect([f.cs(1), f.cs(4)]).toEqual([15, 23]);
  });
});

describe('stopping a fight by hand', () => {
  it('where the table says the text ends it some way the engine cannot see, it opens the section\'s choices', () => {
    const { g, f } = fightAt({ enemies: [foe()], byHand: 'climb past instead' });
    f.stopHere(); f.finish();
    expect([f.over, g.combatPending, g.choices().every((c) => c.enabled)]).toEqual(['stop', false, true]);
  });
  it('anywhere else it wins nothing: the fight stays unwon and only the by-hand turn box is left', () => {
    const { g, f } = fightAt({ enemies: [foe()] });
    f.stopHere(); f.finish();
    expect([f.over, g.brokenOff, g.choices()]).toEqual(['broken', true, []]);
    g.choose({ text: 'by hand' }, '3');
    expect(g.s.at).toBe('3');
  });
});

describe('a contest lost', () => {
  it('heals nothing after: the share back is for a fight that ends otherwise', () => {
    const { g, f } = fightAt({ enemies: [foe({ cs: 40 })], lose: '4', healLost: 0.5 }, mkHero({ ep: 3 }));
    while (!f.over) f.round(drawWhere(-25, (r) => r.hero > 0 && r.hero < 50));
    expect([f.over, f.way(), g.hero.ep]).toEqual(['stop', '4', 1]);
  });
});

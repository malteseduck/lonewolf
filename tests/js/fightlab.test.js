/* The fight list's simulator (tools/admin/fightlab.js): every fight listed, trials on the real LW.Fight,
   and trial rules that change the numbers without leaving a trace on the engine. Stand-in data only. */
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { ROOT, loadShared } from './helpers.js';
import { BASE_RULES, PRESETS, equipFor, listFights, rulesChanged, setDiscipline, standIn, trial, trialAll, oneFight } from '../../tools/admin/fightlab.js';

let LW;
const SWORD = { name: 'Sun Blade', kind: 'special', weapon: ['sword'], cs: 8, undead: 2 };
const foe = (over) => Object.assign({ name: 'Marsh Beast', cs: 15, ep: 20 }, over);
const stand = (combat) => ({ id: '02test', number: 2, title: 'Stand-in', series: 'kai', start: '1', sections: { 1: { text: [], choices: [] }, 5: { text: [], choices: [], combat } } });
const hero = (over) => Object.assign({ series: 'kai', cs: 15, ep: 25, epMax: 25, disciplines: [], weapons: ['sword'], backpack: [], meals: 0, special: [], gold: 0 }, over);

beforeEach(() => {
  LW = loadShared('core.js', 'rules-series.js', 'fight.js');
  LW.addItems({ sommerswerd: SWORD });
});

describe('the list', () => {
  it('has a row for every fight of every book, with each foe, in book and section order', () => {
    const b1 = stand({ enemies: [foe(), foe({ name: 'Second Beast', cs: 9, ep: 4 })] });
    const b2 = Object.assign(stand({ enemies: [foe({ name: 'Later Beast' })] }), { id: '03test', number: 3 });
    const rows = listFights([b2, b1]);
    expect(rows.map((r) => [r.code, r.id, r.foes.map((f) => [f.name, f.cs, f.ep])])).toEqual([
      ['02test', '5', [['Marsh Beast', 15, 20], ['Second Beast', 9, 4]]],
      ['03test', '5', [['Later Beast', 15, 20]]],
    ]);
  });
  it('sorts sections by number, not as text', () => {
    const b = stand({ enemies: [foe()] });
    b.sections[12] = { text: [], choices: [], combat: { enemies: [foe()] } };
    expect(listFights([b]).map((r) => r.id)).toEqual(['5', '12']);
  });
});

describe('a trial', () => {
  it('counts wins and losses, rounds and what it cost, and leaves the book and hero as they were', () => {
    const b = stand({ enemies: [foe({ cs: 17, ep: 30 })] }), h = hero();
    const before = JSON.stringify([b.sections, h]);
    const r = trial(LW, b, '5', h, { n: 300 });
    expect(r.n).toBe(300);
    expect(r.win + r.dead + r.evade + r.stop + r.long).toBe(300);
    expect(r.win).toBeGreaterThan(0);
    expect(r.dead).toBeGreaterThan(0);
    expect(r.rounds).toBeGreaterThan(1);
    expect(r.lost).toBeGreaterThan(0);
    expect(JSON.stringify([b.sections, h])).toBe(before);
  });
  it('gives the same result for the same seed', () => {
    const b = stand({ enemies: [foe()] });
    expect(trial(LW, b, '5', hero(), { n: 100, seed: 7 })).toEqual(trial(LW, b, '5', hero(), { n: 100, seed: 7 }));
  });
  it('states the Combat Ratio and how his score is made up', () => {
    const r = trial(LW, stand({ enemies: [foe()] }), '5', hero({ special: ['sommerswerd'] }), { n: 1 });
    expect(r.cs).toBe(23);
    expect(r.ratio).toBe(8);
    expect(r.parts.map((p) => p.label)).toContain('Sun Blade');
  });
  it('fights every foe of the list', () => {
    const r = trial(LW, stand({ enemies: [foe({ ep: 1 }), foe({ ep: 1 })] }), '5', hero({ cs: 60 }), { n: 20 });
    expect(r.win).toBe(20);
    expect(r.rounds).toBe(2);
  });
  it('a contest lost is a stop, not a death', () => {
    const r = trial(LW, stand({ enemies: [foe({ cs: 60, ep: 99 })], lose: '1' }), '5', hero({ cs: 1 }), { n: 20 });
    expect(r.stop).toBe(20);
    expect(r.dead).toBe(0);
  });
  it('a fight he cannot end stops counting at the round limit', () => {
    const r = trial(LW, stand({ enemies: [foe({ ep: 99 })], rounds: [{ foeLoss: 0, heroLoss: 0 }] }), '5', hero(), { n: 3 });
    expect(r.long).toBe(3);
  });
});

describe('what the +10 cap hides', () => {
  it('states the ratio before the cap as well as after it', () => {
    const r = trial(LW, stand({ enemies: [foe()] }), '5', hero({ cs: 40 }), { n: 1 });
    expect(r.ratio).toBe(10);
    expect(r.uncapped).toBe(25);
  });
});

describe('a Discipline changed by hand', () => {
  const book = (number, series) => ({ id: `${number}x`, number, title: 'Stand-in', series, start: '1', sections: { 5: { text: [], choices: [], combat: { enemies: [foe()] } } } });
  const parts = (b, h) => trial(LW, b, '5', h, { n: 1 }).parts.map((p) => p.label);
  it('takes the bonus of Weaponskill away with the Discipline, and gives it back', () => {
    const b = book(1, 'kai'), h = standIn(LW, b, 'typical');
    expect(parts(b, h)).toContain('Weaponskill');
    setDiscipline(LW, h, 'disciplines', 'weaponskill', false);
    expect(parts(b, h)).not.toContain('Weaponskill');
    setDiscipline(LW, h, 'disciplines', 'weaponskill', true);
    expect(parts(b, h)).toContain('Weaponskill');
  });
  it('counts a Grand Master Discipline past the first four in his scores, and keeps what he has lost', () => {
    const b = book(13, 'grandmaster'), h = standIn(LW, b, 'novice');
    const { cs, epMax } = h;
    h.ep -= 5;
    setDiscipline(LW, h, 'grandmaster', LW.SERIES.grandmaster.list.find((d) => !h.grandmaster.includes(d)), true);
    expect([h.cs, h.epMax, h.ep]).toEqual([cs + 1, epMax + 2, epMax + 2 - 5]);
    setDiscipline(LW, h, 'grandmaster', h.grandmaster[h.grandmaster.length - 1], false);
    expect([h.cs, h.epMax]).toEqual([cs, epMax]);
  });
  it('counts the ENDURANCE of a Lore-circle as it is completed', () => {
    const b = book(6, 'magnakai'), h = standIn(LW, b, 'novice');
    h.magnakai = ['psiScreen']; h.circleEp = 0; h.epMax = 30; h.ep = 30;
    setDiscipline(LW, h, 'magnakai', 'animalControl', true);
    setDiscipline(LW, h, 'magnakai', 'curing', true);
    expect(h.epMax).toBe(33);
    setDiscipline(LW, h, 'magnakai', 'curing', false);
    expect(h.epMax).toBe(30);
  });
});

describe('a fight that allows only some weapons', () => {
  const DARK = { name: 'Dark Blade', kind: 'special', weapon: ['sword'], cs: 5 };
  const only = () => ({ enemies: [foe({ cs: 40 })], only: ['darkBlade', 'otherBlade'], weaponCs: { darkBlade: 12, otherBlade: 12 } });
  it('says when he holds weapons the fight will not let him use', () => {
    LW.addItems({ darkBlade: DARK });
    const r = trial(LW, stand(only()), '5', hero({ special: ['sommerswerd'] }), { n: 1 });
    expect(r.weapon).toBeNull();
    expect(r.barred).toBe(true);
    expect(r.parts.map((p) => p.label)).toContain('Unarmed');
  });
  it('does not say so when he simply has no weapon', () => {
    expect(trial(LW, stand({ enemies: [foe()] }), '5', hero({ weapons: [] }), { n: 1 }).barred).toBe(false);
  });
  it('a hero is given what the fight asks for, since he could not be there without it', () => {
    LW.addItems({ darkBlade: DARK });
    const b = stand(only()), h = hero({ special: ['sommerswerd'] });
    equipFor(LW, h, b.sections[5].combat);
    expect(h.special).toContain('darkBlade');
    const r = trial(LW, b, '5', h, { n: 1 });
    expect(r.weapon).toBe('darkBlade');
    expect(r.barred).toBe(false);
    expect(r.cs).toBe(27);
  });
  it('leaves a hero alone who can already fight it, or where it asks for nothing', () => {
    LW.addItems({ darkBlade: DARK });
    const h = hero({ special: ['darkBlade'] }), plain = hero();
    equipFor(LW, h, only());
    equipFor(LW, plain, { enemies: [foe()] });
    equipFor(LW, plain, { enemies: [foe()], with: 'none' });
    expect(h.special).toEqual(['darkBlade']);
    expect(plain.special).toEqual([]);
    expect(plain.weapons).toEqual(['sword']);
  });
});

describe('tactics', () => {
  it('evades at the Endurance set, when the fight allows it', () => {
    const b = stand({ enemies: [foe({ cs: 40, ep: 99 })], evade: { to: '1' } });
    const r = trial(LW, b, '5', hero(), { n: 100, tactics: { evadeAt: 24 } });
    expect(r.evade).toBeGreaterThan(0);
    expect(trial(LW, b, '5', hero(), { n: 100 }).evade).toBe(0);
  });
  it('drinks Laumspur when low', () => {
    const b = stand({ enemies: [foe({ cs: 20, ep: 40 })] }), h = hero({ backpack: ['potion', 'potion', 'potion'] });
    const dry = trial(LW, b, '5', h, { n: 400, tactics: { drinkAt: 0 } });
    const wet = trial(LW, b, '5', h, { n: 400, tactics: { drinkAt: 8 } });
    expect(wet.win).toBeGreaterThan(dry.win);
  });
  it('rests the mind when told, and adds Mindblast by default', () => {
    const b = stand({ enemies: [foe()] }), h = hero({ disciplines: ['mindblast'] });
    expect(trial(LW, b, '5', h, { n: 1 }).ratio).toBe(2);
    expect(trial(LW, b, '5', h, { n: 1, tactics: { mind: 'rest' } }).ratio).toBe(0);
  });
});

describe('trial rules', () => {
  const run = (rules, h = hero({ special: ['sommerswerd'] }), combat = { enemies: [foe()] }) => trial(LW, stand(combat), '5', h, { n: 300, rules });

  it('the Combat Ratio cap (ruling R1) can be moved', () => {
    const h = hero({ cs: 40 });
    expect(run({}, h).ratio).toBe(10);
    expect(run({ ratioCap: 4 }, h).ratio).toBe(4);
    expect(run({ ratioCap: 99 }, h).ratio).toBe(25);
  });
  it('the Sommerswerd\'s bonus can be set, and grow with the book', () => {
    expect(run({ swordCs: 3 }).parts.find((p) => p.label === 'Sun Blade').n).toBe(3);
    // Book 2 is the stand-in's: nothing grown yet; a later book has
    const later = Object.assign(stand({ enemies: [foe()] }), { number: 4 });
    const r = trial(LW, later, '5', hero({ special: ['sommerswerd'] }), { n: 1, rules: { swordCs: 3, swordGrow: 1, swordMax: 8 } });
    expect(r.parts.find((p) => p.label === 'Sun Blade').n).toBe(5);
  });
  it('an unleashed Sommerswerd is at full power only in its first rounds', () => {
    const c = { enemies: [foe({ cs: 11, ep: 400 })] };
    const one = run({ swordCs: 3, unleashRounds: 1, unleashCs: 8 }, hero({ cs: 80, special: ['sommerswerd'] }), c);
    expect(one.ratio).toBe(10);
    const b = stand({ enemies: [foe({ cs: 18 })] }), h = hero({ special: ['sommerswerd'] });
    const three = trial(LW, b, '5', h, { n: 1, rules: { swordCs: 3, unleashRounds: 3, unleashCs: 8 } });
    expect(three.cs).toBe(23); // +5 on the +3 for the first round; the score shown is the first round's
    expect(trial(LW, b, '5', h, { n: 1, rules: { swordCs: 3 } }).cs).toBe(18);
  });
  it('doubling against the undead can be turned off', () => {
    const c = { enemies: [foe({ cs: 10, ep: 40, undead: true })] }, h = hero({ special: ['sommerswerd'] });
    expect(run({}, h, c).rounds).toBeLessThan(run({ undead: 'never' }, h, c).rounds);
  });
  it('the numbers a mastery or a mind attack adds can be moved', () => {
    const h = hero({ weaponskill: 'sword', disciplines: ['weaponskill', 'mindblast'] });
    const p = (rules) => run(rules, h).parts;
    expect(p({ skillBy: -1 }).find((x) => x.label === 'Weaponskill').n).toBe(1);
    expect(p({ mindBy: 2 }).find((x) => x.label === 'Mindblast').n).toBe(4);
  });
  it('foes can be made stronger, and wounds on either side scaled', () => {
    const h = hero();
    expect(run({ foeCs: 3 }, h).ratio).toBe(-3);
    expect(run({ foeEp: 200 }, h).rounds).toBeGreaterThan(run({}, h).rounds);
    expect(run({ heroLoss: 50 }, h).lost).toBeLessThan(run({}, h).lost);
    expect(run({ foeLoss: 50 }, h).rounds).toBeGreaterThan(run({}, h).rounds);
  });
  it('an outright death on the table can be made a wound', () => {
    const c = { enemies: [foe({ cs: 40, ep: 99 })] }, h = hero({ cs: 5, ep: 500, epMax: 500 });
    expect(run({}, h, c).dead).toBeGreaterThan(run({ killAs: 10 }, h, c).dead);
  });
  it('leaves the engine exactly as it found it', () => {
    const { RATIO_CAP } = LW, combatRound = LW.combatRound, heroCS = LW.heroCS, item = JSON.stringify(LW.ITEMS.sommerswerd);
    run({ ratioCap: 3, swordCs: 1, undead: 'never', heroLoss: 50, killAs: 5, skillBy: 1, unleashRounds: 2, unleashCs: 8 });
    expect([LW.RATIO_CAP, LW.combatRound, LW.heroCS, JSON.stringify(LW.ITEMS.sommerswerd)]).toEqual([RATIO_CAP, combatRound, heroCS, item]);
  });
  it('leaves the engine as it found it when a fight throws', () => {
    const { RATIO_CAP } = LW, b = stand({ enemies: [foe()] });
    b.sections[5].combat.enemies = null;
    expect(() => trial(LW, b, '5', hero(), { n: 1, rules: { ratioCap: 3 } })).toThrow();
    expect(LW.RATIO_CAP).toBe(RATIO_CAP);
  });
  it('says which rules differ from the engine\'s', () => {
    expect(rulesChanged(BASE_RULES)).toEqual([]);
    expect(rulesChanged({ ...BASE_RULES, ratioCap: 4, foeCs: 1 })).toEqual(['ratioCap', 'foeCs']);
    expect(rulesChanged(PRESETS.find((p) => p.id === 'unleash').rules).length).toBeGreaterThan(0);
    expect(rulesChanged(PRESETS.find((p) => p.id === 'books').rules)).toEqual([]);
  });
});

describe('a stand-in hero', () => {
  const book = (number, series) => ({ id: `${number}x`, number, title: 'Stand-in', series, start: '1', sections: {} });
  it('has more disciplines the further on the book is, up to the whole list', () => {
    const n = (num, who, series = 'kai') => standIn(LW, book(num, series), who).disciplines.length;
    expect(n(1, 'typical')).toBe(5);
    expect(n(3, 'typical')).toBe(7);
    expect(n(1, 'master')).toBe(10);
  });
  it('fights with a sword, is ready at full Endurance, and is skilled with it where he has the mastery', () => {
    const h = standIn(LW, book(1, 'kai'), 'typical');
    expect(h.weapons).toContain('sword');
    expect(h.ep).toBe(h.epMax);
    expect(h.weaponskill).toBe('sword');
  });
  it('carries the Sommerswerd only when asked, from Book 2, and not into the New Order', () => {
    expect(standIn(LW, book(5, 'kai'), 'typical', { sword: true }).special).toContain('sommerswerd');
    expect(standIn(LW, book(5, 'kai'), 'typical').special).not.toContain('sommerswerd');
    expect(standIn(LW, book(1, 'kai'), 'typical', { sword: true }).special).not.toContain('sommerswerd');
    expect(standIn(LW, book(22, 'neworder'), 'typical', { sword: true }).special).not.toContain('sommerswerd');
  });
  it('has the series\' scores', () => {
    expect(standIn(LW, book(14, 'grandmaster'), 'novice').cs).toBeGreaterThan(standIn(LW, book(1, 'kai'), 'novice').cs);
  });
});

describe('the sweep', () => {
  it('runs each fight under both sets of rules, a piece at a time, with a hero for its book', async () => {
    const rows = listFights([stand({ enemies: [foe()] })]), seen = [];
    const out = await trialAll(LW, { '02test': stand({ enemies: [foe()] }) }, rows, {
      n: 50, who: 'typical', rules: { foeCs: 8 }, pause: async () => {}, each: (row, a, b) => seen.push([row.id, a.n, b.n]),
    });
    expect(seen).toEqual([['5', 50, 50]]);
    expect(out.get(rows[0].key).b.win).toBeLessThan(out.get(rows[0].key).a.win);
  });
  it('gives the stand-in what a fight asks for', async () => {
    LW.addItems({ darkBlade: { name: 'Dark Blade', kind: 'special', weapon: ['sword'], cs: 5 } });
    const book = stand({ enemies: [foe()], only: ['darkBlade'] }), rows = listFights([book]);
    const out = await trialAll(LW, { '02test': book }, rows, { n: 5, who: 'typical', rules: {}, pause: async () => {} });
    expect(out.get(rows[0].key).a.weapon).toBe('darkBlade');
  });
  it('stops when told to', async () => {
    const rows = listFights([stand({ enemies: [foe()] })]);
    const out = await trialAll(LW, { '02test': stand({ enemies: [foe()] }) }, rows, { n: 10, who: 'typical', rules: {}, pause: async () => {}, stop: () => true });
    expect(out.size).toBe(0);
  });
});

describe('one fight shown', () => {
  it('hands back the engine\'s log and how it ended', () => {
    const r = oneFight(LW, stand({ enemies: [foe({ ep: 1 })] }), '5', hero({ cs: 60 }), { seed: 3 });
    expect(r.over).toBe('win');
    expect(r.log.length).toBeGreaterThan(0);
  });
});

describe('the sheet', () => {
  it('has a script that parses (the suite that parses our scripts does not read a page)', () => {
    const page = fs.readFileSync(path.join(ROOT, 'tools/admin/fightlist.html'), 'utf8');
    new vm.SourceTextModule(page.match(/<script type="module">([\s\S]*?)<\/script>/)[1]);
  });
});

/* tools/items_draft.mjs drafts a book's item table from its plain readings (ADR 0036). These tests run it
   on a temporary project tree: shared/core.js, a stand-in table of another book, and a stand-in book.js
   whose sections are written for the test (no book text). The draft must then pass tools/check_items.mjs. */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ROOT } from './helpers.js';
import { draftItems, HEADER } from '../../tools/items_draft.mjs';
import { checkItems } from '../../tools/check_items.mjs';

let tmp;
const w = (rel, text) => { const f = path.join(tmp, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
const sec = (text, choices = [{ text: 'Turn to 1.', to: '1' }], more = {}) => ({ text: [].concat(text), choices, ...more });
const turn = (to, text = `Turn to ${to}.`) => ({ text, to });

const SECTIONS = {
  '1': sec('A quiet road.', [turn('2'), turn('3'), turn('4'), turn('5'), turn('6'), turn('7'), turn('8'), turn('9'), turn('10'), turn('11'), turn('12'), turn('13'), turn('14')]),
  // found and pocketed: given; offered: loot
  '2': sec(['In the drawer you find 6 Gold Crowns and pocket them.', 'A Dagger lies on the table. You may take it if you wish to: mark it on your Action Chart as a Weapon.']),
  // a wound, and a loss only under a condition
  '3': sec(['A branch strikes you: lose 3 ENDURANCE points.', 'Unless you have the Discipline of Healing, lose 2 ENDURANCE points.']),
  // the gates on its choices
  '4': sec('A locked door.', [turn('5', 'If you have a Lamp, turn to 5.'), turn('6', 'If you have a Sword, turn to 6.'),
    turn('7', 'If you wish to pay the guard 5 Gold Crowns, turn to 7.'), turn('8', 'If you cannot pay, turn to 8.'), turn('9', 'If you have a Glass Key, turn to 9.')]),
  // a thing named inside a longer name is another thing; a list of wares is read by hand
  '5': sec(['You see a Glass Lamp on the shelf. You may take it.', '– Rope (2 Gold Crowns)'], [turn('1')]),
  // Endurance written on a lone way on is taken here
  '6': sec('The stair is steep.', [turn('7', 'Lose 2 ENDURANCE points and turn to 7.')]),
  // on one of several ways on, to a section others lead to too: only when he came this way
  '7': sec('A crossing.', [turn('8', 'Restore 1 ENDURANCE point and turn to 8.'), turn('9')]),
  '8': sec('A camp.', [turn('9')]),
  '9': sec(['The thief runs off with your Lamp: erase it from your Action Chart.'], [turn('1')]),
  // what someone says is no event
  '10': sec(['‘A bed is 2 Gold Crowns a night,’ says the innkeeper.'], [turn('1')]),
  // a Random Number's outcome on its choices
  '11': sec('Pick a number from the Random Number Table.', [{ text: 'If your total is 0-4, lose 3 ENDURANCE points and turn to 1.', to: '1', range: [0, 4] }, { text: 'If it is 5-9, turn to 12.', to: '12', range: [5, 9] }], { rnt: 'auto' }),
  '12': sec('Nothing here.', [turn('13')]),
  '13': sec('The end.', [], { end: 'victory' }),
  // a restoration in brackets may be a thing's description or an event: read by hand
  '14': sec('You sleep well (restore 3 ENDURANCE points).', [turn('13')]),
  // a draft leans to flagging (ADR 0036): a sign it cannot read is a todo, never silence
  '15': sec('In the box you find a Brass Bell (if you wish to keep it, record it on your Action Chart as a Backpack Item).', [turn('13')]),
  '16': sec('You draw and fire two Arrows at the fleeing guards.', [turn('13')]),
  '17': sec('The current is strong, and you lose your Backpack and Weapons.', [turn('13')]),
  '18': sec('Pick a number from the Random Number Table: it is the number of ENDURANCE points you lose.', [turn('13')], { rnt: 'auto' }),
  '19': sec('A Dagger lies by the hearth. You may take this Weapon if you wish.', [turn('13')]),
  '20': sec('A guard bars the gate.', [turn('13', 'If you still have the Brass Bell, turn to 13.'), turn('12')]),
  // ...but no sign, no todo: a thing named as scenery
  '21': sec('The guard leans on his Sword and yawns.', [turn('13')]),
  // a fight's plain rules
  '22': sec(['This creature is undead.', 'Reduce your COMBAT SKILL by 3 for the first two rounds of this fight.'],
    [turn('13', 'If you win this combat in four rounds or less, turn to 13.'), turn('12', 'If you win the combat in five rounds or more, turn to 12.')], { combat: { enemies: [{ name: 'Ghoul', cs: 20, ep: 20 }] } }),
  // a rule of a fight it cannot read is a todo too
  '23': sec('Its venom is such that you lose 1 ENDURANCE point for every round you fight it.', [turn('13')], { combat: { enemies: [{ name: 'Snake', cs: 20, ep: 20 }] } }),
  // a Bow wants an Arrow
  '24': sec('A bird wheels overhead.', [turn('25', 'If you possess a Bow and wish to use it, turn to 25.'), turn('13', 'If you do not possess a Bow, turn to 13.')]),
  // a shot: its ranges read from its choices; the bonus is checked by hand
  '25': sec('Pick a number from the Random Number Table. If you possess Grand Weaponmastery with Bow, add 5 to the number you have picked.',
    [turn('26', 'If your total is now 4 or lower, turn to 26.'), turn('13', 'If it is 5 or higher, turn to 13.')], { rnt: 'free' }),
  // the Arrow told here was spent at the shot, the only way in
  '26': sec('Your Arrow flies wide.', [turn('13')]),
  // a sum held at the gate and paid on the far side is charged once, by choosing that way
  '27': sec('A toll bar.', [turn('28', 'If you possess 7 Gold Crowns, turn to 28.'), turn('13', 'If you do not possess 7 Gold Crowns, turn to 13.')]),
  '28': sec('You pay the man (erase 7 Gold Crowns from your Action Chart).', [turn('13')]),
  // his Endurance as a gate
  '29': sec('The climb is hard.', [turn('12', 'If your current ENDURANCE score is 10 or less, turn to 12.'), turn('13', 'If it is 11 or more, turn to 13.')]),
  // lost by place, by choice, or a sum outright
  '30': sec('The thief runs off (erase the first item on your Backpack Items list).', [turn('13')]),
  '31': sec('A shell bursts. Erase two Backpack Items of your choice from your Action Chart.', [turn('13')]),
  '32': sec('You pay the toll: erase 2 Gold Crowns from your Action Chart.', [turn('13')]),
  // the Meal rule is the importer's, where it read it
  '33': sec('You must now eat a Meal or lose 3 ENDURANCE points.', [turn('13')], { meal: true }),
  // a rank the importer did not read
  '34': sec('A gate.', [{ text: 'If you possess Kai-surge but have yet to reach this rank, turn to 13.', to: '13', need: { disc: 'kaiSurge' } }, turn('12')]),
  // a free draw the importer could not settle
  '35': sec('Pick a number from the Random Number Table.', [turn('13', 'If it is high, turn to 13.'), turn('12', 'If it is low, turn to 12.')], { rnt: 'free' }),
  // a wound in brackets, in its other wording; a thing's description is no event
  '36': sec('The blast stuns you (reduce your ENDURANCE score by 2 points).', [turn('13')]),
  '37': sec('– Potion of Sage (restores 3 ENDURANCE points)', [turn('13')]),
  // an adventure gone by is the player's to answer, whatever it names
  '38': sec('An old friend.', [turn('13', 'If you have ever visited the Lamp in a previous adventure, turn to 13.'), turn('12', 'If you have not, turn to 12.')]),
};
const BOOK = `(window.LW = window.LW || {}).BOOKS = Object.assign(window.LW.BOOKS || {}, { t1: ${JSON.stringify({ id: 't1', sections: SECTIONS })} });`;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lw-items-draft-'));
  fs.mkdirSync(path.join(tmp, 'shared'));
  fs.copyFileSync(path.join(ROOT, 'shared', 'core.js'), path.join(tmp, 'shared', 'core.js'));
  // another book's table: its Lamp is a known item; a generic thing with a book's number is not
  w('items/items-t0.js', `export const ITEMS = { lamp: { name: 'Lamp', kind: 'backpack' }, glassKey0: { name: 'Glass Key', kind: 'special' } }; export const SECTIONS = {};`);
  w('data/projectaon/t1/book.js', BOOK);
});
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('items_draft.mjs', () => {
  it('drafts a new book\'s table from the plain readings, todos for the rest, and it checks clean', async () => {
    const r = await draftItems({ root: tmp, book: 't1' });
    expect(r.code).toBe(0);
    const file = path.join(tmp, 'items', 'items-t1.js');
    expect(r.file).toBe(file);
    const text = fs.readFileSync(file, 'utf8');
    expect(text.startsWith(HEADER)).toBe(true);
    const S = r.sections;
    expect(S['2']).toEqual({ give: [{ gold: 6 }], loot: [{ item: 'dagger' }] });
    expect(S['3']).toEqual({ ep: -3, todo: 'Endurance: as the text says' });
    expect(S['4'].need).toEqual({
      '5': { item: 'lamp' },
      '6': { any: [{ weapon: ['sword'] }] },        // by kind, so a weapon-like item counts
      '7': { gold: 5, spend: true },
    });
    expect(S['4'].todo).toBe('a gate: as the text says');   // the Glass Key: another book's own key
    expect(S['5']).toEqual({ todo: 'items: as the text says' });
    expect(S['6']).toEqual({ ep: -2 });
    expect(S['8']).toEqual({ when: [{ came: ['7'], ep: 1 }] });
    expect(S['9']).toEqual({ take: [{ item: 'lamp' }] });
    expect(S['10']).toEqual({ todo: 'Gold Crowns: as the text says' });
    expect(S['11']).toEqual({ rolls: [{ range: [0, 4], ep: -3 }] });
    expect(S['14']).toEqual({ ep: 3 });
    expect(S['15']).toEqual({ todo: 'an item no table knows yet: as the text says' });
    expect(S['16']).toEqual({ todo: 'Arrows: as the text says' });
    expect(S['17']).toEqual({ todo: 'items lost: as the text says' });
    expect(S['18']).toEqual({ todo: 'Endurance: as the text says' });
    expect(S['19']).toEqual({ loot: [{ item: 'dagger' }] });
    expect(S['20']).toEqual({ todo: 'a gate: as the text says' });
    expect(S['1']).toBeUndefined();
    expect(S['21']).toBeUndefined();
    expect(S['22'].fight).toEqual({ rounds: [{ upTo: 2, csMod: -3, note: 'As the text says' }], undead: true, won: { within: 4, to: '13', else: '12' } });
    expect(S['23']).toEqual({ todo: 'a fight: as the text says' });
    const bow = { weapon: ['bow'], arrows: 1, label: 'a Bow and an Arrow' };
    expect(S['24'].need).toEqual({ '25': { any: [bow] }, '13': { any: [{ not: { any: [bow] } }] } });
    expect(S['25']).toEqual({ bowShot: { '26': [-99, 4], '13': [5, 99] }, todo: 'a bow shot: as the text says' });
    expect(S['26']).toBeUndefined();
    expect(S['27'].need).toEqual({ '28': { gold: 7, spend: true }, '13': { any: [{ not: { gold: 7 } }] } });
    expect(S['28']).toBeUndefined();
    expect(S['29'].need).toEqual({ '12': { ep: [-999, 10] }, '13': { ep: [11, 999] } });
    expect(S['30']).toEqual({ take: [{ at: [1] }] });
    expect(S['31']).toEqual({ take: [{ pick: ['backpack'], n: 2 }] });
    expect(S['32']).toEqual({ take: [{ gold: 2 }] });
    expect(S['33']).toBeUndefined();
    expect(S['34']).toEqual({ todo: 'a gate: as the text says' });
    expect(S['35']).toEqual({ todo: 'a draw: as the text says' });
    expect(S['36']).toEqual({ ep: -2 });
    expect(S['37']).toBeUndefined();
    expect(S['38']).toBeUndefined();
    expect(r.text).toMatch(/^\d+ sections: give 1, loot 2, take \d+, ep \d+, need \d+, todo \d+\nwrote items\/items-t1\.js$/);

    const check = await checkItems({ root: tmp, book: 't1' });
    expect(check.errors).toEqual([]);
  });

  it('flags every fight of a series with a Kai Weapon, for the time and foe the table marks (ADR 0047)', async () => {
    const book = { id: 't1', series: 'neworder', sections: { '1': sec('A plain fight.', [], { combat: { enemies: [{ name: 'Guard', cs: 20, ep: 20 }] } }) } };
    w('data/projectaon/t1/book.js', `(window.LW = window.LW || {}).BOOKS = Object.assign(window.LW.BOOKS || {}, { t1: ${JSON.stringify(book)} });`);
    const r = await draftItems({ root: tmp, book: 't1' });
    expect(r.sections['1']).toEqual({ todo: 'a fight: as the text says' });
  });

  it('leaves a hand-made table alone, drafts beside the book and compares the two', async () => {
    const hand = `export const ITEMS = {};\nexport const SECTIONS = { 2: { give: [{ gold: 6 }] }, 3: { ep: -1 }, 12: { mark: 'x' } };\n`;
    w('items/items-t1.js', hand);
    const r = await draftItems({ root: tmp, book: 't1' });
    expect(fs.readFileSync(path.join(tmp, 'items', 'items-t1.js'), 'utf8')).toBe(hand);
    expect(r.file).toBe(path.join(tmp, 'data', 'projectaon', 't1', 'items-draft.js'));
    expect(r.compared.stats.give).toEqual({ draft: 1, agree: 1 });
    expect(r.compared.stats.ep.agree).toBe(0);
    expect(r.compared.wrong.ep).toContain('3');
    expect(r.compared.missed).toEqual(['12']);
    expect(r.text).toContain('items-t1.js exists and was left alone');
  });

  it('treats the demo book\'s table, demo/<code>/items.js, as its hand-made table (ADR 0046)', async () => {
    w('demo/t1/items.js', `export const ITEMS = {};\nexport const SECTIONS = { 2: { give: [{ gold: 6 }] } };\n`);
    const r = await draftItems({ root: tmp, book: 't1' });
    expect(fs.existsSync(path.join(tmp, 'items', 'items-t1.js'))).toBe(false);
    expect(r.file).toBe(path.join(tmp, 'data', 'projectaon', 't1', 'items-draft.js'));
    expect(r.compared.stats.give).toEqual({ draft: 1, agree: 1 });
  });

  it('redrafts its own draft, and names nothing from another book\'s draft', async () => {
    w('items/items-t1.js', `${HEADER} (old)\nexport const ITEMS = {};\nexport const SECTIONS = {};\n`);
    w('items/items-t2.js', `${HEADER} (old)\nexport const ITEMS = { lamp: { name: 'Lamp', kind: 'backpack' } };\nexport const SECTIONS = {};\n`);
    fs.rmSync(path.join(tmp, 'items', 'items-t0.js'));
    const r = await draftItems({ root: tmp, book: 't1' });
    expect(r.file).toBe(path.join(tmp, 'items', 'items-t1.js'));
    expect(r.sections['4'].need['5']).toBeUndefined();     // the Lamp is known only to a draft
  });

  it('says to import the book first when there is no book.js', async () => {
    const r = await draftItems({ root: tmp, book: 'zz9' });
    expect(r.code).toBe(1);
    expect(r.text).toContain('import the book first');
  });
});

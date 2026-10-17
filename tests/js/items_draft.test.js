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
    expect(S['14']).toEqual({ todo: 'Endurance: as the text says' });
    expect(S['1']).toBeUndefined();
    expect(r.text).toMatch(/^\d+ sections: give 1, loot 1, take 1, ep 2, need 1, todo 5\nwrote items\/items-t1\.js$/);

    const check = await checkItems({ root: tmp, book: 't1' });
    expect(check.errors).toEqual([]);
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

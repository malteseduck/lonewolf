/* tools/check_items.mjs exports checkItems({ root, book, json }); these tests call it against a temporary
   project tree holding shared/core.js, stand-in item tables and a stand-in book.js. One test runs the
   command line for its printing and exit code. Nothing from data/projectaon is used. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { ROOT } from './helpers.js';
import { checkItems } from '../../tools/check_items.mjs';

let tmp;
const w = (rel, text) => { const f = path.join(tmp, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };

const BOOK = `LW.BOOKS['t1'] = { sections: {
  '1': { choices: [{ to: '2' }, { to: '3' }], rnt: true },
  '2': { choices: [{ to: '4' }], combat: { csMod: -2, enemies: [{ name: 'Stand-in' }] } },
  '3': { choices: [] },
  '4': { choices: [{ to: '1' }], combat: { enemies: [{ name: 'Other' }] } },
  '5': { choices: [] }
} };`;

const CLEAN = `export const ITEMS = {
  thing: { name: 'Thing', kind: 'backpack', glyph: 'present' },
  blade: { name: 'Blade', kind: 'weapon' },
};
export const SECTIONS = {
  '1': { give: [{ item: 'thing' }, { gold: 5 }], loot: [{ item: 'dagger', or: true, pick: 1 }], take: [{ item: 'thing' }, { weapons: 'all' }], ep: -2, rolls: [{ range: [0, 4], ep: -1, take: [{ backpack: 'all' }] }], todo: 'a reminder', bowShot: { '2': [0, 4], '3': [5, 9] } },
  '2': { fight: { csMod: -1, mindforce: true, unless: ['thing'], with: 'blade', ambush: true }, need: { '4': { item: 'thing' } } },
  '4': { need: { '1': { any: [{ item: 'blade' }, { item: ['thing', 'meal'] }] } }, ep: 'full' }
};`;

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lw-check-items-'));
  fs.mkdirSync(path.join(tmp, 'shared'));
  fs.copyFileSync(path.join(ROOT, 'shared', 'core.js'), path.join(tmp, 'shared', 'core.js'));
  w('assets/icons/present.svg', '<svg/>');
  w('items/items-t1.js', CLEAN);
  w('items/items-t2.js', `export const ITEMS = { lamp: { name: 'Lamp', kind: 'backpack' } }; export const SECTIONS = {};`);
  w('data/projectaon/t1/book.js', BOOK);
});
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

// the same shape the old child-process runner gave: exit code and output lines
const run = async (book = '01fftd', json = false) => {
  const r = await checkItems({ root: tmp, book, json });
  return { code: r.code, out: r.text.trim().split('\n'), r };
};
/* run the checker on a table with these section entries / items, returning the error lines */
async function errorsOf(sections, items = '') {
  w('items/items-t1.js', `export const ITEMS = { thing: { name: 'Thing', kind: 'backpack', glyph: 'present' }, ${items} }; export const SECTIONS = ${JSON.stringify(sections)};`);
  const r = await run('t1');
  w('items/items-t1.js', CLEAN);
  const lines = r.out;
  return lines[0] === 'no errors' ? [] : lines.slice(0, lines.findIndex((l) => /^\d+ book items/.test(l)));
}

describe('check_items.mjs', () => {
  it('says there is no table yet for a book without one, and exits 0', async () => {
    const r = await run('zz9');
    expect(r.code).toBe(0);
    expect(r.out[0]).toMatch(/^no items-zz9\.js yet/);
  });

  it('passes a clean table, then counts book items and the sections using each field', async () => {
    const r = await run('t1');
        expect(r.out[0]).toBe('no errors');
    expect(r.out[1]).toBe('2 book items; 3 sections: give 1, loot 1, take 1, ep 2, rolls 1, need 2, fight 1, todo 1');
  });

  it('checks the demo book\'s table where it lives, demo/<code>/items.js (ruling R20)', async () => {
    w('data/projectaon/t9/book.js', `LW.BOOKS['t9'] = { sections: { '1': { choices: [] } } };`);
    w('demo/t9/items.js', `export const ITEMS = { flask9: { name: 'Flask', kind: 'backpack', glyph: 'present' } }; export const SECTIONS = { '1': { ep: -1, loot: [{ item: 'flask9' }] } };`);
    const r = await run('t9');
    expect(r.out[0]).toBe('no errors');
    expect(r.out[1]).toMatch(/^1 book items; 1 sections: .*ep 1/);
  });

  it('defaults to Book 1 (01fftd) when no code is given, saying so when the table is absent here', async () => {
    expect((await run()).out[0]).toMatch(/^no items-01fftd\.js yet/);
  });

  it('accepts items defined in other tables and in the engine, and the Meal', async () => {
    // CLEAN already uses dagger (engine) and meal; this adds one from items-t2.js
    expect(await errorsOf({ '1': { give: [{ item: 'lamp' }, { item: 'meal' }] } })).toEqual([]);
  });

  it('accepts an ending taken back (end: null) and a when that is the end of him', async () => {
    expect(await errorsOf({ '1': { end: null, when: [{ unless: { item: 'lamp' }, dead: true }] } })).toEqual([]);
  });

  it.each([
    ['an end other than null', { '1': { end: 'death' } }, '1: end may only be null (an ending taken back)'],
    ['an item nobody defines in give', { '1': { give: [{ item: 'ghost' }] } }, '1 give: unknown item ghost'],
    ['an item nobody defines in loot', { '1': { loot: [{ item: 'ghost' }] } }, '1 loot: unknown item ghost'],
    ['an item nobody defines in take', { '1': { take: [{ item: 'ghost' }] } }, '1 take: unknown item ghost'],
    ['an empty give entry', { '1': { give: [{}] } }, '1 give: give/loot entry with nothing in it'],
    ['a section that does not exist', { '99': { ep: 1 } }, 'section 99 does not exist'],
    ['an unknown field', { '1': { colour: 'red' } }, '1: unknown field colour'],
    ['an unknown fight field', { '2': { fight: { speed: 3 } } }, '2 fight: unknown field speed'],
    ['a fight on a section without combat', { '3': { fight: { csMod: -1 } } }, '3: fight, but the section has no combat'],
    ['an ambush with no COMBAT SKILL lost', { '4': { fight: { ambush: true } } }, '4 fight: ambush, but no COMBAT SKILL lost'],
    ['rolls where no number is drawn', { '3': { rolls: [{ range: [0, 9], ep: -1 }] } }, '3: rolls, but the section draws no Random Number'],
    ['a bowShot where no number is drawn', { '3': { bowShot: { '4': [0, 9] } } }, '3: bowShot, but the section draws no Random Number'],
    ['a bowShot for a choice that is not there', { '1': { bowShot: { '9': [0, 4] } } }, '1: bowShot range for a choice to 9, which it does not have'],
    ['a bowShot range the wrong way round', { '1': { bowShot: { '2': [5, 1] } } }, '1: bowShot range for 2 must be [lo, hi]'],
    ['a fight unless naming an unknown item', { '2': { fight: { unless: ['ghost'] } } }, '2 fight: unknown item ghost'],
    ['a fight with something that is not a weapon', { '2': { fight: { with: 'thing' } } }, '2 fight: with thing, which is not a weapon'],
    ['a loot pick without or', { '1': { loot: [{ item: 'thing', pick: 1 }] } }, '1 loot: pick without or'],
    ['an ep that is neither a number nor full', { '1': { ep: 'lots' } }, "1: ep must be a number or 'full'"],
    ['a need for a choice that is not there', { '1': { need: { '9': { item: 'thing' } } } }, '1: need for a choice to 9, which it does not have'],
    ['a need for an unknown item', { '1': { need: { '2': { item: 'ghost' } } } }, '1: need for unknown item ghost'],
    ['a need any-of with an unknown item', { '1': { need: { '2': { any: [{ item: 'ghost' }] } } } }, '1: need for unknown item ghost'],
    ['a need key the engine does not read', { '1': { need: { '2': { mark: 'hurt' } } } }, "1: need for 2: unknown field mark (a Condition's own fields go in any)"],
    ['an unknown field in a need any-of', { '1': { need: { '2': { any: [{ not: { colour: 1 } }] } } } }, '1: need for 2: unknown field colour'],
    ['a take of weapons other than all or one', { '1': { take: [{ weapons: 'some' }] } }, "1 take: weapons must be 'all', 'one' or 'used'"],
    ['an unknown field in a when', { '1': { when: [{ if: { disc: 'x' }, colour: 1 }] } }, '1 when[0]: unknown field colour'],
    ['an unknown field in a round change', { '2': { fight: { rounds: [{ upTo: 1, speed: 3 }] } } }, '2 fight rounds[0]: unknown field speed'],
    ['a stop rule leading to a section that is no choice', { '2': { fight: { stop: { after: 2, to: '9' } } } }, '2: leads to 9, which is not one of its choices'],
    ['an unknown coin', { '1': { give: [{ coin: 'florin', n: 3 }] } }, '1 give: unknown coin florin'],
    ['an unknown item in the take of a when', { '1': { when: [{ take: [{ item: 'ghost' }] }] } }, '1 when[0]: unknown item ghost'],
    ['an unknown item a trader buys', { '1': { sell: { ghost: 2 } } }, '1 sell: unknown item ghost'],
    ['a price in items from a list the engine lacks', { '1': { need: { 2: { gold: 2, instead: { pick: ['pockets'] } } } } }, '1: need for 2: instead needs a gold price and pick from backpack, packItems, weapons, weapon or special'],
    ['a take of the backpack other than all or items', { '1': { take: [{ backpack: 'some' }] } }, "1 take: backpack must be 'all' or 'items'"],
    ['a take of special items other than all', { '1': { take: [{ special: 'one' }] } }, "1 take: special must be 'all'"],
    ['an unknown item in a roll\'s take', { '1': { rolls: [{ range: [0, 9], take: [{ item: 'ghost' }] }] } }, '1 rolls[0]: unknown item ghost'],
  ])('reports %s', async (_, sections, line) => {
    expect(await errorsOf(sections)).toContain(line);
  });

  it('reports a bad item kind and a missing icon', async () => {
    const errs = await errorsOf({}, "odd: { name: 'Odd', kind: 'ring' }, bare: { name: 'Bare', kind: 'special', glyph: 'no-such-icon' },");
    expect(errs).toContain('item odd: kind must be weapon, backpack or special');
    expect(errs).toContain('item bare: no icon assets/icons/no-such-icon.svg');
  });

  it('prints ids and counts only: no line of output holds anything but those', async () => {
    const r = await run('t1');
    expect(r.out.join('\n')).not.toMatch(/Stand-in/);
  });

  it('lists the flagged sections the table leaves out, from items-reading.txt', async () => {
    w('data/projectaon/t1/items-reading.txt', '#1 first\nbody\n#5 fifth\nmore\n#4 fourth\n');
    const r = await run('t1');
    fs.rmSync(path.join(tmp, 'data/projectaon/t1/items-reading.txt'));
    expect(r.out).toContain('1 flagged sections left out (read, and judged to need nothing):');
    expect(r.out).toContain('5');
  });

  it('with --json writes check-items.json beside the book', async () => {
    const r = await run('t1', true);
    expect(r.out[r.out.length - 1]).toBe('wrote data/projectaon/t1/check-items.json');
    const j = JSON.parse(fs.readFileSync(path.join(tmp, 'data/projectaon/t1/check-items.json'), 'utf8'));
    expect(j).toEqual({
      book: 't1', errors: [], items: 2, sections: 3,
      counts: { give: 1, loot: 1, take: 1, ep: 2, rolls: 1, need: 2, fight: 1, todo: 1 }, leftOut: null,
    });
  });

  it('with --json records errors and the left-out ids', async () => {
    w('data/projectaon/t1/items-reading.txt', '#5 x\n#1 y\n');
    w('items/items-t1.js', `export const ITEMS = {}; export const SECTIONS = { '1': { give: [{ item: 'ghost' }] } };`);
    await run('t1', true);
    const j = JSON.parse(fs.readFileSync(path.join(tmp, 'data/projectaon/t1/check-items.json'), 'utf8'));
    fs.rmSync(path.join(tmp, 'data/projectaon/t1/items-reading.txt'));
    w('items/items-t1.js', CLEAN);
    expect(j.errors).toEqual(['1 give: unknown item ghost']);
    expect(j.leftOut).toEqual(['5']);
  });
});

describe('command line', () => {
  it('prints the text and exits 0, run from a copy placed inside the stand-in tree', async () => {
    fs.mkdirSync(path.join(tmp, 'tools'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'tools', 'check_items.mjs'), path.join(tmp, 'tools', 'check_items.mjs'));
    const r = spawnSync(process.execPath, [path.join(tmp, 'tools', 'check_items.mjs'), 't1'], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout.split('\n').slice(0, 2)).toEqual(['no errors', '2 book items; 3 sections: give 1, loot 1, take 1, ep 2, rolls 1, need 2, fight 1, todo 1']);
  });
});

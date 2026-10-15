/* tools/walk_book.mjs exports walkBook({ root, book, json }); these tests walk a stand-in book in a temporary
   project tree holding the engine (shared/core.js, rules-series.js, fight.js) and a stand-in item table.
   Nothing from data/projectaon is used. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ROOT } from './helpers.js';
import { walkBook } from '../../tools/walk_book.mjs';

let tmp;
const w = (rel, text) => { const f = path.join(tmp, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
const end = { end: 'victory' }, foe = (name) => [{ name, cs: 5, ep: 6 }];

// a Kai book of made-up sections, each there for one thing the walk should find or get past
const SECTIONS = {
  1: { rnt: 'auto', choices: [{ to: '2', range: [0, 4] }, { to: '3', range: [5, 9] }] },
  2: { combat: { enemies: foe('Rat'), won: { within: 1, to: '12', else: '13' } }, choices: [] }, // either way, whatever the dice
  12: { choices: [{ to: '4' }, { to: '9' }] },
  13: { choices: [{ to: '4' }] },
  3: { choices: [{ to: '5', need: { item: 'key' } }, { to: '14', need: { item: 'lamp' } }, { to: '4' }] }, // no Key anywhere; the Lamp is at 13
  4: { choices: [{ to: '6', need: { came: ['99'] } }, { to: '7' }, { to: '11' }] },
  7: { combat: { enemies: foe('Ghost'), rounds: [{ foeLoss: 0, heroLoss: 0 }], to: '8' }, choices: [{ to: '8' }] }, // neither side takes harm
  8: { choices: [{ to: '404' }] }, // no such section: the engine throws
  9: { combat: { enemies: foe('Champion'), lose: '17', to: '18' }, choices: [{ to: '17' }, { to: '18' }] }, // a contest
  11: { choices: [{ to: '6', need: { came: ['99'] } }] }, // no way on
  10: { choices: [{ to: '16' }] }, // no link leads here (a puzzle's answer)
  5: end, 6: end, 14: end, 16: end, 17: end, 18: end,
};
const book = (code, more) => `LW.BOOKS['${code}'] = ${JSON.stringify(Object.assign({ id: code, number: 1, series: 'kai', start: '1', sections: SECTIONS }, more))};`;

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lw-walk-'));
  for (const f of ['core.js', 'rules-series.js', 'fight.js']) w(`shared/${f}`, fs.readFileSync(path.join(ROOT, 'shared', f), 'utf8'));
  w('items/items-01tt.js', `export const ITEMS = { lamp: { name: 'Lamp', kind: 'backpack' } }; export const SECTIONS = { 13: { give: [{ item: 'lamp' }] } };`);
  w('data/projectaon/01tt/book.js', book('01tt'));
  w('data/projectaon/13gm/book.js', book('13gm', { number: 13, series: 'grandmaster' }));
});
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('walk_book.mjs', () => {
  it('walks every way on and lists, by section id, what is wrong', async () => {
    const r = await walkBook({ root: tmp, book: '01tt' });
    expect(r.code).toBe(0);
    expect(r.crashes.map((c) => c.id)).toEqual(['8']);
    // gates that cannot open whatever he has; those opened only with the item lent, and which item is found nowhere
    expect(r.closed.map((c) => `${c.id}>${c.to}`)).toEqual(['4>6', '11>6']);
    expect(r.lent).toEqual([{ id: '3', to: '5', why: ['Needs key'], missing: ['key'] }, { id: '3', to: '14', why: ['Needs Lamp'], missing: [] }]);
    expect(r.stuck.map((s) => s.id)).toEqual(['11']);
    expect(r.long).toEqual(['7']);
    expect(r.unreached).toEqual(['6']);
    expect(r.orphans).toEqual(['10']);
    expect(r.pastOrphans).toEqual(['16']);
    expect(r.look).toEqual(['3', '4', '6', '7', '8', '11']);
    // the fight's two outcomes, the contest won and lost, the endless fight's way on, the lent gates' sections: all reached
    expect(r.standIns.map((s) => s.who)).toEqual(['master', 'novice']);
    expect(r.standIns[0].reached).toBe(14); // all but 6 (unreachable) and 10, 16 (no link)
    expect(r.text).toMatch(/^master: reached 14 of 17 sections/);
  });

  it('gives the same report twice (the draws are seeded) and writes walk.json with --json', async () => {
    const a = await walkBook({ root: tmp, book: '01tt' });
    const b = await walkBook({ root: tmp, book: '01tt', json: true });
    expect(b.text).toContain('wrote data/projectaon/01tt/walk.json');
    const saved = JSON.parse(fs.readFileSync(path.join(tmp, 'data/projectaon/01tt/walk.json'), 'utf8'));
    expect(saved.look).toEqual(a.look);
    expect(saved.standIns).toEqual(a.standIns);
  });

  it('does not walk a book whose series the engine has no rules for', async () => {
    const r = await walkBook({ root: tmp, book: '13gm', json: true });
    expect(r).toMatchObject({ code: 0, waits: true });
    expect(fs.existsSync(path.join(tmp, 'data/projectaon/13gm/walk.json'))).toBe(false);
  });

  it('says to import first when there is no book.js', async () => {
    expect((await walkBook({ root: tmp, book: 'zz9' })).code).toBe(1);
  });
});

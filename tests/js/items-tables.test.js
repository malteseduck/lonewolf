/* Internal consistency of the twelve hand-made item tables (items-<code>.js), without the books:
   what tools/check_items.mjs can check from the table alone (it checks section links against book.js). */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { ROOT, loadShared } from './helpers.js';

const CODES = ['01fftd', '02fotw', '03tcok', '04tcod', '05sots', '06tkot', '07cd', '08tjoh', '09tcof', '10tdot', '11tpot', '12tmod', '13tplor', '14tcok', '16tlov'];
// from tools/check_items.mjs
const FIELDS = new Set(['give', 'loot', 'take', 'ep', 'cs', 'rolls', 'meal', 'noHunt', 'todo', 'need', 'fight', 'bowShot', 'grandBow', 'rntMod',
  'when', 'mark', 'unmark', 'rnt', 'note', 'stake', 'settle', 'sell', 'back', 'mealCost', 'lessen', 'ranges', 'draws', 'healLost', 'epMax', 'game',
  'zeroTen', 'against', 'mealUnless', 'add', 'forfeit']);
const FIGHT = new Set(['csMod', 'csIf', 'csUnless', 'csNote', 'mindforce', 'unless', 'unarmed', 'undead', 'drain', 'with', 'double', 'ambush', 'evade',
  'rounds', 'stop', 'won', 'wounded', 'noEvade', 'noShield', 'noUnarmed', 'weaponCs', 'plain', 'only', 'barred', 'lend', 'mind', 'keep', 'healLost', 'restore', 'noBoost', 'to', 'points', 'lose', 'byHand', 'breath', 'noMind', 'noStrike', 'kind', 'act']);
const KINDS = ['weapon', 'backpack', 'special'];

const tables = {};
let LW;
beforeAll(async () => {
  LW = loadShared('core.js', 'rules-series.js');
  for (const c of CODES) tables[c] = await import(pathToFileURL(path.join(ROOT, 'items', `items-${c}.js`)).href);
  for (const c of CODES) LW.addItems(tables[c].ITEMS, tables[c].MARKS);
});

const known = (id) => id === 'meal' || !!LW.ITEMS[id];
const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

it('there is a table for every file items/items-*.js (a script draft not yet read aside)', () => {
  const files = fs.readdirSync(path.join(ROOT, 'items')).filter((f) => /^items-\w+\.js$/.test(f))
    .filter((f) => !fs.readFileSync(path.join(ROOT, 'items', f), 'utf8').startsWith('// DRAFT by tools/items_draft.mjs')).map((f) => f.slice(6, -3)).sort();
  expect(files).toEqual([...CODES].sort());
});

describe.each(CODES)('items-%s.js', (code) => {
  const T = () => tables[code];

  it('exports ITEMS and SECTIONS as objects', () => {
    expect(typeof T().ITEMS).toBe('object');
    expect(typeof T().SECTIONS).toBe('object');
  });

  it('defines each item with a name and a valid kind', () => {
    for (const [k, it] of Object.entries(T().ITEMS)) {
      expect(typeof it.name, `${k} name`).toBe('string');
      expect(it.name.length, `${k} name`).toBeGreaterThan(0);
      expect(KINDS, `${k} kind`).toContain(it.kind);
    }
  });

  it('names an icon that exists for every glyph', () => {
    for (const [k, it] of Object.entries(T().ITEMS)) {
      if (it.glyph) expect(fs.existsSync(path.join(ROOT, 'assets', 'icons', it.glyph + '.svg')), `${k}: ${it.glyph}.svg`).toBe(true);
    }
  });

  it('gives numeric heal and ep values where set', () => {
    for (const [k, it] of Object.entries(T().ITEMS)) {
      for (const f of ['heal', 'ep', 'fightCs']) if (it[f] != null) expect(typeof it[f], `${k}.${f}`).toBe('number');
    }
  });

  it('uses only fields the engine knows in each section', () => {
    for (const [id, x] of Object.entries(T().SECTIONS)) {
      for (const f of Object.keys(x)) expect(FIELDS.has(f), `${id}: unknown field ${f}`).toBe(true);
    }
  });

  it('section ids are plain numbers', () => {
    for (const id of Object.keys(T().SECTIONS)) expect(id).toMatch(/^\d+$/);
  });

  it('only names items that are defined (in the engine or any table) in give, loot and take', () => {
    const bad = [];
    const things = (list, where) => arr(list).forEach((l) => {
      if (l.item && !known(l.item)) bad.push(`${where}: unknown item ${l.item}`);
      if (!l.item && l.gold == null && l.meal == null && !l.pack && !l.arrows && !l.coin) bad.push(`${where}: empty entry`);
      if (l.pick && !l.or) bad.push(`${where}: pick without or`);
    });
    const losses = (list, where) => arr(list).forEach((t) => {
      arr(t.item).forEach((i) => { if (!known(i)) bad.push(`${where}: unknown item ${i}`); });
      if (t.weapons && !['all', 'one', 'used'].includes(t.weapons)) bad.push(`${where}: weapons ${t.weapons}`);
      if (t.backpack && !['all', 'items'].includes(t.backpack)) bad.push(`${where}: backpack ${t.backpack}`);
      if (t.special && t.special !== 'all' && !(t.special === true && t.weapons)) bad.push(`${where}: special ${t.special}`);
      losses(t.else, `${where} else`);
    });
    for (const [id, x] of Object.entries(T().SECTIONS)) {
      things(x.give, `${id} give`); things(x.loot, `${id} loot`); losses(x.take, `${id} take`);
      arr(x.when).forEach((w, i) => losses(w.take, `${id} when[${i}]`));
      arr(x.rolls).forEach((r, i) => {
        if (!Array.isArray(r.range) || r.range.length !== 2 || r.range[0] > r.range[1]) bad.push(`${id} rolls[${i}]: range`);
        losses(r.take, `${id} rolls[${i}]`);
      });
    }
    expect(bad).toEqual([]);
  });

  it('writes need entries that name known items', () => {
    const bad = [];
    for (const [id, x] of Object.entries(T().SECTIONS)) {
      for (const [to, n] of Object.entries(x.need || {})) {
        expect(to, `${id} need key`).toMatch(/^\d+$/);
        arr(n && n.item).forEach((i) => { if (!known(i)) bad.push(`${id}->${to}: ${i}`); });
        arr(n && n.any).forEach((m) => arr(m.item).forEach((i) => { if (!known(i)) bad.push(`${id}->${to}: ${i}`); }));
      }
    }
    expect(bad).toEqual([]);
  });

  it('writes fight corrections with known fields, items and weapons', () => {
    const bad = [];
    for (const [id, x] of Object.entries(T().SECTIONS)) {
      const f = x.fight;
      if (!f) continue;
      for (const k of Object.keys(f)) if (!FIGHT.has(k)) bad.push(`${id}: fight field ${k}`);
      arr(f.unless).forEach((i) => { if (!known(i)) bad.push(`${id}: fight unless ${i}`); });
      if (f.with && f.with !== 'none') {
        const w = LW.ITEMS[f.with];
        if (!(w && (w.kind === 'weapon' || w.weapon))) bad.push(`${id}: fight with ${f.with}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('writes bowShot as [lo, hi] ranges per choice', () => {
    for (const [id, x] of Object.entries(T().SECTIONS)) {
      for (const [to, r] of Object.entries(x.bowShot || {})) {
        expect(Array.isArray(r) && r.length === 2 && r[0] <= r[1], `${id}->${to}`).toBe(true);
      }
    }
  });

  it('writes ep as a number or "full", cs as a number, todo as a string', () => {
    for (const [id, x] of Object.entries(T().SECTIONS)) {
      if (x.ep != null) expect(x.ep === 'full' || typeof x.ep === 'number', `${id} ep`).toBe(true);
      if (x.cs != null) expect(typeof x.cs, `${id} cs`).toBe('number');
      if (x.todo != null) expect(typeof x.todo, `${id} todo`).toBe('string');
    }
  });
});

describe('across the tables', () => {
  it('no item id is defined with two different names', () => {
    const seen = {};
    const clashes = [];
    for (const c of CODES) for (const [k, it] of Object.entries(tables[c].ITEMS)) {
      if (seen[k] && seen[k].name !== it.name) clashes.push(`${k}: ${seen[k].code} "${seen[k].name}" vs ${c} "${it.name}"`);
      seen[k] = { code: c, name: it.name };
    }
    expect(clashes).toEqual([]);
  });

  it('no table overrides an engine item with another kind', () => {
    const core = loadShared('core.js', 'rules-series.js').ITEMS;
    const bad = [];
    for (const c of CODES) for (const [k, it] of Object.entries(tables[c].ITEMS)) if (core[k] && core[k].kind !== it.kind) bad.push(`${c}.${k}`);
    expect(bad).toEqual([]);
  });

  it('adding the tables makes their weapons known to LW.WEAPONS', () => {
    for (const c of CODES) for (const [k, it] of Object.entries(tables[c].ITEMS)) if (it.kind === "weapon") expect(LW.WEAPONS).toContain(k);
  });
});

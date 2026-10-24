/* The demo book's own item table (demo/99ember/items.js, ruling R20) works with the engine as it is: it
   registers its items, and what it gives, offers and gates is known to the engine. */
import { it, expect, beforeAll } from 'vitest';
import path from 'path';
import { pathToFileURL } from 'url';
import { ROOT, loadShared } from './helpers.js';

let LW, T;
beforeAll(async () => {
  LW = loadShared('core.js', 'rules-series.js');
  T = await import(pathToFileURL(path.join(ROOT, 'demo', '99ember', 'items.js')).href);
  LW.addItems(T.ITEMS, T.MARKS);
});

it('every item it names is one the engine knows, and its own items are well-formed', () => {
  const named = (v) => [].concat(v || []).flatMap((x) => (x && x.item ? [x.item] : []));
  for (const [n, s] of Object.entries(T.SECTIONS)) {
    for (const id of [...named(s.give), ...named(s.loot), ...Object.values(s.need || {}).flatMap((g) => named(g))]) {
      expect(LW.ITEMS[id], `section ${n}: ${id}`).toBeTruthy();
    }
  }
  for (const it of Object.values(T.ITEMS)) expect(['weapon', 'backpack', 'special']).toContain(it.kind);
});

it('the letter is given at the start and gates the warden\'s door', () => {
  expect(T.SECTIONS[1].give).toEqual([{ item: 'emberLetter' }]);
  expect(T.SECTIONS[52].need[90]).toEqual({ item: 'emberLetter' });
});

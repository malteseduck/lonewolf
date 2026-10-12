// shared/core.js: an item table laid over an imported book (LW.applyItems), and a typed name found
// among the items (LW.itemByName). Stand-in book and table.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadShared } from './helpers.js';

let LW;
beforeEach(() => { LW = loadShared('core.js', 'rules-series.js'); });

const book = () => ({
  id: 'test', sections: {
    1: { text: ['x'], choices: [{ text: 'a', to: '2', need: { disc: 'tracking' } }, { text: 'b', to: '3', need: { item: 'rope' } }, { text: 'c', to: '4' }] },
    2: { text: ['y'], combat: { enemies: [{ name: 'Giak', cs: 10, ep: 9 }, { name: 'Giak', cs: 10, ep: 9 }] } },
    3: { text: ['z'], choices: [{ text: 'hit', to: '5' }, { text: 'miss', to: '6' }, { text: 'miss too', to: '6' }] },
  },
});
const table = {
  ITEMS: {},
  SECTIONS: {
    1: { give: [{ item: 'rope' }], need: { 2: null, 3: { item: 'rope', not: true }, 4: { any: [{ disc: 'hunting' }, { item: 'rope' }] } } },
    2: { fight: { csMod: -2, csNote: 'Dark', undead: true, drain: 1 } },
    3: { bowShot: { 5: [7, 99], 6: [0, 6] } },
    99: { give: [{ gold: 1 }] }, // a section the book does not have is passed over
  },
};

describe('an item table laid over a book', () => {
  it('adds what sections give, sets and clears gates, and marks each enemy of a fight', () => {
    const b = book();
    LW.applyItems(b, table);
    const s = b.sections;
    expect(s[1].give).toEqual([{ item: 'rope' }]);
    expect(s[1].choices.map((c) => c.need)).toEqual([undefined, { item: 'rope', not: true }, { any: [{ disc: 'hunting' }, { item: 'rope' }] }]);
    expect(s[2].combat).toMatchObject({ csMod: -2, csNote: 'Dark' });
    expect(s[2].combat.undead).toBeUndefined();
    expect(s[2].combat.enemies.every((e) => e.undead && e.drain === 1)).toBe(true);
    expect([s[3].bowShot, s[3].rnt]).toEqual([true, 'auto']);
    expect(s[3].choices.map((c) => c.range)).toEqual([[7, 99], [0, 6], [0, 6]]);
    expect(s[99]).toBeUndefined();
  });
  it('is laid over once only, and a book with no table is left as it is', () => {
    const b = book();
    LW.applyItems(b, table);
    b.sections[1].give.push({ gold: 2 });
    LW.applyItems(b, table);
    expect(b.sections[1].give).toHaveLength(2);
    const plain = book();
    LW.applyItems(plain, undefined);
    expect(plain).toEqual(book());
  });
});

describe('a typed name', () => {
  it('finds the item of that name, in any case, the open book\'s own first', () => {
    LW.addItems({ bookAKey: { name: 'Iron Key', kind: 'special' }, bookBKey: { name: 'Iron Key', kind: 'special' } });
    expect(LW.itemByName('iron key')).toBe('bookAKey');
    expect(LW.itemByName('IRON KEY', ['bookBKey'])).toBe('bookBKey');
    expect(LW.itemByName('Shield')).toBe('shield');
    expect(LW.itemByName('no such thing')).toBe(null);
  });
});

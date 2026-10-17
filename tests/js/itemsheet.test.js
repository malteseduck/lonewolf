/* tools/admin/itemsheet.js, the item sheet's reading of the item tables: where a book's sections use each
   item, the cards it shows (its own items, then those from elsewhere), and the items sharing an icon. */
import { describe, it, expect } from 'vitest';
import { uses, cards, glyphUsers } from '../../tools/admin/itemsheet.js';

const tables = {
  '01one': {
    ITEMS: { gem1: { name: 'Gem', kind: 'special', glyph: 'gems' }, note1: { name: 'Note', kind: 'backpack' } },
    SECTIONS: {
      5: { loot: [{ item: 'gem1' }, { item: 'sword' }, { meal: 2 }] },
      9: { need: { 20: { item: 'gem1' }, 30: { item: 'gem1', not: true } }, take: [{ item: 'note1' }] },
      12: { fight: { rounds: [{ csMod: -2, if: { wield: ['mace', 'sword'] } }] }, sell: { sword: 3 } },
      14: { give: [{ item: 'herb2' }] },
    },
  },
  '02two': { ITEMS: { herb2: { name: 'Herb', kind: 'backpack', glyph: 'herbs' } }, SECTIONS: { 3: { give: [{ item: 'gem1' }] } } },
};
const items = { sword: { name: 'Sword', kind: 'weapon' }, mace: { name: 'Mace', kind: 'weapon' }, ...tables['01one'].ITEMS, ...tables['02two'].ITEMS };
const glyphOf = (id) => items[id]?.glyph || (id === 'sword' ? 'pointy-sword' : 'swap-bag');
const named = (id) => !!items[id]?.glyph || id === 'sword';

describe('the item sheet', () => {
  it('finds where each item is offered, given, taken, needed or fought with', () => {
    expect(uses(tables['01one'].SECTIONS)).toEqual({
      gem1: { loot: ['5'], need: ['9'] }, sword: { loot: ['5'], fight: ['12'], sell: ['12'] }, note1: { take: ['9'] }, mace: { fight: ['12'] }, herb2: { give: ['14'] },
    });
  });

  it("shows a book's own items, then the ones from elsewhere with where they are defined", () => {
    const got = cards('01one', tables, items, glyphOf, named);
    expect(got.map((c) => [c.id, c.home, c.glyph, c.named])).toEqual([
      ['gem1', '01one', 'gems', true], ['note1', '01one', 'swap-bag', false],
      ['herb2', '02two', 'herbs', true], ['mace', 'engine', 'swap-bag', false], ['sword', 'engine', 'pointy-sword', true],
    ]);
    expect(got[0].books).toEqual(['02two']);  // Book 2 gives it too
    expect(got[0].used).toEqual({ loot: ['5'], need: ['9'] });
  });

  it('groups the items by the icon they show', () => {
    expect(glyphUsers(Object.keys(items), glyphOf)).toEqual({ 'pointy-sword': ['sword'], 'swap-bag': ['mace', 'note1'], gems: ['gem1'], herbs: ['herb2'] });
  });
});

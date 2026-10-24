/* The Ember Road's items, in the same format as items/items-<code>.js (docs/reference/items.md). The book
   is a stand-in written for the showcase (ruling R20); its table lives with it and is loaded by the
   player only where the book is (main.js), so it never reaches the release or the iPad. */
export const ITEMS = {
  emberLetter: { name: 'Sealed Letter', kind: 'special', glyph: 'wax-seal', about: 'A letter for the warden of Thornwick, to be read by no one else.' },
  marshDraught: { name: 'Marsh Draught', kind: 'backpack', glyph: 'standing-potion', heal: 4, about: 'The marsh-wives\' green draught: drink it to restore 4 ENDURANCE.' },
};

export const MARKS = {};

export const SECTIONS = {
  1: { give: [{ item: 'emberLetter' }] },
  52: { need: { 90: { item: 'emberLetter' } } },
  61: { loot: [{ item: 'dagger' }, { item: 'marshDraught' }] },
  73: { ep: -3 },
};

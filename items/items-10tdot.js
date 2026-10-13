/* Book 10's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand (see items-01fftd.js for the fields, items-02fotw.js for the later ones, and
   docs/reference/items.md for how). Notes on this book:
     - Every "If you have a Bow and wish to use it" choice is open only with a Bow. Arrows the text
       has him fire without a Random Number are taken off the Quiver on arrival (take arrows); the
       three shots that draw a number are bowShot, which spends its own Arrow.
     - The Signet Ring is given at 176 and, by the text, does not count against the twelve Special
       Items (free).
     - The one surprise penalty (28, first round only) names Huntmastery itself, so it is an unless.
     - Kalte Firesphere is the Book 3 item (firesphere); the Sommerswerd is Book 2's.
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  bullwhip: { name: 'Bullwhip', kind: 'special', glyph: 'whip', about: 'A studded whip taken from a partisan leader’s brother. Its copper nuggets glow against the undead: +2 COMBAT SKILL in a fight with them. Some partisans will know it.' },
  medal10: { name: 'Medal', kind: 'special', glyph: 'medal', about: 'Won at the Battle of Luomi and pressed into your hand by a grateful knight.' },
  signetRing10: { name: 'Signet Ring', kind: 'special', glyph: 'ring', free: true, about: 'Prince Graygor’s royal crest, worn on the right hand to show the court’s friendship. It does not count against the twelve Special Items.' },
  gorodonHorn: { name: 'Gorodon Horn', kind: 'special', glyph: 'rhinoceros-horn', about: 'Cut from a Gorodon; potion-makers in Humbold would pay well for it. Carried strapped to the pack.' },
  blackKey10: { name: 'Black Key', kind: 'special', glyph: 'key', about: 'Taken from a Drakkarim officer. It opens a black steel door in Torgar.' },
  skeletonKey10: { name: 'Skeleton Key', kind: 'special', glyph: 'skeleton-key', about: 'Picks the lock of the black steel door. Not found in this book.' },
  laumwort: { name: 'Laumwort', kind: 'backpack', glyph: 'herbs-bundle', heal: 2, about: 'A herb like Laumspur: eat the leaves to restore 2 ENDURANCE.' },
  bottleOfWater10: { name: 'Bottle of Water', kind: 'backpack', glyph: 'round-bottom-flask' },
  blanket10: { name: 'Blanket', kind: 'backpack', glyph: 'blanket', about: 'Spares you a bad night’s sleep on the straw at Prince Graygor’s camp.' },
};

const bow = { item: 'bow' };
const rope = { item: 'rope' };
const sommerswerd = { item: 'sommerswerd' };
const notSommerswerd = { item: 'sommerswerd', not: true };
const whip = { item: 'bullwhip' };
const notWhip = { item: 'bullwhip', not: true };
// what keeps the phantoms off at 256: a Kalte Firesphere, a Torch with a Tinderbox, or a Lantern
const lights = [{ item: 'firesphere' }, { items: ['torch', 'tinderbox'] }, { item: 'lantern' }];
// the ghosts: the Sommerswerd, the Bullwhip, or (neither) death
const ghosts = { 133: sommerswerd, 168: whip, 74: { item: ['sommerswerd', 'bullwhip'], not: true } };
// the war-dogs: Mindblast or Psi-surge counts double, triple with the Lore-circle of the Spirit
const spirit = { circle: ['Circle of the Spirit'] };
const akataz = [{ psi: 2, unless: spirit }, { psi: 3, if: spirit }];
// the Taintor Wolf: a fight longer than four rounds is broken off
const wolf = { stop: { after: 4, to: '234' }, to: '202' };

export const SECTIONS = {
  8: { need: { 131: bow } },
  9: { need: { 113: sommerswerd, 126: notSommerswerd } },
  // the weapon he blocked with: the one he fought with at 126, the only way here
  11: { take: [{ weapons: 'used' }] },
  15: { ep: -1 },
  22: { need: { 293: bow } },
  26: { ep: -1, need: { 147: bow } },
  28: { fight: { rounds: [{ upTo: 1, csMod: -3, unless: { disc: 'huntmastery' }, note: 'Surprise' }], won: { within: 4, to: '169', else: '309' } } },
  29: { when: [{ unless: { item: ['blanket10', 'blanket9', 'blanket7', 'blanket'] }, ep: -1 }] },
  34: { ep: -2 },
  36: { take: [{ arrows: 1 }] },
  41: { fight: { stop: { after: 3, to: '10' }, to: '326' } },
  43: { take: [{ at: [2] }] },
  52: { need: { 109: bow } },
  // hanging by the roots: 3 off for the whole fight, and only a weapon-like Special Item can be used; without one he
  // is unarmed, and the engine takes 4 for it (2 for a Tutelary with Weaponmastery, as the text says)
  54: { fight: { csMod: -3, csNote: 'Hanging by the roots', only: ['special'] } },
  59: { need: { 76: bow } },
  62: { need: { 48: rope } },
  64: { ep: -5 },
  67: { need: { 119: bow } },
  // a shot at the creature's mouth: Bow, Arrow, Weaponmastery and Mentora added by the engine
  70: { bowShot: { 336: [0, 2], 349: [3, 7], 195: [8, 99] } },
  71: { need: ghosts },
  73: { need: { 113: sommerswerd, 126: notSommerswerd } },
  76: { take: [{ arrows: 1 }] },
  77: { ep: -5 },
  79: { loot: [{ item: 'medal10' }] },
  81: { fight: { rounds: akataz } },
  93: { need: { 133: sommerswerd, 256: notSommerswerd } },
  96: { bowShot: { 9: [0, 7], 272: [8, 99] } },
  99: { ep: -4 },
  109: { take: [{ arrows: 1 }] },
  119: { take: [{ arrows: 1 }] },
  121: { ep: -2, need: { 36: bow } },
  123: { need: { 48: rope } },
  126: { fight: { won: { within: 4, to: '11', else: '321' } } },
  128: { rntMod: [{ wield: ['dagger', 'quarterstaff'], plus: -3 }, { wield: ['axe', 'mace'], plus: 1 }, { disc: 'huntmastery', plus: 2 }], ranges: { 95: [-9, 6], 233: [7, 99] } },
  130: { need: { 142: { item: 'dagger' }, 17: { item: 'dagger', not: true } } },
  131: { take: [{ arrows: 1 }], need: { 344: { any: [{ arrows: 2 }] } } },
  133: { fight: { undead: true } },
  134: { ep: -3, need: { 214: whip, 327: notWhip } },
  135: { ep: -3 },
  // the dagger snaps in the lock
  142: { take: [{ item: 'dagger' }] },
  145: { loot: [{ item: 'bullwhip' }, { gold: 9 }, { item: 'torch' }, { item: 'tinderbox' }, { item: 'bottleOfWater10' }] },
  146: { loot: [{ meal: 1 }, { meal: 1 }, { meal: 1 }, { meal: 1 }, { meal: 1 }] },
  147: { take: [{ arrows: 1 }], need: { 286: sommerswerd, 333: notSommerswerd } },
  153: { need: { 131: bow } },
  155: { need: { 96: bow } },
  // the whip is taken from him
  159: { take: [{ item: 'bullwhip' }] },
  // the number drawn is the loss, 0 counting as 10, less 2 with Huntmastery
  166: { rolls: [{ range: [0, 9], ep: 'drawn' }], lessen: [{ n: 2, if: { disc: 'huntmastery' } }] },
  167: { need: { 214: whip, 327: notWhip } },
  // the whip's power against the undead
  168: { fight: { csMod: 2, csNote: 'Bullwhip' } },
  // the Gorodon turns half its attacks on Jarel
  172: { fight: { rounds: [{ heroLoss: 0.5, note: 'Jarel' }] } },
  174: { need: { 286: sommerswerd, 333: notSommerswerd } },
  176: { give: [{ item: 'signetRing10' }] },
  177: { loot: [{ item: 'blackKey10' }, { gold: 20 }, { item: 'dagger' }] },
  180: { fight: { won: { within: 2, to: '316', else: '261' } } },
  // the importer's pattern missed this Meal
  186: { meal: true },
  187: { fight: wolf },
  192: { ep: -3 },
  // the number drawn is the loss (the text does not make 0 count as 10), less 3 with Curing
  203: { rolls: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], ep: -n })), lessen: [{ n: 3, if: { disc: 'curing' } }] },
  208: { ep: -2 },
  // the weapon he struck with, his choice of those he has
  210: { ep: -2, take: [{ pick: 'weapon', n: 1 }] },
  213: { ep: -5, need: { 147: bow } },
  215: { ep: -2 },
  217: { loot: [{ item: 'gorodonHorn' }] },
  // Portholes by another name: 12 Lune or 3 Gold Crowns a throw
  218: { game: { kind: 'dice', stake: 3, win: 2, foes: 2, coin: 'lune', rate: 4 } },
  223: { need: { 185: whip, 342: notWhip } },
  228: { ep: -2, need: ghosts },
  233: { when: [{ unless: { disc: 'nexus' }, ep: -3 }] },
  236: { ep: -8 },
  245: { fight: { won: { within: 4, to: '169', else: '309' } } },
  246: { need: { 205: { item: 'oedeHerb', spend: true }, 343: { item: 'oedeHerb', not: true } } },
  251: { fight: { rounds: [{ upTo: 1, csMod: 2, note: 'Impetus' }] } },
  253: { ep: -5 },
  254: { ep: -6, fight: { rounds: akataz } },
  256: { need: { 168: whip, 248: { any: lights }, 24: { any: [{ not: { any: [whip, ...lights] } }] } } },
  257: { ep: -6 },
  261: { ep: -12 },
  265: { take: [{ at: [4, 5, 6] }, { gold: 'half' }] },
  // what the four Zagganozod carried, to take what fits
  271: { loot: [{ item: 'sword' }, { item: 'dagger' }, { item: 'axe' }, { item: 'mace' }, { item: 'broadsword' }, { item: 'bow' }, { item: 'quiver' }, { arrows: 11 }, { gold: 4 }, { meal: 1 }, { meal: 1 }, { meal: 1 }, { meal: 1 }] },
  272: { need: { 113: sommerswerd, 126: notSommerswerd } },
  // enough for three Meals of it, two ENDURANCE each
  276: { loot: [{ item: 'laumwort' }, { item: 'laumwort' }, { item: 'laumwort' }] },
  277: { loot: [{ item: 'broadsword' }, { item: 'axe' }, { item: 'bottleOfWater10' }, { item: 'torch' }, { item: 'blanket10' }, { meal: 1 }, { meal: 1 }, { meal: 1 }] },
  // the number drawn is the loss, 0 counting as 10
  281: { rolls: [{ range: [0, 9], ep: 'drawn' }] },
  283: { ep: -3, need: { 131: bow } },
  285: { need: { 80: { item: 'blackKey10' }, 219: { item: 'skeletonKey10' }, 130: { item: ['blackKey10', 'skeletonKey10'], not: true } } },
  286: { fight: { stop: { foeAt: 20, to: '20' } } },
  293: { bowShot: { 149: [0, 7], 164: [8, 99] } },
  // what the dead Drakkar carried
  296: { loot: [{ item: 'sword' }, { item: 'dagger' }, { item: 'bow' }, { item: 'blanket10' }, { item: 'quiver' }, { arrows: 3 }, { gold: 4 }] },
  297: { need: { 252: sommerswerd, 143: notSommerswerd } },
  // the Lapillibore fought from the ledge (the importer read the 3 off for the whole fight): one-handed weapons
  // only, weapon-like Special Items by their kind, and no Shield
  304: { fight: { noShield: true, only: ['sword', 'mace', 'axe', 'dagger', 'shortSword', 'warhammer'] } },
  309: { ep: -2 },
  310: { ep: -8 },
  316: { ep: -4 },
  319: { need: { 36: bow } },
  329: { need: { 70: bow } },
  336: { fight: { ...wolf, rounds: [{ upTo: 1, unarmed: true }] } },
  340: { ep: -4, take: [{ at: [2, 3, 5, 7] }, { gold: 'half' }, { pick: 'special', n: 1 }] },
  344: { take: [{ arrows: 2 }] },
  349: { fight: wolf },
};

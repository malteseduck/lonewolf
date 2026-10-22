/* Book 9's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand (see items-01fftd.js for the fields, items-02fotw.js for the later ones, and
   docs/reference/items.md for how). Notes on this book:
     - Money in Anari is Lune (4 to the Gold Crown). Prices either coin may pay are kept in Crowns
       (the inn's room, the beggars); Lune is counted as its own coin only where the text keeps them
       apart: the purse at 155, the mercenaries' fee at 253, the thief at 315.
     - Three sections that strip the hero of everything (the gatehouse cell: 170, 174, 312) put it
       aside under 'cell'; 54 gives it all back, 177 all but the Weapons.
     - The pickpocket's theft (201, 273) is put aside under 'pickpocket', and found on him at 155.
     - Bow shots are 99, 216 and 229. A fixed shot with no draw (12, 22, 171, 183, 184) takes its Arrows.
     - Undead foes (the Zaaryx ghouls, the Psi-ghouls) are marked, so the Sommerswerd doubles against them.
     - The Dagger of Vashna comes from an earlier book; here it is only what a choice at 210 asks for.
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  psychicRing: { name: 'Psychic Ring', kind: 'special', glyph: 'ring', about: 'A ring with a yellow stone that amplifies your psychic power. Kept in a pocket.' },
  invitation9: { name: 'Invitation', kind: 'special', glyph: 'wax-seal', about: 'A written invitation to the house of Chiban in Tahou.' },
  receipt9: { name: 'Receipt', kind: 'special', glyph: 'ticket', free: true, about: 'For the horses impounded at the gate. It takes no room.' },
  ironKey9: { name: 'Iron Key', kind: 'special', glyph: 'key', about: 'Taken from a gatehouse guard.' },
  bluePills9: { name: 'Vial of Blue Pills', kind: 'backpack', glyph: 'pill', doses: 2, about: 'Sabito root tablets, two doses: they let you breathe under water.' },
  silverBowl9: { name: 'Silver Bowl', kind: 'backpack', glyph: 'bowl-spiral' },
  goldDust9: { name: 'Vial of Gold Dust', kind: 'backpack', glyph: 'round-bottom-flask' },
  altarCloth9: { name: 'Altar Cloth', kind: 'backpack', glyph: 'rolled-cloth' },
  scrollHonour9: { name: 'Scroll of Honour', kind: 'backpack', glyph: 'scroll-unfurled' },
  jadinAnklets9: { name: 'Jadin Anklets', kind: 'backpack', glyph: 'ring' },
  flask9: { name: 'Flask of Water', kind: 'backpack', glyph: 'round-bottom-flask' },
  boza9: { name: 'Flask of Boza', kind: 'backpack', glyph: 'round-bottom-flask', about: 'A pale yellow wine that smells of sour milk.' },
  blanket9: { name: 'Blanket', kind: 'backpack', glyph: 'blanket' },
  comb9: { name: 'Comb', kind: 'backpack', glyph: 'comb' },
  candlestick9: { name: 'Silver Candlestick', kind: 'backpack', glyph: 'candle-holder' },
  whistle9: { name: 'Brass Whistle', kind: 'backpack', glyph: 'whistle' },
  goblet9: { name: 'Silver Goblet', kind: 'backpack', glyph: 'jeweled-chalice' },
  silkJacket9: { name: 'Silk Jacket', kind: 'backpack', glyph: 'robe' },
  decanter9: { name: 'Crystal Decanter', kind: 'backpack', glyph: 'brandy-bottle' },
};

const bow = { item: 'bow' };
const sommerswerd = { item: 'sommerswerd' };
const noSommerswerd = { item: 'sommerswerd', not: true };
const fireseed = { item: 'fireseed' };
// the strongroom's weapons, and what the warehouse gives besides
const arms = [{ item: 'sword' }, { item: 'axe' }, { item: 'bow' }, { item: 'quiver' }, { arrows: 6 }, { item: 'broadsword' }, { item: 'warhammer' }];
// a hermit's hut, and the huts and fields where a Comb, Rope, Lantern and Blanket lie
const hut = [{ item: 'comb9' }, { item: 'rope' }, { item: 'lantern' }, { item: 'blanket9' }];
// the gatehouse cell: everything put aside, to be given back at 54 or 177
const stripped = { take: [{ weapons: 'all', special: true, stash: 'cell' }, { special: 'all', stash: 'cell' }, { backpack: 'items', stash: 'cell' }] };
const undead = { fight: { undead: true } };
const firstTwo = { fight: { rounds: [{ upTo: 2, heroLoss: 0, note: 'Surprise' }] } };
// the pickpocket: the thing taken by place, kept for 155
const filched = (n) => ({ at: [n], from: 'special', min: 2, else: [{ at: [1], stash: 'pickpocket' }], stash: 'pickpocket' });

export const SECTIONS = {
  // any two of five prizes
  // the stake at 115 comes back with a right answer (5, or 50 for the second riddle); a second wrong one forfeits it (302)
  5: { back: ['khmar9'], loot: ['silverBowl9', 'goldDust9', 'altarCloth9', 'scrollHonour9', 'jadinAnklets9'].map((item) => ({ item, or: 'khmar', pick: 2 })) },
  7: { take: [{ item: 'rope' }] },
  11: { meal: 2, need: { 171: bow } },
  12: { take: [{ arrows: 1 }] },
  13: { loot: [{ item: 'dagger' }, { meal: 3 }, { item: 'rope' }, { item: 'flask9' }, { item: 'torch' }, { item: 'tinderbox' }, { item: 'bow' }, { arrows: 3 }, { item: 'blanket9' }, { item: 'spear' }] },
  15: { need: { 216: bow } },
  // the Fireseed is thrown
  16: { ep: -2, take: [{ item: 'fireseed' }] },
  22: { take: [{ arrows: 1 }] },
  24: { take: [{ weapons: 'one' }] },
  25: { take: [{ item: 'bluePills9', dose: true }] },
  46: firstTwo,
  47: { ep: -2 },
  48: { ep: -5 },
  54: { back: ['cell'] },
  58: { loot: [{ item: 'rope' }, { item: 'shortSword' }, { item: 'blanket9' }, { item: 'mace' }, { item: 'bow' }, { item: 'flask9' }, { arrows: 6 }, { item: 'quiver' }, { item: 'broadsword' }, { item: 'lantern' }, { item: 'dagger' }] },
  59: { ep: -2 },
  61: { when: [{ unless: { disc: 'psiScreen', rank: 5 }, ep: -3 }] },
  64: { ep: -5 },
  // the Fireseed, the Psychic Ring, or neither
  67: { need: { 16: fireseed, 214: { item: 'psychicRing' }, 277: { item: ['fireseed', 'psychicRing'], not: true } } },
  // a draw plus 2 is the loss, 0 counting as 10
  72: { rolls: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], ep: -((n || 10) + 2) })) },
  75: { ep: 3 },
  // his losses doubled; no fifth round: then 151
  82: { fight: { rounds: [{ heroLoss: 2, note: 'Venom' }], stop: { after: 4, to: '151' }, to: '247', noEvade: true } },
  87: { loot: [{ item: 'psychicRing' }] },
  88: { ep: 'full' },
  89: { ep: -4 },
  91: { take: [{ halve: 'backpack' }] },
  93: { ep: -2 },
  97: { fight: { undead: true } },
  99: { bowShot: { 70: [0, 6], 198: [7, 99] } },
  100: { need: { 321: { item: 'invitation9' } } },
  104: { fight: { undead: true, won: { within: 3, to: '228', else: '322' } } },
  106: { take: [{ item: 'fireseed' }] },
  111: { ep: -3 },
  113: { give: [{ item: 'receipt9' }] },
  115: { take: [{ pick: ['special', 'backpack'], n: { special: 1, backpack: 3 }, stash: 'khmar9', label: 'Choose your stake: one Special Item, or three Backpack Items' }] },
  116: firstTwo,
  119: { ep: -3 },
  120: { need: { 12: bow } },
  145: { need: { 34: { gold: 3, spend: true } } },
  146: { ep: 3 },
  148: { fight: { rounds: [{ upTo: 2, csMod: -2, note: 'Thrown from the saddle' }] } },
  150: { ep: 'full' },
  // what the pickpocket took comes back
  155: { back: ['pickpocket'], loot: [{ item: 'dagger' }, { meal: 2 }, { coin: 'lune', n: 28 }, { item: 'blanket9' }, { item: 'bluePills9' }] },
  162: { ep: -2 },
  // three Crowns or more to 28; less, to 235
  163: { need: { 28: { gold: 3, spend: true } } },
  166: { fight: { undead: true } },
  170: stripped,
  171: { take: [{ arrows: 1 }], need: { 106: fireseed } },
  172: { loot: [{ meal: 6 }, { item: 'dagger' }, { item: 'sword' }, { item: 'candlestick9' }, { item: 'lantern' }, { item: 'whistle9' }, { item: 'blanket9' }, { item: 'goblet9' }, { item: 'silkJacket9' }, { item: 'torch' }, { item: 'decanter9' }] },
  173: { need: { 7: { item: 'rope' } } },
  174: stripped,
  177: { loot: arms, back: [{ stash: 'cell', only: ['backpack', 'special'] }] },
  179: { need: { 99: bow } },
  // tangled in the net: no weapon and no Shield (its 2 taken back) for four rounds
  182: { ep: -3, fight: { rounds: [{ upTo: 4, unarmed: true, note: 'In the net' }, { upTo: 4, if: { item: 'shield' }, csMod: -2, note: 'No Shield' }] } },
  183: { take: [{ arrows: 1 }] },
  184: { take: [{ arrows: 2 }] },
  190: { loot: hut },
  191: { ep: -6, fight: { csMod: -4, undead: true } },
  193: { need: { 136: { item: 'invitation9' } } },
  201: { rolls: [{ range: [0, 4], take: [filched(1)] }, { range: [5, 9], take: [filched(2)] }] },
  203: { ep: -3 },
  206: { need: { 271: { item: 'meal', spend: true } } },
  207: { need: { 336: sommerswerd, 67: noSommerswerd } },
  209: { give: [{ item: 'invitation9' }] },
  210: { ep: -5, need: { 188: { item: 'psychicRing' }, 79: { item: 'daggerVashna' }, 20: { item: ['psychicRing', 'daggerVashna'], not: true } } },
  // the ring adds 8 to COMBAT SKILL for the whole fight
  214: { fight: { csMod: 8, csNote: 'The Psychic Ring' } },
  215: { rntMod: [{ plus: 4, mastery: 'dagger' }], ranges: { 287: [0, 6], 117: [7, 99] } },
  216: { bowShot: { 9: [0, 7], 310: [8, 99] }, rntMod: [{ disc: 'huntmastery', plus: 1 }] },
  227: { ep: -2 },
  229: { bowShot: { 330: [0, 5], 107: [6, 99] } },
  // the beggars cut the third and fourth from his Backpack
  235: { take: [{ at: [3, 4] }] },
  237: { need: { 184: bow } },
  239: { rntMod: [{ plus: 3, mastery: 'dagger' }, { plus: 1, circle: ['Circle of Fire'] }], ranges: { 20: [0, 4], 350: [5, 99] } },
  240: { need: { 136: { item: 'invitation9' } } },
  244: { fight: { won: { within: 3, to: '306', else: '148' } } },
  253: { need: { 19: { coin: 'lune', n: 10, spend: true } } },
  254: undead,
  258: { need: { 48: sommerswerd, 210: noSommerswerd } },
  259: { give: [{ item: 'sword' }, { item: 'dagger' }, { item: 'ironKey9' }] },
  // one thing of his choice dropped down the shaft
  261: { take: [{ pick: ['gold', 'special', 'backpack', 'weapons'], n: 1 }] },
  264: { ep: -3 },
  265: { loot: hut },
  266: { ep: -1 },
  273: { take: [{ at: [2], from: 'special', last: true, else: [{ at: [1], stash: 'pickpocket' }], stash: 'pickpocket' }] },
  283: { ep: -4 },
  285: firstTwo,
  289: { need: { 25: { item: 'bluePills9' }, 329: { item: 'bluePills9', not: true } } },
  291: { when: [{ unless: { disc: 'curing', rank: 5 }, ep: -8 }] },
  297: { ep: -1 },
  301: undead,
  307: { need: { 27: sommerswerd, 152: noSommerswerd } },
  // Sogh fights beside him once the first pair is down
  309: { ep: -8, fight: { rounds: [{ fromFoe: 1, csMod: 2, note: 'Sogh' }], noEvade: true } },
  312: stripped,
  313: { need: { 106: fireseed } },
  314: { need: { 183: bow } },
  315: { take: [{ gold: 'all' }, { coin: 'lune', n: 'all' }] },
  317: { ep: -4 },
  // a Crown to each of the two soldiers
  319: { ep: -1, take: [{ gold: 2 }] },
  321: { give: [{ item: 'receipt9' }] },
  322: undead,
  324: { need: { 295: sommerswerd, 152: noSommerswerd } },
  331: { loot: [{ meal: 2, cost: 1 }, { item: 'boza9', cost: 1 }] },
  332: { ep: -2 },
  338: { need: { 22: bow } },
  346: { take: [{ backpack: 'all' }] },
  349: { need: { 106: fireseed } },
};

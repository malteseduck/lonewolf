/* Book 9's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand (see items-01fftd.js for the fields, items-02fotw.js for the later ones, and
   docs/reference/items.md for how). Nothing new in the fields. Notes on this book:
     - Money in Anari is Lune (4 to the Gold Crown). The page counts Crowns only, so a price in Lune
       is a note to the player, except the room at the inn (3 Crowns), which gates its choice.
     - Three sections that strip the hero of everything (the gatehouse cell: 170, 174, 312) mark the
       things "x"; he gets them back at 54 or 177. The engine has nowhere to put them aside, so these
       are notes for the player to keep a list by hand.
     - Bow shots are 99, 216 and 229. A fixed shot with no draw (12, 22, 171, 183, 184) takes its Arrows.
     - Undead foes (the Zaaryx ghouls, the Psi-ghouls) are marked, so the Sommerswerd doubles against them.
     - The Dagger of Vashna comes from an earlier book; here it is only what a choice at 210 asks for.
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  psychicRing: { name: 'Psychic Ring', kind: 'special', glyph: 'ring', about: 'A ring with a yellow stone that amplifies your psychic power. Kept in a pocket.' },
  invitation9: { name: 'Invitation', kind: 'special', glyph: 'wax-seal', about: 'A written invitation to the house of Chiban in Tahou.' },
  receipt9: { name: 'Receipt', kind: 'special', glyph: 'ticket', about: 'For the horses impounded at the gate. It takes no room.' },
  ironKey9: { name: 'Iron Key', kind: 'special', glyph: 'key', about: 'Taken from a gatehouse guard.' },
  bluePills9: { name: 'Vial of Blue Pills', kind: 'backpack', glyph: 'pill', about: 'Sabito root tablets, two doses: they let you breathe under water.' },
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
  goblet9: { name: 'Silver Goblet', kind: 'backpack', glyph: 'wine-glass' },
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
const stripped = 'every Weapon, Backpack Item and Special Item is taken from you. Put an x by each on your own list (or drop them) and keep the list: they come back later (54, 177), or if you recover them.';
const undead = { fight: { undead: true } };
const firstTwo = 'ignore the ENDURANCE you lose in the first two rounds of this fight.';

export const SECTIONS = {
  // any two of five prizes
  5: { loot: ['silverBowl9', 'goldDust9', 'altarCloth9', 'scrollHonour9', 'jadinAnklets9'].map((item) => ({ item, or: 'khmar', pick: 2 })) },
  7: { take: [{ item: 'rope' }] },
  11: { meal: true, todo: 'the text calls for two Meals, not one: eat a second Meal now or lose 3 ENDURANCE for it (Huntmastery spares both).', need: { 171: bow } },
  12: { take: [{ arrows: 1 }] },
  13: { loot: [{ item: 'dagger' }, { meal: 3 }, { item: 'rope' }, { item: 'flask9' }, { item: 'torch' }, { item: 'tinderbox' }, { item: 'bow' }, { arrows: 3 }, { item: 'blanket9' }, { item: 'spear' }] },
  15: { need: { 216: bow } },
  // the Fireseed is thrown
  16: { ep: -2, take: [{ item: 'fireseed' }] },
  22: { take: [{ arrows: 1 }] },
  24: { take: [{ weapons: 'one' }] },
  25: { todo: 'one of the two doses of Sabito is swallowed: the vial stays in your pack until the second is used.' },
  46: { todo: firstTwo },
  47: { ep: -2 },
  48: { ep: -5 },
  54: { todo: 'your Weapons, Backpack Items and Special Items are given back: restore anything you put an x by.' },
  58: { loot: [{ item: 'rope' }, { item: 'shortSword' }, { item: 'blanket9' }, { item: 'mace' }, { item: 'bow' }, { item: 'flask9' }, { arrows: 6 }, { item: 'quiver' }, { item: 'broadsword' }, { item: 'lantern' }, { item: 'dagger' }] },
  59: { ep: -2 },
  61: { todo: 'unless you have Psi-screen and the rank of Tutelary or higher, lose 3 ENDURANCE.' },
  64: { ep: -5 },
  // the Fireseed, the Psychic Ring, or neither
  67: { need: { 16: fireseed, 214: { item: 'psychicRing' }, 277: { item: ['fireseed', 'psychicRing'], not: true } } },
  // a draw plus 2 is the loss, 0 counting as 10
  72: { rolls: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], ep: -((n || 10) + 2) })) },
  75: { ep: 3 },
  82: { todo: 'ENDURANCE lost to its fangs and claws is doubled. If a fifth round begins, stop fighting and go to 151 (use the Turn to section box); a win in four rounds or fewer goes on as usual.' },
  87: { loot: [{ item: 'psychicRing' }] },
  88: { ep: 'full' },
  89: { ep: -4 },
  91: { todo: 'halve your Backpack: count the items, drop the last one if the number is odd, split the rest into two lists and flip a coin for which list is lost. Then draw.' },
  93: { ep: -2 },
  97: { fight: { undead: true } },
  99: { bowShot: { 70: [0, 6], 198: [7, 99] } },
  100: { need: { 321: { item: 'invitation9' } } },
  104: { todo: 'if the fight lasts longer than three rounds, you go to 322; a win in three rounds or fewer goes on to 228.', fight: { undead: true } },
  106: { take: [{ item: 'fireseed' }] },
  111: { ep: -3 },
  113: { give: [{ item: 'receipt9' }] },
  115: { todo: 'stake one Special Item or three Backpack Items before you answer. If you fail, those are lost (204): remove them by hand.' },
  116: { todo: firstTwo },
  119: { ep: -3 },
  120: { need: { 12: bow } },
  145: { need: { 34: { gold: 3, spend: true } } },
  146: { ep: 3 },
  148: { todo: 'take 2 off your COMBAT SKILL for the first two rounds only.' },
  150: { ep: 'full' },
  155: { loot: [{ item: 'dagger' }, { meal: 2 }, { gold: 7 }, { item: 'blanket9' }, { item: 'bluePills9' }], todo: 'if the pickpocket took something from you, you get it back now: add it by hand.' },
  162: { ep: -2 },
  163: { todo: 'take off whatever you give by hand (12 Lune is 3 Gold Crowns). Three Crowns or more goes to 28, less to 235.' },
  166: { fight: { undead: true } },
  170: { todo: stripped },
  171: { take: [{ arrows: 1 }], need: { 106: fireseed } },
  172: { loot: [{ meal: 6 }, { item: 'dagger' }, { item: 'sword' }, { item: 'candlestick9' }, { item: 'lantern' }, { item: 'whistle9' }, { item: 'blanket9' }, { item: 'goblet9' }, { item: 'silkJacket9' }, { item: 'torch' }, { item: 'decanter9' }] },
  173: { need: { 7: { item: 'rope' } } },
  174: { todo: stripped },
  177: { loot: arms, todo: 'your Special and Backpack Items are given back, but not your Weapons: restore what you put an x by, and choose your Weapons from the shelves.' },
  179: { need: { 99: bow } },
  182: { ep: -3, todo: 'you may not use a Weapon, weapon-like Special Item or Shield for the first four rounds: fight unarmed (the engine counts the unarmed penalty only when you have no weapon).' },
  183: { take: [{ arrows: 1 }] },
  184: { take: [{ arrows: 2 }] },
  190: { loot: hut },
  191: { ep: -6, fight: { csMod: -4, undead: true } },
  193: { need: { 136: { item: 'invitation9' } } },
  201: { todo: 'a pickpocket has stolen an item: after the draw, the first Special Item on your list if the number is 0-4, the second if 5-9; with one or no Special Item, the first Backpack Item. Remove it by hand.' },
  203: { ep: -3 },
  204: { todo: 'you lose what you staked: remove it by hand.' },
  206: { need: { 271: { item: 'meal', spend: true } } },
  207: { need: { 336: sommerswerd, 67: noSommerswerd } },
  209: { give: [{ item: 'invitation9' }] },
  210: { ep: -5, need: { 188: { item: 'psychicRing' }, 79: { item: 'daggerVashna' }, 20: { item: ['psychicRing', 'daggerVashna'], not: true } } },
  // the ring adds 8 to COMBAT SKILL for the whole fight
  214: { fight: { csMod: 8, csNote: 'The Psychic Ring' } },
  215: { todo: 'with Weaponmastery with Dagger, add 4 to the number drawn. The dagger is thrown and leaves your hands.' },
  216: { bowShot: { 9: [0, 7], 310: [8, 99] }, todo: 'with Huntmastery, add 1 more to the total.' },
  227: { ep: -2 },
  229: { bowShot: { 330: [0, 5], 107: [6, 99] } },
  235: { todo: 'the beggars steal the third and fourth items on your list of Backpack Items: remove them by hand.' },
  237: { need: { 184: bow } },
  239: { todo: 'with Weaponmastery with Dagger, add 3 to the number drawn; with the Lore-circle of Fire, add 1 (the page adds only the Lore-circle). The dagger is thrown.' },
  240: { need: { 136: { item: 'invitation9' } } },
  244: { todo: 'if the fight lasts longer than three rounds, you go to 148; a win in three rounds or fewer goes on to 306.' },
  253: { todo: 'pay ten Lune (not Gold Crowns) by hand if you wish to question them.' },
  254: undead,
  258: { need: { 48: sommerswerd, 210: noSommerswerd } },
  259: { give: [{ item: 'sword' }, { item: 'dagger' }, { item: 'ironKey9' }] },
  261: { todo: 'drop one coin, Special Item, Backpack Item or Weapon of your choice, to hear how deep it is: remove it by hand.' },
  264: { ep: -3 },
  265: { loot: hut },
  266: { ep: -1 },
  273: { todo: 'a pickpocket has stolen the second Special Item on your list (the only one if you have one; with none, the first Backpack Item). Remove it by hand.' },
  283: { ep: -4 },
  285: { todo: firstTwo },
  289: { need: { 25: { item: 'bluePills9' }, 329: { item: 'bluePills9', not: true } } },
  291: { todo: 'unless you have Curing and the rank of Tutelary or higher, lose 8 ENDURANCE.' },
  297: { ep: -1 },
  301: undead,
  307: { need: { 27: sommerswerd, 152: noSommerswerd } },
  309: { ep: -8, todo: 'Sogh adds 2 to your COMBAT SKILL only after you have beaten the first pair of guards, for the later fights.' },
  312: { todo: stripped },
  313: { need: { 106: fireseed } },
  314: { need: { 183: bow } },
  315: { take: [{ gold: 'all' }] },
  317: { ep: -4 },
  319: { ep: -1, todo: 'pay one Gold Crown to each of the two soldiers by hand.' },
  321: { give: [{ item: 'receipt9' }] },
  322: undead,
  324: { need: { 295: sommerswerd, 152: noSommerswerd } },
  331: { loot: [{ meal: 2, cost: 1 }, { item: 'boza9', cost: 1 }] },
  332: { ep: -2 },
  338: { need: { 22: bow } },
  346: { take: [{ backpack: 'all' }] },
  349: { need: { 106: fireseed } },
};

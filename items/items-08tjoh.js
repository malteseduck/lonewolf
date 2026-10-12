/* Book 8's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand (see items-01fftd.js for the fields, items-02fotw.js and items-03tcok.js for the
   later ones, and docs/reference/items.md for how). Notes on this book:
     - Money: the book counts in Lune, 4 to the Gold Crown (rules-books.md). Prizes and prices are
       written here in Crowns at that rate (20 Lune = 5 Crowns); the Arrows at the bowyer's are two
       for a Crown.
     - Bows: a choice that says "if you have a Bow" is gated on the Bow or the Silver Bow of Duadon. The
       Silver Bow is only a Special Item here (it is carried on from Book 7): the engine does not shoot
       it, so a shot with it is worked out by hand. Arrows fired by the text outside a draw are
       taken from the Quiver on arrival; the draws that are shots are `bowShot`.
     - The Helghast can be wounded only by magic: the Sommerswerd, or Paido's blue-steel sword.
     - Lone Wolf's companion Paido has no sheet of his own; his sword is a Special Item you pick up.
     - Left to the player (todo): the Arrows shot at the dogs (164), and which remedy was used on
       Paido when he carries more than one kind.
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  pass: { name: 'Pass', kind: 'special', glyph: 'id-card', about: 'A safe-conduct from Lord Adamas, sealed with his ring. It opens gates in northern Talestria.' },
  silverBox: { name: 'Silver Box', kind: 'backpack', glyph: 'locked-chest', about: 'A small box inlaid with pearls, worth a good sum.' },
  silverSack: { name: 'Sack of Silver', kind: 'backpack', glyph: 'swap-bag', about: 'A sack of silver nuggets. Each takes one Backpack space.' },
  oxydine: { name: 'Tincture of Oxydine', kind: 'backpack', glyph: 'round-bottom-flask', heal: 2, about: 'Restores 2 ENDURANCE; one dose. It cures the korovax infection.' },
  larnuma: { name: 'Flask of Larnuma Liqueur', kind: 'backpack', glyph: 'round-bottom-flask', heal: 3, doses: 2, about: 'A nourishing liqueur: each of two draughts restores 3 ENDURANCE.' },
  lodestone: { name: 'Lodestone', kind: 'special', glyph: 'rock', about: 'A small, heavy, pear-shaped stone with a mirror-smooth blue surface. Some sections assume you carry it.' },
  mapTharro8: { name: 'Map of Tharro', kind: 'special', glyph: 'treasure-map', about: 'A plan of the town of Tharro.' },
  vial8: { name: 'Vial of Clear Liquid', kind: 'special', glyph: 'round-bottom-flask', about: 'A vial found in the monastery kitchen; its contents are a tree-sap poison.' },
  giakScroll: { name: 'Scroll', kind: 'special', glyph: 'scroll-quill', about: 'A tiny message in the Giak tongue, from the necromancer’s book. Kept in a pocket.' },
  greyRing: { name: 'Grey Crystal Ring', kind: 'special', glyph: 'diamond-ring', about: 'A ring of translucent grey crystal that gives off real magic.' },
  paidoSword: { name: 'Paido’s Sword', kind: 'special', glyph: 'pointy-sword', weapon: [], about: 'The blue-steel blade forged by the Elder Magi. It can wound a Helghast.' },
  wristGuards8: { name: 'Wrist and Finger Guards', kind: 'backpack', glyph: 'bracer', about: 'Archer’s guards for the bow hand.' },
  bowCaseWood8: { name: 'Bow Case (wood)', kind: 'backpack', glyph: 'quiver', about: 'A wooden case that keeps a bow dry.' },
  bowCaseLeather8: { name: 'Bow Case (leather)', kind: 'backpack', glyph: 'quiver', about: 'A leather case that keeps a bow dry.' },
  bowstring8: { name: 'Bowstring', kind: 'backpack', glyph: 'arrow-flights', about: 'A spare string for a bow.' },
};

export const MARKS = {
  burns8: { name: 'Burns', about: '2 COMBAT SKILL less for the rest of this adventure.', cs: -2, book: true },
  korovax: { name: 'Korovax', about: 'An infected wound: only a Tincture of Oxydine or an Oede Herb cures it.', until: ['oxydine', 'oedeHerb'], book: true },
};

// anyone with a Bow of either kind
const bow = { item: ['bow', 'silverBow'] };
const sommerswerd = { item: 'sommerswerd' };
const fireseed = { item: 'fireseed' };
// any Laumspur remedy he could give Paido
const remedies = ['potion', 'redLaumspur', 'rendalimPotion', 'laumspurHerb', 'rendalim', 'oedeHerb'];
const remedy = { item: remedies };
// the remedy used on Paido is gone, when he carries only one kind (with more, he says which)
const usedOnPaido = { when: remedies.map((id) => ({ if: { item: id }, unless: { item: remedies.filter((x) => x !== id) }, take: [{ item: id }] })), todo: 'if you carry more than one kind of remedy, remove the one you used on Paido.' };
const light = { any: [{ item: 'lantern' }, { items: ['torch', 'tinderbox'] }, { item: 'firesphere' }] };
const edged = ['sword', 'dagger', 'axe', 'spear', 'shortSword', 'broadsword'];
const paido = { rounds: [{ heroLoss: 0.5, note: 'Paido beside you' }] };
const drawing = { rounds: [{ upTo: 2, unarmed: true, note: 'No time to draw a weapon' }] };
const arrow = { arrows: 1 };
// the number drawn is the loss, 0 counting as 10
const loss = () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], ep: -(n || 10) }));
const sacks = [1, 2, 3, 4].map(() => ({ item: 'silverSack' }));

export const SECTIONS = {
  1: { give: [{ item: 'pass' }] },
  // the Count's prizes, at 4 Lune to the Crown
  7: { loot: [{ item: 'silverBox' }] },
  15: { ep: -2, take: [fireseed] },
  16: { give: [{ gold: 5 }] },
  18: { ep: -2 },
  // the fortune-teller's fee is 80 Lune
  244: { need: { 20: { gold: 20, spend: true } } },
  34: { take: [{ item: 'meal' }] },
  39: { ep: -8, take: [arrow] },
  42: { loot: [{ item: 'alether' }, { item: 'potion' }, { item: 'broadsword' }, { item: 'quarterstaff' }, { item: 'rendalim' }, { item: 'oxydine' }] },
  47: { give: [{ item: 'paidoSword' }], fight: { with: 'paidoSword', drain: 2 } },
  5: { need: { 324: bow } },
  36: { need: { 182: bow, 225: fireseed } },
  52: { fight: { rounds: [{ heroLoss: 2, note: 'Venom' }, { psi: 3, note: 'Weak against the mind' }] } },
  59: { give: [{ gold: 10 }] },
  60: { need: { 308: sommerswerd, 248: { item: 'sommerswerd', not: true } } },
  // the barge: 40 Lune a head
  89: { need: { 266: { gold: 10, spend: true } } },
  299: { need: { 266: { gold: 10, spend: true } } },
  6: { take: [arrow] },
  64: { loot: sacks },
  66: { ep: -2 },
  // 3 for good, and 2 more for this adventure
  71: { cs: -3, mark: 'burns8' },
  74: { fight: { mind: { cs: 15 }, noBoost: true } },
  77: { take: [arrow] },
  81: { ep: -12, take: [fireseed] },
  83: { ep: -5 },
  86: { rolls: loss() },
  87: { take: [{ item: 'silverBow' }] },
  8: { fight: { undead: true } },
  93: { need: { 161: bow } },
  95: { need: { 196: bow } },
  97: { ep: -1 },
  100: { ep: 'full' },
  101: { fight: { undead: true } },
  104: { ep: -2 },
  113: { need: { 30: sommerswerd, 183: { item: 'sommerswerd', not: true } } },
  115: { ep: -8 },
  123: { need: { 81: fireseed } },
  127: { need: { 209: bow } },
  132: { need: { 15: fireseed } },
  135: { need: { 68: { item: 'pass' }, 92: { item: 'pass', not: true } } },
  139: { give: [{ item: 'greyRing' }] },
  143: { need: { 18: { item: 'pass' } } },
  145: { take: [{ gold: 4 }] },
  146: { ep: -5 },
  // Primate: four Magnakai Disciplines
  155: { fight: { rounds: [{ heroLoss: 2, unless: { disc: 'curing', rank: 4 }, note: 'Venom' }] } },
  // using either remedy from the inventory cures it
  156: { ep: -6, mark: 'korovax' },
  31: { need: { 237: { any: [{ mark: 'korovax' }] }, 91: { any: [{ not: { mark: 'korovax' } }] } } },
  159: { ep: -5, fight: paido },
  161: { take: [arrow], need: { 208: bow } },
  164: { todo: 'the dogs were shot down: erase the Arrows used by hand (the text gives no number).' },
  // the bowyer's price list, in Crowns at 4 Lune to the Crown (Arrows are 2 Lune each)
  168: {
    loot: [{ arrows: 2, cost: 1 }, { item: 'bow', cost: 8 }, { item: 'quiver', cost: 3 }, { item: 'wristGuards8', cost: 2 }, { item: 'bowCaseWood8', cost: 5 }, { item: 'bowCaseLeather8', cost: 3 }, { item: 'bowstring8', cost: 1 }],
    need: { 304: { item: 'silverBow' } },
  },
  169: { fight: { with: 'none', mindforce: 2 } },
  // the potion that treats Paido is used up
  178: usedOnPaido,
  331: usedOnPaido,
  349: usedOnPaido,
  182: { take: [arrow] },
  183: { give: [{ item: 'paidoSword' }], fight: { with: 'paidoSword', drain: 2, rounds: [{ upTo: 1, foeLoss: 0, note: 'Drawing the sword' }] } },
  // the weapon he prodded with: his only one, or the one he names
  187: { take: [{ weapons: 'one' }] },
  189: { need: { 287: sommerswerd, 13: { item: 'sommerswerd', not: true } } },
  191: { give: [{ item: 'vial8' }] },
  194: { need: { 283: { any: [light] }, 118: { any: [{ not: light }] } } },
  195: { need: { 323: bow } },
  196: { take: [arrow] },
  199: { fight: paido },
  201: { loot: [{ item: 'sword' }, { item: 'bow' }, { arrows: 3 }, { meal: 2 }] },
  202: { loot: [{ item: 'lodestone' }] },
  204: { need: { 22: { item: 'mapTharro8' } } },
  206: { need: { 246: bow } },
  207: { take: [fireseed] },
  208: { take: [arrow] },
  209: { bowShot: { 162: [0, 6], 303: [7, 99] } },
  212: { need: { 17: bow } },
  // by the weapon he prods with: any edged one he holds, or any blunt one
  214: { need: { 235: { any: [{ weapon: edged }] }, 187: { any: [{ weapon: ['mace', 'warhammer', 'quarterstaff', 'bow'] }] } } },
  215: { take: [arrow] },
  225: { take: [fireseed] },
  226: { ep: -3 },
  228: { loot: [{ item: 'larnuma' }] },
  230: { ep: -8 },
  242: { loot: [{ item: 'greyRing', for: ['lodestone', 'jewelledMace', 'silverHelm'] }] },
  246: { bowShot: { 184: [0, 4], 4: [5, 7], 213: [8, 99] } },
  248: { need: { 39: bow } },
  251: { fight: { rounds: [{ upTo: 1, heroLoss: 0, note: 'Swiftness of your attack' }] } },
  252: { fight: drawing },
  257: { fight: { stop: { after: 2, to: '163' }, won: { within: 2, to: '12', else: '163' } } },
  // the weapon he struck with: his only one, or the one he names
  258: { ep: -8, take: [{ weapons: 'one' }] },
  260: { need: { 34: { item: 'meal' } } },
  261: { need: { 349: remedy } },
  268: { need: { 178: remedy } },
  317: { need: { 331: remedy } },
  // the fourth Special Item, the last if fewer; with none, the first in the Backpack
  269: { take: [{ at: [4], from: 'special', last: true, else: [{ at: [1] }] }] },
  272: { need: { 28: bow, 207: fireseed } },
  275: { need: { 8: sommerswerd, 101: { item: 'sommerswerd', not: true } } },
  28: { bowShot: { 38: [-99, 4], 125: [5, 99] } },
  274: { ep: 3 },
  287: { fight: { undead: true } },
  290: { need: { 97: { item: 'dagger' }, 132: { item: 'dagger', not: true } } },
  294: { take: [{ item: 'meal' }] },
  298: { fight: { rounds: [{ upTo: 2, csMod: -3, unless: { disc: 'huntmastery' }, note: 'Surprise' }] } },
  305: { need: { 164: bow } },
  306: { loot: [{ item: 'mapTharro8' }, { meal: 1 }, { item: 'axe' }] },
  308: { fight: { with: 'sommerswerd', undead: true, drain: 2 } },
  30: { fight: { with: 'sommerswerd', undead: true, drain: 2 } },
  310: { bowShot: { 184: [0, 8], 213: [9, 99] } },
  312: { loot: [{ item: 'giakScroll' }] },
  316: { need: { 139: { gold: 30, spend: true } } },
  321: { loot: sacks },
  323: { take: [arrow], fight: drawing },
  325: { ep: -3 },
  333: { fight: { mindforce: 2 } },
  337: { ep: -3 },
  341: { need: { 215: bow, 33: fireseed } },
  33: { take: [fireseed] },
  348: { need: { 29: { item: 'lodestone' }, 170: { item: 'lodestone', not: true } } },
};

/* Book 16's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand from the script's draft (see items-01fftd.js for the fields, docs/reference/book-format.md
   for the later ones, and docs/reference/items.md for how). Notes on this book:
     - The Scroll (1), the Platinum Amulet (45) and the Black Amulet (84) take no place among the Special
       Items, as the text says (`free`); the Runic Disc and the Black Token do.
     - The Deathstaff is taken at 57, 92, 157, 225 and 318, the five ways into 270. At 57, 92 and 157 it
       destroys Helshezag, if he has it, for 5 ENDURANCE (footnotes 7, 9, 12, after 94). It is no weapon
       he was trained in (footnote 17): it fights with no bonus of its own, +10 at 345 only. The footnote's
       other reading (Grand Weaponmastery with Quarterstaff or Spear) is not applied. 350 takes it.
     - The Vortexi fights give +2 for every rank above Kai Grand Guardian: one round entry per rank.
     - The page fights with the weapon that gives most, so at 345 the Deathstaff is used when it is his
       best; both ways on stay open, the fight's log naming the weapon used.
     - Bow shots with Grand Weaponmastery's +5 (120, 198, 301) are spent by the page's own shot; Arrows
       loosed with no number drawn (109, 183, 227, 254, 304) are taken here, and 330's volley by its number.
     - No fight here is a surprise attack or ambush: 39's penalty is spared by Grand Huntmastery as the text
       says (`unless`), the Corvayl's first round is the horse rearing.
     - Footnote 8 (the Sommerswerd may add 4 on the Plane of Darkness) is a suggestion, not applied.
     - Gates on earlier adventures (12, 105, 250, 279) are the player's to answer: no table entry.
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  scroll16: { name: 'Scroll', kind: 'special', free: true, glyph: 'scroll-unfurled', about: 'President Kadharian’s written invitation to his senate: a cover for the journey to Helgor.' },
  platinumAmulet16: { name: 'Platinum Amulet', kind: 'special', free: true, glyph: 'medal', about: 'Gwynian the Sage’s corded platinum disc, worn about the neck: a shield against the heat of the Plane of Darkness.' },
  blackAmulet: { name: 'Black Amulet', kind: 'special', free: true, glyph: 'rune-stone', about: 'An oblong amulet of black, metal-flecked stone found in the ruins of Vorn, engraved with Vashna rising from the Maakengorge.' },
  runicDisc: { name: 'Runic Disc', kind: 'special', glyph: 'token', about: 'A palm-sized coin of black metal engraved with runes: the mark of the Guild of Rhem, the assassins’ brotherhood.' },
  blackToken: { name: 'Black Token', kind: 'special', glyph: 'hexagonal-nut', about: 'A hexagonal token of the same black metal as the amulet, taken from an acolyte’s grave. Carried in a pocket.' },
  deathstaff: { name: 'Deathstaff', kind: 'special', weapon: [], glyph: 'wizard-staff', about: 'A six-foot staff of twisted black metal forged by Naar to raise Vashna. It drains whoever wields it.' },
  spyglass16: { name: 'Spyglass', kind: 'backpack', glyph: 'spyglass' },
  pipe16: { name: 'Pipe', kind: 'backpack', glyph: 'straight-pipe' },
  comb16: { name: 'Comb', kind: 'backpack', glyph: 'comb' },
  blanket16: { name: 'Blanket', kind: 'backpack', glyph: 'blanket' },
  wine16: { name: 'Bottle of Wine', kind: 'backpack', glyph: 'wine-bottle' },
  rubyRing16: { name: 'Ruby Ring', kind: 'special', glyph: 'diamond-ring' },
  smallSack16: { name: 'Small Sack', kind: 'backpack', glyph: 'swap-bag' },
  coneyMitts16: { name: 'Coney-skin Mitts', kind: 'backpack', glyph: 'winter-gloves' },
  wolfskinCloak16: { name: 'Wolfskin Cloak', kind: 'backpack', glyph: 'cape' },
  wildcatPelt16: { name: 'Wildcat Pelt', kind: 'backpack', glyph: 'animal-hide' },
  bearskinCloak16: { name: 'Bearskin Cloak', kind: 'backpack', glyph: 'fur-shirt' },
  whiteWolfPelt16: { name: 'White Wolf Pelt', kind: 'backpack', glyph: 'animal-hide' },
  kalkothHide16: { name: 'Kalkoth Hide', kind: 'backpack', glyph: 'animal-hide' },
  corvaylCloak16: { name: 'Black Corvayl Cloak', kind: 'backpack', glyph: 'cape' },
};

const sommerswerd = { item: 'sommerswerd' }, noSommerswerd = { item: 'sommerswerd', not: true };
const bowArrows = { any: [{ weapon: ['bow'], arrows: 1 }] };
const range = (a, b) => [...Array(b - a + 1).keys()].map((i) => a + i);
// a number drawn with 0 counting as 10, for each n drawn: what it does
const byDraw = (f) => range(0, 9).map((n) => ({ range: [n, n], ...f(n || 10) }));
// gold to pay: so many Crowns, or, short of them, all he has and one thing from the Backpack
const payOr = (n) => ({ at: range(1, n), from: 'gold', min: n, else: [{ gold: 'all' }, { pick: ['backpack'], n: 1 }] });
// every weapon held in the hand: the Elder at 82 takes these, not a Bow or a weapon-like Special Item
const hand = ['dagger', 'spear', 'mace', 'shortSword', 'warhammer', 'sword', 'axe', 'quarterstaff', 'broadsword', 'dvalSword', 'boninWarhammer', 'curvedSword11'];
// the Deathstaff taken from the dais: Helshezag, if he has it, is destroyed by it (footnotes 7, 9, 12)
const deathstaff = { give: [{ item: 'deathstaff' }], when: [{ if: { item: 'helshezag' }, take: [{ item: 'helshezag' }], ep: -5 }] };
const RANKS = ['Sun Knight', 'Sun Lord', 'Sun Thane', 'Grand Thane', 'Grand Crown', 'Sun Prince', 'Kai Supreme Master'];
// the Vortexi: +2 for every rank above Kai Grand Guardian (5 Disciplines), in place of the importer's flat +2
const vortexi = { csMod: 0, rounds: RANKS.map((note, i) => ({ if: { rank: 6 + i }, csMod: 2, note })) };
const sunsword = { when: [{ if: sommerswerd, ep: 5 }] };
const rearing = (n) => ({ rounds: [{ upTo: 1, csMod: -n, note: 'Your horse rears' }] });
const cheghath = { rounds: [{ psi: 0.5, note: 'Strong psychic defences' }] };
const furs = { coneyMitts16: 5, wolfskinCloak16: 12, wildcatPelt16: 12, bearskinCloak16: 16, whiteWolfPelt16: 18, kalkothHide16: 20, corvaylCloak16: 35 };
// the acolytes' blessing: the Disciplines' 2s add up; Runic Disc +1, Sommerswerd -3, +1 a rank above Kai Grand Guardian
const blessing = (sun) => ({ rntMod: [{ disc: 'kaiAlchemy', plus: 2 }, { disc: 'kaiScreen', plus: 2 }, { disc: 'assimilance', plus: 2 },
  { item: 'runicDisc', plus: 1 }, { ...sun, plus: -3 }, { plus: 1, each: 'grandmaster', over: 5 }], ranges: { 322: [-99, 4], 192: [5, 99] } });

export const SECTIONS = {
  1: { give: [{ item: 'scroll16' }] },
  4: { ep: -2, take: [{ pick: ['backpack'], n: 3 }] },
  5: { need: { 330: bowArrows } },
  18: { take: [{ at: [2], last: true }] },
  19: { ep: -3 },
  // the second ale: a Crown, or with none an item of like worth or nothing (footnote 6)
  21: { take: [{ gold: 1 }], need: { 108: { any: [{ packItems: 1 }, { meals: 1 }] } }, todo: 'With no Gold Crown for the ale, give her an item worth as much, or let the cost go (footnote 6)' },
  24: { loot: [{ item: 'broadsword' }, { item: 'axe' }, { item: 'shortSword' }, { item: 'quiver' }, { arrows: 4 }, { item: 'bow' },
    { item: 'dagger' }, { item: 'dagger' }, { item: 'dagger' }, { item: 'quarterstaff' }] },
  26: { ep: -5 },
  28: { ep: -8 },
  29: { need: { 135: sommerswerd, 213: { item: 'deathstaff' }, 109: bowArrows } },
  33: { give: [{ gold: 6 }], loot: [{ meal: 1 }] },
  34: { need: { 94: { item: 'helshezag' }, 225: { item: 'helshezag', not: true } } },
  36: { ...sunsword, fight: vortexi },
  // the number drawn (0 as 10) is lost three times over: ENDURANCE, Gold Crowns and Backpack things
  38: { rolls: byDraw((n) => ({ ep: -n, take: [{ gold: n }, { pick: ['backpack'], n }] })) },
  39: { fight: { rounds: [{ upTo: 3, csMod: -5, unless: { disc: 'grandHuntmastery' }, note: 'Wounded and rushed' }] } },
  44: { ep: -4 },
  45: { give: [{ item: 'platinumAmulet16' }] },
  46: { ep: 'full' },
  47: { need: { 122: { any: [{ meals: 1 }] } } },
  48: { fight: rearing(10) },
  50: { need: { 273: { item: 'daggerVashna' }, 179: { item: 'daggerVashna', not: true } } },
  56: { need: { 120: bowArrows } },
  57: deathstaff,
  58: { ep: 5 },
  // the drunkard's ten Crowns are paid on 287's choice; this one is the stable boy's
  62: { take: [{ gold: 1 }] },
  // Bayan's fee: the number drawn (0 as 10), or all he has and a Backpack thing
  64: { rolls: byDraw((n) => ({ take: [payOr(n)] })) },
  65: { need: { 263: { item: 'deathstaff' } } },
  68: { ep: -2 },
  70: { give: [{ item: 'runicDisc' }] },
  71: { ep: -12 },
  73: { ep: -5 },
  // hand weapons go overboard; a Bow and weapon-like Special Items stay
  82: { take: [{ item: hand }, { item: hand }] },
  84: { give: [{ item: 'blackAmulet' }] },
  88: { need: { 227: bowArrows } },
  89: { ep: 3 },
  91: { ep: -3 },
  92: { ...deathstaff, take: [{ pick: ['backpack'], n: 2 }] },
  93: { todo: 'Footnote 10: if you carried a character who chose Pathsmanship and reached Scion-kai in the Magnakai books, you may turn to 243' },
  94: { take: [{ item: 'helshezag' }], ep: -5 },
  97: { fight: cheghath },
  101: { ep: -8 },
  103: { ...sunsword, fight: vortexi },
  104: { ep: -2 },
  106: { need: { 254: bowArrows } },
  // Smudd takes the first thing on the Backpack list
  108: { take: [{ at: [1] }] },
  109: { ep: -2, take: [{ item: ['bow', 'silverBow'], choose: true, label: 'Choose the Bow that burned' }, { arrows: 1 }] },
  117: { ep: 3, loot: [{ meal: 2 }] },
  118: { ep: 5, fight: vortexi },
  120: { bowShot: { 139: [0, 6], 328: [7, 99] } },
  121: { rolls: [{ range: [0, 9], ep: 'drawn' }], need: { 265: { ep: [0, 20] }, 114: { ep: [21, 999] } } },
  122: { take: [{ meals: 1 }] },
  125: { ep: -3 },
  // the weapon he raised against the lightning ball (any but a Bow or Quarterstaff, by 236's choice)
  131: { rolls: [{ range: [0, 9], ep: 'drawn' }], take: [{ weapons: 'one' }] },
  132: { fight: cheghath },
  136: { need: { 304: bowArrows } },
  138: { ep: -3 },
  142: { ...sunsword, fight: vortexi },
  143: blessing(sommerswerd),
  144: { need: { 118: sommerswerd, 284: noSommerswerd } },
  // the Sommerswerd betrays him here only without the Korlinium Scabbard
  150: blessing({ item: 'sommerswerd', not: { item: 'korliniumScabbard' } }),
  151: { ep: -2 },
  155: { ep: 3, loot: [{ meal: 2 }] },
  157: deathstaff,
  159: { ep: -3 },
  163: { need: { 176: sommerswerd, 149: noSommerswerd } },
  165: { need: { 330: bowArrows } },
  167: { need: { 304: bowArrows } },
  // five Crowns for Smudd, or all he has and a Backpack thing
  169: { take: [payOr(5)] },
  170: { ep: -2 },
  172: { ep: -2 },
  176: { ep: -2 },
  174: { when: [{ unless: { item: Object.keys(furs) }, take: [{ gold: 5 }] }] },
  178: { need: { 234: { item: 'blackAmulet' }, 45: { item: 'blackAmulet', not: true } } },
  179: { ep: -3, need: { 58: sommerswerd, 97: noSommerswerd } },
  183: { take: [{ arrows: 1 }] },
  188: { loot: [{ arrows: 6 }, { item: 'comb16' }, { item: 'broadsword' }, { item: 'dagger' }, { item: 'pipe16' }, { item: 'sword' },
    { item: 'spyglass16' }, { meal: 3 }, { item: 'blanket16' }, { gold: 20 }] },
  198: { bowShot: { 48: [0, 4], 272: [5, 99] } },
  199: { give: [{ item: 'blackToken' }] },
  200: { need: { 183: bowArrows } },
  203: { ep: -3 },
  204: { need: { 20: { item: 'daggerVashna' }, 81: { item: 'helshezag' }, 343: { item: ['daggerVashna', 'helshezag'], not: true } } },
  206: { ep: -3, fight: vortexi },
  207: { ep: 3 },
  210: { take: [{ at: [2], last: true }] },
  213: { ep: -7 },
  218: { need: { 349: { item: 'blackToken' }, 121: { item: 'blackToken', not: true } } },
  219: { need: { 255: { item: 'runicDisc' }, 196: { item: 'runicDisc', not: true } } },
  224: { need: { 166: sommerswerd, 204: noSommerswerd } },
  225: deathstaff,
  // the furrier: a fur bought, or five Crowns for the way (paid at 174, which only 226 leads to), opens 174
  226: { loot: Object.entries(furs).map(([item, cost]) => ({ item, cost })), need: { 174: { any: [{ item: Object.keys(furs), label: 'a fur bought' }, { gold: 5 }] } } },
  227: { take: [{ arrows: 1 }] },
  229: { ...sunsword, fight: vortexi },
  236: { need: { 308: { any: [{ weapon: ['bow', 'quarterstaff'] }] } } },
  241: { need: { 304: bowArrows } },
  243: { need: { 55: { item: 'runicDisc' } } },
  247: { loot: [{ gold: 80 }, { meal: 3 }, { item: 'quiver' }, { arrows: 3 }, { item: 'wine16' }, { item: 'spyglass16' }, { item: 'rubyRing16' }] },
  253: { need: { 330: bowArrows } },
  254: { take: [{ arrows: 1 }] },
  257: { fight: rearing(10) },
  259: { need: { 301: bowArrows } },
  260: { need: { 321: sommerswerd, 236: noSommerswerd } },
  264: { ep: -6 },
  266: { ep: -4 },
  270: { ep: -5 },
  271: { ep: -10 },
  272: { take: [{ at: [2], last: true }] },
  273: { take: [{ item: 'daggerVashna' }] },
  284: { fight: vortexi },
  287: { need: { 62: { gold: 10, spend: true } } },
  289: { loot: [{ meal: 3 }, { item: 'quiver' }, { arrows: 4 }, { item: 'bow' }, { item: 'dagger' }, { item: 'dagger' }, { item: 'dagger' },
    { item: 'tinderbox' }, { item: 'rope' }, { item: 'wine16' }] },
  // the woman leaves him 2, 3 or 5 Crowns by the number drawn (he has at least 20 here: no way to 290 spends any)
  290: { rolls: [[0, 3, 2], [4, 7, 3], [8, 9, 5]].map(([lo, hi, keep]) => ({ range: [lo, hi], take: [{ at: range(keep + 1, 50), from: 'gold' }] })) },
  293: { ep: 3, loot: [{ meal: 2 }] },
  295: { need: { 166: sommerswerd, 204: noSommerswerd } },
  299: { ep: -9 },
  301: { bowShot: { 27: [0, 6], 251: [7, 99] } },
  304: { take: [{ arrows: 1 }] },
  305: { ep: -2, fight: vortexi },
  306: { fight: rearing(5) },
  // the weapon he raised: his Bow or Quarterstaff (236's choice)
  308: { take: [{ item: ['bow', 'silverBow', 'quarterstaff'], choose: true, label: 'Choose the weapon that was destroyed' }] },
  310: { ep: -2 },
  316: { take: [{ item: 'blackToken' }] },
  318: deathstaff,
  321: { rolls: [{ range: [0, 9], ep: 'drawn' }] },
  329: { loot: [{ item: 'bow' }, { item: 'quiver' }, { arrows: 4 }, { item: 'dagger' }, { item: 'shortSword' }, { gold: 13 }, { item: 'rope' }, { item: 'smallSack16' }] },
  // the number drawn (0 as 10) is how many Arrows he loosed; with none left, 268
  330: { rolls: byDraw((n) => ({ take: [{ arrows: n }] })),
    need: { 268: { any: [{ not: { arrows: 1 }, label: 'no Arrows left' }] }, 167: { any: [{ arrows: 1 }] } } },
  // the stable boy's Crown; with none, a Backpack thing of his choice, with neither nothing (footnote 16)
  332: { take: [{ at: [1], from: 'gold', min: 1, else: [{ pick: ['backpack'], n: 1 }] }] },
  335: { ep: 'full' },
  336: { fight: rearing(10) },
  338: { need: { 198: bowArrows } },
  345: { fight: { weaponCs: { deathstaff: 10 } } },
  348: { need: { 304: bowArrows } },
  350: { take: [{ item: 'deathstaff' }] },
};

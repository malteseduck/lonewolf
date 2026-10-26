/* Book 18's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand from the script's draft (see items-01fftd.js for the fields, docs/reference/book-format.md
   for the later ones, and docs/reference/items.md for how). Notes on this book:
     - Its rules say a found item named with capitals goes in the Backpack unless the text calls it a Special
       Item: so the Scroll, the Military Pass and the Map of Palmyrion are Backpack Items here.
     - The Lune (4 to the Crown) is found in saddle-bags and on the brigands; the blacksmith at 75 takes 20 Lune
       as well as 5 Gold Crowns.
     - Captured at 236, 290 or 335, he loses his Weapons, his Belt Pouch (Crowns and Lune) and the Backpack
       itself, never the Special Items; the horse's saddle-bags at 202 replace some of it.
     - At 98 the Sommerswerd adds 4 on the Plane of Darkness, as the section says. The footnotes' bonuses (the
       Helmet's and Breastplate's ENDURANCE at the armourer's, 339; the Sommerswerd's 4 at 344) are not applied:
       rules-books.md.
     - Bow shots: 297 and 334 (the Arrow loosed there). Arrows loosed with no number drawn (178, 192, 243,
       336, 341) are taken there. No fight's COMBAT SKILL loss is a surprise attack's: no ambushes.
     - Gates on earlier adventures (56, 90, 112, 121, 175, 194, 240, 280, 308) are the player's to answer.
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  sunCrystal: { name: 'Sun-crystal', kind: 'special', glyph: 'sun-radiations', about: 'Gwynian’s golden crystal, warm to the touch and harmless in this world: thrown into the Shadow Gate, it destroys it.' },
  silverSeal: { name: 'Silver Seal', kind: 'special', glyph: 'wax-seal', about: 'A small seal with the star of Eldenora on it, left in a bandits’ campfire: proof of who you are to Eldenoran eyes.' },
  talismanOfIshir: { name: 'Talisman of Ishir', kind: 'backpack', glyph: 'ankh', about: 'A gift of the Vaderish Brethren, to keep hostile creatures away.' },
  aquasFlask: { name: 'Flask of Aquas', kind: 'backpack', glyph: 'brandy-bottle', about: 'The Vaderish monks’ golden liqueur, for the road. The book gives it no effect.' },
  mathosPotion: { name: 'Matho’s Potion', kind: 'backpack', glyph: 'potion-ball', about: 'The old cleric’s flask: it protects you from the plague of the Stornlands.' },
  blanket18: { name: 'Blanket', kind: 'backpack', glyph: 'blanket' },
  spyglass18: { name: 'Spyglass', kind: 'backpack', glyph: 'spyglass' },
  boarWhip18: { name: 'Boar Whip', kind: 'backpack', glyph: 'whip' },
  hammer18: { name: 'Hammer', kind: 'backpack', glyph: 'claw-hammer' },
  mirror18: { name: 'Mirror', kind: 'backpack', glyph: 'mirror-mirror' },
  mapPalmyrion: { name: 'Map of Palmyrion', kind: 'backpack', glyph: 'treasure-map' },
  scroll18: { name: 'Scroll', kind: 'backpack', glyph: 'scroll-unfurled' },
  tobacco18: { name: 'Pouch of Tobacco', kind: 'backpack', glyph: 'straight-pipe' },
  militaryPass18: { name: 'Military Pass', kind: 'backpack', glyph: 'id-card' },
  helmet18: { name: 'Helmet', kind: 'special', glyph: 'visored-helm', about: 'Bought in Rhem. A footnote suggests +2 ENDURANCE, outside the official rules: not counted.' },
  breastplate18: { name: 'Breastplate', kind: 'special', glyph: 'breastplate', about: 'Bought in Rhem. A footnote suggests +4 ENDURANCE, outside the official rules: not counted.' },
};

const bowArrows = { any: [{ weapon: ['bow'], arrows: 1 }] };
const sommerswerd = { item: 'sommerswerd' }, noSommerswerd = { item: 'sommerswerd', not: true };
const seal = { item: 'silverSeal' }, noSeal = { item: 'silverSeal', not: true };
const amulet = { item: 'platinumAmulet16' }, talisman = { item: 'talismanOfIshir' };
const plague = ['oedeHerb', 'oedeJar13', 'mathosPotion'];
const sabito = ['sabito', 'bluePills9', 'sabitoJar13'];
// the Plane of Darkness: its heat costs 3 unless the amulet, the talisman or Grand Nexus shields him
const shielded = { any: [amulet, talisman, { disc: 'grandNexus' }] };
const heat = { when: [{ unless: shielded, ep: -3 }] };
const lune = (n) => ({ coin: 'lune', n });
// the trooper's saddle-bags near Fabri (14, 85, 110, 174, 260)
const saddle = [{ item: 'sword' }, { item: 'rope' }, { item: 'tinderbox' }, { item: 'blanket18' }, { item: 'bow' }, { item: 'quiver' },
  { arrows: 5 }, lune(12), { item: 'spyglass18' }];
// captured outside Duadon: Weapons, Belt Pouch and Backpack, not the Special Items
const seized = [{ weapons: 'all' }, { gold: 'all' }, { coin: 'lune', n: 'all' }, { backpack: 'all' }];
// a number drawn that is even costs `even`, odd `odd`
const evenOdd = (even, odd) => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], ep: n % 2 ? -odd : -even }));

export const SECTIONS = {
  3: { need: { 283: seal, 317: noSeal } },
  13: { ep: -1 },
  14: { ep: -1, loot: saddle },
  19: { ep: 3 },
  23: { need: { 113: { item: plague }, 128: { item: plague, not: true } } },
  27: { ep: -2 },
  // 5 Crowns, or one Backpack Item of his choice when he has fewer (the short case first, so paying cannot trigger it)
  28: { when: [{ unless: { gold: 5 }, take: [{ pick: ['backpack'], n: 1 }] }, { if: { gold: 5 }, take: [{ gold: 5 }] }] },
  29: { ep: -3 },
  30: { need: { 232: { ep: [-99, 10] }, 177: { ep: [11, 999] } } },
  // won within three rounds: 85; longer: 160
  33: { fight: { won: { within: 3, to: '85', else: '160' } } },
  34: { ep: -4, ...heat },
  39: { fight: { csMod: 3, csIf: { item: 'jewelledMace' }, csNote: 'The Jewelled Mace' } },
  42: { take: [{ gold: 3 }] },
  46: heat,
  51: { ep: 'full' },
  52: { ep: -4 },
  59: { ep: 3 },
  64: { take: [{ item: 'sunCrystal' }], need: { 208: amulet, 18: talisman, 131: { any: [{ not: { any: [amulet, talisman, { disc: 'grandNexus' }] }, label: 'none of these' }] } } },
  75: { need: { 234: { gold: 5, spend: true } },
    add: [{ text: 'Pay the blacksmith 20 Lune instead: turn to 234.', to: '234', need: { coin: 'lune', n: 20, spend: true } }] },
  76: heat,
  80: { need: { 196: bowArrows } },
  85: { loot: saddle },
  87: { ep: -5 },
  88: { ep: -3 },
  89: { give: [{ item: 'dagger' }] },
  // won 30 at cards, 25 spent on a horse and lodging: 5 kept
  92: { give: [{ gold: 5 }] },
  95: { ep: -4 },
  97: { take: [{ gold: 2 }] },
  // the Sommerswerd's light: all Endurance back, and +4 on the Plane of Darkness (the section's own)
  98: { ep: 'full', fight: { with: 'sommerswerd', csMod: 4, csNote: 'The Sommerswerd on the Plane of Darkness' } },
  100: { give: [{ item: 'sunCrystal' }] },
  103: { ep: 3 },
  106: { ep: -4 },
  109: { loot: [{ item: 'sword' }, { item: 'sword' }, { item: 'axe' }, { item: 'axe' }, { item: 'broadsword' }, { item: 'spear' }, { item: 'spear' },
    lune(260), { pack: 1 }, { item: 'dagger' }, { item: 'dagger' }, ...Array.from({ length: 12 }, () => ({ meal: 1 })), { item: 'rope' },
    { item: 'boarWhip18' }, { item: 'hammer18' }, { item: 'lantern' }, { item: 'blanket18' }, { item: 'spyglass18' }, { item: 'silverSeal' }] },
  110: { ep: -1, loot: saddle },
  113: { ep: -6, take: [{ item: plague, choose: true, label: 'Choose the remedy you swallowed' }] },
  114: { need: { 192: bowArrows } },
  118: { loot: [{ item: 'silverSeal' }] },
  120: { need: { 101: sommerswerd, 72: noSommerswerd } },
  128: { rolls: evenOdd(10, 6) },
  131: { ep: -3 },
  137: { ep: -16 },
  138: { need: { 103: { gold: 2, spend: true } } },
  143: { rntMod: [{ item: ['rope', 'oiledRope17'], plus: 2 }, { disc: 'grandHuntmastery', plus: 1 }], ranges: { 223: [-99, 3], 329: [4, 99] } },
  146: { loot: [{ gold: 10 }] },
  151: { ep: -6 },
  // the monks' gifts, and a donation of his own if he likes
  154: { ep: -3, loot: [{ item: 'aquasFlask' }, { item: 'talismanOfIshir' }], stake: { spend: true } },
  156: { need: { 341: bowArrows } },
  158: { need: { 178: bowArrows } },
  163: { rntMod: [{ item: sabito, plus: 3 }, { disc: 'kaiAlchemy', plus: 3 }, { disc: 'grandNexus', plus: 1 }], ranges: { 65: [-99, 4], 116: [5, 99] } },
  164: { ep: -3 },
  172: { ep: -3 },
  174: { loot: saddle },
  178: { take: [{ arrows: 1 }] },
  183: { ep: -2 },
  188: { loot: [lune(40), { item: 'mathosPotion' }] },
  192: { take: [{ arrows: 1 }] },
  193: { need: { 283: seal, 317: noSeal } },
  199: { loot: [{ gold: 10 }] },
  // the saddle-bags outside Duadon replace what was seized (the Quiver his to take: a Special Item, it was not seized)
  202: { give: [{ pack: 1 }, { item: 'rope' }, { meal: 2 }, { item: 'sword' }, { gold: 3 }, { item: 'bow' }, { arrows: 3 }], loot: [{ item: 'quiver' }] },
  210: { ep: 'full' },
  213: heat,
  219: { ep: -3 },
  225: { ep: -1 },
  233: { ep: -3 },
  236: { ep: -3, take: seized },
  242: heat,
  243: { take: [{ arrows: 1 }] },
  253: { ep: -5, fight: { csMod: 3, csIf: { item: 'jewelledMace' }, csNote: 'The Jewelled Mace' } },
  254: { ep: -1 },
  259: { take: [{ at: [3] }] },
  260: { loot: saddle },
  261: { ep: -5 },
  269: { ep: -3 },
  270: { loot: [{ meal: 2 }, { item: 'mace' }, { item: 'rope' }, { item: 'tinderbox' }, lune(8), { item: 'mirror18' }] },
  272: { ep: -6 },
  273: { ep: -3 },
  277: { loot: [{ item: 'mapPalmyrion' }, { pack: 1 }, { item: 'dagger' }, { item: 'scroll18' }, { gold: 12 }, { item: 'potion' }, { item: 'potion' },
    { item: 'tobacco18' }, { item: 'militaryPass18' }] },
  278: { ep: -4 },
  285: { need: { 243: bowArrows } },
  287: { need: { 106: amulet, 345: { item: 'platinumAmulet16', not: true } } },
  290: { ep: -3, take: seized },
  293: { need: { 336: bowArrows } },
  296: { rolls: [{ range: [0, 9], ep: 'drawn' }] },
  // the Penetrate spell's shot: Grand Weaponmastery's +5 is the engine's; Grand Nexus 2, Telegnosis 1
  297: { bowShot: { 242: [-99, 7], 173: [8, 9], 102: [10, 99] }, rntMod: [{ disc: 'grandNexus', plus: 2 }, { disc: 'telegnosis', plus: 1 }] },
  298: { ep: -3 },
  300: { need: { 267: sommerswerd } },
  302: { ep: -2 },
  // one round only: who lost more decides the way on (even: 226)
  303: { fight: { stop: { after: 1, by: { hero: '263', foe: '226', even: '226' } } } },
  305: { ep: -4 },
  310: { ep: -4 },
  312: { ep: -5 },
  316: { need: { 98: sommerswerd, 239: noSommerswerd } },
  // 20 Crowns; short of them, one Special Item of his choice and half the Backpack (the short case first)
  317: { when: [{ unless: { gold: 20 }, take: [{ pick: ['special'], n: 1 }] }, { if: { gold: 20 }, take: [{ gold: 20 }] }],
    todo: 'If you could not pay the 20 Gold Crowns, also erase half the items in your Backpack, your choice' },
  318: { ep: -1 },
  323: { need: { 74: { gold: 4, spend: true } } },
  325: { rolls: evenOdd(5, 3) },
  331: { take: [{ pick: ['special'], n: 1, but: ['sunCrystal'] }] },
  334: { bowShot: { 76: [-99, 8], 265: [9, 99] } },
  335: { ep: -3, take: seized },
  336: { take: [{ arrows: 1 }] },
  // the armourer buys and sells
  339: { loot: [{ item: 'sword', cost: 4 }, { item: 'spear', cost: 6 }, { item: 'axe', cost: 2 }, { item: 'dagger', cost: 2 }, { item: 'bow', cost: 6 },
    { arrows: 1, cost: 1 }, { item: 'broadsword', cost: 6 }, { item: 'mace', cost: 2 }, { item: 'helmet18', cost: 6 }, { item: 'breastplate18', cost: 6 }],
    sell: { sword: 2, spear: 3, axe: 1, dagger: 1, bow: 3, broadsword: 3, mace: 1, helmet18: 3, breastplate18: 3, arrows: { n: 2, gold: 1 } } },
  341: { take: [{ arrows: 1 }] },
  // 10, or 6 with Kai-screen
  345: { when: [{ if: { disc: 'kaiScreen' }, ep: -6 }, { unless: { disc: 'kaiScreen' }, ep: -10 }] },
  346: { ep: 'full' },
};

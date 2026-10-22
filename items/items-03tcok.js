/* Book 3's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand (see items-01fftd.js for the fields, items-02fotw.js for the later ones, and
   docs/reference/items.md for how). Notes on this book:
     - Kalte is icy desert: Hunting never provides a Meal there (noHunt on the sections that ask for one).
     - Baknar oil is an item only so the choices and losses that depend on it can follow it; it takes no room.
     - The sledge's goods (Sleeping Furs, a Tent, a Rope) take more than one Backpack space in the
       text; the page counts each as one, so the player keeps the room by hand.
     - Where a choice depends on a past adventure (the Graveyard of the Ancients, Ragadorn), the
       choice stays open and the player decides: no earlier table marks those visits yet.
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  baknarOil: { name: 'Baknar Oil', kind: 'special', glyph: 'round-bottom-flask', about: 'Rubbed into your skin for the rest of this adventure: it keeps out the cold. It takes no room.' },
  silverKey3: { name: 'Ornate Silver Key', kind: 'special', glyph: 'key', about: 'From the stomach of a Crystal Frostwyrm. It opens a carved stone chest.' },
  boneSword: { name: 'Bone Sword', kind: 'special', glyph: 'rusty-sword', weapon: ['sword'], about: 'A sword set with teeth, taken from an Ice Barbarian. It fights as a sword.' },
  blueDisc: { name: 'Blue Stone Disc', kind: 'special', glyph: 'circle-cage', about: 'The key to a door with a slot beside it.' },
  blueTriangle: { name: 'Blue Stone Triangle', kind: 'special', glyph: 'moebius-triangle', about: 'Worn on a chain. It fits the recess that opens the fortress door.' },
  diamond: { name: 'Diamond', kind: 'special', glyph: 'cut-diamond', about: 'Worth a fortune in Sommerlund; here, a bright thing to throw.' },
  bracelet: { name: 'Gold Bracelet', kind: 'special', glyph: 'ring', about: 'Worn by the Ice Barbarians. It carries a mind attack that Mindshield turns away.' },
  effigy: { name: 'Stone Effigy', kind: 'special', glyph: 'third-eye', about: 'A statuette of a tentacled creature.' },
  glowingCrystal: { name: 'Glowing Crystal', kind: 'special', glyph: 'crystal-ball', about: 'Warm to the touch. It is a Doomstone and will sicken whoever carries it.' },
  firesphere: { name: 'Firesphere', kind: 'special', glyph: 'fire-bomb', about: 'Two metal halves that make a ball of fire when joined; animals will not cross it.' },
  silverHelm: { name: 'Silver Helm', kind: 'special', glyph: 'visored-helm', fightCs: 2, about: '+2 COMBAT SKILL in a fight. Not worn with another helmet.' },
  blackGraveweed: { name: 'Potion of Black Graveweed', kind: 'backpack', glyph: 'round-bottom-flask', about: 'A strong poison.' },
  greenGallowbrush: { name: 'Potion of Green Gallowbrush', kind: 'backpack', glyph: 'round-bottom-flask', about: 'A strong sleeping draught.' },
  redLaumspur: { name: 'Red Potion of Laumspur', kind: 'backpack', glyph: 'health-potion', heal: 5, about: 'Concentrated Laumspur. Drink it after a fight.' },
  alether4: { name: 'Potion of Alether', kind: 'backpack', glyph: 'standing-potion', boost: 4, about: 'Swallow it just before a fight: +4 COMBAT SKILL for that fight.' },
  sleepingFurs: { name: 'Sleeping Furs', kind: 'backpack', glyph: 'blanket', about: 'Take the room of two Backpack Items; the page counts one.' },
  tent: { name: 'Tent', kind: 'backpack', glyph: 'knapsack', about: 'Takes the room of three Backpack Items; the page counts one.' },
};

// what the wrecked sledge still holds, to take what fits in the Backpack
const sledge = [{ meal: 1 }, { meal: 1 }, { meal: 1 }, { meal: 1 }, { meal: 1 }, { item: 'sleepingFurs' }, { item: 'tent' }, { item: 'rope' }];
const sommerswerd = { item: 'sommerswerd' };
const oil = { item: 'baknarOil' };
const graveyard = { any: [{ mark: 'visitedGraveyard' }] };
const notGraveyard = { any: [{ not: { mark: 'visitedGraveyard' } }] };

// flags a later section or book tests (core.js, LW.MARKS)
export const MARKS = { ateByFire: { name: 'having eaten by the fire', flag: true } };

export const SECTIONS = {
  4: { loot: [{ item: 'boneSword' }, { item: 'blueDisc' }] },
  8: { give: [oil] },
  10: { loot: [{ pack: true }] },
  // his share, and the evening Meal he eats at once
  12: { give: [{ meal: 3 }, { item: 'sleepingFurs' }, { item: 'rope' }], meal: true, noHunt: true },
  15: { need: { 86: { item: ['dagger', 'boneSword'] } } },
  16: { take: [{ pick: 'backpack', n: 2 }] },
  // the weapon he struck with, a weapon-like Special Item too
  18: { ep: -3, take: [{ pick: 'weapon', n: 1 }] },
  21: { ep: -3 },
  24: { take: [{ item: 'diamond' }] },
  25: { loot: [{ item: 'blueTriangle' }] },
  26: { loot: [{ item: 'boneSword' }, { item: 'dagger' }, { item: 'mace' }] },
  27: { when: [{ unless: oil, ep: -2 }] },
  29: { need: { 43: sommerswerd } },
  // met before at 138 or 263 (evaded there): the wounds carry over, and only as many as fought there
  32: { fight: { keep: 'kalkoth', stop: { wound: true, to: '66' }, to: '25' } },
  33: { ep: -1 },
  38: { loot: [{ pack: true }, { item: 'rope' }] },
  43: { ep: -1 },
  44: { need: { 79: { item: 'blackGraveweed' }, 157: { item: 'greenGallowbrush' }, 270: { item: ['blackGraveweed', 'greenGallowbrush'], not: true } } },
  45: { need: { 303: { item: 'silverKey3' }, 15: { item: 'silverKey3', not: true } } },
  // the Backpack stays in the tent: he keeps his weapons, gold and Special Items
  49: { take: [{ backpack: 'all' }] },
  50: { need: { 139: { item: 'glowingCrystal' }, 189: { item: 'glowingCrystal', not: true } } },
  55: { ep: -5, cs: -2 },
  59: { loot: [{ item: 'blueTriangle' }] },
  62: { ep: -3 },
  67: { need: { 328: { item: 'rope' } } },
  70: { need: { 209: oil, 339: { item: 'baknarOil', not: true } } },
  77: { ep: -1 },
  79: { ep: 6, take: [{ item: 'blackGraveweed' }] },
  // its controller's Mindforce, once, not per round
  83: { when: [{ unless: { disc: 'mindshield' }, ep: -2 }] },
  84: { loot: [{ item: 'blueTriangle' }] },
  // Weaponskill with the blade put in the lock
  86: { rntMod: [{ any: [{ item: 'dagger', mastery: 'dagger' }, { item: 'boneSword', mastery: 'boneSword' }], plus: 3, label: 'Weaponskill' }], ranges: { 47: [0, 7], 194: [8, 12] } },
  88: { fight: { rounds: [{ heroLoss: 0, fatal: [9], note: 'Padded arm' }] } },
  91: { give: [oil] },
  92: { need: { 133: { item: 'rope' }, 297: { item: 'rope', not: true } } },
  // a drowning on 7-9
  94: { rolls: [{ range: [0, 6], ep: -3 }, { range: [7, 9], dead: true }] },
  96: { rntMod: [{ item: 'baknarOil', plus: 2 }], ranges: { 59: [0, 8], 214: [9, 11] } },
  // the disc is the key to the door at the end of the corridor
  104: { need: { 135: { item: 'blueDisc' }, 330: { item: 'blueDisc', not: true } } },
  97: { need: { 24: { item: 'diamond' }, 152: { gold: 1 } } },
  99: { fight: { undead: true, noBoost: true } },
  102: { loot: [{ item: 'effigy' }] },
  107: { need: { 202: oil, 284: { item: 'baknarOil', not: true } } },
  // the Doomstone and the empty vial are thrown away
  // "evade after one round" is in the text, not in a choice, so the importer missed it
  // up the stairs, then south or north: two ways out
  108: { fight: { to: '282', evade: [{ after: 1, to: '330', label: 'Run south' }, { after: 1, to: '198', label: 'Run north' }] } },
  116: { take: [{ item: 'redLaumspur' }, { item: 'glowingCrystal' }] },
  119: { loot: sledge },
  // marks set in Books 2 (Ragadorn) and 1 (the Graveyard of the Ancients)
  128: { need: { 11: { any: [{ mark: 'visitedRagadorn' }] } } },
  129: { when: [{ unless: oil, ep: -3 }] },
  121: { ep: -1 },
  // a first wound ends these fights
  123: { fight: { stop: { wound: true, to: '66' }, to: '174' } },
  // he has just eaten if he came by the old men's fire (295, 309)
  132: { when: [{ unless: { mark: 'ateByFire' }, ate: false, ep: -3 }, { unmark: 'ateByFire' }] },
  // partly immune: Mindblast adds 1 here, not 2 (the importer marked the pair immune, so the engine adds nothing)
  137: { fight: { csMod: 1, csIf: { disc: ['mindblast'] } } },
  138: { fight: { keep: 'kalkoth', stop: { wound: true, to: '66' }, wounded: '66', to: '25' } },
  139: { need: { 116: { item: 'redLaumspur' }, 239: { item: 'redLaumspur', not: true } } },
  140: { ep: -2 },
  146: { need: { 43: sommerswerd } },
  147: { fight: { stop: { wound: true, to: '66' }, to: '84' } },
  150: { when: [{ unless: oil, ep: -2 }], need: { 120: sommerswerd, 310: { item: 'firesphere' } } },
  151: { need: { 209: oil, 339: { item: 'baknarOil', not: true } } },
  // the Crowns thrown are gone whether or not the draw works
  152: { stake: { min: 1, spend: true }, todo: 'the number drawn (0 counting as 10) against the Crowns thrown: no more, 319; more, 181.' },
  155: { noHunt: true },
  156: { loot: [{ item: 'greenGallowbrush' }] },
  157: { ep: 6, take: [{ item: 'greenGallowbrush' }] },
  158: { fight: { stop: { after: 1, by: { hero: '165', foe: '271', even: '337' } } } },
  164: { fight: { undead: true } },
  169: { need: { 41: { item: 'blueTriangle' }, 265: { item: 'blueTriangle', not: true } } },
  // seized from behind: no potion before the fight (noBoost at 304 and 99, reached only from here and 328)
  170: { ep: -6, need: { 304: sommerswerd, 175: { item: 'sommerswerd', not: true } } },
  173: { need: { 34: { item: 'effigy' }, 164: sommerswerd, 200: { item: ['effigy', 'sommerswerd'], not: true } } },
  177: { loot: [{ item: 'blackGraveweed' }] },
  // Fenor stabs it from behind every round
  180: { fight: { rounds: [{ foeEach: 3, note: 'Fenor' }], stop: { wound: true, to: '129' }, to: '70' } },
  181: { need: { 152: { gold: 1 } } },
  187: { give: [{ item: 'bracelet' }] },
  192: { need: { 267: { item: 'glowingCrystal' }, 44: { item: 'glowingCrystal', not: true } } },
  193: { ep: -2 },
  196: { ep: -2, take: [{ weapons: 'all' }] },
  200: { fight: { won: { within: 7, to: '272', else: '324' } } },
  206: { ep: -1 },
  209: { ep: -2 },
  210: { loot: [{ item: 'boneSword' }] },
  214: { ep: -2 },
  217: { ep: -10 },
  218: { loot: [{ item: 'diamond' }] },
  223: { loot: sledge },
  226: { ep: -1 },
  229: { need: { 46: { item: 'firesphere' }, 88: { item: 'firesphere', not: true } } },
  233: { loot: [{ item: 'redLaumspur' }] },
  236: { give: [{ item: 'bracelet' }] },
  237: { noHunt: true },
  241: { fight: { rounds: [{ upTo: 2, heroLoss: 0 }] } },
  242: { need: { 42: sommerswerd, 145: { item: 'sommerswerd', not: true } } },
  247: { need: { 118: { item: 'rope' } } },
  244: { need: { 150: { any: [{ weapon: true }] } } },
  250: { need: { 77: graveyard, 10: notGraveyard } },
  251: { ep: -2 },
  // the number drawn is the loss, less 2 with Hunting or Sixth Sense (not below nothing)
  258: { rolls: [{ range: [0, 9], ep: 'drawn' }], lessen: [{ n: 2, if: { disc: ['hunting', 'sixthSense'] } }], take: [{ item: 'bracelet' }] },
  259: { fight: { stop: { wound: true, to: '129' }, to: '151' } },
  260: { fight: { rounds: [{ upTo: 2, heroLoss: 0 }] } },
  263: { fight: { keep: 'kalkoth', stop: { wound: true, to: '66' }, wounded: '66', to: '25' } },
  267: { take: [{ item: 'glowingCrystal' }] },
  268: { need: { 177: graveyard, 10: notGraveyard } },
  272: { need: { 213: sommerswerd } },
  277: { need: { 142: { any: [{ weapon: true }] } } },
  280: { ep: -1, loot: [{ item: 'silverKey3' }] },
  282: { loot: [{ item: 'spear' }, { item: 'blueDisc' }] },
  // Hunting, Tracking or Animal Kinship (the importer read Hunting alone)
  275: { need: { 293: { disc: ['hunting', 'tracking', 'animalKinship'] } } },
  289: { need: { 156: { any: [{ disc: 'animalKinship' }, { rank: 6 }] } } },
  // a Guardian (seven Disciplines) is sent to 341, so the others come here only with Sixth Sense
  290: { need: { 124: { disc: 'sixthSense' } } },
  294: { meal: 2, noHunt: true },
  295: { loot: [{ item: 'firesphere' }], mark: 'ateByFire' },
  // the guards collapse after three rounds
  296: { fight: { stop: { after: 3 } } },
  298: { loot: [{ item: 'blueTriangle' }] },
  // with Mind Over Matter he pressed the buttons by it (227)
  299: { when: [{ unless: { disc: 'mindOverMatter' }, ep: -2 }] },
  303: { take: [{ item: 'silverKey3' }] },
  304: { fight: { undead: true, noBoost: true } },
  // he swaps it for the helmet he was wearing, if any
  308: { give: [{ item: 'silverHelm' }], take: [{ item: 'helmet' }] },
  309: { loot: [{ item: 'blueTriangle' }, { item: 'firesphere' }], mark: 'ateByFire' },
  311: { loot: [{ item: 'alether4' }] },
  321: { loot: [{ item: 'blueTriangle' }] },
  326: { ep: -1 },
  328: { ep: -6, need: { 99: sommerswerd, 175: { item: 'sommerswerd', not: true } } },
  329: { need: { 202: oil, 284: { item: 'baknarOil', not: true } } },
  330: { need: { 100: { item: 'rope' }, 148: { item: 'rope', not: true } } },
  331: { when: [{ unless: { disc: 'healing' }, ep: -4 }] },
  334: { loot: [{ item: 'glowingCrystal' }] },
  340: { ep: 6 },
  344: { need: { 41: { item: 'blueTriangle' }, 147: { item: 'blueTriangle', not: true } } },
  345: { take: [{ item: 'bracelet' }] },
  349: { need: { 139: { item: 'glowingCrystal' }, 97: { item: 'glowingCrystal', not: true } } },
};

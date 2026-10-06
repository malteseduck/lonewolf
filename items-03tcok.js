/* Book 3's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand (see items-01fftd.js for the fields, items-02fotw.js for the later ones, and
   docs/reference/items.md for how). Nothing new in the fields. Notes on this book:
     - Kalte is icy desert: Hunting never provides a Meal there (noHunt on the sections that ask for one).
     - Baknar oil is an item only so the choices that depend on it can be gated; it takes no room.
     - The sledge's goods (Sleeping Furs, a Tent, a Rope) take more than one Backpack space in the
       text; the page counts each as one, so the player keeps the room by hand.
     - Where a choice depends on a past adventure (the Graveyard of the Ancients, Ragadorn) or on
       carrying any weapon, the choice stays open and the player decides.
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  baknarOil: { name: 'Baknar Oil', kind: 'special', glyph: 'round-bottom-flask', about: 'Rubbed into your skin for the rest of this adventure: it keeps out the cold. It takes no room.' },
  silverKey3: { name: 'Ornate Silver Key', kind: 'special', glyph: 'skeleton-key', about: 'From the stomach of a Crystal Frostwyrm. It opens a carved stone chest.' },
  boneSword: { name: 'Bone Sword', kind: 'special', glyph: 'pointy-sword', weapon: ['sword'], about: 'A sword set with teeth, taken from an Ice Barbarian. It fights as a sword.' },
  blueDisc: { name: 'Blue Stone Disc', kind: 'special', glyph: 'medal', about: 'The key to a door with a slot beside it.' },
  blueTriangle: { name: 'Blue Stone Triangle', kind: 'special', glyph: 'gem-pendant', about: 'Worn on a chain. It fits the recess that opens the fortress door.' },
  diamond: { name: 'Diamond', kind: 'special', glyph: 'cut-diamond', about: 'Worth a fortune in Sommerlund; here, a bright thing to throw.' },
  bracelet: { name: 'Gold Bracelet', kind: 'special', glyph: 'ring', about: 'Worn by the Ice Barbarians. It carries a mind attack that Mindshield turns away.' },
  effigy: { name: 'Stone Effigy', kind: 'special', glyph: 'third-eye', about: 'A statuette of a tentacled creature.' },
  glowingCrystal: { name: 'Glowing Crystal', kind: 'special', glyph: 'crystal-ball', about: 'Warm to the touch. It is a Doomstone and will sicken whoever carries it.' },
  firesphere: { name: 'Firesphere', kind: 'special', glyph: 'fire-bomb', about: 'Two metal halves that make a ball of fire when joined; animals will not cross it.' },
  silverHelm: { name: 'Silver Helm', kind: 'special', glyph: 'visored-helm', fightCs: 2, about: '+2 COMBAT SKILL in a fight. Not worn with another helmet.' },
  blackGraveweed: { name: 'Potion of Black Graveweed', kind: 'backpack', glyph: 'round-bottom-flask', about: 'A strong poison.' },
  greenGallowbrush: { name: 'Potion of Green Gallowbrush', kind: 'backpack', glyph: 'round-bottom-flask', about: 'A strong sleeping draught.' },
  redLaumspur: { name: 'Red Potion of Laumspur', kind: 'backpack', glyph: 'health-potion', heal: 5, about: 'Concentrated Laumspur. Drink it after a fight.' },
  alether4: { name: 'Potion of Alether', kind: 'backpack', glyph: 'standing-potion', about: 'Swallow it just before a fight: +4 COMBAT SKILL for that fight. Apply it by hand.' },
  sleepingFurs: { name: 'Sleeping Furs', kind: 'backpack', glyph: 'blanket', about: 'Take the room of two Backpack Items; the page counts one.' },
  tent: { name: 'Tent', kind: 'backpack', glyph: 'knapsack', about: 'Takes the room of three Backpack Items; the page counts one.' },
};

// what the wrecked sledge still holds, to take what fits in the Backpack
const sledge = [{ meal: 1 }, { meal: 1 }, { meal: 1 }, { meal: 1 }, { meal: 1 }, { item: 'sleepingFurs' }, { item: 'tent' }, { item: 'rope' }];
// the number drawn is the loss, 0 counting as 10
const loss = (extra) => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], ep: -(n || 10), ...extra }));
const sommerswerd = { item: 'sommerswerd' };
const oil = { item: 'baknarOil' };

export const SECTIONS = {
  4: { loot: [{ item: 'boneSword' }, { item: 'blueDisc' }] },
  8: { give: [oil] },
  10: { loot: [{ pack: true }] },
  // his share, and the evening Meal he eats at once
  12: { give: [{ meal: 3 }, { item: 'sleepingFurs' }, { item: 'rope' }], meal: true, noHunt: true },
  15: { need: { 86: { item: ['dagger', 'boneSword'] } } },
  16: { todo: 'two of the items in your Backpack are crushed: choose which, or the one you have.' },
  18: { ep: -3, take: [{ weapons: 'one' }], todo: 'if your only weapon is a weapon-like Special Item (a Bone Sword, the Sommerswerd), that is the one lost.' },
  21: { ep: -3 },
  24: { take: [{ item: 'diamond' }] },
  25: { loot: [{ item: 'blueTriangle' }] },
  26: { loot: [{ item: 'boneSword' }, { item: 'dagger' }, { item: 'mace' }] },
  27: { todo: 'unless you have rubbed Baknar oil into your skin, lose 2 ENDURANCE.' },
  29: { need: { 43: sommerswerd } },
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
  83: { todo: 'its controller attacks with Mindforce: unless you have Mindshield, lose 2 ENDURANCE (the text gives it once, not per round).' },
  84: { loot: [{ item: 'blueTriangle' }] },
  86: { todo: 'with Weaponskill for the weapon in your hand, add 3 to the number drawn before choosing the way on.' },
  88: { todo: 'ENDURANCE lost in this fight is not taken from your total. Draw a number after each such loss instead: 0-8 and the padded arm saved you, a 9 is death.' },
  91: { give: [oil] },
  92: { need: { 133: { item: 'rope' }, 297: { item: 'rope', not: true } } },
  // a drowning on 7-9, which the draw cannot do for him
  94: { rolls: [{ range: [0, 6], ep: -3 }], todo: 'a 7, 8 or 9 drowns you: your mission ends here.' },
  96: { todo: 'if you have ever rubbed Baknar oil into your skin, add 2 to the number drawn before choosing the way on.' },
  // the disc is the key to the door at the end of the corridor
  104: { need: { 135: { item: 'blueDisc' }, 330: { item: 'blueDisc', not: true } } },
  97: { need: { 24: { item: 'diamond' }, 152: { gold: 1 } } },
  99: { fight: { undead: true } },
  102: { loot: [{ item: 'effigy' }] },
  107: { need: { 202: oil, 284: { item: 'baknarOil', not: true } } },
  // the Doomstone and the empty vial are thrown away
  108: { todo: 'after the first round you may break off, either way the text offers: use the Turn to section box.' },
  116: { take: [{ item: 'redLaumspur' }, { item: 'glowingCrystal' }] },
  119: { loot: sledge },
  129: { todo: 'unless you have rubbed Baknar oil into your skin, lose 3 ENDURANCE.' },
  121: { ep: -1 },
  132: { todo: 'unless you have just eaten, lose 3 ENDURANCE (Hunting does not help in Kalte).' },
  137: { todo: 'Mindblast is only partly blocked here: if you have it, it adds 1 COMBAT SKILL, not 2.' },
  138: { todo: 'the moment you lose any ENDURANCE here, stop and turn to the section the text names (use the Turn to section box).' },
  139: { need: { 116: { item: 'redLaumspur' }, 239: { item: 'redLaumspur', not: true } } },
  140: { ep: -2 },
  146: { need: { 43: sommerswerd } },
  150: { todo: 'unless you have rubbed Baknar oil into your skin, lose 2 ENDURANCE.', need: { 120: sommerswerd, 310: { item: 'firesphere' } } },
  151: { need: { 209: oil, 339: { item: 'baknarOil', not: true } } },
  // the Crowns thrown are gone whether or not the draw works
  152: { todo: 'write down how many Gold Crowns you throw before drawing; they are gone whatever the number, so take them off your gold by hand.' },
  155: { noHunt: true },
  156: { loot: [{ item: 'greenGallowbrush' }] },
  157: { ep: 6, take: [{ item: 'greenGallowbrush' }] },
  158: { todo: 'only one round is fought: the way on follows who lost more ENDURANCE in it, or neither.' },
  164: { fight: { undead: true } },
  169: { need: { 41: { item: 'blueTriangle' }, 265: { item: 'blueTriangle', not: true } } },
  // reached when he is seized: no potion can be swallowed before the fight
  170: { ep: -6, need: { 304: sommerswerd, 175: { item: 'sommerswerd', not: true } }, todo: 'you cannot swallow any potion before this fight.' },
  173: { need: { 34: { item: 'effigy' }, 164: sommerswerd, 200: { item: ['effigy', 'sommerswerd'], not: true } } },
  177: { loot: [{ item: 'blackGraveweed' }] },
  180: { todo: 'Fenor stabs the creature from behind: take 3 more ENDURANCE off the Kalkoth in every round you fight.' },
  181: { need: { 152: { gold: 1 } } },
  187: { give: [{ item: 'bracelet' }] },
  192: { need: { 267: { item: 'glowingCrystal' }, 44: { item: 'glowingCrystal', not: true } } },
  193: { ep: -2 },
  196: { ep: -2, take: [{ weapons: 'all' }] },
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
  241: { todo: 'ignore the ENDURANCE you lose in the first two rounds.' },
  242: { need: { 42: sommerswerd, 145: { item: 'sommerswerd', not: true } } },
  247: { need: { 118: { item: 'rope' } } },
  251: { ep: -2 },
  // the number drawn is the loss, less 2 with Hunting or Sixth Sense (not below nothing)
  258: { rolls: loss(), todo: 'with Hunting or Sixth Sense the loss is 2 less (never below 0): give back up to 2 ENDURANCE. The Bracelet is then gone.', take: [{ item: 'bracelet' }] },
  260: { todo: 'you lose no ENDURANCE in the first two rounds.' },
  263: { todo: 'the moment you lose any ENDURANCE here, stop and turn to the section the text names (use the Turn to section box).' },
  267: { take: [{ item: 'glowingCrystal' }] },
  272: { need: { 213: sommerswerd } },
  280: { ep: -1, loot: [{ item: 'silverKey3' }] },
  282: { loot: [{ item: 'spear' }, { item: 'blueDisc' }] },
  // Hunting, Tracking or Animal Kinship (the importer read Hunting alone)
  275: { need: { 293: { disc: ['hunting', 'tracking', 'animalKinship'] } } },
  289: { need: { 156: null }, todo: 'only with Animal Kinship, or with six or more Disciplines, may you turn to 156; otherwise return to 10.' },
  // a Guardian (seven Disciplines) is sent to 341, so the others come here only with Sixth Sense
  290: { need: { 124: { disc: 'sixthSense' } } },
  294: { todo: 'after the six hours of labour eat two Meals or lose 6 ENDURANCE.' },
  295: { loot: [{ item: 'firesphere' }] },
  296: { todo: 'only three rounds are fought before the guards collapse.' },
  298: { loot: [{ item: 'blueTriangle' }] },
  299: { todo: 'unless you used Mind Over Matter, lose 2 ENDURANCE.' },
  303: { take: [{ item: 'silverKey3' }] },
  304: { fight: { undead: true } },
  // he swaps it for the helmet he was wearing, if any
  308: { give: [{ item: 'silverHelm' }], take: [{ item: 'helmet' }] },
  309: { loot: [{ item: 'blueTriangle' }, { item: 'firesphere' }] },
  311: { loot: [{ item: 'alether4' }] },
  321: { loot: [{ item: 'blueTriangle' }] },
  326: { ep: -1 },
  328: { ep: -6, need: { 99: sommerswerd, 175: { item: 'sommerswerd', not: true } }, todo: 'you cannot swallow any potion before this fight.' },
  329: { need: { 202: oil, 284: { item: 'baknarOil', not: true } } },
  330: { need: { 100: { item: 'rope' }, 148: { item: 'rope', not: true } } },
  331: { todo: 'unless you have Healing, lose 4 ENDURANCE.' },
  334: { loot: [{ item: 'glowingCrystal' }] },
  340: { ep: 6 },
  344: { need: { 41: { item: 'blueTriangle' }, 147: { item: 'blueTriangle', not: true } } },
  345: { take: [{ item: 'bracelet' }] },
  349: { need: { 139: { item: 'glowingCrystal' }, 97: { item: 'glowingCrystal', not: true } } },
};

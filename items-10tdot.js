/* Book 10's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand (see items-01fftd.js for the fields, items-02fotw.js for the later ones, and
   docs/reference/items.md for how). Nothing new in the fields. Notes on this book:
     - Every "If you have a Bow and wish to use it" choice is open only with a Bow. Arrows the text
       has him fire without a Random Number are taken off the Quiver on arrival (take arrows); the
       three shots that draw a number are bowShot, which spends its own Arrow.
     - The Signet Ring is given at 176 and, by the text, does not count against the twelve Special
       Items; the page counts it, so with a full list the player makes room by hand.
     - Where the text puts a number into a fight for the first rounds only, or stops a fight early,
       the engine cannot; those are todos. No fight here costs a surprise attack's penalty for its
       whole length, so no fight is marked ambush.
     - Kalte Firesphere is the Book 3 item (firesphere); the Sommerswerd is Book 2's.
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  bullwhip: { name: 'Bullwhip', kind: 'special', glyph: 'whip', about: 'A studded whip taken from a partisan leader’s brother. Its copper nuggets glow against the undead: +2 COMBAT SKILL in a fight with them. Some partisans will know it.' },
  medal10: { name: 'Medal', kind: 'special', glyph: 'medal', about: 'Won at the Battle of Luomi and pressed into your hand by a grateful knight.' },
  signetRing10: { name: 'Signet Ring', kind: 'special', glyph: 'ring', about: 'Prince Graygor’s royal crest, worn on the right hand to show the court’s friendship. It does not count against the twelve Special Items.' },
  gorodonHorn: { name: 'Gorodon Horn', kind: 'special', glyph: 'rhinoceros-horn', about: 'Cut from a Gorodon; potion-makers in Humbold would pay well for it. Carried strapped to the pack.' },
  blackKey10: { name: 'Black Key', kind: 'special', glyph: 'key', about: 'Taken from a Drakkarim officer. It opens a black steel door in Torgar.' },
  skeletonKey10: { name: 'Skeleton Key', kind: 'special', glyph: 'skeleton-key', about: 'Picks the lock of the black steel door. Not found in this book.' },
  laumwort: { name: 'Laumwort', kind: 'backpack', glyph: 'herbs-bundle', heal: 2, about: 'A herb like Laumspur: eat the leaves to restore 2 ENDURANCE.' },
  bottleOfWater10: { name: 'Bottle of Water', kind: 'backpack', glyph: 'round-bottom-flask' },
  blanket10: { name: 'Blanket', kind: 'backpack', glyph: 'blanket', about: 'Spares you a bad night’s sleep on the straw at Prince Graygor’s camp.' },
};

// the number drawn is the loss, 0 counting as 10
const loss = () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], ep: -(n || 10) }));
const bow = { item: 'bow' };
const rope = { item: 'rope' };
const sommerswerd = { item: 'sommerswerd' };
const notSommerswerd = { item: 'sommerswerd', not: true };
const whip = { item: 'bullwhip' };
const notWhip = { item: 'bullwhip', not: true };
// the ghosts: the Sommerswerd, the Bullwhip, or (neither) death
const ghosts = { 133: sommerswerd, 168: whip, 74: { item: ['sommerswerd', 'bullwhip'], not: true } };
const oneRound = (n) => `if the fight lasts longer than ${n} rounds, stop at once and turn to the section the text names (use the Turn to section box).`;
const psychicDouble = 'Mindblast or Psi-surge counts double against these war-dogs, triple with the Lore-circle of the Spirit. Apply it by hand.';

export const SECTIONS = {
  8: { need: { 131: bow } },
  9: { need: { 113: sommerswerd, 126: notSommerswerd } },
  // his weapon is destroyed; a weapon-like Special Item goes only if he has no ordinary Weapon
  11: { take: [{ weapons: 'one' }], todo: 'if your only weapon is a weapon-like Special Item, that is the one lost; with an ordinary Weapon, it goes first.' },
  15: { ep: -1 },
  22: { need: { 293: bow } },
  26: { ep: -1, need: { 147: bow } },
  28: { todo: 'surprise attack: unless you have Huntmastery, take 3 off your COMBAT SKILL for the first round only. The engine does not.' },
  29: { todo: 'unless you carry a Blanket, lose 1 ENDURANCE.' },
  34: { ep: -2 },
  36: { take: [{ arrows: 1 }] },
  41: { todo: oneRound(3) },
  43: { todo: 'one item is lost in the jump: the second one listed in your Backpack.' },
  52: { need: { 109: bow } },
  // hanging by the roots: 3 off for the whole fight, and he fights bare-handed (the engine takes the penalty for it)
  54: { fight: { csMod: -3, with: 'none' }, todo: 'if you carry a weapon-like Special Item you fight with it and take no penalty for being unarmed. You may not use the Silver Bow of Duadon.' },
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
  81: { todo: psychicDouble },
  93: { need: { 133: sommerswerd, 256: notSommerswerd } },
  96: { bowShot: { 9: [0, 7], 272: [8, 99] } },
  99: { ep: -4 },
  109: { take: [{ arrows: 1 }] },
  119: { take: [{ arrows: 1 }] },
  121: { ep: -2, need: { 36: bow } },
  123: { need: { 48: rope } },
  128: { todo: 'before choosing the way on, change the number drawn for the weapon in your hand: 3 less for a Dagger or Quarterstaff, 1 more for an Axe or Mace; Huntmastery adds 2.' },
  130: { need: { 142: { item: 'dagger' }, 17: { item: 'dagger', not: true } } },
  131: { take: [{ arrows: 1 }], todo: 'to fire at these men too you must have at least two Arrows still in the Quiver.' },
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
  166: { rolls: loss(), todo: 'with Huntmastery the loss is 2 less (never below 0): give back up to 2 ENDURANCE.' },
  167: { need: { 214: whip, 327: notWhip } },
  // the whip's power against the undead
  168: { fight: { csMod: 2, csNote: 'Bullwhip' } },
  172: { todo: 'halve every ENDURANCE point you lose in this fight (the Gorodon turns half its attacks on Jarel).' },
  174: { need: { 286: sommerswerd, 333: notSommerswerd } },
  176: { give: [{ item: 'signetRing10' }] },
  177: { loot: [{ item: 'blackKey10' }, { gold: 20 }, { item: 'dagger' }] },
  // the importer's pattern missed this Meal
  186: { meal: true },
  187: { todo: oneRound(4) },
  192: { ep: -3 },
  // the number drawn is the loss, 0 counting as 10, less 3 with Curing but never below 1
  203: { rolls: loss(), todo: 'with Curing the loss is 3 less, but you always lose at least 1: give back up to 3 ENDURANCE.' },
  208: { ep: -2 },
  210: { ep: -2, take: [{ weapons: 'one' }], todo: 'if your only weapon is a weapon-like Special Item, that is the one lost; with an ordinary Weapon, it goes first.' },
  213: { ep: -5, need: { 147: bow } },
  215: { ep: -2 },
  217: { loot: [{ item: 'gorodonHorn' }] },
  218: { todo: 'each throw costs a stake of 3 Gold Crowns, won or lost by the dice as the text says; take it off your gold by hand.' },
  223: { need: { 185: whip, 342: notWhip } },
  228: { ep: -2, need: ghosts },
  233: { todo: 'unless you have Nexus, lose 3 ENDURANCE.' },
  236: { ep: -8 },
  246: { need: { 205: { item: 'oedeHerb', spend: true }, 343: { item: 'oedeHerb', not: true } } },
  251: { todo: 'the first round only: add 2 to your COMBAT SKILL. The engine does not.' },
  253: { ep: -5 },
  254: { ep: -6, todo: psychicDouble },
  // a Torch needs a Tinderbox too, so the choice stays open
  256: { need: { 168: whip }, todo: 'the light that keeps them off is a Kalte Firesphere, a Lantern, or a Torch with a Tinderbox: take 248 only with one of these, else 24.' },
  257: { ep: -6 },
  261: { ep: -12 },
  265: { todo: 'lose the items listed fourth, fifth and sixth in your Backpack, and half the Gold Crowns in your Belt Pouch.' },
  // what the four Zagganozod carried, to take what fits
  271: { loot: [{ item: 'sword' }, { item: 'dagger' }, { item: 'axe' }, { item: 'mace' }, { item: 'broadsword' }, { item: 'bow' }, { item: 'quiver' }, { arrows: 11 }, { gold: 4 }, { meal: 1 }, { meal: 1 }, { meal: 1 }, { meal: 1 }] },
  272: { need: { 113: sommerswerd, 126: notSommerswerd } },
  // enough for three Meals of it, two ENDURANCE each
  276: { loot: [{ item: 'laumwort' }, { item: 'laumwort' }, { item: 'laumwort' }] },
  277: { loot: [{ item: 'broadsword' }, { item: 'axe' }, { item: 'bottleOfWater10' }, { item: 'torch' }, { item: 'blanket10' }, { meal: 1 }, { meal: 1 }, { meal: 1 }] },
  // the number drawn is the loss, 0 counting as 10
  281: { rolls: loss() },
  283: { ep: -3, need: { 131: bow } },
  285: { need: { 80: { item: 'blackKey10' }, 219: { item: 'skeletonKey10' }, 130: { item: ['blackKey10', 'skeletonKey10'], not: true } } },
  286: { todo: 'break off the moment the Demonlord is down to 20 ENDURANCE or less: turn to the section the text names (use the Turn to section box).' },
  293: { bowShot: { 149: [0, 7], 164: [8, 99] } },
  // what the dead Drakkar carried
  296: { loot: [{ item: 'sword' }, { item: 'dagger' }, { item: 'bow' }, { item: 'blanket10' }, { item: 'quiver' }, { arrows: 3 }, { gold: 4 }] },
  297: { need: { 252: sommerswerd, 143: notSommerswerd } },
  // the Lapillibore fought from the ledge (the importer read the 3 off for the whole fight)
  304: { todo: 'fight with a one-handed weapon only (Sword, Mace, Axe, Dagger, Short Sword, Warhammer) and no Shield; weapon-like Special Items count as ordinary weapons here.' },
  309: { ep: -2 },
  310: { ep: -8 },
  316: { ep: -4 },
  319: { need: { 36: bow } },
  329: { need: { 70: bow } },
  336: { todo: 'the first round is fought bare-handed; you may draw a weapon from the second. ' + oneRound(4) },
  340: { ep: -4, todo: 'lose the items listed second, third, fifth and seventh in your Backpack, half the Gold Crowns in your Belt Pouch, and one Special Item of your choice.' },
  344: { take: [{ arrows: 2 }] },
  349: { todo: oneRound(4) },
};

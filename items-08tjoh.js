/* Book 8's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand (see items-01fftd.js for the fields, items-02fotw.js and items-03tcok.js for the
   later ones, and docs/reference/items.md for how). Nothing new in the fields. Notes on this book:
     - Money: the book counts in Lune, 4 to the Gold Crown (rules-books.md). Prizes and prices are
       written here in Crowns at that rate (20 Lune = 5 Crowns); the Arrows at the bowyer's are two
       for a Crown.
     - Bows: a choice that says "if you have a Bow" is gated on the Bow or the Silver Bow of Duadon. The
       Silver Bow is only a Special Item here (it is carried on from Book 7): the engine does not shoot
       it, so a shot with it is worked out by hand. Arrows fired by the text outside a draw are
       taken from the Quiver on arrival; the draws that are shots are `bowShot`.
     - The Helghast can be wounded only by magic: the Sommerswerd, or Paido's blue-steel sword.
     - Lone Wolf's companion Paido has no sheet of his own; his sword is a Special Item you pick up.
     - Left to the player (todo): which Special Item the riddler takes, a potion used up to heal Paido,
       and the Lore-circle and rank bonuses that apply to part of a fight.
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  pass: { name: 'Pass', kind: 'special', glyph: 'id-card', about: 'A safe-conduct from Lord Adamas, sealed with his ring. It opens gates in northern Talestria.' },
  silverBox: { name: 'Silver Box', kind: 'backpack', glyph: 'locked-chest', about: 'A small box inlaid with pearls, worth a good sum.' },
  silverSack: { name: 'Sack of Silver', kind: 'backpack', glyph: 'swap-bag', about: 'A sack of silver nuggets. Each takes one Backpack space.' },
  oxydine: { name: 'Tincture of Oxydine', kind: 'backpack', glyph: 'round-bottom-flask', heal: 2, about: 'Restores 2 ENDURANCE; one dose. It cures the korovax infection.' },
  larnuma: { name: 'Flask of Larnuma Liqueur', kind: 'backpack', glyph: 'round-bottom-flask', heal: 3, about: 'A nourishing liqueur: each of two draughts restores 3 ENDURANCE. The page counts it as one dose; mark the second by hand.' },
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

// anyone with a Bow of either kind
const bow = { item: ['bow', 'silverBow'] };
const sommerswerd = { item: 'sommerswerd' };
const fireseed = { item: 'fireseed' };
// any Laumspur remedy he could give Paido
const remedy = { item: ['potion', 'redLaumspur', 'laumspurHerb', 'rendalim', 'oedeHerb'] };
const arrow = { arrows: 1 };
// the number drawn is the loss, 0 counting as 10
const loss = () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], ep: -(n || 10) }));
const sacks = [1, 2, 3, 4].map(() => ({ item: 'silverSack' }));
const spirit = 'with the Lore-circle of the Spirit complete, add 2 to your COMBAT SKILL for this fight.';
const potionUsed = 'the potion or herb you used on Paido is used up: remove it from your Backpack.';

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
  47: { give: [{ item: 'paidoSword' }], fight: { with: 'paidoSword', drain: 2 }, todo: spirit },
  5: { need: { 324: bow } },
  36: { need: { 182: bow, 225: fireseed } },
  52: { todo: 'double every ENDURANCE point you lose in this fight (the bite is venomous), and triple what Mindblast or Psi-surge would add.' },
  59: { give: [{ gold: 10 }] },
  60: { need: { 308: sommerswerd, 248: { item: 'sommerswerd', not: true } } },
  // the barge: 40 Lune a head
  89: { need: { 266: { gold: 10, spend: true } } },
  299: { need: { 266: { gold: 10, spend: true } } },
  6: { take: [arrow] },
  64: { loot: sacks },
  66: { ep: -2 },
  71: { cs: -3, todo: 'your COMBAT SKILL is 2 lower again for the rest of this adventure only: take that off by hand.' },
  74: { todo: 'a psychic fight only: your COMBAT SKILL is 15 whatever it was, and no weapon or item helps.' },
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
  155: { todo: 'unless you have Curing and the rank of Primate, double every ENDURANCE point you lose in this fight (the snake’s bite is venomous).' },
  156: { ep: -6, todo: 'you now carry the korovax infection: it kills within two days unless cured with a Tincture of Oxydine or an Oede Herb. Use one at once if you have it.' },
  159: { ep: -5, todo: 'you may halve every ENDURANCE point you lose in this fight, as Paido fights beside you.' },
  161: { take: [arrow], need: { 208: bow } },
  164: { todo: 'the dogs were shot down: erase the Arrows used by hand (the text gives no number).' },
  // the bowyer's price list, in Crowns at 4 Lune to the Crown (Arrows are 2 Lune each)
  168: {
    loot: [{ arrows: 2, cost: 1 }, { item: 'bow', cost: 8 }, { item: 'quiver', cost: 3 }, { item: 'wristGuards8', cost: 2 }, { item: 'bowCaseWood8', cost: 5 }, { item: 'bowCaseLeather8', cost: 3 }, { item: 'bowstring8', cost: 1 }],
    need: { 304: { item: 'silverBow' } },
  },
  169: { fight: { with: 'none', mindforce: 2 } },
  // the potion that treats Paido is used up
  178: { todo: potionUsed },
  331: { todo: potionUsed },
  349: { todo: potionUsed },
  182: { take: [arrow] },
  183: { give: [{ item: 'paidoSword' }], fight: { with: 'paidoSword', drain: 2 }, todo: spirit + ' Ignore the ENDURANCE the Helghast loses in the first round.' },
  187: { take: [{ weapons: 'one' }], todo: 'the weapon you prodded the creature with is the one crushed.' },
  189: { need: { 287: sommerswerd, 13: { item: 'sommerswerd', not: true } } },
  191: { give: [{ item: 'vial8' }] },
  194: { todo: 'to go on down the shaft you need a Lantern, a Torch with a Tinderbox, or a Kalte Firesphere; with none of them take the way in the dark.' },
  195: { need: { 323: bow } },
  196: { take: [arrow] },
  199: { todo: 'you may halve every ENDURANCE point you lose in this fight, as Paido fights beside you.' },
  201: { loot: [{ item: 'sword' }, { item: 'bow' }, { arrows: 3 }, { meal: 2 }] },
  202: { loot: [{ item: 'lodestone' }] },
  204: { need: { 22: { item: 'mapTharro8' } } },
  206: { need: { 246: bow } },
  207: { take: [fireseed] },
  208: { take: [arrow] },
  209: { bowShot: { 162: [0, 6], 303: [7, 99] } },
  212: { need: { 17: bow } },
  214: { todo: 'an edged weapon (Sword, Dagger, Axe, Spear, Short Sword, Broadsword) goes to 235; a Mace, Warhammer, Quarterstaff or Bow goes to 187.' },
  215: { take: [arrow] },
  225: { take: [fireseed] },
  226: { ep: -3 },
  228: { loot: [{ item: 'larnuma' }] },
  230: { ep: -8 },
  242: { todo: 'if you have a Lodestone, a Jewelled Mace or a Silver Helm, you may swap it for the Grey Crystal Ring by hand.' },
  246: { bowShot: { 184: [0, 4], 4: [5, 7], 213: [8, 99] } },
  248: { need: { 39: bow } },
  251: { todo: 'ignore the ENDURANCE you lose in the first round only.' },
  252: { todo: 'you fight unarmed for the first two rounds, then with your weapon.' },
  257: { todo: 'only two rounds are fought: after them, if both still stand, turn to the section the text names (use the Turn to section box).' },
  258: { ep: -8, take: [{ weapons: 'one' }], todo: 'the weapon you struck the fireball with is the one destroyed.' },
  260: { need: { 34: { item: 'meal' } } },
  261: { need: { 349: remedy } },
  268: { need: { 178: remedy } },
  317: { need: { 331: remedy } },
  269: { todo: 'the riddler takes the fourth Special Item on your list (the last if you have fewer than four; the first Backpack Item if you have none): remove it by hand.' },
  272: { need: { 28: bow, 207: fireseed } },
  275: { need: { 8: sommerswerd, 101: { item: 'sommerswerd', not: true } } },
  28: { bowShot: { 38: [-99, 4], 125: [5, 99] } },
  274: { ep: 3 },
  287: { fight: { undead: true } },
  290: { need: { 97: { item: 'dagger' }, 132: { item: 'dagger', not: true } } },
  294: { take: [{ item: 'meal' }] },
  298: { todo: 'unless you have Huntmastery, take 3 off your COMBAT SKILL for the first two rounds only.' },
  305: { need: { 164: bow } },
  306: { loot: [{ item: 'mapTharro8' }, { meal: 1 }, { item: 'axe' }] },
  308: { fight: { with: 'sommerswerd', undead: true, drain: 2 }, todo: spirit },
  30: { fight: { with: 'sommerswerd', undead: true, drain: 2 }, todo: spirit },
  310: { bowShot: { 184: [0, 8], 213: [9, 99] } },
  312: { loot: [{ item: 'giakScroll' }] },
  316: { need: { 139: { gold: 30, spend: true } } },
  321: { loot: sacks },
  323: { take: [arrow], todo: 'you fight unarmed for the first two rounds, then with your weapon.' },
  325: { ep: -3 },
  333: { fight: { mindforce: 2 } },
  337: { ep: -3 },
  339: { todo: 'unless you have Nexus and the rank of Primate, take 8 off your COMBAT SKILL for this fight (the gas).' },
  341: { need: { 215: bow, 33: fireseed } },
  33: { take: [fireseed] },
  348: { need: { 29: { item: 'lodestone' }, 170: { item: 'lodestone', not: true } } },
};

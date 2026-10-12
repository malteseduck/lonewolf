/* Book 5's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand (see items-01fftd.js for the fields, items-02fotw.js for the later ones, and
   docs/reference/items.md for how). Nothing new in the fields. Notes on this book:
     - He is captured early (69) and loses everything he carries; the page cannot remember it, so
       the sections that hand it back (14) leave that to the player, who notes it down at 69.
     - Limbdeath (the dead arm, from 81 on) costs 3 COMBAT SKILL and bars a shield; the Oede herb
       cures it and gives the points back. Where it matters the table leaves it to the player.
     - Several fights count only some rounds (the first rounds unscored, a round limit, one round).
       The engine has no per-round rules, so those are todos.
     - A Black Crystal Cube is a trap to keep (it betrays him at 229); it is still offered, as the
       text offers it.
     - The Oede herb here heals 10; its id is suffixed because Books 8 and 10 carry another Oede.
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  oedeHerb: { name: 'Oede Herb', kind: 'backpack', glyph: 'herbs-bundle', heal: 10, about: 'A rare herb that cures many diseases. Swallowed after a fight it restores 10 ENDURANCE.' },
  larnumaOil: { name: 'Larnuma Oil', kind: 'backpack', glyph: 'health-potion', heal: 2, about: 'Restores 2 ENDURANCE per dose, after a fight.' },
  rendalim: { name: 'Rendalim’s Elixir', kind: 'backpack', glyph: 'health-potion', heal: 6, about: 'Restores 6 ENDURANCE per dose, after a fight.' },
  gallowbrush: { name: 'Potion of Gallowbrush', kind: 'backpack', glyph: 'round-bottom-flask', about: 'Puts the drinker to sleep for an hour or two per dose.' },
  graveweedTincture: { name: 'Tincture of Graveweed', kind: 'backpack', glyph: 'round-bottom-flask', about: 'Makes whoever drinks it sick and costs 2 ENDURANCE per dose. It must be this tincture where the text asks for it (239).' },
  calacenaTincture: { name: 'Tincture of Calacena', kind: 'backpack', glyph: 'round-bottom-flask', about: 'Brings terrifying hallucinations for an hour or two per dose.' },
  kourshah: { name: 'Bottle of Kourshah', kind: 'backpack', glyph: 'wine-bottle', heal: 4, about: 'Lime-green mountain wine; enough left to restore 4 ENDURANCE.' },
  blowpipe: { name: 'Blowpipe', kind: 'backpack', glyph: 'bamboo', about: 'Fires drugged darts. It needs a Sleep Dart to be of any use.' },
  sleepDart: { name: 'Sleep Dart', kind: 'backpack', glyph: 'arrowhead', about: 'One dart for the Blowpipe: whoever it hits falls unconscious.' },
  jakanBow: { name: 'Jakan Bow', kind: 'weapon', glyph: 'pocket-bow', ranged: true, about: 'A fisherman’s hunting bow. It shoots only with an Arrow, and not hand to hand. The one Arrow with it is used at 56; the page does not count Arrows here.' },
  canteen5: { name: 'Canteen of Water', kind: 'backpack', glyph: 'water-flask', about: 'Water for the road.' },
  towel: { name: 'Towel', kind: 'backpack', glyph: 'towel', about: 'Takes the room of two Backpack Items because of its size; the page counts one.' },
  prism5: { name: 'Prism', kind: 'backpack', glyph: 'prism', about: 'Splits and turns a beam of light; it opens the stone door at 395.' },
  silverComb: { name: 'Silver Comb', kind: 'backpack', glyph: 'comb' },
  hourglass: { name: 'Hourglass', kind: 'backpack', glyph: 'hourglass' },
  gaolersKeys: { name: 'Gaoler’s Keys', kind: 'special', glyph: 'key', about: 'Worn on the belt. They open the locked door at 122.' },
  copperKey5: { name: 'Copper Key', kind: 'special', glyph: 'skeleton-key', about: 'Worn in a pocket. It opens the garden door at 215.' },
  herbPad: { name: 'Herb Pad', kind: 'special', glyph: 'herbs-bundle', about: 'A pouch of sweet herbs held over the mouth to keep out foul air.' },
  jewelledMace: { name: 'Jewelled Mace', kind: 'special', glyph: 'mace-head', weapon: ['mace'], about: 'A silver mace set with emeralds and diamonds, tucked in the belt. It is enchanted: +5 COMBAT SKILL against the Dhorgaan (253, by hand). It fights as a mace.' },
  blackSash: { name: 'Black Sash', kind: 'special', glyph: 'belt-buckles', about: 'Worn over the tunic as a mark of mourning for the dead Zakhan; it lets you pass for a Vassagonian in the tavern at 188.' },
  brassWhistle: { name: 'Brass Whistle', kind: 'special', glyph: 'whistle', about: 'Worn on a chain round the neck.' },
  blackCrystalCube: { name: 'Black Crystal Cube', kind: 'special', glyph: 'cube', about: 'A Drakkar’s trinket. It is a tracking beacon for the Darklord’s riders: keeping it betrays you at 229.' },
};

const spend = (gold) => ({ gold, spend: true });
const sommerswerd = { item: 'sommerswerd' };
const notSommerswerd = { item: 'sommerswerd', not: true };
const star = { item: 'crystalStar', ever: true };
const notStar = { item: 'crystalStar', ever: true, not: true };
const cube = { item: 'blackCrystalCube' };
const notCube = { item: 'blackCrystalCube', not: true };
const sash = { item: 'blackSash' };
const notSash = { item: 'blackSash', not: true };
const shop = (list) => list.map(([item, cost]) => ({ item, cost }));
const firstThree = 'the first three rounds are to the enemy’s surprise: take no ENDURANCE loss in them. The engine does not.';
const lyingDown = 'you are on the ground: take 2 off your COMBAT SKILL for the first 3 rounds only. The engine does not.';
const halfBack = 'when the fight is over, win or evade, add back half the ENDURANCE you lost in it (rounded down). The page does not track this.';
const kwaraz = 'a Kwaraz is weak against the mind: with Mindblast the bonus here is 4 instead of 2, so add 2 more by hand.';
const arm = 'if you have lost the use of an arm (from 81), take 3 off the number you draw.';

export const SECTIONS = {
  // the guard's sword is already in his hand when this fight starts, so he is not unarmed
  4: { give: [{ item: 'sword' }], todo: 'ENDURANCE the guard loses in the first round does not count (you only parry): ignore it.' },
  2: { loot: [{ item: 'oedeHerb' }], todo: 'if the dead arm (Limbdeath, from 81) is cured by the herb, give back the 3 COMBAT SKILL taken at 166.' },
  3: { loot: [{ gold: 4 }, { item: 'dagger' }, { item: 'sword' }, { item: 'alether' }, { item: 'blowpipe' }, { item: 'sleepDart' }] },
  8: { ep: -2 },
  14: { todo: 'he gets back everything taken at 69 (Weapons, Special Items, Backpack and its contents, Gold Crowns): put them back by hand from your own note.' },
  16: { loot: [{ item: 'rope' }, { item: 'tinderbox' }] },
  19: { todo: 'the guards want two Backpack Items (not Meals): drop two to pass. With fewer than two you cannot go this way.' },
  20: { todo: halfBack },
  22: { ep: -8, need: { 107: { disc: 'healing' } } },
  23: { ep: -1, todo: `${arm} Hunting adds 2 as usual.` },
  27: { loot: shop([['larnumaOil', 3], ['potion', 5], ['rendalim', 7]]) },
  29: { take: [{ item: 'rope' }] },
  31: { need: { 143: { item: ['firesphere', 'tinderbox'] }, 183: { item: ['firesphere', 'tinderbox'], not: true } } },
  34: { ep: -1 },
  35: { loot: [{ item: 'jewelledMace' }, { item: 'copperKey5' }] },
  38: { ep: -1 },
  40: { ep: -2, take: [{ gold: 'all' }], todo: 'you also lose one Backpack Item of your choice: drop it in the inventory.' },
  50: { ep: -2 },
  51: { ep: -1 },
  52: { loot: [{ gold: 4 }, { item: 'gaolersKeys' }, { item: 'dagger' }, { item: 'sword' }] },
  56: { loot: [{ item: 'jakanBow' }] },
  57: { todo: 'if you have ever fought an Elix in an earlier adventure, add 2 to your COMBAT SKILL for this fight.' },
  63: { todo: 'from here on lose 2 ENDURANCE for every section you pass, until you find and swallow a Potion of Laumspur; at 0 you die. The page does not count this.' },
  64: { todo: kwaraz },
  67: { loot: [{ item: 'quarterstaff' }] },
  // everything he carries is taken, however he came here (10, 25, 161, 176)
  69: { take: [{ weapons: 'all' }, { special: 'all' }, { backpack: 'all' }, { gold: 'all' }], todo: 'note down what was taken: you get it back at 14.' },
  71: { loot: [{ item: 'towel' }] },
  72: { ep: -1 },
  86: { ep: -1 },
  93: { ep: 1 },
  100: { loot: [{ item: 'prism5' }, { item: 'copperKey5' }] },
  101: { loot: [{ gold: 4 }, { item: 'dagger' }, { item: 'sword' }, { item: 'alether' }, { item: 'blowpipe' }, { item: 'sleepDart' }] },
  102: { loot: [{ item: 'sword' }, { item: 'dagger' }, { item: 'warhammer' }, { gold: 6 }, { item: 'gaolersKeys' }] },
  103: { ep: 2 },
  106: { todo: lyingDown },
  108: { ep: -2 },
  110: { todo: kwaraz },
  111: { loot: [{ gold: 3 }, { item: 'copperKey5' }] },
  119: { todo: firstThree },
  122: { need: { 136: { item: 'gaolersKeys' }, 26: { item: 'gaolersKeys', not: true } } },
  127: { todo: 'if the number plus 10 is more than your COMBAT SKILL the door holds and you lose 1 ENDURANCE; if it is equal or less the lock bursts.' },
  128: { need: { 29: { item: 'rope' } } },
  130: { ep: 1, give: [{ item: 'herbPad' }] },
  131: { loot: [{ item: 'silverComb' }, { item: 'hourglass' }, { item: 'dagger' }, { item: 'potion' }, { item: 'prism5' }, { meal: 3 }] },
  135: { todo: halfBack },
  154: { loot: shop([['alether', 4], ['gallowbrush', 2], ['potion', 5], ['larnumaOil', 3], ['graveweedTincture', 1], ['calacenaTincture', 2]]) },
  159: { ep: -2, todo: lyingDown },
  161: { todo: 'restore half the ENDURANCE you lost in the combat (rounded down). The page does not track this.' },
  162: { ep: -1, todo: 'with a dead arm you cannot fight the Steamspiders. Otherwise you may fight them, or instead climb past: the number you draw is the ENDURANCE you lose (0 counts as 10).' },
  164: { ep: -1 },
  166: { cs: -3, todo: 'while the arm is dead you cannot use a shield. The 3 COMBAT SKILL come back if it is cured (2).' },
  169: { loot: [{ item: 'blackSash', cost: 2 }] },
  182: { loot: [{ item: 'spear' }, { item: 'broadsword' }] },
  183: { ep: -2 },
  188: { need: { 172: sash, 72: notSash } },
  192: { ep: -2 },
  207: { loot: [{ gold: 8 }, { item: 'brassWhistle' }] },
  208: { need: { 321: { item: 'oedeHerb' } } },
  211: { ep: 2, loot: [{ item: 'kourshah', cost: 5 }] },
  212: { need: { 349: sommerswerd, 355: notSommerswerd } },
  215: { need: { 246: { item: 'copperKey5' }, 301: { item: 'copperKey5', not: true } } },
  221: { need: { 336: star, 275: notStar } },
  224: { need: { 319: { item: 'onyxMedallion' } } },
  237: { ep: 1 },
  238: { ep: -1 },
  239: { need: { 260: { item: 'graveweedTincture' } } },
  240: { fight: { double: true } },
  244: { todo: 'only one round is fought: the way on follows who lost more ENDURANCE in it, or neither.' },
  248: { need: { 328: spend(5) } },
  251: { ep: -6 },
  253: { todo: 'with the Jewelled Mace add 5 to your COMBAT SKILL for this fight.' },
  254: { ep: -2 },
  255: { loot: [{ item: 'blackCrystalCube' }] },
  260: { take: [{ item: 'graveweedTincture' }] },
  264: { need: { 315: sommerswerd, 299: notSommerswerd }, todo: 'unless you have Mindshield, lose 2 ENDURANCE.' },
  265: { need: { 397: spend(1) } },
  270: { todo: 'you lose 2 Backpack Items of your choice; with none, a Weapon and a Special Item instead. Drop them in the inventory.' },
  273: { ep: -1 },
  276: { need: { 326: spend(5) } },
  278: { ep: -3 },
  281: { loot: [{ item: 'jewelledMace' }] },
  284: { ep: -3 },
  285: { ep: -2 },
  287: { ep: -1 },
  288: { need: { 399: star, 294: notStar } },
  289: { need: { 311: sommerswerd, 219: notSommerswerd } },
  290: { loot: [{ item: 'blackCrystalCube' }] },
  297: { ep: -4 },
  300: { need: { 229: cube, 247: notCube } },
  302: { ep: 3 },
  310: { give: [{ item: 'copperKey5' }], loot: [{ item: 'canteen5', or: 'guardroom' }, { item: 'broadsword', or: 'guardroom' }] },
  313: { todo: 'to go to 325 you need both the Blowpipe and a Sleep Dart; if you lack either, go to 282.' },
  316: { todo: 'surprised: take 2 off your COMBAT SKILL for the first 3 rounds only. The engine does not.' },
  320: { meal: true, noHunt: true },
  321: { take: [{ item: 'oedeHerb' }] },
  325: { take: [{ item: 'sleepDart' }] },
  329: { need: { 305: { item: 'rope' }, 387: { item: 'rope', not: true } } },
  333: { need: { 258: sommerswerd, 348: notSommerswerd } },
  341: { give: [{ item: 'copperKey5' }], loot: [{ item: 'canteen5' }, { item: 'broadsword' }] },
  344: { need: { 321: { item: 'oedeHerb' } } },
  350: { ep: -3, take: [{ item: 'sommerswerd' }] },
  354: { ep: -2 },
  355: { fight: { mindforce: 2 } },
  357: { todo: 'if you ever draw a 1 during this fight you lose your balance and fall: go to 293 at once.' },
  359: { ep: 2 },
  362: { need: { 237: spend(1) } },
  368: { ep: -3 },
  369: { ep: -6 },
  370: { ep: -3, fight: { double: true } },
  371: { ep: -4 },
  372: { ep: -1 },
  379: { ep: -6 },
  380: { ep: -2, need: { 229: cube, 247: notCube } },
  382: { need: { 399: star, 294: notStar } },
  385: { ep: -12 },
  388: { loot: shop([['sword', 5], ['dagger', 3], ['broadsword', 9]]) },
  393: { todo: 'unless you have Mindshield, lose 2 ENDURANCE; and take 2 off your COMBAT SKILL for the first round only. The engine does not.' },
  395: { need: { 233: { item: 'prism5' }, 245: { item: 'blueTriangle' }, 298: { item: ['prism5', 'blueTriangle'], not: true } } },
  400: { todo: 'if the Sommerswerd was lost at 350, he gets it back now: add it by hand.' },
  280: { todo: 'ignore all of your own ENDURANCE losses in the first round.' },
};

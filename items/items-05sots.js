/* Book 5's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand (see items-01fftd.js for the fields, items-02fotw.js for the later ones, and
   docs/reference/items.md for how). Notes on this book:
     - He is captured early (69) and loses everything he carries; it is kept (stash 'cell') and
       given back at 14. He keeps the Backpack itself here, as the engine cannot give that back.
     - Limbdeath (the dead arm, from 166) is a mark: 3 COMBAT SKILL less and no shield, until the
       Oede herb cures it (2).
     - Being beaten by the Horseman (20) or the Sharnazim (135) is capture (161), not death (`lose`).
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
  blowpipe: { name: 'Blowpipe', kind: 'backpack', glyph: 'straight-pipe', about: 'Fires drugged darts. It needs a Sleep Dart to be of any use.' },
  sleepDart: { name: 'Sleep Dart', kind: 'backpack', glyph: 'dart', about: 'One dart for the Blowpipe: whoever it hits falls unconscious.' },
  jakanBow: { name: 'Jakan Bow', kind: 'weapon', glyph: 'pocket-bow', ranged: true, about: 'A fisherman’s hunting bow. It shoots only with an Arrow, and not hand to hand. The one Arrow with it is used at 56; the page does not count Arrows here.' },
  canteen5: { name: 'Canteen of Water', kind: 'backpack', glyph: 'water-flask', about: 'Water for the road.' },
  towel: { name: 'Towel', kind: 'backpack', glyph: 'towel', about: 'Takes the room of two Backpack Items because of its size; the page counts one.' },
  prism5: { name: 'Prism', kind: 'backpack', glyph: 'prism', about: 'Splits and turns a beam of light; it opens the stone door at 395.' },
  silverComb: { name: 'Silver Comb', kind: 'backpack', glyph: 'comb' },
  hourglass: { name: 'Hourglass', kind: 'backpack', glyph: 'hourglass' },
  gaolersKeys: { name: 'Gaoler’s Keys', kind: 'special', glyph: 'key', about: 'Worn on the belt. They open the locked door at 122.' },
  copperKey5: { name: 'Copper Key', kind: 'special', glyph: 'key', about: 'Worn in a pocket. It opens the garden door at 215.' },
  herbPad: { name: 'Herb Pad', kind: 'special', glyph: 'herbs-bundle', about: 'A pouch of sweet herbs held over the mouth to keep out foul air.' },
  jewelledMace: { name: 'Jewelled Mace', kind: 'special', glyph: 'flanged-mace', weapon: ['mace'], about: 'A silver mace set with emeralds and diamonds, tucked in the belt. It is enchanted: +5 COMBAT SKILL against the Dhorgaan (253). It fights as a mace.' },
  blackSash: { name: 'Black Sash', kind: 'special', glyph: 'black-belt', about: 'Worn over the tunic as a mark of mourning for the dead Zakhan; it lets you pass for a Vassagonian in the tavern at 188.' },
  brassWhistle: { name: 'Brass Whistle', kind: 'special', glyph: 'whistle', about: 'Worn on a chain round the neck.' },
  blackCrystalCube: { name: 'Black Crystal Cube', kind: 'special', glyph: 'cube', about: 'A Drakkar’s trinket. It is a tracking beacon for the Darklord’s riders: keeping it betrays you at 229.' },
};

export const MARKS = {
  limbdeath: { name: 'Limbdeath', about: 'A dead arm: 3 COMBAT SKILL less, and no shield, until the Oede herb cures it.', cs: -3, noShield: true },
  bloodPoison: { name: 'Infected wound', about: '2 ENDURANCE lost in every section until you swallow a Laumspur Potion.', ep: -2, until: 'potion' },
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
const dart = { items: ['blowpipe', 'sleepDart'] };
const lyingDown = { rounds: [{ upTo: 3, csMod: -2, note: 'On the ground' }] };
// a Kwaraz is weak against the mind: Mindblast adds 4 instead of 2
const kwaraz = { rounds: [{ psi: 2, note: 'Kwaraz' }] };
const mindshield = [{ unless: { disc: 'mindshield' }, ep: -2 }];

export const SECTIONS = {
  // the guard's sword is already in his hand when this fight starts, so he is not unarmed
  4: { give: [{ item: 'sword' }], fight: { rounds: [{ upTo: 1, foeLoss: 0, note: 'Parrying' }], won: { within: 4, to: '165', else: '180' } } },
  // the herb cures Limbdeath; the Elix fought is a flag for later books
  2: { loot: [{ item: 'oedeHerb' }], unmark: 'limbdeath', mark: 'foughtElix' },
  3: { loot: [{ gold: 4 }, { item: 'dagger' }, { item: 'sword' }, { item: 'alether' }, { item: 'blowpipe' }, { item: 'sleepDart' }] },
  8: { ep: -2 },
  14: { back: ['cell'] },
  16: { loot: [{ item: 'rope' }, { item: 'tinderbox' }] },
  // the two items handed over are lost at 137 when he came from here
  19: { need: { 137: { any: [{ packItems: 2 }] } } },
  // a win within three rounds leads to 125; after three the fight ends (82)
  // two ways out: into the sea, or surrender
  20: { fight: { stop: { after: 3, to: '82' }, won: { within: 3, to: '125', else: '82' }, lose: '161', evade: [{ after: 0, to: '142' }, { after: 0, to: '176', label: 'Surrender' }] } },
  22: { ep: -8, need: { 107: { disc: 'healing' } } },
  23: { ep: -1, rntMod: [{ plus: -3, mark: 'limbdeath', label: 'Limbdeath' }, { plus: 2, disc: 'hunting' }], ranges: { 77: [-99, -1], 192: [0, 6], 114: [7, 99] } },
  27: { loot: shop([['larnumaOil', 3], ['potion', 5], ['rendalim', 7]]) },
  29: { take: [{ item: 'rope' }] },
  31: { need: { 143: { item: ['firesphere', 'tinderbox'] }, 183: { item: ['firesphere', 'tinderbox'], not: true } } },
  34: { ep: -1 },
  35: { loot: [{ item: 'jewelledMace' }, { item: 'copperKey5' }] },
  38: { ep: -1 },
  40: { ep: -2, take: [{ gold: 'all' }, { pick: 'backpack', n: 1 }] },
  50: { ep: -2 },
  51: { ep: -1 },
  52: { loot: [{ gold: 4 }, { item: 'gaolersKeys' }, { item: 'dagger' }, { item: 'sword' }] },
  56: { loot: [{ item: 'jakanBow' }] },
  57: { fight: { rounds: [{ csMod: 2, if: { mark: 'foughtElix' }, note: 'Fought an Elix before' }] } },
  63: { mark: 'bloodPoison' },
  64: { fight: kwaraz },
  67: { loot: [{ item: 'quarterstaff' }] },
  // everything he carries is taken, however he came here (10, 25, 161, 176)
  69: { take: [{ weapons: 'all', stash: 'cell' }, { special: 'all', stash: 'cell' }, { backpack: 'items', stash: 'cell' }, { gold: 'all', stash: 'cell' }] },
  71: { loot: [{ item: 'towel' }] },
  72: { ep: -1 },
  86: { ep: -1 },
  93: { ep: 1 },
  100: { loot: [{ item: 'prism5' }, { item: 'copperKey5' }] },
  101: { loot: [{ gold: 4 }, { item: 'dagger' }, { item: 'sword' }, { item: 'alether' }, { item: 'blowpipe' }, { item: 'sleepDart' }] },
  102: { loot: [{ item: 'sword' }, { item: 'dagger' }, { item: 'warhammer' }, { gold: 6 }, { item: 'gaolersKeys' }] },
  103: { ep: 2 },
  106: { fight: lyingDown },
  108: { ep: -2 },
  110: { fight: kwaraz },
  111: { loot: [{ gold: 3 }, { item: 'copperKey5' }] },
  119: { fight: { rounds: [{ upTo: 3, heroLoss: 0, note: 'Surprise' }] } },
  122: { need: { 136: { item: 'gaolersKeys' }, 26: { item: 'gaolersKeys', not: true } } },
  // the number plus 10 against his COMBAT SKILL; the bruise is lost here, as 93 is reached from elsewhere
  127: { rntMod: [{ plus: 10 }, { vsCS: true }], ranges: { 159: [-99, 0], 93: [1, 99] }, rolls: [{ range: [1, 99], ep: -1 }] },
  128: { need: { 29: { item: 'rope' } } },
  // half of what the fight at 135 cost, only when won (a loss is healed at 161)
  130: { ep: 1, give: [{ item: 'herbPad' }], when: [{ came: ['135'], healLost: 0.5 }] },
  131: { loot: [{ item: 'silverComb' }, { item: 'hourglass' }, { item: 'dagger' }, { item: 'potion' }, { item: 'prism5' }, { meal: 3 }] },
  135: { fight: { lose: '161' } },
  // the guards' price at 19
  137: { when: [{ came: ['19'], take: [{ pick: 'packItems', n: 2 }] }] },
  154: { loot: shop([['alether', 4], ['gallowbrush', 2], ['potion', 5], ['larnumaOil', 3], ['graveweedTincture', 1], ['calacenaTincture', 2]]) },
  159: { ep: -2, fight: lyingDown },
  161: { when: [{ healLost: 0.5 }] },
  // climbing past instead of fighting: the number drawn is lost
  162: { ep: -1, rolls: [{ range: [0, 9], ep: 'drawn' }], fight: { byHand: 'you climb past the nest instead of fighting' }, todo: 'to climb past, stop the fight before the first round, then draw (not after a fight won). With a dead arm you must climb.' },
  164: { ep: -1 },
  166: { mark: 'limbdeath' },
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
  244: { fight: { stop: { after: 1, by: { hero: '347', foe: '327', even: '271' } } } },
  248: { need: { 328: spend(5) } },
  251: { ep: -6 },
  253: { fight: { rounds: [{ csMod: 5, if: { item: 'jewelledMace' }, note: 'Jewelled Mace' }] } },
  254: { ep: -2 },
  255: { loot: [{ item: 'blackCrystalCube' }] },
  260: { take: [{ item: 'graveweedTincture' }] },
  264: { need: { 315: sommerswerd, 299: notSommerswerd }, when: mindshield },
  265: { need: { 397: spend(1) } },
  270: { take: [{ pick: 'backpack', n: 2, else: [{ pick: 'weapons', n: 1 }, { pick: 'special', n: 1 }] }] },
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
  313: { need: { 325: { any: [dart] }, 282: { any: [{ not: dart }] } } },
  316: { fight: { rounds: [{ upTo: 3, csMod: -2, note: 'Surprise' }] } },
  320: { meal: true, noHunt: true },
  321: { take: [{ item: 'oedeHerb' }] },
  325: { take: [{ item: 'sleepDart' }] },
  329: { need: { 305: { item: 'rope' }, 387: { item: 'rope', not: true } } },
  333: { need: { 258: sommerswerd, 348: notSommerswerd } },
  341: { give: [{ item: 'copperKey5' }], loot: [{ item: 'canteen5' }, { item: 'broadsword' }] },
  344: { need: { 321: { item: 'oedeHerb' } } },
  350: { ep: -3, take: [{ item: 'sommerswerd', stash: 'haakon' }] },
  354: { ep: -2 },
  355: { fight: { mindforce: 2 } },
  357: { fight: { stop: { drawn: [1], to: '293' } } },
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
  393: { when: mindshield, fight: { rounds: [{ upTo: 1, csMod: -2, note: 'Surprise' }] } },
  395: { need: { 233: { item: 'prism5' }, 245: { item: 'blueTriangle' }, 298: { item: ['prism5', 'blueTriangle'], not: true } } },
  400: { back: ['haakon'] },
  280: { fight: { rounds: [{ upTo: 1, heroLoss: 0, note: 'Speed of your attack' }] } },
};

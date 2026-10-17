/* Book 13's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand from the script's draft (see items-01fftd.js for the fields, docs/reference/book-format.md
   for the later ones, and docs/reference/items.md for how). Notes on this book:
     - Lune (Palmyrion's coin, four to a Gold Crown) are counted apart from Crowns (LW.COINS).
     - The Cener Robe and Mask are a disguise: carried in the Backpack (the Robe in two places) until he puts
       them on (292), or put on straight from the pegs (77, 304), and then worn. The page has no worn state, so
       both are Special Items outside the limit: while they are only carried, keep their three Backpack places
       free by hand. 220 takes them off for good.
     - The three Copper Keys (18, 239, 286) are one item: any of them opens the door at 347.
     - The jars of herbs at 234 and 341 hold several doses each in one Backpack place.
     - Arrows loosed where the text says outright that one flies are taken from the Quiver here; Random
       Number shots are spent by the page's own bow shot. The three shots (104, 176, 303) give Grand
       Weaponmastery with Bow +3, in place of its usual +5 (grandBow, ruling R10).
     - Junk the dead carry (tobacco, a copper bowl) is left out.
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  cenerRobe: { name: 'Cener Robe', kind: 'special', glyph: 'robe', free: true,
    about: 'A Cener Druid’s scarlet robe, part of a disguise. Carried, it takes two Backpack places (keep them free by hand); worn, none.' },
  cenerMask: { name: 'Cener Mask', kind: 'special', glyph: 'domino-mask', free: true,
    about: 'A Cener Druid’s glassy green mask, part of a disguise. Carried, it takes a Backpack place (keep it free by hand); worn, none.' },
  mapMogaruith: { name: 'Map of Mogaruith', kind: 'special', glyph: 'treasure-map', free: true, about: 'Shows the dungeon levels of Mogaruith. Kept in your tunic: takes no Special Item place.' },
  goldKey13: { name: 'Gold Key', kind: 'special', glyph: 'key' },
  copperKey13: { name: 'Copper Key', kind: 'backpack', glyph: 'key' },
  restrainer13: { name: 'Restrainer', kind: 'special', glyph: 'jigsaw-box', about: 'A tiny magical box on a chain that bent a Pit Agarashi to the will of its Vazhag keeper.' },
  volkoBerries: { name: 'Jar of Black Berries', kind: 'backpack', glyph: 'covered-jar', about: 'Volko berries from Kakush, prized by magicians: they speed up magical reactions without being changed themselves.' },
  mirror13: { name: 'Mirror', kind: 'backpack', glyph: 'mirror-mirror' },
  laumspurJar13: { name: 'Jar of Laumspur', kind: 'backpack', glyph: 'health-potion', heal: 4, doses: 5, about: 'Five doses in one jar: each restores 4 ENDURANCE, swallowed after a fight.' },
  aletherJar13: { name: 'Jar of Alether', kind: 'backpack', glyph: 'standing-potion', boost: 2, doses: 4, about: 'Four doses in one jar: each, swallowed just before a fight, gives +2 COMBAT SKILL for it.' },
  gallowbrushJar13: { name: 'Jar of Gallowbrush', kind: 'backpack', glyph: 'round-bottom-flask', doses: 2, about: 'Two doses in one jar: each induces ten hours’ sleep and costs 2 ENDURANCE.' },
  sabitoJar13: { name: 'Jar of Sabito', kind: 'backpack', glyph: 'mason-jar', doses: 2, about: 'Two doses in one jar: each lets you breathe under water.' },
  laumwortJar13: { name: 'Jar of Laumwort', kind: 'backpack', glyph: 'health-potion', heal: 2, doses: 3, about: 'Three doses in one jar: each restores 2 ENDURANCE, before or after a fight.' },
  oedeJar13: { name: 'Jar of Oede', kind: 'backpack', glyph: 'health-potion', heal: 10, about: 'One dose of the rare Oede: it cures serious diseases and restores 10 ENDURANCE, before or after a fight.' },
};

const lune = (n) => ({ coin: 'lune', n });
// what each slain Cener Druid carries
const druid = [{ item: 'dagger' }, { item: 'cenerRobe' }, { item: 'cenerMask' }, lune(20)];
const herbJars = ['laumspurJar13', 'aletherJar13', 'gallowbrushJar13', 'sabitoJar13', 'laumwortJar13', 'oedeJar13'].map((item) => ({ item }));
const table = [{ arrows: 2 }, { meal: 2 }, { item: 'dagger' }, { item: 'dagger' }, { item: 'sword' }, { item: 'mirror13' }, { item: 'rope' }];
const sommerswerd = { item: 'sommerswerd' }, noSommerswerd = { item: 'sommerswerd', not: true };
const bowArrows = (n = 1) => ({ any: [{ weapon: ['bow'], arrows: n }] });
const noBowArrows = (n = 1) => ({ any: [{ not: { weapon: ['bow'], arrows: n } }] });
const disguise = { any: [{ items: ['cenerRobe', 'cenerMask'] }] }, noDisguise = { any: [{ not: { items: ['cenerRobe', 'cenerMask'] } }] };
const nonEdged = { csMod: -4, if: { wield: ['mace', 'quarterstaff', 'warhammer'] }, note: 'Non-edged weapon' };
const longWeapon = { csMod: -3, if: { wield: ['broadsword', 'spear', 'quarterstaff'] }, note: 'Too long a weapon' };
// the Giganite may be evaded once they are down to 36 (the importer read any time)
const giganite = { evade: { foeAt: 36, to: '13' } };

export const SECTIONS = {
  2: { ep: -1 },
  3: { ep: -2 },
  4: { loot: [{ item: 'dagger' }, { item: 'cenerRobe' }, { item: 'cenerMask' }, lune(16), { item: 'sword' }] },
  6: { ep: -3 },
  10: { ep: 3 },
  16: { ep: -2, need: { 277: { item: 'baylonFungi11' }, 136: { item: 'baylonFungi11', not: true } } },
  18: { loot: [{ item: 'copperKey13' }] },
  21: { loot: [{ item: 'dagger' }, { item: 'sword' }, { item: 'broadsword' }, { item: 'bow' }, { arrows: 4 }, { item: 'quiver' }] },
  22: { ep: -4 },
  26: { ep: -2 },
  27: { fight: { rounds: [{ upTo: 3, unarmed: true, note: 'Weapon knocked away' }] } },
  // the Arrow drawn at 187 is loosed here and at 157
  31: { take: [{ arrows: 1 }] },
  38: { fight: giganite },
  39: { take: [{ arrows: 1 }] },
  43: { take: [{ arrows: 2 }] },
  47: { fight: { rounds: [nonEdged] } },
  48: { ep: -2 },
  51: { ep: -6 },
  // the number drawn plus 1 is lost
  52: { rolls: [...Array(10).keys()].map((n) => ({ range: [n, n], ep: -(n + 1) })) },
  53: { loot: druid },
  60: { loot: druid },
  63: { take: [{ at: [3, 4] }] },
  65: { ep: -12 },
  66: { loot: [{ item: 'alether' }, { meal: 1 }, { item: 'dagger' }] },
  72: { need: { 176: bowArrows() } },
  77: { give: [{ item: 'cenerRobe' }, { item: 'cenerMask' }] },
  80: { fight: giganite },
  // levering the pin: the ranges are for the total
  81: { rntMod: [{ item: 'sommerswerd', plus: 4 }, { wield: ['spear', 'broadsword'], plus: 2 }, { wield: ['quarterstaff', 'dagger'], plus: -2 }], ranges: { 275: [-99, 4], 248: [5, 99] } },
  92: { ep: -5 },
  95: { need: { 341: { item: 'mapMogaruith' }, 234: { item: 'goldKey13' }, 179: { item: ['mapMogaruith', 'goldKey13'], not: true } } },
  96: { need: { 225: bowArrows(), 74: noBowArrows() } },
  100: { fight: { won: { within: 5, to: '254', else: '37' } } },
  104: { bowShot: { 167: [0, 5], 235: [6, 99] }, grandBow: 3 },
  111: { ep: -6 },
  119: { need: { 158: disguise, 77: noDisguise } },
  121: { loot: [{ item: 'restrainer13' }] },
  // a surprise attack by an undead foe: the Sommerswerd doubles its losses
  131: { ep: -6, fight: { ambush: true, undead: true } },
  132: { need: { 221: bowArrows() } },
  136: { ep: -8 },
  145: { ep: -3 },
  146: { give: [{ item: 'mapMogaruith' }] },
  // the portcullis crushes the Backpack and all in it
  147: { take: [{ backpack: 'all' }] },
  152: { ep: -8 },
  157: { take: [{ arrows: 1 }] },
  159: { ep: -2, need: { 322: sommerswerd, 123: noSommerswerd } },
  160: { need: { 292: disguise, 193: noDisguise } },
  172: { need: { 176: bowArrows() } },
  176: { bowShot: { 232: [0, 5], 317: [6, 99] }, grandBow: 3 },
  180: { ep: -4 },
  184: { need: { 39: bowArrows() } },
  185: { ep: -2 },
  190: { need: { 104: bowArrows() } },
  191: { ep: -3 },
  199: { ep: 3 },
  210: { need: { 43: bowArrows(2), 89: noBowArrows(2) } },
  211: { ep: -3 },
  217: { ep: -5 },
  220: { take: [{ item: 'cenerRobe' }, { item: 'cenerMask' }] },
  221: { take: [{ arrows: 1 }], fight: { won: { within: 4, to: '64', else: '114' } } },
  222: { need: { 61: sommerswerd, 188: noSommerswerd } },
  225: { take: [{ arrows: 1 }] },
  227: { loot: table },
  230: { ep: 3 },
  231: { ep: -5 },
  234: { loot: herbJars },
  235: { loot: druid },
  239: { loot: [{ meal: 1 }, { item: 'copperKey13' }] },
  243: { ep: -4, fight: { rounds: [longWeapon] } },
  249: { take: [{ at: [2, 4] }] },
  250: { loot: druid },
  253: { loot: [{ item: 'dagger' }, { item: 'cenerRobe' }, lune(20), { item: 'volkoBerries' }] },
  259: { ep: 8 },
  264: { ep: -2, loot: druid },
  267: { ep: -2 },
  269: { ep: -5 },
  272: { ep: -5, fight: { rounds: [{ upTo: 1, csMod: -20, note: 'His desperate first strike' }] } },
  276: { need: { 187: bowArrows() } },
  277: { todo: 'The text does not say whether eating a chunk uses up the Baylon’s Bough Fungi: erase it by hand if you take it so.' },
  280: { need: { 126: disguise, 304: noDisguise } },
  286: { loot: [{ item: 'copperKey13' }] },
  287: { loot: [{ item: 'goldKey13' }] },
  290: { need: { 199: sommerswerd, 316: noSommerswerd } },
  291: { fight: { rounds: [{ upTo: 2, csMod: -3, ambush: true, note: 'Surprise' }] } },
  293: { ep: -2 },
  295: { fight: { rounds: [longWeapon] } },
  297: { loot: [{ item: 'restrainer13' }] },
  298: { ep: -4 },
  299: { ep: -4 },
  // Kai-surge adds 10 here, not 8; its lesser Mindblast is unchanged
  301: { fight: { rounds: [{ mind: 2, csMod: 2, if: { disc: 'kaiSurge' }, note: 'Kai-surge tells badly' }] } },
  303: { bowShot: { 99: [0, 4], 250: [5, 99] }, grandBow: 3 },
  304: { give: [{ item: 'cenerRobe' }, { item: 'cenerMask' }] },
  314: { need: { 39: bowArrows() } },
  316: { ep: -6 },
  317: { loot: druid },
  319: { loot: [{ item: 'sword' }, { item: 'dagger' }, lune(16), { item: 'rope' }] },
  325: { fight: { won: { within: 4, to: '64', else: '114' } } },
  329: { ep: -8, take: [{ at: [1, 3] }] },
  334: { loot: druid },
  339: { fight: { rounds: [nonEdged] } },
  340: { loot: table },
  341: { loot: herbJars },
  343: { ep: -6 },
  344: { ep: -10 },
  347: { need: { 102: { item: 'copperKey13' }, 261: { item: 'copperKey13', not: true } } },
  349: { loot: druid },
};

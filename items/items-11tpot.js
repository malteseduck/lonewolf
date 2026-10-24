/* Book 11's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand (see items-01fftd.js for the fields, items-02fotw.js for the later ones, and
   docs/reference/items.md for how; the later fields are in docs/reference/book-format.md). Notes on this book:
     - The Ironheart Broadsword is a Special Item that fights as a broadsword. Its +8 is given only
       at the one fight the text states it for (204), as that fight's weaponCs, so he fights with it
       there and his skill with another weapon does not add; he can only reach 204 by holding it. It
       goes back to its keepers at 144.
     - Surprise penalties for the first rounds are spared by Huntmastery where the text says so; the
       rounds fought unarmed (10, 220) are not marked as ambushes.
     - The Obsidian Seal is given at 210 and handed over at 87. The book's own map is given at 233
       (a new character's kit has none).
     - "Laumspur" at 234 is any Laumspur herb or potion of the series; the one used is spent there.
     - Positions in the Backpack list (179, 338) count Meals as the Action Chart lists them; at 73 the
       Meals are lost apart, so the positions there are of the other items.
     - The Senara herb is plentiful: the page offers as many as the Backpack could hold.
     - At 170 the Meal is eaten on the way to 231 (the Yoacor food at 119 stands in for it), so 231 asks for it.
     - Every "If you have a Bow" choice needs a Bow and an Arrow (the Silver Bow of Duadon carried from Book 6
       counts). Arrows fired without a Random Number (72, 77, 256, 296, 339) are taken on arrival; the shots
       that draw a number are bowShot, which spends its own Arrow.
     - 'baylonTomb11' marks a visit to Baylon's Tomb (166): 298's evasion to it is open only before one.
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  obsidianSeal11: { name: 'Obsidian Seal', kind: 'special', glyph: 'wax-seal', about: 'A pyramid of black stone from Serocca. Show it to the Meledorians and they will not attack you.' },
  map11: { name: 'Map', kind: 'special', glyph: 'treasure-map', about: 'Serocca’s map of the Nahgoth Forest and the way to Haagadar. Carried inside your tunic.' },
  ironheartBroadsword: { name: 'Ironheart Broadsword', kind: 'special', glyph: 'broadsword', weapon: ['broadsword'], about: 'A magical blade from the Grand Sepulchre, set with rubies, emeralds and korlinium. It fights as a broadsword; the +8 is given at the one fight the text names.' },
  ookorCharm: { name: 'Ookor Charm', kind: 'special', glyph: 'feathered-wing', about: 'A wooden charm in the shape of a bird’s wing, given by an old Ookor fortune teller. Strapped to your Backpack.' },
  silverRod11: { name: 'Silver Rod', kind: 'special', glyph: 'crescent-staff', about: 'A gleaming rod found with the bones in a cairn. Carried through your belt.' },
  silverFlask11: { name: 'Silver Flask', kind: 'backpack', glyph: 'round-bottom-flask', heal: 4, doses: 2, about: 'Charmed wine from Baylon’s sarcophagus. Two draughts are left; each restores 4 ENDURANCE.' },
  khetuSpores11: { name: 'Khetu Spores', kind: 'backpack', glyph: 'mushroom-gills', about: 'Orange spore pods from the Nahgoth Forest floor. Deadly poison.' },
  haina11: { name: 'Haina', kind: 'backpack', glyph: 'herbs-bundle', heal: 5, about: 'A red flower for battle-wounds: restores 5 ENDURANCE, and only after a fight.' },
  senara11: { name: 'Senara', kind: 'backpack', glyph: 'herbs-bundle', heal: 3, meal: true, about: 'Buds of a rare herb, abundant in Vhozada. One serving restores 3 ENDURANCE; it is eaten as a Meal when you have none.' },
  yoacorFood11: { name: 'Yoacor Food', kind: 'backpack', glyph: 'meal', heal: 3, meal: true, about: 'Strange, nourishing Yoacor fare, enough for one Meal. It restores 3 ENDURANCE when eaten.' },
  baylonFungi11: { name: 'Baylon’s Bough Fungi', kind: 'backpack', glyph: 'mushrooms', about: 'Fungi scraped from the bark of a fallen tree. They draw out a blowpipe poison.' },
  curvedSword11: { name: 'Curvy-bladed Sword', kind: 'weapon', weapon: ['sword'], glyph: 'shining-sword', about: 'The scarlet warrior’s jewelled sword, engraved with a fiery dragon: the mark of Haagadar. The text calls it a sword, so it fights as one (ruling R17).' },
  conchShell11: { name: 'Conch Shell', kind: 'backpack', glyph: 'spiral-shell', about: 'Taken from the Ookor you killed.' },
};

// the number drawn is the loss, 0 counting as 10
const loss = () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], ep: -(n || 10) }));
// the number drawn is the gain, 0 counting as 10
const gain = () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], ep: n || 10 }));
const sommerswerd = { item: 'sommerswerd' };
const ironheart = { item: 'ironheartBroadsword' };
// anyone with a Bow of either kind and an Arrow to shoot
const bows = ['bow', 'silverBow'];
const bow = { any: [{ item: bows, arrows: 1, label: 'a Bow and an Arrow' }] };
const shot = [{ arrows: 1 }];
const rod = { item: 'silverRod11' };
const light = { any: [{ item: 'firesphere' }, { item: 'lantern' }, { items: ['torch', 'tinderbox'] }] };
// the fight with the scarlet warrior ends when he is down to 20; killing him outright leads elsewhere
const scarlet = { fight: { stop: { foeAt: 20, to: '306' }, to: '123' } };
// a surprise attack's first rounds, spared by Huntmastery
const surprise = (upTo, csMod) => ({ fight: { rounds: [{ upTo, csMod, unless: { disc: 'huntmastery' }, note: 'Surprise attack' }] } });
// the tentacles' poison: 2 more for every wound, unless Curing at Mentora
const tentacles = { rounds: [{ heroPlus: 2, unless: { disc: 'curing', rank: 7 } }] };
// any Laumspur, Laumwort or Oede herb
const remedy = ['laumspurHerb', 'potion', 'rendalimPotion', 'redLaumspur', 'laumspur3', 'jarLaumspur7', 'laumwort', 'oedeHerb'];

export const SECTIONS = {
  1: { rolls: loss() },
  2: { take: [{ item: 'fireseed' }] },
  5: { loot: [{ meal: 1 }, { meal: 1 }, { meal: 1 }] },
  7: { loot: [{ item: 'ironheartBroadsword' }] },
  8: { give: [{ item: 'curvedSword11' }] },
  10: { fight: { rounds: [{ upTo: 2, unarmed: true }] } },
  12: { take: [{ meals: 'all' }] },
  18: { loot: [{ item: 'ookorCharm' }] },
  22: scarlet,
  30: { ep: -5 },
  34: { fight: tentacles },
  36: { loot: [{ item: 'khetuSpores11' }] },
  40: { need: { 341: sommerswerd, 204: ironheart, 111: { item: ['sommerswerd', 'ironheartBroadsword'], not: true } } },
  54: { need: { 107: sommerswerd, 221: { item: 'sommerswerd', not: true } } },
  59: { need: { 339: bow } },
  60: { ep: -2 },
  68: surprise(2, -3),
  72: { take: shot },
  73: { take: [{ meals: 'half' }, { at: [2, 4], from: 'packItems' }] },
  74: { loot: [{ item: 'haina11' }], noHunt: true },
  76: { bowShot: { 249: [0, 4], 171: [5, 8], 113: [9, 99] } },
  77: Object.assign({ take: shot }, surprise(2, -3)),
  81: { ep: -5 },
  83: { ep: -2 },
  86: { ep: -2 },
  87: { take: [{ item: 'obsidianSeal11' }] },
  92: { need: { 296: bow } },
  97: scarlet,
  101: { ep: 'full' },
  102: { ep: -3 },
  118: { when: [{ unless: { any: [{ disc: 'curing', rank: 7 }, { disc: 'nexus', rank: 4 }] }, ep: -5 }] },
  119: { ep: 3, loot: [{ item: 'yoacorFood11' }] },
  120: { ep: -5 },
  121: { loot: [{ item: 'khetuSpores11' }] },
  126: { need: { 61: light } },
  129: { loot: Array(8).fill({ item: 'senara11' }) },
  134: { need: { 198: { item: 'rope' } } },
  135: { need: { 256: bow } },
  141: { need: { 284: bow } },
  143: { noHunt: true },
  166: { mark: 'baylonTomb11' },
  144: { take: [{ item: 'ironheartBroadsword' }] },
  146: { ep: -4, loot: [{ item: 'baylonFungi11' }] },
  151: { bowShot: { 147: [0, 4], 326: [5, 8], 17: [9, 99] } },
  158: { need: { 77: bow } },
  168: { need: { 12: { any: [{ meals: 4 }] }, 327: { any: [{ not: { meals: 4 } }] } } },
  169: { ep: -10 },
  170: { meal: false },
  174: { ep: -1 },
  177: { loot: [{ item: 'silverRod11' }] },
  179: { take: [{ at: [3, 4, 5] }] },
  184: { need: { 72: bow } },
  191: { ep: -3, take: [{ item: 'silverRod11' }] },
  193: { bowShot: { 95: [0, 4], 19: [5, 8], 241: [9, 99] } },
  198: { take: [{ backpack: 'all' }] },
  200: { need: { 32: bow } },
  201: {
    ep: -3,
    fight: { noShield: true, rounds: [{ csMod: -2, if: { wield: ['broadsword', 'quarterstaff', 'spear'] }, note: 'Long weapon' }], won: { within: 3, to: '254', else: '37' } },
  },
  203: { loot: [{ item: 'spear' }, { item: 'spear' }, { item: 'sword' }, { item: 'sword' }, { item: 'axe' }, { meal: 1 }, { meal: 1 }, { meal: 1 }, { item: 'conchShell11' }] },
  204: { fight: { weaponCs: { ironheartBroadsword: 8 } } },
  206: scarlet,
  208: { ep: -3 },
  210: { give: [{ item: 'obsidianSeal11' }] },
  216: { ep: -10 },
  217: { when: [{ unless: { disc: 'nexus' }, ep: -3 }] },
  220: { fight: { rounds: [{ upTo: 1, unarmed: true }] } },
  231: { meal: true, loot: [{ item: 'sword' }] },
  233: { give: [{ item: 'map11' }] },
  234: { ep: -6, need: { 277: { item: remedy, spend: true }, 11: { item: remedy, not: true } } },
  238: { ep: 'full' },
  242: { ep: -4 },
  244: { rntMod: [{ item: 'rope', plus: 1 }, { disc: 'huntmastery', rank: 4, plus: 3 }], ranges: { 239: [0, 4], 279: [5, 99] } },
  246: { need: { 213: { disc: ['divination', 'huntmastery', 'pathsmanship'] } } },
  256: Object.assign({ take: shot }, surprise(1, -2)),
  260: { need: { 177: light } },
  261: { ep: 4, loot: [{ item: 'silverFlask11' }] },
  267: { loot: [{ item: 'sword' }, { item: 'spear' }, { item: 'mace' }, { item: 'dagger' }, { arrows: 6 }, { item: 'bow' }, { item: 'quiver' }, { pack: true }, { item: 'quarterstaff' }, { item: 'shortSword' }] },
  269: { ep: -4 },
  // a fight of the mind: 1 for each Magnakai Discipline past three, the rings 3 each; of the rest only the Silver Helm counts
  270: { fight: { csMod: 0, mind: { each: 1, over: 3, items: { psychicRing: 3, greyRing: 3, silverHelm: 2 } } } },
  271: { need: { 322: bow } },
  272: { need: { 2: { item: 'fireseed' } } },
  274: scarlet,
  277: { loot: [{ item: 'khetuSpores11' }] },
  280: { need: { 39: rod, 67: { item: 'silverRod11', not: true } } },
  281: { need: { 193: bow } },
  284: { bowShot: { 220: [0, 4], 127: [5, 8], 21: [9, 99] } },
  293: { ep: -2 },
  294: { need: { 46: bow } },
  296: { take: shot },
  298: { fight: Object.assign({ evade: { after: 0, to: '166', if: { not: { mark: 'baylonTomb11' } } } }, tentacles) },
  // the loss by the number drawn, less 2 with Huntmastery
  299: { rntMod: [{ disc: 'huntmastery', plus: -2 }], rolls: [{ range: [-2, 3], ep: -2 }, { range: [4, 6], ep: -3 }, { range: [7, 9], ep: -4 }] },
  310: { ep: -7 },
  312: { rolls: gain() },
  313: { when: [{ unless: { circle: ['Circle of Solaris'] }, ep: -3 }] },
  319: surprise(2, -3),
  322: { bowShot: { 105: [0, 8], 286: [9, 99] } },
  331: { need: { 2: { item: 'fireseed' } } },
  // the loss by the number drawn, less 2 with Huntmastery
  332: { rntMod: [{ disc: 'huntmastery', plus: -2 }], rolls: [{ range: [-2, 3], ep: -1 }, { range: [4, 6], ep: -2 }, { range: [7, 9], ep: -3 }] },
  333: { bowShot: { 45: [0, 4], 263: [5, 8], 287: [9, 99] } },
  338: { take: [{ pick: 'special', n: 1 }, { at: [1, 3] }] },
  339: { take: shot },
  344: { ep: -10 },
};

/* Book 11's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand (see items-01fftd.js for the fields, items-02fotw.js for the later ones, and
   docs/reference/items.md for how). Nothing new in the fields. Notes on this book:
     - The Ironheart Broadsword is a Special Item that fights as a broadsword. Its +8 is given only
       at the one fight the text states it for (204), as that fight's csMod; he can only reach 204
       by holding it. It goes back to its keepers at 144.
     - Fights where a penalty or bonus lasts only some rounds (a surprise attack's first two rounds,
       an unarmed first round) are todos: the engine applies a COMBAT SKILL change to a whole fight,
       so these are not marked as ambushes either.
     - The Obsidian Seal is given at 210 and handed over at 87. The book's own map is given at 233
       (a new character's kit has none).
     - Choices where the text offers a way for any of several things (a Lantern, a Firesphere, or a
       Torch with Tinderbox; Laumspur, Laumwort or an Oede herb) are left open with a todo, not
       gated on a guess.
     - The Senara herb is plentiful: the page offers as many as the Backpack could hold.
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  obsidianSeal11: { name: 'Obsidian Seal', kind: 'special', glyph: 'wax-seal', about: 'A pyramid of black stone from Serocca. Show it to the Meledorians and they will not attack you.' },
  map11: { name: 'Map', kind: 'special', glyph: 'treasure-map', about: 'Serocca’s map of the Nahgoth Forest and the way to Haagadar. Carried inside your tunic.' },
  ironheartBroadsword: { name: 'Ironheart Broadsword', kind: 'special', glyph: 'broadsword', weapon: ['broadsword'], about: 'A magical blade from the Grand Sepulchre, set with rubies, emeralds and korlinium. It fights as a broadsword; the +8 is given at the one fight the text names.' },
  ookorCharm: { name: 'Ookor Charm', kind: 'special', glyph: 'feathered-wing', about: 'A wooden charm in the shape of a bird’s wing, given by an old Ookor fortune teller. Strapped to your Backpack.' },
  silverRod11: { name: 'Silver Rod', kind: 'special', glyph: 'wizard-staff', about: 'A gleaming rod found with the bones in a cairn. Carried through your belt.' },
  silverFlask11: { name: 'Silver Flask', kind: 'backpack', glyph: 'round-bottom-flask', about: 'Charmed wine from Baylon’s sarcophagus. Two draughts are left; each restores 4 ENDURANCE. Keep count by hand.' },
  khetuSpores11: { name: 'Khetu Spores', kind: 'backpack', glyph: 'mushroom-gills', about: 'Orange spore pods from the Nahgoth Forest floor. Deadly poison.' },
  haina11: { name: 'Haina', kind: 'backpack', glyph: 'herbs-bundle', heal: 5, about: 'A red flower for battle-wounds: restores 5 ENDURANCE, and only after a fight.' },
  senara11: { name: 'Senara', kind: 'backpack', glyph: 'herbs-bundle', heal: 3, meal: true, about: 'Buds of a rare herb, abundant in Vhozada. One serving restores 3 ENDURANCE; it is eaten as a Meal when you have none.' },
  yoacorFood11: { name: 'Yoacor Food', kind: 'backpack', glyph: 'meal', heal: 3, meal: true, about: 'Strange, nourishing Yoacor fare, enough for one Meal. It restores 3 ENDURANCE when eaten.' },
  baylonFungi11: { name: 'Baylon’s Bough Fungi', kind: 'backpack', glyph: 'mushrooms', about: 'Fungi scraped from the bark of a fallen tree. They draw out a blowpipe poison.' },
  conchShell11: { name: 'Conch Shell', kind: 'backpack', glyph: 'spiral-shell', about: 'Taken from the Ookor you killed.' },
};

// the number drawn is the loss, 0 counting as 10
const loss = () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], ep: -(n || 10) }));
// the number drawn is the gain, 0 counting as 10
const gain = () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], ep: n || 10 }));
const sommerswerd = { item: 'sommerswerd' };
const ironheart = { item: 'ironheartBroadsword' };
const bow = { item: 'bow' };
const rod = { item: 'silverRod11' };
const light = 'turn to the first way only with a Firesphere, a Lantern, or a Torch with Tinderbox; otherwise take another.';
const scarlet = 'break off at once, without finishing the fight, when his ENDURANCE is 20 or less, and turn to the section the text names (use the Turn to section box).';

export const SECTIONS = {
  1: { rolls: loss() },
  2: { take: [{ item: 'fireseed' }] },
  5: { loot: [{ meal: 1 }, { meal: 1 }, { meal: 1 }] },
  7: { loot: [{ item: 'ironheartBroadsword' }] },
  8: { todo: 'if you kept the curvy-bladed sword, add it to your weapons by hand: the text names no kind.' },
  10: { todo: 'you must fight the first two rounds unarmed (no weapon); from round three you may use a weapon. The engine does not.' },
  12: { todo: 'you tip out your provisions for the snake: take your Meals off your Backpack.' },
  18: { loot: [{ item: 'ookorCharm' }] },
  22: { todo: scarlet },
  30: { ep: -5 },
  34: { todo: 'unless you have Curing at the rank of Mentora or higher, add 2 to every ENDURANCE loss you take in this fight.' },
  36: { loot: [{ item: 'khetuSpores11' }] },
  40: { need: { 341: sommerswerd, 204: ironheart, 111: { item: ['sommerswerd', 'ironheartBroadsword'], not: true } } },
  54: { need: { 107: sommerswerd, 221: { item: 'sommerswerd', not: true } } },
  59: { need: { 339: bow } },
  60: { ep: -2 },
  68: { todo: 'unless you have Huntmastery, take 3 off your COMBAT SKILL for the first two rounds only. The engine does not.' },
  73: { todo: 'half your Meals are lost (rounded down), and the second and fourth items on your Backpack list: take them off by hand.' },
  74: { loot: [{ item: 'haina11' }], noHunt: true },
  76: { bowShot: { 249: [0, 4], 171: [5, 8], 113: [9, 99] } },
  77: { todo: 'unless you have Huntmastery, take 3 off your COMBAT SKILL for the first two rounds only. The engine does not.' },
  81: { ep: -5 },
  83: { ep: -2 },
  86: { ep: -2 },
  87: { take: [{ item: 'obsidianSeal11' }] },
  92: { need: { 296: bow } },
  97: { todo: scarlet },
  101: { ep: 'full' },
  102: { ep: -3 },
  118: { todo: 'unless you have Curing at the rank of Mentora or higher, or Nexus at the rank of Primate or higher, lose 5 ENDURANCE.' },
  119: { ep: 3, loot: [{ item: 'yoacorFood11' }] },
  120: { ep: -5 },
  121: { loot: [{ item: 'khetuSpores11' }] },
  126: { todo: light },
  129: { loot: Array(8).fill({ item: 'senara11' }) },
  134: { need: { 198: { item: 'rope' } } },
  135: { need: { 256: bow } },
  141: { need: { 284: bow } },
  143: { noHunt: true },
  144: { take: [{ item: 'ironheartBroadsword' }] },
  146: { ep: -4, loot: [{ item: 'baylonFungi11' }] },
  151: { bowShot: { 147: [0, 4], 326: [5, 8], 17: [9, 99] } },
  158: { need: { 77: bow } },
  168: { todo: 'turn to the first way only if you have 4 or more Meals; otherwise take the other.' },
  169: { ep: -10 },
  174: { ep: -1 },
  177: { loot: [{ item: 'silverRod11' }] },
  179: { todo: 'the third, fourth and fifth items on your Backpack list are lost: take them off by hand.' },
  184: { need: { 72: bow } },
  191: { ep: -3, take: [{ item: 'silverRod11' }] },
  193: { bowShot: { 95: [0, 4], 19: [5, 8], 241: [9, 99] } },
  198: { take: [{ backpack: 'all' }] },
  200: { need: { 32: bow } },
  201: { todo: 'you may not use a Shield here, and a Broadsword, Quarterstaff or Spear costs 2 COMBAT SKILL. Winning in three rounds or fewer leads one way, in more rounds the other: count them.' },
  203: { loot: [{ item: 'spear' }, { item: 'sword' }, { item: 'axe' }, { meal: 1 }, { meal: 1 }, { meal: 1 }, { item: 'conchShell11' }] },
  204: { fight: { csMod: 8, csNote: 'Ironheart Broadsword' } },
  206: { todo: scarlet },
  208: { ep: -3 },
  210: { give: [{ item: 'obsidianSeal11' }] },
  216: { ep: -10 },
  217: { todo: 'unless you have Nexus, lose 3 ENDURANCE from the fumes.' },
  220: { todo: 'you fight the first round unarmed, and may draw a weapon from the second. The engine does not.' },
  231: { loot: [{ item: 'sword' }] },
  233: { give: [{ item: 'map11' }] },
  234: { ep: -6, todo: 'turn to the first way only if you have Laumspur, Laumwort or an Oede herb; otherwise take the other.' },
  238: { ep: 'full' },
  242: { ep: -4 },
  244: { todo: 'add 1 to the number drawn if you have a Rope, and 3 if you have Huntmastery at the rank of Primate or higher, then choose the way by the total.' },
  246: { need: { 213: { disc: ['divination', 'huntmastery', 'pathsmanship'] } } },
  256: { todo: 'unless you have Huntmastery, take 2 off your COMBAT SKILL for the first round only. The engine does not.' },
  260: { todo: light },
  261: { ep: 4, loot: [{ item: 'silverFlask11' }] },
  267: { loot: [{ item: 'sword' }, { item: 'spear' }, { item: 'mace' }, { item: 'dagger' }, { arrows: 6 }, { item: 'bow' }, { item: 'quiver' }, { pack: true }, { item: 'quarterstaff' }, { item: 'shortSword' }] },
  269: { ep: -4 },
  270: { fight: { csMod: 0 }, todo: 'a mind fight: add 1 COMBAT SKILL for each Magnakai Discipline beyond the first three, and 3 for each Psychic Ring or Grey Crystal Ring. Weaponmastery, a Shield, Alether, weapon-like Special Items and armour do not count; the Silver Helm does. Work the score out by hand.' },
  271: { need: { 322: bow } },
  272: { need: { 2: { item: 'fireseed' } } },
  274: { todo: scarlet },
  277: { loot: [{ item: 'khetuSpores11' }], todo: 'the potion or herb you used is gone: take it off by hand.' },
  280: { need: { 39: rod, 67: { item: 'silverRod11', not: true } } },
  281: { need: { 193: bow } },
  284: { bowShot: { 220: [0, 4], 127: [5, 8], 21: [9, 99] } },
  293: { ep: -2 },
  294: { need: { 46: bow } },
  298: { todo: 'unless you have Curing at the rank of Mentora or higher, add 2 to every ENDURANCE loss you take in this fight.' },
  // the number drawn is the loss (Huntmastery takes 2 off the number first)
  299: { rolls: [{ range: [0, 3], ep: -2 }, { range: [4, 6], ep: -3 }, { range: [7, 9], ep: -4 }], todo: 'with Huntmastery, take 2 off the number you drew before reading the loss: give back what you were over-charged.' },
  301: { need: { 309: null }, todo: 'turn to the first way only with Pathsmanship at the rank of Scion-kai, or with Animal Control; otherwise take the other.' },
  310: { ep: -7 },
  312: { rolls: gain() },
  313: { todo: 'unless you have completed the Lore-circle of Solaris, lose 3 ENDURANCE.' },
  319: { todo: 'unless you have Huntmastery, take 3 off your COMBAT SKILL for the first two rounds only. The engine does not.' },
  322: { bowShot: { 105: [0, 8], 286: [9, 99] } },
  331: { need: { 2: { item: 'fireseed' } } },
  // the number drawn is the loss (Huntmastery takes 2 off the number first)
  332: { rolls: [{ range: [0, 3], ep: -1 }, { range: [4, 6], ep: -2 }, { range: [7, 9], ep: -3 }], todo: 'with Huntmastery, take 2 off the number you drew before reading the loss: give back what you were over-charged.' },
  333: { bowShot: { 45: [0, 4], 263: [5, 8], 287: [9, 99] } },
  338: { todo: 'you lose one Special Item of your choice, and the first and third items on your Backpack list: take them off by hand.' },
  341: { todo: 'with the Lore-circle of the Spirit, add 2 to your COMBAT SKILL for this fight.' },
  343: { need: { 309: null }, todo: 'turn to the first way only with Pathsmanship at the rank of Scion-kai, or with Animal Control; otherwise take the other.' },
  344: { ep: -10 },
};

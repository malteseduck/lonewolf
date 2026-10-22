/* Book 14's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand from the script's draft (see items-01fftd.js for the fields, docs/reference/book-format.md
   for the later ones, and docs/reference/items.md for how). Notes on this book:
     - The Statuettes of Zagarna and Slûtar are the proof the voice at 157 and 204 asks for; Slûtar's, the
       Dagger of Vashna or Helshezag is the relic the guards at 239 accept.
     - The Brass Keys found on guards and in chests are one item: any of them opens the door at 271.
     - Two Green Keys: the workshop's at 76 is a Backpack Item, the glowing one at 276 a Special Item. No
       section asks for either.
     - The Drakkarim uniform worn at 70 is never written on the Action Chart, so 186's footnote (get rid of
       it) needs nothing here.
     - Arrows loosed where the text says outright that one flies are taken from the Quiver here; Random
       Number shots with Grand Weaponmastery's +5 (73, 227, 335, 345) are spent by the page's own bow shot.
       The shot at the sphere (245) adds no bonus, so it is a plain number and its Arrow is taken here.
     - The spells at the sphere (69, 108) may each be tried once (footnotes 7, 9, 15): a mark records each.
     - Junk is left out; every list's things are kept, as the text offers them.
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  statuetteZagarna: { name: 'Statuette of Zagarna', kind: 'special', glyph: 'evil-minion', about: 'A bronze likeness of Darklord Zagarna, once lord of Kaag.' },
  statuetteSlutar: { name: 'Statuette of Slûtar', kind: 'special', glyph: 'imp', about: 'A golden likeness of Darklord Slûtar, who once ruled Kaag, taken from a Ligan’s altar.' },
  brassKey14: { name: 'Brass Key', kind: 'backpack', glyph: 'key' },
  greenKey14: { name: 'Green Key', kind: 'backpack', glyph: 'key' },
  glowingKey14: { name: 'Green Key', kind: 'special', glyph: 'skeleton-key', about: 'Carved from a green metal that glows faintly. Carried in a tunic pocket.' },
  blackKey14: { name: 'Black Key', kind: 'backpack', glyph: 'key' },
  copperKey14: { name: 'Copper Key', kind: 'backpack', glyph: 'key' },
  whistle14: { name: 'Whistle', kind: 'backpack', glyph: 'whistle' },
  laumspur14: { name: 'Laumspur', kind: 'backpack', glyph: 'herbs-bundle', heal: 4, doses: 3, about: 'Enough for three doses: each restores 4 ENDURANCE, after a fight.' },
  goldDust14: { name: 'Vial of Gold Dust', kind: 'backpack', glyph: 'round-bottom-flask' },
  conchShell14: { name: 'Conch Shell', kind: 'backpack', glyph: 'spiral-shell' },
  silverFlask14: { name: 'Silver Flask', kind: 'backpack', glyph: 'water-flask' },
  comb14: { name: 'Comb', kind: 'backpack', glyph: 'comb' },
  silverBowl14: { name: 'Silver Bowl', kind: 'backpack', glyph: 'bowl-spiral' },
  hammer14: { name: 'Hammer', kind: 'backpack', glyph: 'claw-hammer' },
  wine14: { name: 'Bottle of Wine', kind: 'backpack', glyph: 'wine-bottle' },
};

// the sphere's spells, each tried once this adventure (footnotes 7, 9, 15)
export const MARKS = {
  sphereAlchemy14: { name: 'having tried Kai-alchemy on the crystal sphere', flag: true, book: true },
  sphereMagi14: { name: 'having tried Magi-magic on the crystal sphere', flag: true, book: true },
};

const kika = (n) => ({ coin: 'kika', n });
const sommerswerd = { item: 'sommerswerd' }, noSommerswerd = { item: 'sommerswerd', not: true };
const bowArrows = { any: [{ weapon: ['bow'], arrows: 1 }] };
const statZ = { item: 'statuetteZagarna' };
const guardKeys = [{ item: 'whistle14' }, { item: 'brassKey14' }];
// a light for the oily pool: a Lantern, or a Torch with a Tinderbox
const light = { any: [{ item: 'lantern' }, { items: ['torch', 'tinderbox'] }] };
const noLight = { any: [{ not: light }] };
// the number drawn, less 1 (0 and 1 cost nothing), is lost to fatigue clearing the rubble
const rubble = { rolls: [...Array(10).keys()].map((n) => ({ range: [n, n], ep: -Math.max(0, n - 1) })) };
const climb = { rntMod: [{ item: 'rope', plus: 1 }, { disc: 'grandHuntmastery', plus: 2 }], ranges: { 253: [-99, 3], 198: [4, 6], 63: [7, 99] } };
// the dust pool takes all his Gold Crowns and the first Backpack Item
const dustPool = [{ gold: 'all' }, { at: [1] }];
// the Sommerswerd's power doubles against the Xaghash
const xaghash = { weaponCs: { sommerswerd: 16 } };
const akataz = { rounds: [{ psi: 2, note: 'Susceptible to psychic attack' }], won: { within: 4, to: '13', else: '264' } };
const kraan = { rounds: [{ psi: 2, if: { disc: 'kaiSurge', rank: 5 }, note: 'Kai Grand Guardian’s Kai-surge' }] };
const coldHall = { when: [{ unless: { disc: 'grandNexus' }, ep: -5 }] };

export const SECTIONS = {
  6: { ep: 3 },
  7: { ep: -3 },
  9: { take: dustPool },
  12: { need: { 330: { item: ['daggerVashna', 'jewelledMace', 'helshezag'] }, 212: { item: ['daggerVashna', 'jewelledMace', 'helshezag'], not: true } } },
  13: { loot: [statZ] },
  18: { ep: -1 },
  20: { loot: [{ arrows: 4 }, { item: 'quiver' }, { item: 'sword' }, { item: 'dagger' }, { item: 'broadsword' }] },
  21: { ep: 4 },
  23: { need: { 245: bowArrows, 69: { any: [{ disc: 'kaiAlchemy', rank: 5, not: { mark: 'sphereAlchemy14' } }] } } },
  25: { loot: guardKeys },
  28: { ep: -2 },
  30: { need: { 6: sommerswerd, 222: noSommerswerd } },
  32: { ep: -4 },
  33: { ep: -8 },
  37: { loot: [statZ] },
  40: { loot: [{ item: 'brassKey14' }] },
  41: { ep: -6 },
  43: rubble,
  45: { ep: -5, need: { 211: sommerswerd, 169: noSommerswerd } },
  48: { need: { 162: sommerswerd, 12: noSommerswerd } },
  // the number drawn plus 3 is lost to the fever
  49: { rolls: [...Array(10).keys()].map((n) => ({ range: [n, n], ep: -(n + 3) })) },
  50: { need: { 245: bowArrows } },
  51: { ep: -2 },
  52: { when: [{ came: ['243'], take: [{ arrows: 1 }] }] },
  55: coldHall,
  58: { fight: { undead: true } },
  62: { take: [{ arrows: 1 }], fight: xaghash },
  68: rubble,
  69: { mark: 'sphereAlchemy14' },
  73: { bowShot: { 251: [0, 8], 231: [9, 99] } },
  76: { loot: [{ item: 'tinderbox' }, { item: 'laumspur14' }, { item: 'goldDust14' }, { item: 'conchShell14' }, { item: 'silverFlask14' },
    { item: 'greenKey14' }, { item: 'brassKey14' }, { item: 'copperKey14' }, { item: 'rope' }, { item: 'comb14' }] },
  83: { ep: 6 },
  // the heat: only Grand Huntmastery and Grand Nexus together spare this Meal
  // the heat: a Meal unless he has both Grand Huntmastery and Grand Nexus
  86: { meal: true, mealUnless: { disc: ['grandHuntmastery', 'grandNexus'], every: true } },
  94: { need: { 223: light, 14: noLight } },
  101: { ep: -3 },
  102: { take: [{ item: 'bow' }] },
  103: { ep: -8 },
  106: { need: { 62: bowArrows } },
  108: { mark: 'sphereMagi14' },
  110: { ep: -3, loot: [statZ] },
  111: { need: { 159: bowArrows } },
  112: { take: [{ at: [3] }] },
  113: { ep: -2 },
  114: { loot: [{ item: 'rope' }, { item: 'lantern' }, { item: 'silverBowl14' }, { item: 'whistle14' }, { item: 'brassKey14' }, { item: 'blackKey14' }, { item: 'hammer14' }, { meal: 2 }] },
  115: rubble,
  117: { ep: -4 },
  // undead: the Sommerswerd doubles its losses
  118: { fight: { undead: true, won: { within: 3, to: '79', else: '284' } } },
  119: { loot: [{ item: 'brassKey14' }] },
  122: { ep: -3 },
  // the fight is broken off if his ENDURANCE falls below 12
  128: { fight: { byHand: 'The text stops the fight once your ENDURANCE falls below 12' }, need: { 105: { ep: [-99, 11] }, 248: { ep: [12, 999] } } },
  130: { need: { 306: { item: ['oedeHerb', 'oedeJar13'] }, 49: { item: ['oedeHerb', 'oedeJar13'], not: true } } },
  131: { need: { 108: { any: [{ disc: 'magiMagic', rank: 5, not: { mark: 'sphereMagi14' } }] } } },
  135: { take: [{ arrows: 1 }], fight: akataz },
  139: { need: { 243: bowArrows } },
  140: { loot: [{ item: 'spear' }] },
  146: { need: { 335: bowArrows } },
  154: { ep: -5 },
  157: { need: { 336: statZ, 87: { item: 'statuetteZagarna', not: true } } },
  159: { take: [{ arrows: 1 }], loot: guardKeys },
  164: climb,
  165: { take: dustPool },
  174: { need: { 211: sommerswerd, 169: noSommerswerd } },
  176: { loot: [{ item: 'statuetteSlutar' }] },
  178: { ep: -7 },
  179: { ep: -2 },
  180: { loot: [statZ] },
  186: { when: [{ unless: { disc: 'kaiScreen' }, ep: -3 }] },
  190: { ep: 2 },
  191: { ep: -4 },
  192: { need: { 223: light, 14: noLight } },
  195: { fight: { won: { within: 3, to: '295', else: '206' } } },
  198: { ep: -2 },
  199: { take: [{ arrows: 1 }] },
  204: { need: { 336: { item: 'statuetteSlutar' }, 87: { item: 'statuetteSlutar', not: true } } },
  207: { ep: -3 },
  208: { ep: 3 },
  209: coldHall,
  215: { need: { 99: bowArrows } },
  218: { ep: -2 },
  219: { fight: { undead: true } },
  // the light thrown into the pool
  223: { take: [{ item: ['lantern', 'torch'], choose: true, label: 'Choose the light you threw' }] },
  225: { ep: -3 },
  226: { need: { 199: bowArrows } },
  227: { bowShot: { 91: [0, 6], 158: [7, 99] } },
  // only Kai-surge works on it, at half its bonus
  229: { fight: { rounds: [{ psi: 0.5, note: 'Kai-surge does half' }] } },
  230: { loot: [{ item: 'brassKey14' }, { item: 'sword' }, { item: 'sword' }, { item: 'dagger' }, { meal: 2 }, kika(80), { item: 'wine14' }] },
  236: { ep: -3 },
  239: { need: { 61: { item: ['statuetteSlutar', 'daggerVashna', 'helshezag'] }, 137: { item: ['statuetteSlutar', 'daggerVashna', 'helshezag'], not: true } } },
  241: { ep: -3 },
  // footnote 13: Flameshaft, with Magi-magic at Kai Grand Guardian (5 Disciplines), costs an Arrow (taken at 52)
  243: { add: [{ text: 'With Magi-magic at Kai Grand Guardian, cast Flameshaft on the pool (footnote): turn to 52.', to: '52', need: { disc: 'magiMagic', rank: 5, any: [{ arrows: 1, label: 'an Arrow' }] } }] },
  245: { take: [{ arrows: 1 }] },
  246: { loot: [statZ] },
  247: { ep: -4, need: { 205: sommerswerd, 292: noSommerswerd } },
  254: rubble,
  257: { loot: guardKeys },
  258: { ep: -5, need: { 243: bowArrows } },
  263: { fight: xaghash },
  265: { ep: -4 },
  271: { need: { 141: { item: 'brassKey14' }, 255: { item: 'brassKey14', not: true } } },
  276: { loot: [{ item: 'glowingKey14' }] },
  277: climb,
  279: { fight: kraan },
  283: { ep: -3 },
  // the number drawn plus 1 is lost to the Zlanbeast
  284: { rolls: [...Array(10).keys()].map((n) => ({ range: [n, n], ep: -(n + 1) })) },
  286: { fight: akataz },
  288: { ep: -10 },
  292: { ep: -4 },
  293: { need: { 46: bowArrows } },
  297: coldHall,
  298: { ep: 2 },
  299: { ep: -8 },
  303: { fight: kraan },
  306: { take: [{ item: ['oedeJar13', 'oedeHerb'] }] },
  308: { loot: [statZ] },
  317: { ep: -4 },
  318: { fight: { rounds: [{ psi: 2, note: 'Susceptible to psychic attack' }] } },
  320: { need: { 245: bowArrows, 108: { any: [{ disc: 'magiMagic', rank: 5, not: { mark: 'sphereMagi14' } }] } } },
  322: { ep: -15 },
  323: { ep: -1 },
  326: { loot: [statZ] },
  334: { take: [{ arrows: 1 }], fight: akataz },
  335: { bowShot: { 102: [0, 5], 221: [6, 11], 34: [12, 99] } },
  342: { ep: -3, take: dustPool },
  345: { bowShot: { 17: [0, 6], 305: [7, 99] } },
  348: { ep: -1 },
};

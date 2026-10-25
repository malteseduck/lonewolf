/* Book 15's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand from the script's draft (see items-01fftd.js for the fields, docs/reference/book-format.md
   for the later ones, and docs/reference/items.md for how). Notes on this book:
     - The commander's cabin is searched at 10, 213 or 344 (by whichever way in): the same things each time.
     - The Green Key the octagonal lock asks for (109, 212) is one carried from Book 14: either of its two.
     - Bow shots with Grand Weaponmastery's +5 (270) are spent by the page's own shot; Arrows loosed with
       no bonus to the number (76) or no number at all (241, 278, 321) are taken here, and 180's three at once.
     - The Jadin Amulet's +1 against missiles applies at 81, the only such draw after it can be found (323).
     - 335's first round is a surprise attack (`ambush`); 305's is spared by Grand Pathsmanship as the text
       says (`unless`); 244's is the fall.
     - The Mawtaw (121, 297): Kai-surge adds only 1, and Kai-alchemy at Sun Knight adds 5 to COMBAT SKILL
       (applied) and 5 ENDURANCE for the fight only (by hand).
     - 72 and 194 cannot be reached (rules-books.md); 25's way to 315 (met Prarg in Book 10) is the player's.
     - The Kai-surge used at 190 and 312 costs 1 ENDURANCE (footnote 10, and rules-books.md).
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  signetRing15: { name: 'Signet Ring', kind: 'special', glyph: 'globe-ring', about: 'A Drakkarim officer’s ring of high rank: the Tukodak bow to whoever bears it.' },
  hourglass15: { name: 'Hourglass', kind: 'backpack', glyph: 'hourglass' },
  brassKey15: { name: 'Brass Key', kind: 'special', glyph: 'key' },
  silverRod15: { name: 'Silver Rod', kind: 'special', glyph: 'metal-bar', about: 'A plain silver rod four inches long, found in a dead guard’s boot. Carried in a pocket.' },
  jadinAmulet: { name: 'Jadin Amulet', kind: 'special', glyph: 'emerald-necklace', about: 'A polished amulet on a gold chain, worn at the neck: +1 to a number drawn to avoid arrows, bolts and other missiles.' },
  boarWhip: { name: 'Boar Whip', kind: 'backpack', glyph: 'whip', about: 'An oiled leather whip from the war-hog pen.' },
  floroa: { name: 'Floroa', kind: 'backpack', glyph: 'mushrooms', heal: 3, about: 'A nourishing temple fungus, one dose: eaten, it restores 3 ENDURANCE.' },
  bowstring15: { name: 'Bowstring', kind: 'backpack', glyph: 'bow-string' },
  wine15: { name: 'Bottle of Wine', kind: 'backpack', glyph: 'wine-bottle' },
  bottle15: { name: 'Bottle', kind: 'backpack', glyph: 'square-bottle', about: 'Empty.' },
  ballOfString15: { name: 'Ball of String', kind: 'backpack', glyph: 'yarn' },
};

const bowArrows = { any: [{ weapon: ['bow'], arrows: 1 }] };
const signet = { item: 'signetRing15' }, rod = { item: 'silverRod15' };
const greenKey = { item: ['greenKey14', 'glowingKey14'] };
const oedeSabito = ['oedeHerb', 'oedeJar13', 'sabito', 'bluePills9', 'sabitoJar13'];
// the commander's cabin, by whichever way he came in
const cabin = { loot: [{ item: 'potion' }, { item: 'potion' }, { item: 'hourglass15' }, { item: 'signetRing15' }, { item: 'bow' }, { arrows: 3 },
  { item: 'sword' }, { item: 'brassKey15' }, { item: 'dagger' }] };
const tukodak = { loot: [{ meal: 1 }, { item: 'dagger' }, { item: 'sword' }, { item: 'sword' }, { item: 'bow' }, { arrows: 4 }] };
const deadGuard = { loot: [{ item: 'dagger' }, { item: 'sword' }, { item: 'bottle15' }, { item: 'bow' }, { arrows: 2 }, { item: 'ballOfString15' },
  { coin: 'kika', n: 40 }, { item: 'silverRod15' }] };
// immune to Mindblast and Psi-surge, Kai-surge adds only 1; the Strength spell adds 5 (its 5 ENDURANCE by hand)
const mawtaw = { fight: { rounds: [{ psi: 0.125, note: 'Kai-surge adds only 1' },
  { if: { disc: 'kaiAlchemy', rank: 6 }, csMod: 5, note: 'Strength spell' }] },
todo: 'With Kai-alchemy at Sun Knight, the Strength spell also gives 5 ENDURANCE for this fight; take 5 off after it (to no less than 1)' };
const akataz = { fight: { rounds: [{ psi: 2, note: 'Susceptible to psychic attack' }] } };
const firstBlow = { fight: { rounds: [{ upTo: 1, heroLoss: 0, note: 'The speed of your attack' }] } };
// the potions erased at 156: Laumspur and Alether, by every name they have had
const potions = ['potion', 'laumspur3', 'redLaumspur', 'rendalimPotion', 'jarLaumspur7', 'laumspurJar13', 'alether', 'alether4', 'aletherJar13'];

export const SECTIONS = {
  3: { ep: -3 },
  10: cabin,
  12: tukodak,
  13: { ep: -4 },
  20: { need: { 76: bowArrows } },
  23: { loot: [{ arrows: 6 }, { item: 'quiver' }, { item: 'dagger' }, { item: 'sword' }, { item: 'spear' }] },
  29: { ep: -6 },
  32: akataz,
  33: { ep: 3, loot: [{ item: 'floroa' }] },
  37: { need: { 211: { item: 'rope' }, 346: { item: 'rope', not: true } } },
  42: { need: { 271: { item: 'sommerswerd' }, 134: { item: 'sommerswerd', not: true } } },
  44: { fight: { stop: { after: 6, to: '155' }, to: '264' } },
  46: { loot: [{ item: 'bow' }, { arrows: 2 }, { meal: 2 }, { item: 'alether' }, { item: 'wine15' }, { item: 'bowstring15' }] },
  47: { need: { 180: bowArrows } },
  49: { ep: -2 },
  58: { ep: -1 },
  68: { take: [{ meals: 1 }] },
  69: { need: { 278: bowArrows } },
  75: { ep: -2 },
  76: { take: [{ arrows: 1 }] },
  // the Jadin Amulet: +1 to avoid missiles
  81: { rntMod: [{ disc: 'grandPathsmanship', plus: 2 }, { item: 'jadinAmulet', plus: 1 }] },
  96: { loot: [{ item: 'lantern' }, { item: 'rope' }, { item: 'dagger' }, { meal: 2 }, { item: 'hourglass15' }] },
  101: { need: { 241: bowArrows } },
  109: { need: { 304: greenKey } },
  118: { need: { 270: bowArrows } },
  121: mawtaw,
  132: { ep: -4 },
  133: { ep: -3 },
  134: { when: [{ unless: { disc: 'kaiScreen' }, ep: -5 }] },
  145: { ep: -3 },
  // the bolt rebounds: the number drawn (0 as 10) is lost
  147: { rolls: [{ range: [0, 9], ep: 'drawn' }], need: { 241: bowArrows } },
  153: { ep: -3 },
  // sixteen days digging: down to 15 ENDURANCE, and no Meals or potions left
  156: { epCap: 15, take: [{ meals: 'all' }, ...Array(10).fill({ item: potions })] },
  160: { ep: -3 },
  167: { ep: -4 },
  173: { ep: 3 },
  176: { ep: -5 },
  180: { take: [{ arrows: 3 }] },
  182: { need: { 241: bowArrows } },
  186: { ep: -2 },
  187: { need: { 68: { any: [{ meals: 1 }] }, 282: { any: [{ not: { meals: 1 }, label: 'no Meal' }] } } },
  188: { ep: 3 },
  190: { ep: -1 },
  193: { rntMod: [{ disc: 'grandHuntmastery', plus: 2 }, { item: 'rope', plus: 1 }, { rank: 5, plus: 1 }], ranges: { 210: [-99, 6], 114: [7, 99] } },
  194: { ep: -4 },
  198: firstBlow,
  199: { ep: -1 },
  // the acid: the first and fourth Backpack Items, and a Special Item or the Bow, his choice
  203: { take: [{ at: [1, 4] }], todo: 'Erase one Special Item of your choice, or your Bow if you have one' },
  204: { need: { 169: signet, 57: { item: 'signetRing15', not: true } } },
  206: { ep: -4 },
  209: { ep: -8, need: { 181: { ep: [-99, 15] }, 301: { ep: [16, 999] } } },
  211: { ep: -3 },
  // the Oede or Sabito swallowed
  212: { take: [{ item: oedeSabito, choose: true, dose: true, label: 'Choose what you swallowed' }], need: { 304: greenKey } },
  213: cabin,
  220: { need: { 27: rod, 290: { item: 'silverRod15', not: true } } },
  226: { ep: -3 },
  229: { ep: -5 },
  232: firstBlow,
  236: { ep: 3 },
  237: { ep: -3 },
  // the weapon used on the ice: a Special Item +2; Mace, Warhammer, Axe, Broadsword +1; Dagger, Quarterstaff, Short Sword -1
  238: { rntMod: [{ wield: ['special'], plus: 2 }, { wield: ['mace', 'warhammer', 'axe', 'broadsword'], plus: 1 },
    { wield: ['dagger', 'quarterstaff', 'shortSword'], plus: -1 }], ranges: { 139: [-99, 4], 3: [5, 99] } },
  241: { take: [{ arrows: 1 }], need: { 321: { any: [{ arrows: 1 }] } } },
  243: { ep: -5 },
  244: { fight: { rounds: [{ upTo: 2, csMod: -10, note: 'Stunned by the fall' }], noBoost: true } },
  246: { ep: -3 },
  247: deadGuard,
  250: { ep: -2, ...akataz },
  254: { fight: { won: { within: 3, to: '35', else: '160' } } },
  269: { ep: -6 },
  270: { bowShot: { 183: [0, 5], 201: [6, 99] } },
  278: { take: [{ arrows: 1 }] },
  280: { need: { 170: bowArrows } },
  292: { need: { 212: { item: oedeSabito }, 233: { item: oedeSabito, not: true } } },
  297: mawtaw,
  299: deadGuard,
  305: { fight: { rounds: [{ upTo: 1, csMod: -3, unless: { disc: 'grandPathsmanship' }, note: 'Caught in the window' }] } },
  306: { loot: [{ item: 'boarWhip' }] },
  311: tukodak,
  312: { ep: -1 },
  313: { ep: -5 },
  321: { take: [{ arrows: 1 }] },
  // the number in the amulet's description is no draw here
  323: { rnt: null, loot: [{ item: 'jadinAmulet' }] },
  335: { fight: { rounds: [{ upTo: 1, csMod: -3, ambush: true, note: 'Surprise' }] } },
  337: { ep: -2 },
  343: { need: { 180: bowArrows } },
  344: cabin,
};

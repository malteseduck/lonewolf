/* Book 24's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand from the script's draft (see items-01fftd.js for the fields, docs/reference/book-format.md
   for the later ones, and docs/reference/items.md for how). Notes on this book:
     - The Kai Weapon's higher bonus is marked where the text names the weapon: the Vorka, lizard-like and fought by
       night (Spawnsmite, Kaistar; 299 Spawnsmite alone), the river serpent in the tunnels (Spawnsmite, Illuminatus),
       Zorkaan by night (Alema, Kaistar) and the deserters in the mine (Illuminatus, Kaistar).
     - The Kai Clothes, stowed at 156 and 348, take two Backpack places: the page counts one. 67 spares them.
     - 328's offer is a stake added to the number by hand (the page cannot add it); 234 takes it, 32 hands it back.
     - 39's hand weapon broken is the player's pick, never the Bow; the Kai Weapon is a Special Item, so never offered.
     - 149's way for a hero without Assimilance stays open, as every "if you do not possess" way is (rules-books.md).
     - Bow gates want an Arrow too; the Arrows loosed (6, 56, 238, 242, 291) are taken there.
     - 61, 289 and 334 cost a Discipline for the rest of the book: by hand.
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  kaiClothes: { name: 'Kai Clothes', kind: 'backpack', glyph: 'cape', about: 'Your Kai journeyman’s tunic, breeches and cloak, stowed while you wear a disguise. They take two Backpack places: keep one more free by hand.' },
  tekaroChalice: { name: 'Tekaro Chalice', kind: 'backpack', glyph: 'jeweled-chalice', about: 'A gem-set golden chalice looted from Tekaro Cathedral: a prize greedy guards would take.' },
  dungeonKeys24: { name: 'Dungeon Keys', kind: 'special', glyph: 'keyring', about: 'A gaoler’s bunch of keys, kept in your tunic pocket.' },
  graveweed24: { name: 'Graveweed Concentrate', kind: 'backpack', glyph: 'round-bottom-flask', about: 'Deadly if swallowed.' },
  mokradon: { name: 'Potion of Mokradon', kind: 'backpack', glyph: 'potion-ball', about: 'Blinds a man for good.' },
  volzoc: { name: 'Potion of Volzoc', kind: 'backpack', glyph: 'standing-potion', about: 'Brings on violent visions.' },
  ghilev: { name: 'Ghilev', kind: 'backpack', glyph: 'mushrooms', about: 'One dose of a purplish mould that puts men and beasts to sleep when swallowed.' },
  smallShovel24: { name: 'Small Shovel', kind: 'backpack', glyph: 'spade' },
  hammer24: { name: 'Hammer', kind: 'backpack', glyph: 'claw-hammer' },
  pliers24: { name: 'Pliers', kind: 'backpack', glyph: 'pincers' },
  pincers24: { name: 'Pincers', kind: 'backpack', glyph: 'pincers' },
  spike24: { name: 'Spike', kind: 'backpack', glyph: 'metal-bar' },
  plane24: { name: 'Plane', kind: 'backpack', glyph: 'wood-beam' },
  saw24: { name: 'Saw', kind: 'backpack', glyph: 'hand-saw' },
  bowl24: { name: 'Bowl', kind: 'backpack', glyph: 'bowl-spiral' },
  mirror24: { name: 'Mirror', kind: 'backpack', glyph: 'mirror-mirror' },
  pitcher24: { name: 'Pitcher', kind: 'backpack', glyph: 'jug' },
  phosphorBomb: { name: 'Phosphor Bomb', kind: 'backpack', glyph: 'molotov', about: 'A glass bulb of naphtha and phosphorus that bursts into burning fragments when thrown.' },
  redVial: { name: 'Red Vial', kind: 'special', glyph: 'test-tubes', about: 'A psychic jelly kept in your tunic pocket: swallowed before a psychic fight, it strengthens your mental defences.' },
  blueVial: { name: 'Blue Vial', kind: 'special', glyph: 'test-tubes', about: 'A psychic jelly kept in your tunic pocket: swallowed before a psychic fight, it strengthens your psychic attack.' },
  yellowVial: { name: 'Yellow Vial', kind: 'special', glyph: 'test-tubes', about: 'A psychic jelly kept in your tunic pocket: swallowed, it weakens your psychic defences.' },
  skullTorWristband: { name: 'Skull-Tor Wristband', kind: 'special', glyph: 'bracer', free: true, about: 'A herald’s leather wristband, the pass onto the drawbridge of Skull-Tor’s inner keep. Carried beyond the limit of Special Items.' },
  battleMap24: { name: 'Battle-map', kind: 'special', glyph: 'treasure-map', free: true, about: 'A map taken from an Eldenoran herald: a reason to be in Skull-Tor. Carried beyond the limit of Special Items.' },
};

const bowArrow = { any: [{ weapon: ['bow'], arrows: 1, label: 'a Bow and an Arrow' }] };
const has = (item) => ({ item });
const hasNot = (item) => ({ item, not: true });
// a number drawn that is odd costs `odd` ENDURANCE, even `even`
const oddEven = (odd, even) => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], ep: n % 2 ? odd : even }));
// the Kai Weapon's higher bonus, where the text names it
const vorka = ['reptile', 'night'], serpent = ['reptile', 'underground'], zorkaan = ['undead', 'night'];
const threeRounds = { stop: { after: 3 } };
// the guards' supper, laced with what he carries (40 and 280)
const tray = { need: { 87: has('gallowbrush'), 195: has('graveweed24'), 327: has('mokradon'), 169: has('volzoc'), 271: has('ghilev') } };
const potions = { loot: [{ item: 'gallowbrush' }, { item: 'graveweed24' }, { item: 'mokradon' }, { item: 'volzoc' }] };
const vials = { loot: [{ item: 'redVial' }, { item: 'blueVial' }, { item: 'yellowVial' }] };
const tools = { loot: [{ item: 'hammer24' }, { item: 'pliers24' }, { item: 'pincers24' }, { item: 'axe' }, { item: 'rope' }, { item: 'spike24' }, { item: 'plane24' }, { item: 'saw24' }] };
const shop = (list) => list.map(([item, cost]) => ({ item, cost }));
// the Grand Weaponmastery bonus with the kind of Kai Weapon he wields (178)
const kaiKind = (kind) => ({ item: ['spawnsmite', 'alema', 'magnara', 'sunstrike', 'kaistar', 'valiance', 'ulnarias', 'raumas', 'illuminatus', 'firefall']
  .filter((id) => ({ spawnsmite: 'axe', alema: 'axe', magnara: 'axe', raumas: 'broadsword', illuminatus: 'broadsword', firefall: 'broadsword' }[id] || 'sword') === kind), mastery: kind });
const surprise = { fight: { rounds: [{ upTo: 2, heroLoss: 0, note: 'Surprise attack' }] } };
const dog = { fight: { rounds: [{ upTo: 2, foeLoss: 0, note: 'The dog’s sudden attack' }] } };

export const SECTIONS = {
  3: { ep: -2 },
  4: { ep: -1, fight: { kaiWeapon: serpent } },
  6: { take: [{ arrows: 1 }] },
  8: { ep: -2 },
  9: surprise,
  13: { noHunt: true },
  15: { ep: -2 },
  19: { loot: [{ meal: 1 }, { meal: 1 }] },
  22: { ep: -2 },
  24: { fight: { kaiWeapon: vorka } },
  29: { fight: { kaiWeapon: serpent } },
  30: { ep: -3 },
  35: { need: { 238: bowArrow } },
  39: { take: [{ pick: 'weapons', n: 1, but: ['bow'], label: 'Choose the hand weapon you break' }] },
  40: tray,
  41: { ep: -4 },
  43: { ep: -3 },
  44: { need: { 291: bowArrow } },
  49: { loot: [{ meal: 1 }, { meal: 1 }] },
  52: { fight: { kaiWeapon: vorka, won: { within: 5, to: '187', else: '35' } } },
  53: { ep: -2, fight: { rounds: [{ foeLoss: 0.5, note: 'Blows with the flat of the blade' }] } },
  54: { loot: [{ item: 'dungeonKeys24' }] },
  55: { need: { 242: bowArrow } },
  56: { take: [{ arrows: 1 }] },
  57: { ep: -2 },
  61: { ep: -4, todo: 'Choose one Grand Master Discipline you may not use for the rest of this adventure' },
  62: { rolls: oddEven(-2, -4) },
  63: { noHunt: true },
  65: { need: { 203: { gold: 10, spend: true } } },
  66: { loot: [{ arrows: 6 }] },
  67: { ep: -6, take: [{ pick: 'backpack', n: 2, but: ['kaiClothes'] }] },
  68: { fight: { kaiWeapon: serpent } },
  71: { loot: [{ item: 'mace' }, { item: 'smallShovel24' }] },
  72: { loot: [{ item: 'potion' }, { item: 'potion' }] },
  73: { fight: { kaiWeapon: vorka } },
  75: { fight: { kaiWeapon: zorkaan, ...threeRounds } },
  79: tools,
  80: { fight: { stop: { after: 1, by: { hero: '111', foe: '64', even: '64' } } } },
  84: { fight: { kaiWeapon: vorka } },
  87: { take: [{ item: 'gallowbrush' }] },
  91: { loot: [{ item: 'tekaroChalice' }] },
  92: { fight: { kaiWeapon: zorkaan } },
  94: { ep: -4 },
  99: { ep: -8 },
  101: { fight: { with: 'none', ...dog.fight } },
  110: { loot: [{ meal: 1 }, { meal: 1 }] },
  118: { ep: -3 },
  124: { ep: -2 },
  126: { fight: { kaiWeapon: vorka } },
  128: potions,
  136: { take: [{ item: 'blueVial' }], fight: { kaiWeapon: zorkaan, ...threeRounds } },
  138: surprise,
  150: { ep: -1 },
  153: { ep: -3 },
  154: { take: [{ item: 'yellowVial' }], fight: { kaiWeapon: zorkaan, ...threeRounds } },
  156: { give: [{ item: 'kaiClothes' }] },
  159: { need: { 45: { gold: 10, spend: true } } },
  160: { fight: { kaiWeapon: vorka, won: { within: 5, to: '187', else: '35' } } },
  161: { fight: { kaiWeapon: vorka } },
  162: { noHunt: true },
  163: { take: [{ item: 'phosphorBomb' }] },
  165: { loot: [{ item: 'dungeonKeys24' }] },
  168: { need: { 6: bowArrow } },
  169: { take: [{ item: 'volzoc' }] },
  172: { ep: -4 },
  175: { need: { 182: has('redVial'), 136: has('blueVial'), 154: has('yellowVial') } },
  178: {
    rntMod: [{ disc: 'grandHuntmastery', plus: 3 }, { plus: 2, label: 'Grand Weaponmastery with your Kai Weapon’s kind', any: [kaiKind('axe'), kaiKind('sword'), kaiKind('broadsword')] }, { disc: 'animalMastery', plus: 1 }],
    ranges: { 300: [-99, 3], 80: [4, 99] },
  },
  182: { take: [{ item: 'redVial' }], fight: { kaiWeapon: zorkaan, ...threeRounds } },
  185: surprise,
  186: { loot: [{ item: 'phosphorBomb' }] },
  194: { noHunt: true },
  195: { take: [{ item: 'graveweed24' }] },
  198: { need: { 208: has('dungeonKeys24'), 38: hasNot('dungeonKeys24') } },
  206: { fight: { kaiWeapon: serpent, rounds: [{ upTo: 4, heroLoss: 0, note: 'Its head held in the net' }] } },
  211: surprise,
  214: { need: { 96: { any: [{ disc: 'animalMastery' }, { item: 'eyeOfLhaz' }] } } },
  216: { ep: -5 },
  217: { fight: { kaiWeapon: vorka } },
  220: { ep: -1 },
  222: { zeroTen: true, ranges: { 232: [-99, 3], 81: [4, 99] } },
  224: { ep: -5 },
  225: { loot: [{ item: 'ghilev' }] },
  226: { ep: 9 },
  229: { take: [{ weapons: 'all' }] },
  230: { loot: [{ meal: 1 }, { meal: 1 }] },
  231: { need: { 56: bowArrow } },
  234: { settle: { 328: -1 } },
  235: { ep: -2 },
  237: {
    loot: [{ arrows: 1, cost: 1 }, ...shop([['dagger', 3], ['quarterstaff', 3], ['spear', 5], ['shortSword', 6], ['axe', 6], ['mace', 6], ['sword', 7],
      ['warhammer', 7], ['broadsword', 9], ['bow', 10]])],
  },
  238: { take: [{ arrows: 1 }] },
  242: { take: [{ arrows: 1 }] },
  245: { fight: { kaiWeapon: ['underground', 'night'] } },
  256: vials,
  263: { need: { 335: has('tekaroChalice'), 65: hasNot('tekaroChalice') } },
  264: { fight: { kaiWeapon: zorkaan } },
  265: dog,
  270: { need: { 296: has('tekaroChalice'), 159: hasNot('tekaroChalice') } },
  271: { take: [{ item: 'ghilev' }] },
  274: potions,
  275: { ep: -3 },
  277: { fight: { kaiWeapon: vorka } },
  280: tray,
  282: { fight: { kaiWeapon: zorkaan } },
  284: { ep: -3, take: [{ pick: 'backpack', n: 1 }] },
  288: { zeroTen: true, ranges: { 11: [-99, 3], 341: [4, 99] } },
  289: { todo: 'Choose one Grand Master Discipline you may not use for the rest of this adventure' },
  291: { take: [{ arrows: 1 }] },
  292: { loot: [{ item: 'bowl24' }, { item: 'mirror24' }, { item: 'pitcher24' }, { item: 'flute' }] },
  296: { take: [{ item: 'tekaroChalice' }] },
  299: { fight: { kaiWeapon: ['reptile'], won: { within: 4, to: '13', else: '174' } } },
  304: { fight: { kaiWeapon: vorka } },
  305: { ep: -2 },
  307: { ep: -3 },
  310: { loot: [{ item: 'tekaroChalice' }] },
  312: { fight: { with: 'none', ...dog.fight } },
  317: { fight: { kaiWeapon: serpent } },
  320: {
    rntMod: [{ item: ['dagger', 'spike24'], plus: 1 }, { disc: 'grandNexus', plus: 2 }],
    ranges: { 265: [-99, 3], 170: [4, 7], 89: [8, 99] },
  },
  322: { ep: -1 },
  323: { loot: [{ item: 'mace' }, { item: 'smallShovel24' }] },
  326: { loot: [{ meal: 1 }, { meal: 1 }] },
  327: { take: [{ item: 'mokradon' }] },
  328: { stake: {}, todo: 'Add the Gold Crowns you offer to the number drawn: 8 or less, turn to 32; 9 or more, turn to 234' },
  333: { ep: -3, take: [{ at: [1] }] },
  334: { ep: -8, todo: 'Choose one Grand Master Discipline you may not use for the rest of this adventure' },
  335: { take: [{ item: 'tekaroChalice' }] },
  340: { need: { 163: has('phosphorBomb'), 190: hasNot('phosphorBomb') } },
  343: { give: [{ item: 'skullTorWristband' }, { item: 'battleMap24' }] },
  348: { give: [{ item: 'kaiClothes' }] },
  349: vials,
};

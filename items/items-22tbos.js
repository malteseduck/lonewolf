/* Book 22's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand from the script's draft (see items-01fftd.js for the fields, docs/reference/book-format.md
   for the later ones, and docs/reference/items.md for how). Notes on this book:
     - Nobles are their own coin in the Belt Pouch (ADR 0047): found, lost and priced as the text names them. The rules
       take Gold Crowns 1 for 1 for Nobles, so a price in Nobles may be paid in Crowns too (`alt`), but for 57's shop,
       which says Nobles only. 8's winnings are Nobles, and the traders at 156, 164 and 278 pay in them. The way for
       too little at 66, 211 and 341 opens when he has neither 2 Nobles nor the 2 Crowns that may pay instead.
     - The Kai Weapon's higher bonus is marked where the text says the foe, the time or the place (ADR 0047): the
       hold's creature and the night-thing are made by magic (the text names Valiance), the night-thing and the kholo
       are fought at night, the sea monster under water and a reptile (the text names Ulnarias and Spawnsmite), the
       racetrack's henchmen and gate guard and the Masama thugs by day. The rest is the panel's control.
     - Three seizures: the hut's (20, everything and the whole purse, given back at 308), the gaol's (Weapons, the Kai Weapon and the
       Backpack's contents; back at 45, 81, 187, 234, 302) and the Hall of Correction's (Weapons and the Kai Weapon;
       back at 33 and 279).
     - The Moonstone comes with the kit (LW.KITS[22], skipped for a hero carried from Book 21 who has it): 1 needs no entry.
     - Bow gates want an Arrow too; the Arrows loosed with no number drawn (74, 165, 233, 247, 306, 343) are taken
       there; 274 is the one shot.
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  nhangDoll: { name: 'Nhang Doll', kind: 'backpack', glyph: 'voodoo-doll', about: 'A porcelain child with lifelike eyes, said to be one of an emperor’s hundred. A collector may pay for it.' },
  silverClasp: { name: 'Silver Clasp', kind: 'special', glyph: 'belt-buckles', about: 'An ornate clasp, a rescued sailor’s thanks. Kept in a tunic pocket.' },
  leonghisScroll: { name: 'Leonghi’s Scroll', kind: 'special', glyph: 'scroll-unfurled', about: 'A sealed letter of introduction to the captain’s cousin in Tiklu. Kept in a tunic pocket.' },
  emeraldMedallion: { name: 'Emerald Medallion', kind: 'special', glyph: 'emerald-necklace', about: 'A shopkeeper’s thanks for his cure. Kept in a pocket.' },
  seotaDust: { name: 'Pouch of Seota Dust', kind: 'special', glyph: 'powder-bag', about: 'Restores 10 ENDURANCE, once: drop it and add the points yourself.' },
  talismanOfDefiance: { name: 'Talisman of Defiance', kind: 'special', glyph: 'gem-pendant', fightCs: 2, about: '+2 COMBAT SKILL in a fight.' },
  eyeOfLhaz: { name: 'Eye of Lhaz', kind: 'special', glyph: 'snake', about: 'Lets its bearer master poisonous snakes.' },
  ironKey22: { name: 'Iron Key', kind: 'special', glyph: 'key', free: true, about: 'A gaoler’s key, carried beyond the limit of Special Items.' },
  crystalPrism: { name: 'Crystal Prism', kind: 'special', glyph: 'prism', about: 'Found among the village elders’ hoard. A trader may buy it.' },
  liera: { name: 'Potion of Liera', kind: 'backpack', glyph: 'round-bottom-flask', about: 'A narcotic that leaves whoever takes it open to suggestion.' },
  scava: { name: 'Bottle of Scava', kind: 'backpack', glyph: 'brandy-bottle', about: 'A cherry-coloured liqueur, a guildsman’s gift.' },
  hammer22: { name: 'Hammer', kind: 'backpack', glyph: 'claw-hammer' },
  silverMirror22: { name: 'Silver Mirror', kind: 'backpack', glyph: 'mirror-mirror' },
  blanket22: { name: 'Blanket', kind: 'backpack', glyph: 'blanket' },
  steelFlask22: { name: 'Steel Flask', kind: 'backpack', glyph: 'water-flask' },
  pewterGoblet22: { name: 'Pewter Goblet', kind: 'backpack', glyph: 'jeweled-chalice' },
  whip22: { name: 'Whip', kind: 'backpack', glyph: 'whip' },
  spyglass22: { name: 'Spyglass', kind: 'backpack', glyph: 'spyglass' },
  quillPen22: { name: 'Quill Pen', kind: 'backpack', glyph: 'quill' },
  inkPot22: { name: 'Pot of Ink', kind: 'backpack', glyph: 'quill-ink' },
  fishHooks22: { name: '3 Fish Hooks', kind: 'backpack', glyph: 'fishing-hook', about: 'Three, taking the room of one.' },
  riceWine22: { name: 'Bottle of Rice Wine', kind: 'backpack', glyph: 'square-bottle' },
  soap22: { name: 'Soap', kind: 'backpack', glyph: 'soap' },
};

const bowArrow = { any: [{ weapon: ['bow'], arrows: 1, label: 'a Bow and an Arrow' }] };
// prices in Nobles; alt false: Nobles only (57), else Gold Crowns 1 for 1 may pay instead
const shop = (list, alt = true) => list.map(([item, cost]) => ({ item, cost, coin: 'noble', ...(alt ? { alt: cost } : {}) }));
// a fee of n Nobles (or n Gold Crowns); short: the way for too little of either
const fare = (n, to, short) => ({ [to]: { coin: 'noble', n, spend: true, alt: n }, ...(short ? { [short]: { any: [{ not: { any: [{ coins: { noble: n } }, { gold: n }] }, label: `fewer than ${n} Nobles` }] } } : {}) });
// a number drawn that is odd does `odd`, even `even` (to his Endurance, or to his coins with key 'coins')
const oddEven = (odd, even, key = 'ep') => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], [key]: n % 2 ? odd : even }));
const blankets = ['blanket22', 'blanket21', 'blanket18', 'blanket16', 'blanket12', 'blanket10', 'blanket9', 'blanket7'];
const handWeapons = ['sword', 'dagger', 'axe', 'quarterstaff', 'spear', 'mace', 'shortSword', 'warhammer', 'broadsword'];
// the gaol of Ghol-Tabras keeps his Weapons, his Kai Weapon and what is in his Backpack; Special Items stay with him
const gaol = { take: [{ weapons: 'all', special: true, stash: 'gaol' }, { backpack: 'items', stash: 'gaol' }] };
// the Lunarlian captain at 164: any Special Item but the Moonstone 8, any Weapon 2, any Backpack Item 1
const each = (ids, price) => Object.fromEntries(ids.map((id) => [id, price]));
const buyer = {
  ...each(['mapSoutheastMagnamund', 'mapSeaRoute', 'quiver', 'spawnsmite', 'alema', 'magnara', 'sunstrike', 'kaistar', 'valiance', 'ulnarias', 'raumas',
    'illuminatus', 'firefall', 'ironSkull', 'siyenCrown', 'temujunsRing', 'kutyanEmerald', 'silverClasp', 'leonghisScroll', 'emeraldMedallion', 'seotaDust',
    'talismanOfDefiance', 'eyeOfLhaz', 'crystalPrism'], 8),
  ...each(handWeapons.concat('bow'), 2),
  ...each(['meal', 'rope', 'potion', 'flute', 'alether', 'mustow', 'sebaris', 'cowana', 'tinderbox', 'lantern', 'blanket21', 'hourglass21', 'spyglass21',
    'scentedOil21', 'candles21', 'slippers21', 'copperCup21', 'lyre', 'chalk21', 'nhangDoll', 'liera', 'scava', 'hammer22', 'silverMirror22', 'blanket22',
    'steelFlask22', 'pewterGoblet22', 'whip22', 'spyglass22', 'quillPen22', 'inkPot22', 'fishHooks22', 'riceWine22', 'soap22'], 1),
};
const magic = { kaiWeapon: ['magic'] };
const nightThing = { kaiWeapon: ['magic', 'night'] };
const seaMonster = { kaiWeapon: ['water', 'reptile'] };
const kholo = { kaiWeapon: ['night'], rounds: [{ psi: 2, note: 'They take the mind’s attack badly' }] };
const firstFree = (upTo, note) => ({ rounds: [{ upTo, heroLoss: 0, note }] });
const twoRounds = { stop: { after: 2, to: '215' } };

export const SECTIONS = {
  7: { loot: [{ item: 'dagger' }, { item: 'dagger' }, { item: 'sword' }, { item: 'sword' }, { gold: 3 }, { coin: 'noble', n: 6 }] },
  8: { rolls: oddEven({ noble: 4 }, { noble: 6 }, 'coins') },
  10: { ep: -2 },
  11: { fight: { ...magic, ...firstFree(1, 'Your leap gives you the first blow') } },
  12: { rolls: oddEven(-3, -5) },
  13: { ep: -1, take: [{ meals: 'all' }] },
  15: { ep: 'full' },
  19: { fight: nightThing },
  20: { take: [{ weapons: 'all', special: true, stash: 'hut' }, { purse: 'all', stash: 'hut' }, { backpack: 'all', stash: 'hut' }, { special: 'all', stash: 'hut' }] },
  21: { give: [{ item: 'nhangDoll' }] },
  23: { need: fare(2, '201') },
  25: { ep: -3 },
  28: { ep: -6 },
  29: { ep: -2 },
  30: { need: fare(1, '264') },
  31: { need: { 176: { any: [{ item: handWeapons, label: 'a normal Weapon' }] } } },
  33: { back: ['suhn'] },
  37: { rolls: oddEven(-3, -5) },
  40: { ep: -2 },
  41: { ep: -4 },
  43: { need: { 274: bowArrow } },
  45: { give: [{ item: 'ironKey22' }], back: ['gaol'] },
  46: { ep: -3, need: { 343: bowArrow } },
  48: { ep: -3 },
  52: { ep: -3, ...gaol },
  54: { take: [{ at: [1] }, { weapons: 'one' }] },
  55: { rntMod: [{ disc: 'grandHuntmastery', plus: 3 }, { item: 'rope', plus: 2 }, { ep: [-99, 10], plus: -1 }], ranges: { 44: [-99, 5], 246: [6, 99] } },
  57: { loot: shop([['hammer22', 1], ['rope', 2], ['silverMirror22', 2], ['blanket22', 1], ['steelFlask22', 1], ['pewterGoblet22', 1]], false) },
  61: { loot: [{ item: 'potion', cost: 3, coin: 'noble', alt: 3, max: 1 }, { item: 'alether', cost: 3, coin: 'noble', alt: 3, max: 1 }] },
  66: { need: fare(2, '188', '287') },
  67: { fight: { ...seaMonster, noBoost: true } },
  71: { need: fare(5, '283') },
  74: { take: [{ arrows: 1 }], fight: nightThing },
  79: { ep: -3 },
  81: { back: ['gaol'] },
  82: { ep: -3 },
  83: { need: fare(3, '315') },
  84: { give: [{ item: 'silverClasp' }], loot: [{ gold: 10 }] },
  86: { fight: kholo },
  87: { need: { 343: bowArrow } },
  88: { ep: -4 },
  89: { fight: { kaiWeapon: ['day'] } },
  90: { ep: -8 },
  93: { ep: -2 },
  94: { take: [{ pick: 'backpack', n: 2 }] },
  96: { fight: { ...magic, ...firstFree(2, 'Your surprise attack') } },
  97: { need: fare(3, '315') },
  98: { loot: [{ item: 'potion', cost: 2, coin: 'noble', alt: 2 }] },
  99: { give: [{ item: 'nhangDoll' }] },
  102: { loot: [{ item: 'potion' }, { item: 'potion' }] },
  104: { loot: [{ item: 'liera' }, { item: 'liera' }] },
  105: { fight: { barred: ['special'], rounds: [{ upTo: 1, unarmed: true, note: 'Your Kai Weapon is thrown: bare hands' }] } },
  106: { take: [{ item: 'bow' }], fight: twoRounds },
  109: { give: [{ item: 'leonghisScroll' }] },
  110: { fight: { kaiWeapon: ['day'] } },
  114: { need: fare(4, '29') },
  115: { ep: -3 },
  116: { loot: [{ item: 'potion', cost: 2, coin: 'noble', alt: 2 }] },
  119: { ep: 6 },
  122: { fight: nightThing },
  126: { need: { 21: { gold: 10, spend: true }, 99: { gold: 7, spend: true } } },
  128: { rolls: oddEven(-3, -5) },
  131: { fight: { ...magic, ...firstFree(1, 'Your spell strikes first') } },
  132: { ep: -3 },
  135: { ep: -1 },
  138: { need: fare(2, '124') },
  140: { need: { 247: bowArrow } },
  141: { loot: [{ item: 'emeraldMedallion' }] },
  147: { ep: -6 },
  148: { ep: -3, ...gaol },
  150: { need: { 233: bowArrow } },
  152: { loot: [{ item: 'spear' }, { item: 'shortSword' }, { item: 'mace' }, { item: 'warhammer' }, { item: 'bow' }, { item: 'broadsword' }] },
  153: { loot: [{ meal: 1 }, { meal: 1 }, { meal: 1 }] },
  154: { fight: magic },
  156: {
    loot: [...shop([['sword', 2], ['whip22', 2], ['axe', 2], ['bow', 3]]), { arrows: 6, cost: 2, coin: 'noble', alt: 2 }, ...shop([['spyglass22', 3], ['quillPen22', 1], ['inkPot22', 2]])],
    sell: { seotaDust: 10, talismanOfDefiance: 15, eyeOfLhaz: 20 },
    sellCoin: 'noble',
  },
  164: { sell: buyer, sellCoin: 'noble' },
  165: { take: [{ arrows: 1 }] },
  166: { fight: seaMonster },
  167: { give: [{ item: 'seotaDust' }, { item: 'talismanOfDefiance' }, { item: 'eyeOfLhaz' }] },
  169: { fight: nightThing },
  174: { need: { 216: { item: blankets }, 298: { item: blankets, not: true } } },
  176: { fight: { barred: ['special'], ...firstFree(1, 'Your first strike') } },
  182: { ep: -3 },
  187: { back: ['gaol'] },
  202: { ep: -4, rolls: oddEven(-3, -5) },
  206: { loot: [{ item: 'sword' }, { item: 'sword' }, { item: 'dagger' }, { item: 'dagger' }, { coin: 'noble', n: 8 }] },
  207: { fight: { with: 'none' } },
  208: { ep: -4, fight: magic },
  210: { ep: -2, ...gaol },
  211: { need: fare(2, '188', '287') },
  216: { take: [{ item: blankets }] },
  220: { loot: [{ meal: 1 }, { meal: 1 }, { meal: 1 }] },
  221: { take: [{ weapons: 'all', special: true, stash: 'suhn' }] },
  222: { fight: { with: 'none' } },
  223: { take: [{ purse: 'all' }, { pick: 'special', n: 1, but: ['moonstone'] }] },
  224: { fight: nightThing },
  226: { ep: -2 },
  228: gaol,
  230: { need: { 165: bowArrow } },
  231: { ep: -2 },
  232: { need: fare(1, '264') },
  233: { take: [{ arrows: 1 }] },
  234: { back: ['gaol'] },
  241: { ep: -3 },
  242: { need: { 176: { any: [{ item: handWeapons, label: 'a normal Weapon' }] } } },
  245: { fight: twoRounds },
  247: { take: [{ arrows: 2 }] },
  256: { ep: -2 },
  266: { ep: -3 },
  267: { ep: 3, need: { 306: bowArrow } },
  269: { fight: kholo },
  270: { fight: magic },
  271: { loot: [{ item: 'scava' }] },
  274: { bowShot: { 106: [0, 8], 317: [9, 99] } },
  275: { take: [{ item: 'leonghisScroll' }] },
  278: { sell: { nhangDoll: 12, crystalPrism: 8, scava: 4 }, sellCoin: 'noble' },
  279: { back: ['suhn'] },
  280: { need: { 333: { item: 'siyenCrown' }, 123: { item: 'siyenCrown', not: true } } },
  285: { ep: -3 },
  287: { take: [{ pick: 'backpack', n: 1 }] },
  295: { take: [{ pick: 'backpack', n: 1 }] },
  297: { ep: -5 },
  298: { ep: -1 },
  300: { need: fare(6, '259') },
  302: { back: ['gaol'] },
  304: { take: [{ at: [3] }] },
  306: { take: [{ arrows: 1 }] },
  308: {
    back: ['hut'],
    loot: [{ item: 'bow' }, { arrows: 6 }, { item: 'spear' }, { item: 'rope' }, { item: 'fishHooks22' }, { item: 'riceWine22' }, { item: 'soap22' },
      { item: 'shortSword' }, { item: 'lantern' }, { item: 'crystalPrism' }],
  },
  309: { ep: -8 },
  311: { rolls: oddEven(-4, -2) },
  322: { need: { 274: bowArrow } },
  323: { ep: -1 },
  333: { take: [{ item: 'siyenCrown' }] },
  340: { fight: { kaiWeapon: ['day'] } },
  341: { ep: -3, need: fare(2, '188', '287') },
  343: { take: [{ arrows: 1 }] },
  345: gaol,
  348: { ep: -4 },
  349: { need: { 74: bowArrow } },
};

/* Book 23's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand from the script's draft (see items-01fftd.js for the fields, docs/reference/book-format.md
   for the later ones, and docs/reference/items.md for how). Notes on this book:
     - Lune and Ren are their own coins in the Belt Pouch (ADR 0047). A price given in Lune and Gold Crowns takes
       either (`alt`); 166's trader takes Crowns at 4 Lune each, so his prices carry that `alt` too. 120's trader
       pays in Lune. Torqs (74, 161) are no coin the page keeps: by hand.
     - The bribes at 112 and 209 are stakes: what he offers (2 Crowns or more) is paid where it is taken (26, 347)
       or scattered (141); the 1 added to the number for every Crown past 2 is by hand.
     - Two seizures: Cavalia's (130; given back at 39, 150, 211 and 324) and Varedo's (247; given back at 131).
     - The Kai Weapon's higher bonus is marked where the text names the weapon: the winged Bavazanur (Raumas), the
       warrior-mages and the sorcerous blades (Valiance), Peutrimax and Sadanzo's knights by night (Kaistar).
     - Bow gates want an Arrow too; the Arrows loosed (102, 135, 278, 286, 345) are taken there. 102's number is
       for dodging the creature's spikes after the Arrow has struck, so it is no bow shot.
     - The Meals found at 132 and 325 are handed over, so the Meal the same section asks for can be eaten from them.
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  jewelledKnife: { name: 'Jewelled Knife', kind: 'backpack', glyph: 'stiletto', about: 'A gem-set knife from a hidden cache. A trader may buy it.' },
  silverSignetRing: { name: 'Silver Signet Ring', kind: 'backpack', glyph: 'ring', about: 'From the same hidden cache. A trader may buy it.' },
  ivoryComb: { name: 'Ivory Comb', kind: 'backpack', glyph: 'comb', about: 'A soldier’s keepsake. A trader may buy it.' },
  riceWine23: { name: 'Bottle of Rice Wine', kind: 'backpack', glyph: 'square-bottle' },
  blanket23: { name: 'Blanket', kind: 'backpack', glyph: 'blanket' },
  tehdaKey: { name: 'Tehda Key', kind: 'special', glyph: 'key', free: true, about: 'An iron key marked as the Tehda Stables’ property. Carried beyond the limit of Special Items.' },
  stoneDagger: { name: 'Stone Dagger', kind: 'special', glyph: 'sacrificial-dagger', about: 'A crude blade of red-veined stone, stained by sacrifices. Not one to be caught carrying.' },
  sadanzosScroll: { name: 'Sadanzo’s Scroll', kind: 'special', glyph: 'scroll-unfurled', free: true, about: 'The Baron’s sealed contract for the old king’s murder: proof of his treachery. Carried beyond the limit of Special Items.' },
  goldenHuntingHorn: { name: 'Golden Hunting Horn', kind: 'backpack', glyph: 'hunting-horn', about: 'A silent horn from the Baron’s hoard; it turns a psychic assault back on its makers.' },
  jewelledTankard: { name: 'Jewelled Tankard', kind: 'backpack', glyph: 'beer-stein', about: 'A treasure from the Baron’s hoard.' },
  sadanzosSeal: { name: 'Sadanzo’s Seal', kind: 'backpack', glyph: 'wax-seal', about: 'The Baron’s own seal: his men may defer to whoever shows it.' },
  riverboatTicket: { name: 'Riverboat Ticket', kind: 'special', glyph: 'ticket', free: true, about: 'A berth on the riverboat to Seroa, kept in a breeches pocket. Carried beyond the limit of Special Items.' },
};

// flags a later section tests (core.js, LW.MARKS)
export const MARKS = { visitedOridonStone: { name: 'having visited the Oridon Stone', flag: true } };

const bowArrow = { any: [{ weapon: ['bow'], arrows: 1, label: 'a Bow and an Arrow' }] };
// a number drawn that is odd costs `odd` ENDURANCE, even `even`
const oddEven = (odd, even) => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], ep: n % 2 ? odd : even }));
const has = (item) => ({ item });
const hasNot = (item) => ({ item, not: true });
// the Lune price at 166, payable in Gold Crowns at 4 Lune each
const lune = (n) => ({ cost: n, coin: 'lune', alt: n / 4 });
// the cells of Cavalia's citadel: his own things back, and what lies beside them
const cavalia = (arrows, more) => ({ back: ['cavalia'], loot: [{ item: 'bow' }, { arrows }, { meal: 1 }, ...more] });
const seized = (key) => ({ take: [{ weapons: 'all', special: true, stash: key }, { backpack: 'all', stash: key }, { special: 'all', stash: key }] });
const potions3 = { loot: [{ item: 'potion' }, { item: 'potion' }, { item: 'potion' }] };
const karvasWins = (within) => ({ fight: { won: { within, to: '215', else: '103' } } });

export const SECTIONS = {
  3: { take: [{ weapons: 'one' }, { pick: 'backpack', n: 1 }] },
  4: { loot: [{ coin: 'ren', n: 100 }, { item: 'jewelledKnife' }, { item: 'silverSignetRing' }] },
  7: { ep: -3 },
  8: { ep: -1, ...potions3 },
  9: { ep: -2 },
  10: { fight: { kaiWeapon: ['winged'] } },
  12: { need: { 135: bowArrow } },
  15: { ep: -1 },
  24: { ep: -5, take: [{ pick: 'backpack', n: 4 }] },
  25: { fight: { rounds: [{ from: 4, csMod: 5, note: 'Prince Karvas joins the fight' }] } },
  26: { settle: { 112: -1 } },
  32: { todo: 'Pay the farmer 8 Lune or 2 Gold Crowns; without enough money, give him 1 Weapon or 1 Backpack Item of your choice' },
  33: { ep: -3 },
  34: karvasWins(3),
  37: { todo: 'The tavern-keeper gives 5 Lune for each Gold Crown: change as many as you like on the Belt Pouch' },
  38: { ep: -5 },
  39: cavalia(6, [{ item: 'spear' }, { item: 'axe' }]),
  40: { ep: -2 },
  44: { need: { 252: has('sadanzosSeal'), 335: hasNot('sadanzosSeal') } },
  46: { ep: 3, need: { 153: has('riverboatTicket'), 27: hasNot('riverboatTicket') } },
  49: { ep: -10 },
  52: { need: { 193: { coin: 'lune', n: 8, spend: true, alt: 2 } } },
  53: { need: { 102: bowArrow } },
  55: { need: { 36: has('stoneDagger'), 247: hasNot('stoneDagger') } },
  57: { ep: -3 },
  60: { fight: { kaiWeapon: ['magic'], stop: { after: 1, by: { hero: '40', foe: '297', even: '143' } } } },
  64: potions3,
  65: { give: [{ item: 'riverboatTicket' }] },
  66: { rntMod: [{ item: 'dagger', plus: 2 }], ranges: { 233: [-99, 3], 279: [4, 99] } },
  68: { ep: -5 },
  74: { todo: 'The clerk gives 4 Torqs for each Gold Crown. The page keeps no Torqs: note any you take' },
  75: { give: [{ item: 'sadanzosScroll' }] },
  76: { rntMod: [{ disc: 'grandHuntmastery', plus: 2 }, { item: 'rope', plus: 1 }], ranges: { 163: [-99, 5], 231: [6, 99] } },
  77: { ep: 6 },
  79: { ep: -1 },
  80: { need: { 52: { any: [{ mark: 'visitedOridonStone' }] }, 155: { any: [{ not: { mark: 'visitedOridonStone' } }] } } },
  85: { ep: -2 },
  88: { need: { 345: bowArrow } },
  96: { ep: -3 },
  99: { ep: -2 },
  102: { take: [{ arrows: 1 }] },
  103: { fight: { kaiWeapon: ['night', 'magic'] } },
  104: { mark: 'visitedOridonStone' },
  105: { ep: -2 },
  107: { ep: -3, fight: { rounds: [{ upTo: 1, csMod: -5, note: 'Still finding your feet' }] } },
  112: { stake: { min: 2 }, todo: 'Add 1 to the number for every Gold Crown you offer past the first 2' },
  116: { need: { 264: has('sadanzosSeal'), 73: hasNot('sadanzosSeal') } },
  117: { rolls: oddEven(-2, -4) },
  118: { need: { 83: has('sadanzosScroll'), 162: hasNot('sadanzosScroll') } },
  120: { sell: { tinderbox: 6, riceWine23: 8, riceWine22: 8, ivoryComb: 10, jewelledKnife: 20, silverSignetRing: 24 }, sellCoin: 'lune' },
  122: { rolls: oddEven(-4, -2) },
  124: { give: [{ meal: 2 }] },
  128: karvasWins(5),
  130: seized('cavalia'),
  131: { ep: 3, back: ['varedo'] },
  132: { give: [{ meal: 1 }, { item: 'tehdaKey' }], loot: [{ coin: 'ren', n: 30 }, { item: 'spear' }, { item: 'dagger' }] },
  135: { take: [{ arrows: 1 }] },
  141: { settle: { 209: -1 } },
  143: { ep: -3 },
  145: { give: [{ item: 'tehdaKey' }], loot: [{ item: 'blanket23' }, { meal: 1 }, { meal: 1 }, { item: 'dagger' }, { item: 'tinderbox' }] },
  146: { ep: -3 },
  149: { ep: -3 },
  150: cavalia(6, [{ item: 'spear' }, { item: 'axe' }]),
  152: { ep: -6 },
  153: { take: [{ item: 'riverboatTicket' }] },
  155: { need: { 221: { coin: 'lune', n: 40, spend: true, alt: 10 } } },
  157: { need: { 286: bowArrow } },
  158: { ep: -2 },
  159: { fight: { kaiWeapon: ['night'] } },
  161: { todo: 'Torqs are not kept by the page: turn to 236 if you hold any, else to 19' },
  166: {
    loot: [{ meal: 1, ...lune(4) }, { arrows: 1, ...lune(4) }, { item: 'rope', ...lune(8) }, { item: 'lantern', ...lune(8) },
      { item: 'alether', ...lune(12) }, { item: 'quarterstaff', ...lune(20) }, { item: 'bow', ...lune(32) }],
  },
  168: { ep: -3 },
  171: { loot: [{ meal: 1 }, { meal: 1 }] },
  172: { ep: -1 },
  177: { need: { 13: { item: 'rope' } } },
  180: { need: { 136: has('tehdaKey'), 274: hasNot('tehdaKey') } },
  181: { give: [{ item: 'riverboatTicket' }] },
  185: { loot: [{ item: 'stoneDagger' }] },
  195: { ep: -3, ...potions3 },
  196: { ep: -4 },
  197: { rntMod: [{ item: 'dagger', plus: 2 }], ranges: { 21: [-99, 5], 4: [6, 99] } },
  209: { stake: { min: 2 }, todo: 'Add 1 to the number for every Gold Crown you offer past the first 2' },
  211: cavalia(6, [{ item: 'spear' }, { item: 'axe' }]),
  212: { ep: -2, take: [{ pick: 'special', n: 1 }, { weapons: 'one' }, { pick: 'backpack', n: 2 }, { gold: 'half' }, { coin: 'lune', n: 'half' }, { coin: 'ren', n: 'half' }] },
  216: { fight: { with: 'none' } },
  217: { fight: { kaiWeapon: ['magic'] } },
  223: { ep: -2 },
  224: { take: [{ at: [2] }] },
  231: { take: [{ item: 'rope' }] },
  233: { take: [{ item: 'dagger' }] },
  239: { rolls: oddEven(-3, -5) },
  243: { need: { 112: { gold: 2 } } },
  244: { fight: { kaiWeapon: ['magic'] } },
  245: { noHunt: true },
  246: { loot: [{ coin: 'ren', n: 20 }, { item: 'dagger' }, { item: 'potion' }] },
  247: seized('varedo'),
  249: { need: { 278: bowArrow } },
  250: { need: { 61: has('sadanzosScroll'), 296: hasNot('sadanzosScroll') } },
  255: { ep: -2 },
  259: { loot: [{ meal: 1 }] },
  260: { need: { 209: { gold: 2 } } },
  261: { ep: -3 },
  262: { ep: -2 },
  266: { need: { 37: { gold: 2, spend: true }, 241: { coin: 'ren', n: 20, spend: true } } },
  269: { ep: -1 },
  273: { ep: -2 },
  277: { need: { 164: has('goldenHuntingHorn'), 9: hasNot('goldenHuntingHorn') } },
  278: { take: [{ arrows: 1 }] },
  284: karvasWins(4),
  286: { take: [{ arrows: 1 }] },
  288: { loot: [{ item: 'goldenHuntingHorn' }, { item: 'jewelledTankard' }, { item: 'sadanzosSeal' }] },
  293: { need: { 126: has('sadanzosScroll'), 317: hasNot('sadanzosScroll') } },
  301: { fight: { kaiWeapon: ['winged'] } },
  309: { give: [{ item: 'riverboatTicket' }] },
  310: potions3,
  312: { ep: -3 },
  314: { rolls: oddEven(-4, -7), lessen: [{ n: 2, if: { disc: 'kaiScreen' } }] },
  320: { give: [{ item: 'riverboatTicket' }] },
  324: cavalia(3, []),
  325: { give: [{ meal: 1 }], loot: [{ coin: 'ren', n: 30 }, { item: 'spear' }, { item: 'sword' }, { item: 'dagger' }, { item: 'riceWine23' }, { item: 'ivoryComb' }] },
  328: { ep: -3 },
  329: { ep: 3 },
  330: { rolls: oddEven(-3, -1) },
  333: { take: [{ pick: 'backpack', n: 1 }] },
  335: { need: { 81: { any: [{ disc: 'bardsmanship', rank: 7, item: 'flute', label: 'Bardsmanship, a Flute and the rank of Kai Grand Sentinel' }] } } },
  338: { ep: -4 },
  341: { ep: -5 },
  344: { ep: -1 },
  345: { take: [{ arrows: 1 }] },
  346: { take: [{ purse: 'all' }] },
  347: { settle: { 209: -1 } },
};

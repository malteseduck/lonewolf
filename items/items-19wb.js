/* Book 19's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand from the script's draft (see items-01fftd.js for the fields, docs/reference/book-format.md
   for the later ones, and docs/reference/items.md for how). Notes on this book:
     - The Iron Disc is one id however he comes by it (5, 129, 274, 333): it opens the doors at 95 and 199, and
       is left behind at 261.
     - The duel at 304 is by hand: its Combat Ratio is fixed at -4 whatever his bonuses, and Wolf's Bane starts
       with his ENDURANCE (4 less with the Bronze Disc); the engine has neither rule. A proposal for the owner.
     - 276's 4 COMBAT SKILL lost, spared by Grand Weaponmastery at Grand Crown, is the section's own, as printed
       (the footnote doubts it: rules-books.md); `unarmed` keeps it from doubling the engine's -4 with no weapon.
     - The Sommerswerd's 4 suggested by footnotes at 3, 162 and 201 is not applied (rules-books.md).
     - 237's 5 COMBAT SKILL lost is written in words, which the importer does not read: given here.
     - Bow shots: 87. Arrows loosed with no number drawn (106, 136, 138, 196, 209) are taken there. No fight's
       COMBAT SKILL loss is a surprise attack's: no ambushes.
     - Teleport's cost is the section's own each time (54, 126, 198, 245, 293, 329).
     - Gates on earlier adventures (35, 78, 151, 160, 298) are the player's to answer.
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  ironDisc19: { name: 'Iron Disc', kind: 'special', glyph: 'cog', about: 'A small iron disc engraved with runes, carried in the tunic pocket: the key to the electrical locks of Avaros.' },
  bronzeDisc: { name: 'Bronze Disc', kind: 'special', glyph: 'sun', about: 'Dropped by Wolf’s Bane as he fled, engraved with alien symbols. It weakens him in the duel to come.' },
  rubyRing19: { name: 'Ruby Ring', kind: 'special', glyph: 'diamond-ring', about: 'Set with crimson stones, found in the ashes of a Baroness of Tyso.' },
  goldCup19: { name: 'Gold Cup', kind: 'special', glyph: 'trophy-cup', about: 'A valuable golden goblet.' },
  blackPotion19: { name: 'Black Potion', kind: 'backpack', glyph: 'corked-tube', about: 'A small stone phial taken from a reptilian. What it does is unknown.' },
  naphthaBomb: { name: 'Naphtha Bomb', kind: 'backpack', glyph: 'fire-bomb', about: 'A small incendiary from Baron Caldar’s armoury, primed and thrown.' },
  platinumIngot: { name: 'Platinum Ingot', kind: 'backpack', glyph: 'metal-bar', about: 'A bar of pure platinum, worth a fortune at home. It takes the room of two Backpack Items; the page counts one.' },
  wolfsBaneAmulet: { name: 'Wolf’s Bane’s Amulet', kind: 'special', glyph: 'gem-pendant', about: 'Taken from your slain double and worn on a chain at the neck, beside the Platinum Amulet, for the journey home.' },
  blackClasp: { name: 'Black Clasp', kind: 'special', glyph: 'belt-buckles', about: 'The buckle of the Rahjaz’s leather collar, carried in the tunic pocket.' },
};

const bowArrows = { any: [{ weapon: ['bow'], arrows: 1 }] };
const sommerswerd = { item: 'sommerswerd' }, noSommerswerd = { item: 'sommerswerd', not: true };
const disc = { item: 'ironDisc19' }, noDisc = { item: 'ironDisc19', not: true };
const blades = ['sword', 'shortSword', 'broadsword', 'axe', 'dagger'];
const bladed = { any: [{ weapon: blades }] };
// the fire-arrow ways: a Bow and an Arrow, Magi-magic, and a rank (Sun Lord at 209, Kai Grand Guardian at 138)
const flameshaft = (rank) => ({ any: [{ weapon: ['bow'], arrows: 1, disc: 'magiMagic', rank }] });
// a number drawn (0 counting as 10) and `k` more lost
const drawnPlus = (k) => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], ep: -((n || 10) + k) }));
const potions = [{ item: 'potion' }, { item: 'potion' }, { item: 'potion' }];
// one round against the dragonfly: who lost more decides the way on
const swoop = (hurt, held) => ({ stop: { after: 1, by: { hero: hurt, foe: held, even: held } } });
// the weapon in hand destroyed, unless it is a Special Item
const weaponLost = { when: [{ unless: { wield: ['special'] }, take: [{ weapons: 'used' }] }] };

export const SECTIONS = {
  1: { need: { 195: { item: 'platinumAmulet16' }, 302: { item: 'platinumAmulet16', not: true } } },
  2: { ep: -4 },
  4: { ep: -4 },
  5: { loot: [{ item: 'ironDisc19' }] },
  6: { need: { 209: flameshaft(7) } },
  8: { ep: -6 },
  // the first Backpack Item on his list is lost in the water
  9: { take: [{ at: [1] }], need: { 106: bowArrows } },
  11: { ep: -4 },
  15: { ep: -3 },
  16: { ep: -5 },
  // the number drawn (0 as 10) is lost, 2 less with Grand Nexus
  17: { rolls: [{ range: [0, 9], ep: 'drawn' }], lessen: [{ n: 2, if: { disc: 'grandNexus' } }], need: { 106: bowArrows } },
  20: { ep: -1 },
  27: { ep: -1, loot: [{ meal: 1 }, { meal: 1 }, { meal: 1 }] },
  30: { ep: 'full' },
  33: { ep: -1 },
  34: { ep: -4 },
  36: { ep: -3 },
  37: { need: { 118: sommerswerd, 187: { any: [{ disc: 'grandWeaponmastery', rank: 7, weapon: blades }] } } },
  45: { rolls: drawnPlus(5) },
  51: { need: { 196: bowArrows } },
  53: { ep: -2 },
  54: { ep: -4 },
  62: { need: { 138: flameshaft(5) } },
  65: { rolls: [{ range: [0, 4], ep: -2 }, { range: [5, 9], ep: -4 }] },
  67: { ep: -4 },
  68: { need: { 196: bowArrows } },
  69: { rntMod: [{ weapon: blades, plus: 3 }], ranges: { 65: [-99, 4], 228: [5, 99] } },
  70: { need: { 136: bowArrows } },
  72: { rolls: drawnPlus(5) },
  75: { fight: swoop('221', '163') },
  81: { ep: -1 },
  82: { ep: -2, need: { 288: { item: 'naphthaBomb' }, 320: { item: 'naphthaBomb', not: true } } },
  87: { bowShot: { 322: [-99, 4], 44: [5, 9], 299: [10, 99] } },
  90: { loot: [{ arrows: 1 }, { arrows: 1 }, { item: 'dagger' }] },
  95: { need: { 159: disc, 143: noDisc } },
  96: { ep: -3 },
  97: { ep: -4 },
  98: { give: [{ item: 'wolfsBaneAmulet' }] },
  99: { ep: -3, loot: [{ item: 'rubyRing19' }] },
  100: { need: { 341: sommerswerd, 153: noSommerswerd } },
  102: { ep: -5 },
  103: { need: { 332: bladed } },
  104: { ep: 4 },
  106: { take: [{ arrows: 1 }] },
  107: { loot: [{ item: 'goldCup19' }] },
  116: { fight: swoop('192', '38') },
  // for every rank above Kai Grand Guardian, 1 (the text's cap of 5 is the most a rank can give in this book)
  122: { rntMod: [{ plus: 1, each: 'grandmaster', over: 5 }], ranges: { 16: [-99, 3], 96: [4, 9], 315: [10, 99] } },
  126: { ep: -6 },
  129: { loot: [{ item: 'ironDisc19' }, { item: 'dagger' }, { item: 'sword' }, { item: 'blackPotion19' }] },
  134: { need: { 87: bowArrows } },
  136: { take: [{ arrows: 2 }] },
  138: { take: [{ arrows: 1 }] },
  144: { need: { 332: bladed } },
  // the Baron's armoury: anything he likes
  149: { loot: [{ item: 'broadsword' }, { item: 'sword' }, { item: 'axe' }, { item: 'warhammer' }, { item: 'shortSword' }, { item: 'mace' },
    { item: 'spear' }, { arrows: 6 }, { item: 'quiver' }, { item: 'naphthaBomb' }] },
  154: { ...weaponLost, loot: [{ item: 'rubyRing19' }] },
  155: { ep: -10 },
  159: { loot: [{ item: 'platinumIngot' }] },
  166: { ep: -1 },
  172: { need: { 106: bowArrows } },
  182: { loot: potions },
  185: { ep: -2 },
  188: { ep: -1, loot: [{ meal: 1 }, { meal: 1 }, { meal: 1 }] },
  // Breathe Water: no losses of his in the first two rounds
  194: { fight: { rounds: [{ upTo: 2, heroLoss: 0, note: 'Breathe Water: no loss' }] } },
  196: { take: [{ arrows: 1 }] },
  197: { ep: -4 },
  198: { ep: -4 },
  199: { need: { 261: disc, 210: noDisc } },
  205: { ep: -4, take: [{ at: [3] }] },
  206: { loot: potions },
  207: { give: [{ item: 'bronzeDisc' }] },
  209: { take: [{ arrows: 1 }] },
  215: { ep: -3 },
  216: { ep: 8 },
  // won within three rounds: 142; a fourth round is not fought (19)
  217: { fight: { stop: { after: 3, to: '19' }, to: '142' } },
  218: { ep: -3 },
  220: { need: { 138: flameshaft(5) } },
  // 1 more at 20 ENDURANCE or higher, 1 less at 10 or lower
  226: { rntMod: [{ ep: [20, 999], plus: 1 }, { ep: [-99, 10], plus: -1 }], ranges: { 89: [-99, 2], 346: [3, 99] } },
  228: { rolls: [{ range: [0, 4], ep: -1 }, { range: [5, 9], ep: -2 }] },
  233: { ep: -1 },
  237: { fight: { csMod: -5, csNote: 'Short of air' } },
  // won within two rounds: 142; a third is not fought (19)
  241: { fight: { stop: { after: 2, to: '19' }, to: '142' } },
  245: { ep: -4 },
  248: { ep: -2 },
  249: { loot: [{ item: 'blackClasp' }] },
  257: { ep: -4, need: { 138: flameshaft(5) } },
  259: { ep: -6 },
  261: { take: [{ item: 'ironDisc19' }] },
  265: { ep: -3 },
  271: { loot: [{ item: 'goldCup19' }] },
  273: { ep: -2 },
  274: { loot: [{ item: 'ironDisc19' }] },
  // grappled before he can draw: the section's 4, as printed (see the notes above)
  276: { fight: { unarmed: true, csNote: 'Grappled before drawing a weapon' } },
  278: { ep: -2 },
  279: { when: [{ unless: { disc: 'grandNexus' }, ep: -5 }] },
  281: { ep: -5 },
  282: { need: { 3: sommerswerd, 123: noSommerswerd } },
  // a locked door broken down in the storm
  283: { ep: -3, fight: { kind: 'obstacle' } },
  284: { rolls: [{ range: [0, 9], ep: 'drawn' }] },
  286: { rolls: drawnPlus(2) },
  288: { take: [{ item: 'naphthaBomb' }] },
  291: { ep: -6 },
  293: { ep: -5 },
  295: { ep: -3 },
  302: { give: [{ item: 'platinumAmulet16' }] },
  304: { todo: 'Fight the duel yourself: the Combat Ratio is -4 whatever your bonuses, and Wolf’s Bane’s ENDURANCE equals yours now, 4 less if you carry the Bronze Disc. Stop once his falls to 10 or below and turn to 151; set your ENDURANCE by hand' },
  305: { take: [{ pick: ['backpack'], n: 3 }] },
  309: { need: { 136: bowArrows } },
  312: { ep: -5, need: { 209: flameshaft(7) } },
  315: { ep: -1 },
  318: { need: { 28: sommerswerd, 167: noSommerswerd } },
  321: { ep: -8, take: [{ pick: ['special'], n: 1 }, { pick: ['backpack'], n: 1 }] },
  327: { ep: -1 },
  328: weaponLost,
  329: { ep: -4 },
  332: { ep: -2 },
  333: { loot: [{ item: 'ironDisc19' }] },
  338: { loot: [{ item: 'sword' }], need: { 138: flameshaft(5) } },
  340: { fight: swoop('221', '163') },
  341: { ep: 3 },
  342: { ep: -5 },
  343: { need: { 132: sommerswerd, 147: noSommerswerd } },
  345: { loot: [{ item: 'rubyRing19' }] },
};

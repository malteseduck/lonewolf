/* Book 20's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand from the script's draft (see items-01fftd.js for the fields, docs/reference/book-format.md
   for the later ones, and docs/reference/items.md for how). Notes on this book:
     - Skarn-Ska is a Special Item that fights as a sword (+5); where a fight gives it more, that is the fight's
       `weaponCs` (64, 185, 193, 211), so the bonus goes with the blade in hand.
     - The three keys to Dazganon (the Nza'pok Amulet, the Künae Ring, the Scarab) each carry a number, put on the
       Action Chart as a note (139, 100, 155); the curtain at 57 takes all three. At 297 and 338 their total is
       the section to turn to: the importer read the sections as deaths, which they are only without all three.
     - The Sommerswerd's 4 on the Plane of Darkness (footnote 3, section 90) is not applied, nor is the Kai-ray
       (rules-books.md). 330's loss of the last three Backpack places is left by hand until the owner rules.
     - 48's 20 ENDURANCE is Deliverance's, as the section says; the page cannot tell whether it was used already.
     - Gates with a top rank or a span of ranks (21, 59, 85, 122, 141, 170, 266, 283) are written here: the
       importer reads only "or higher".
     - Bow shots: 51 and 271 (two Arrows loosed before the shot). Arrows loosed with no number drawn (244, 317,
       336) are taken there, 291 empties the Quiver. No fight's COMBAT SKILL loss is a surprise attack's: no
       ambushes.
     - Edged and non-edged weapons (255, 261): the text names Sword and Axe, Quarterstaff and Mace; a Spear may
       take either way at 261 and cut the path at 255. 261 has no way for one with no weapon but a Bow, or none.
     - Gates on earlier adventures (47, 48, 63, 86, 112, 155, 191, 210, 218, 236, 243, 248, 269, 275, 281, 285,
       303, 343, 348) are the player's to answer.
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  skarnSka: { name: 'Skarn-Ska', kind: 'special', glyph: 'relic-blade', weapon: ['sword'], cs: 5, about: 'The golden sword Lords Rimoah and Ardan forged at the Monastery, tempered in spell-fire; its name means Wolf’s Blade.' },
  tomeOfDarkness: { name: 'Tome of Darkness', kind: 'special', glyph: 'book-cover', free: true, about: 'A black-bound book of blank metal pages found in Kazan-Oud. On the Plane of Darkness its pages tell of each realm and how to leave it. Takes no Special Item place.' },
  nzapokAmulet: { name: 'Nza’pok Amulet', kind: 'special', glyph: 'primitive-necklace', about: 'The iron amulet torn from the Lord of the Mire: the way out of his realm, and one of three keys to Dazganon. Kept in a pocket.' },
  kunaeRing: { name: 'Künae Ring', kind: 'special', glyph: 'power-ring', about: 'A gold ring cut from a Lord of Decay’s hand: the way out of their realm, and one of three keys to Dazganon. Kept in a pocket.' },
  scarabWinglessDragon: { name: 'Scarab of the Wingless Dragon', kind: 'special', glyph: 'scarab-beetle', about: 'Found in the Dragonlord’s nest of fire; it shields its bearer from the cold of the beam below, and is one of three keys to Dazganon. Kept in a pocket.' },
  blueDiamond: { name: 'Blue Diamond', kind: 'special', glyph: 'emerald', about: 'A walnut-sized gem dug from under a swamp hut. It answers to magic in the Dragonlord’s realm. Kept in a pocket.' },
  muntaagHoney: { name: 'Muntaag Honey', kind: 'backpack', glyph: 'honey-jar', about: 'Poisonous honey from an insect hive, wrapped in a leaf. Not to be eaten; a hungry beast may want it.' },
  shamathsPotion: { name: 'Shamath’s Potion', kind: 'backpack', glyph: 'round-bottom-flask', about: 'The golden elixir the Demoness meant for her rival: deadly to evil, healing to good.' },
};

const blades = ['sword', 'shortSword', 'broadsword', 'axe', 'dagger'];
// whether a Spear is edged the text does not say: both ways stay open to it at 255 and 261
const edgedOrSpear = { any: [{ weapon: [...blades, 'spear'], label: 'an edged weapon (a Spear: your call)' }] };
const magicBlades = ['sommerswerd', 'skarnSka'];
const blade = { item: magicBlades }, noBlade = { item: magicBlades, not: true };
const bowArrows = { any: [{ weapon: ['bow'], arrows: 1, label: 'a Bow and an Arrow' }] };
const amulet = { item: 'platinumAmulet16' }, noAmulet = { item: 'platinumAmulet16', not: true };
const diamond = { item: 'blueDiamond' }, noDiamond = { item: 'blueDiamond', not: true };
const potion = { item: 'shamathsPotion' }, noPotion = { item: 'shamathsPotion', not: true };
// below a rank: the text's "if you have yet to attain" choices, and spans of ranks
const below = (rank, cond, label) => ({ any: [{ ...cond, not: { rank }, label }] });
// Kekataag: by the blade he has
const kekataag = { 121: { item: 'sommerswerd' }, 211: { item: 'skarnSka' }, 282: noBlade };
// a draw with 1 off at 10 ENDURANCE or lower and 1 more at 20 or higher, which the importer left free
const nerve = [{ ep: [-99, 10], plus: -1 }, { ep: [20, 999], plus: 1 }];
// the number drawn (0 as 10), doubled, restored by the Platinum Amulet
const amuletHeals = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], ep: 2 * (n || 10) }));
// lifted in the net: a Backpack Item of his choice on 0-4, all his Crowns on 5-9
const netted = [{ range: [0, 4], take: [{ pick: ['backpack'], n: 1 }] }, { range: [5, 9], take: [{ gold: 'all' }] }];
// the Dragonlord: stopped at 20; the Blue Diamond adds 3, Skarn-Ska 2 more than its own
const dragonlord = (to) => ({ stop: { foeAt: 20, to }, weaponCs: { skarnSka: 7 }, rounds: [{ if: diamond, csMod: 3, note: 'Blue Diamond' }] });
const animalMastery = { if: { disc: 'animalMastery' }, csMod: 2, note: 'Animal Mastery' };
const keys = ['nzapokAmulet', 'kunaeRing', 'scarabWinglessDragon'];
const swarm = { fight: { rounds: [{ psi: 2, note: 'Susceptible to psychic attack' }] } };

export const SECTIONS = {
  4: { ep: -3 },
  // the first three Backpack places ruined
  8: { ep: -5, take: [{ at: [1, 2, 3] }] },
  15: { rolls: [{ range: [0, 9], ep: 'drawn' }], lessen: [{ n: 1, if: { disc: 'deliverance' } }] },
  21: { need: { 187: below(7, {}, 'Sun Knight or lower'), 219: below(10, { rank: 7 }, 'Sun Lord to Grand Thane') } },
  24: { ep: -3 },
  27: { need: { 258: { item: 'korliniumScabbard' }, 341: { item: 'korliniumScabbard', not: true } } },
  29: { need: { 108: blade, 6: noBlade } },
  32: { fight: { undead: true } },
  34: { ep: -2 },
  35: { ep: -2, need: { 193: blade, 261: noBlade } },
  41: { need: { 109: { gold: 1 }, 65: { any: [{ not: { gold: 1 } }] } } },
  42: { rntMod: nerve, ranges: { 148: [-99, 4], 14: [5, 99] } },
  // Deliverance's 20, then the amulet's healing
  48: { ep: 20, rolls: amuletHeals },
  49: { ep: -2 },
  50: { give: [{ item: 'skarnSka' }, { item: 'korliniumScabbard' }], need: { 180: amulet, 296: noAmulet } },
  51: { bowShot: { 175: [-99, 7], 203: [8, 99] } },
  53: { give: [{ item: 'tomeOfDarkness' }] },
  57: { take: [{ item: 'nzapokAmulet' }, { item: 'kunaeRing' }, { item: 'scarabWinglessDragon' }] },
  58: { need: { 44: blade } },
  59: { need: { 187: below(7, {}, 'Sun Knight or lower'), 219: below(10, { rank: 7 }, 'Sun Lord to Grand Thane') } },
  60: { need: { 315: potion, 218: noPotion } },
  62: { rntMod: nerve, ranges: { 45: [-99, 2], 114: [3, 99] } },
  64: { fight: dragonlord('344') },
  68: { need: kekataag },
  73: { ep: -1 },
  76: { when: [{ unless: { rank: 7 }, ep: -2 }] },
  81: { need: kekataag },
  82: { ep: -1 },
  83: { rolls: [{ range: [0, 9], ep: 'drawn' }], lessen: [{ n: 1, if: { disc: 'deliverance' } }] },
  85: { need: { 334: below(10, { disc: 'grandPathsmanship' }, 'Grand Pathsmanship below Grand Crown') } },
  89: { give: [{ item: 'platinumAmulet16' }, { item: 'tomeOfDarkness' }] },
  98: { need: { 310: blade, 147: noBlade } },
  99: { ep: -2 },
  100: { ep: -2, give: [{ item: 'kunaeRing' }], note: 'Künae Ring: 20' },
  103: { ep: -6, take: [{ gold: 2 }] },
  106: { ep: -4 },
  110: { ep: -3 },
  112: { loot: [{ item: 'muntaagHoney' }] },
  117: { ep: -4 },
  118: { ep: -8 },
  121: { fight: { undead: true } },
  122: { need: { 251: below(10, { disc: 'kaiAlchemy' }, 'Kai-alchemy below Grand Crown') } },
  129: { rolls: netted },
  131: { ep: -2 },
  135: { need: { 254: blade, 147: noBlade } },
  138: { ep: -4 },
  139: { give: [{ item: 'nzapokAmulet' }], note: 'Nza’pok Amulet: 6' },
  141: { need: { 251: below(10, { disc: 'kaiAlchemy' }, 'Kai-alchemy below Grand Crown') } },
  142: { need: { 317: bowArrows } },
  // the coin lost at 332
  143: { take: [{ gold: 1 }] },
  144: { rolls: [{ range: [0, 4], ep: -4 }, { range: [5, 9], ep: -5 }] },
  149: { rntMod: nerve, ranges: { 284: [-99, 3], 31: [4, 99] } },
  150: { take: [{ item: 'tomeOfDarkness' }] },
  151: { rolls: netted },
  154: { ep: -1 },
  155: { give: [{ item: 'scarabWinglessDragon' }], note: 'Scarab of the Wingless Dragon: 31' },
  159: { take: [{ item: 'muntaagHoney' }] },
  164: { ep: -4, take: [{ item: 'dagger' }] },
  165: { ep: -3 },
  // the Kai-blast's cost
  167: { ep: -4 },
  168: { ep: -3 },
  169: { ep: -2 },
  170: { need: { 133: below(10, { disc: 'kaiScreen' }, 'Kai-screen below Grand Crown') } },
  180: { give: [{ item: 'tomeOfDarkness' }] },
  181: { ep: -2 },
  185: { fight: dragonlord('70') },
  186: { need: { 276: { ep: [-99, 4] }, 303: { ep: [5, 999] } } },
  187: { ep: -6 },
  190: { need: { 164: { any: [{ weapon: ['dagger'] }] }, 244: { any: [{ arrows: 1, label: 'an Arrow' }] },
    199: { any: [{ not: { any: [{ weapon: ['dagger'] }, { arrows: 1 }] }, label: 'neither a Dagger nor an Arrow' }] } } },
  191: { loot: [{ item: 'muntaagHoney' }] },
  // the magic blade's 2 more against the vines, and Animal Mastery's 2
  193: { fight: { weaponCs: { sommerswerd: 10, skarnSka: 7 }, rounds: [animalMastery] } },
  195: { take: [{ gold: 1 }] },
  199: { ep: -2 },
  200: { need: { 336: bowArrows } },
  205: { rntMod: nerve, ranges: { 305: [-99, 2], 102: [3, 99] } },
  206: { ep: -3 },
  210: { ep: -1 },
  // Skarn-Ska's 3 more against the undead champion, as its own bonus
  211: { fight: { csMod: 0, weaponCs: { skarnSka: 8 }, undead: true } },
  212: { ep: -2, ...swarm },
  214: { ep: -4 },
  219: { ep: -3 },
  220: { need: { 295: diamond, 239: noDiamond } },
  221: { ep: -2 },
  223: { need: { 27: { item: 'sommerswerd' }, 307: { item: 'sommerswerd', not: true } } },
  224: { need: { 254: blade, 147: noBlade } },
  228: { need: { 188: { item: 'sommerswerd' }, 347: { item: 'skarnSka' } } },
  229: { rolls: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], ep: n % 2 ? -3 : -5 })) },
  230: { ep: -3 },
  233: { ep: -5 },
  // the Kai-blast's cost, 2 here
  236: { ep: -2, loot: [{ item: 'muntaagHoney' }] },
  237: { need: kekataag },
  244: { ep: -4, take: [{ arrows: 1 }] },
  245: { ep: -2 },
  246: { ep: -1 },
  253: { ep: -1, loot: [{ item: 'shamathsPotion' }] },
  255: { need: { 304: edgedOrSpear, 24: { any: [{ not: { weapon: blades }, label: 'no edged weapon' }] } } },
  256: { take: [{ item: 'shamathsPotion' }] },
  // the coin lost at 214
  257: { take: [{ gold: 1 }] },
  258: { need: { 53: amulet, 296: noAmulet } },
  // the armoury: as many Arrows as the Quiver holds
  260: { loot: [{ item: 'sword' }, { item: 'spear' }, { item: 'axe' }, { item: 'broadsword' }, { arrows: 6 }, { item: 'bow' }] },
  261: { need: { 61: edgedOrSpear, 345: { any: [{ weapon: ['quarterstaff', 'mace', 'warhammer', 'spear'], label: 'a non-edged weapon (a Spear: your call)' }] } } },
  266: { need: { 251: below(10, { disc: 'kaiAlchemy' }, 'Kai-alchemy below Grand Crown') } },
  265: { need: { 109: { gold: 1 }, 65: { any: [{ not: { gold: 1 } }] } } },
  268: { need: { 159: { item: 'muntaagHoney' }, 321: { item: 'muntaagHoney', not: true } } },
  269: { loot: [{ item: 'blueDiamond' }] },
  // two Arrows loosed, then the third is the shot
  271: { take: [{ arrows: 2 }], bowShot: { 291: [-99, 7], 222: [8, 99] } },
  272: { need: { 256: potion, 146: noPotion } },
  274: { ep: -5 },
  277: { ep: -2 },
  281: { rolls: amuletHeals },
  // two Arrows go before the shot at 271, so three are needed
  283: { need: { 111: below(10, { item: 'rope' }, 'a Rope, below Grand Crown'),
    271: { any: [{ weapon: ['bow'], arrows: 3, not: { any: [{ rank: 10 }, { item: 'rope' }] }, label: 'a Bow and three Arrows, no Rope, below Grand Crown' }] } } },
  // a first rush: no loss of his in the first two rounds
  282: { fight: { rounds: [{ upTo: 2, heroLoss: 0, note: 'First rush' }] } },
  285: { loot: [{ item: 'muntaagHoney' }] },
  286: { loot: [{ item: 'shamathsPotion' }] },
  288: { ep: -8 },
  291: { take: [{ arrows: 'all' }] },
  292: { ep: -5 },
  294: { need: { 254: blade, 147: noBlade } },
  296: { give: [{ item: 'platinumAmulet16' }, { item: 'tomeOfDarkness' }] },
  // the three numbers' total is a section to turn to; the death the importer read is only for who lacks a key
  297: { end: null, when: [{ unless: { items: keys }, dead: true }] },
  298: { ep: -1 },
  // the weapon's burning edge, 3, and Animal Mastery's 2
  299: { fight: { csMod: 3, csNote: 'Burning edge', rounds: [animalMastery] } },
  303: { rolls: amuletHeals },
  304: { ep: -1 },
  309: { ep: -6, take: [{ gold: 2 }] },
  312: { ep: -4 },
  313: { ep: -4 },
  315: { todo: 'Drink all of Shamath’s Potion (restore all your ENDURANCE and erase it) or half (restore 5 and keep it): change your ENDURANCE, and remove the Potion, by hand' },
  317: { take: [{ arrows: 1 }] },
  318: swarm,
  321: { need: { 51: bowArrows } },
  330: { todo: 'Lose the items in the last three places of your Backpack list: by hand' },
  331: { need: { 157: diamond, 106: noDiamond } },
  332: { ep: -4 },
  336: { take: [{ arrows: 1 }] },
  338: { end: null, when: [{ unless: { items: keys }, dead: true }] },
  341: { give: [{ item: 'korliniumScabbard' }], need: { 53: amulet, 296: noAmulet } },
  342: { ep: -10 },
};

/* Book 12's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand (see items-01fftd.js for the fields, docs/reference/book-format.md for the later ones, and
   docs/reference/items.md for how). Notes on this book:
     - The Sommerswerd, the Dagger of Vashna (items-04tcod.js), a Bow and the Rope come with him from
       earlier books or the kit; the table only gates choices on them. The Sommerswerd's choices lead to a death where
       it is drawn in the Darklands; the section says when that is wrong, the page just offers it.
     - Kika (the Darklands' coin, ten to a Gold Crown) are counted apart from Crowns (LW.COINS), as the
       text will not let Crowns stand in for them when bribing or betting. The pit-fight bet (61) is a
       stake, settled in 225 and 265.
     - Arrows fired where the text says outright that one flies are taken from the Quiver here (the
       count stops at none); Random Number shots are spent by the page's own bow shot. 211 returns one.
     - The three armours (Kagonite Chainmail, Bronin Vest, Silver Bracers) add their ENDURANCE and their
       COMBAT SKILL in every fight through the item (`ep`, `fightCs`).
     - Kai Hunting no longer feeds him past 200 (the Meals at 36, 144 and 338); Huntmastery still does.
     - First-round and first-two-round penalties and unarmed opening rounds are fight `rounds`; where the
       text says outright that Huntmastery spares one, it is an `unless`, not `ambush`.
     - Bonuses that depend on which weapon is used (Helshezag, the Dagger, 12 against Gnaag) are the
       fight's `weaponCs`, in place of the weapon's own bonus. Helshezag's cost (1 ENDURANCE a round from
       the second, off his basic score, as the book's footnote to 240 says) is the item's `wieldCost`; the
       engine takes it up only where a fight names it (133, 230, 88) or he has no other weapon, as the
       text leaves it to him elsewhere (104, 342).
     - Junk the dead carry (tobacco, wine, a pipe) is left out. A Pouch of Herbs is an item only so the
       two sections that open it can swap it for the Adgana, or throw it away.
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  crystalExplosive: { name: 'Crystal Explosive', kind: 'special', glyph: 'crystal-cluster', about: 'A charge of fused crystals strapped to your Backpack. It must go under the Transfusor; the shard in it primes it, and it blows fifteen minutes later.' },
  goldenAmulet12: { name: 'Golden Amulet', kind: 'special', glyph: 'gem-necklace', free: true, about: 'Keeps out the heat and poisonous air of the Darklands. Takes no Special Item place.' },
  greenMask12: { name: 'Green Mask', kind: 'special', glyph: 'domino-mask', free: true, about: 'A glass-like mask that hides who you are from a casual look. Takes no Special Item place.' },
  korliniumScabbard: { name: 'Korlinium Scabbard', kind: 'special', glyph: 'scabbard', free: true, about: 'Keeps the Sommerswerd’s power hidden while it is sheathed. Takes no Special Item place.' },
  helshezag: { name: 'Helshezag', kind: 'special', glyph: 'broadsword', weapon: ['sword'], cs: 5, wieldCost: { from: 2, ep: 1 },
    about: 'Kraagenskûl’s black sword: +5 COMBAT SKILL, +7 against a Darklord of Helgedad (the page adds 5, and 7 where the text says). From the second round of every fight you use it in, it takes 1 ENDURANCE for good (counted). The page fights with it only where the text names it, or when you have no other weapon.' },
  kagoniteMail: { name: 'Kagonite Chainmail', kind: 'special', glyph: 'mail-shirt', ep: 1, fightCs: 3, about: '+1 ENDURANCE and +3 COMBAT SKILL (both counted). Worn under any other body armour.' },
  broninVest: { name: 'Bronin Vest', kind: 'special', glyph: 'leather-vest', ep: 1, fightCs: 3, apart: ['chainmail'], about: '+1 ENDURANCE and +3 COMBAT SKILL (both counted). Not worn with a Chainmail Waistcoat; fine with a Padded Leather Waistcoat.' },
  silverBracers: { name: 'Silver Bracers', kind: 'special', glyph: 'bracer', ep: 1, fightCs: 2, about: '+1 ENDURANCE and +2 COMBAT SKILL (both counted).' },
  zejarDulaga: { name: 'Zejar-dulaga', kind: 'special', glyph: 'arrow-flights', arrow: true, about: 'A poisoned arrow that never misses its mark, carried in the Quiver in an Arrow’s place.' },
  ironKey12: { name: 'Iron Key', kind: 'special', glyph: 'key' },
  blackKey12: { name: 'Black Key', kind: 'backpack', glyph: 'skeleton-key', about: 'Opens a locked door in the Imperial Sector of Helgedad.' },
  blackCube12: { name: 'Black Cube', kind: 'backpack', glyph: 'cube', about: 'A Nadziranim power crystal, unstable once picked up. Carry it into the Imperial Armoury and it kills you.' },
  adgana12: { name: 'Dose of Adgana', kind: 'backpack', glyph: 'herbs-bundle', boost: 6, boostAgain: 3, addict: { key: 'adgana', upTo: 1, again: 3, epMax: -4 },
    about: 'Swallow before a fight: +6 COMBAT SKILL for it (+3 if you have used Adgana before). Afterwards a number is drawn: on 0 or 1 (0 to 3 if you used it before) you are addicted and lose 4 ENDURANCE for good.' },
  herbsPouch12: { name: 'Pouch of Herbs', kind: 'backpack', glyph: 'herbs-bundle', about: 'Unknown herbs from a dead officer.' },
  whip12: { name: 'Whip', kind: 'backpack', glyph: 'whip' },
  blanket12: { name: 'Blanket', kind: 'backpack', glyph: 'blanket' },
  gnallia12: { name: 'Meal of Gnallia', kind: 'backpack', glyph: 'meal', meal: true, heal: 2, about: 'An edible bacterium, foul but nourishing: a Meal that also restores 2 ENDURANCE.' },
};

// the number drawn is the loss, 0 counting as 10
const loss = [{ range: [0, 9], ep: 'drawn' }];
const sommerswerd = { item: 'sommerswerd' };
// anyone with a Bow of either kind and an Arrow to shoot; a Bow lost is the one he has (of two, he says which)
const bows = ['bow', 'silverBow'];
const bow = { any: [{ item: bows, arrows: 1, label: 'a Bow and an Arrow' }] };
const bowLost = { item: bows, choose: true, label: 'The Bow you lose' };
const kika = (n) => ({ coin: 'kika', n });
const hunt = { disc: 'huntmastery' };
// no weapon can be drawn in the first rounds
const bare = (upTo, unless) => Object.assign({ upTo, unarmed: true }, unless && { unless });
const surprise = (upTo, csMod) => ({ upTo, csMod, unless: hunt, note: 'Surprise' });
// the foe takes psychic attack badly: Mindblast's and Psi-surge's bonus doubled
const psychic = { rounds: [{ mind: true, psi: 2 }] };
// the Ictakko's numbing wounds cost 1 more, unless he has Nexus and is an Archmaster (9 disciplines)
const ictakko = { heroPlus: 1, unless: { disc: 'nexus', rank: 9 } };

export const SECTIONS = {
  // the ENDURANCE lost in the Shadow Gate is the number drawn, 0 counting as 10
  1: { rolls: loss },
  2: { fight: psychic },
  5: { take: [bowLost, { arrows: 1 }], fight: { rounds: [bare(1)], won: { within: 4, to: '232', else: '148' } } },
  8: { fight: { rounds: [{ upTo: 2, csMod: -2, unless: { disc: ['huntmastery', 'divination'] }, note: 'Spotted' }], won: { within: 3, to: '311', else: '252' } } },
  9: { ep: -3 },
  12: { ep: -2 },
  13: { ep: -5 },
  16: { ep: -3, fight: { rounds: [surprise(2, -4)] } },
  18: { need: { 264: bow } },
  22: { need: { 247: sommerswerd } },
  23: { fight: { rounds: [bare(1, hunt)] } },
  25: { need: { 208: sommerswerd } },
  32: { fight: { rounds: [bare(2)] } },
  42: { ep: -4 },
  43: { take: [{ coin: 'kika', n: 'half' }] },
  44: { ep: -6 },
  48: { need: { 324: bow } },
  // the Arrow that kills the first bird is not recovered
  49: { take: [{ arrows: 1 }], need: { 107: { any: [{ arrows: 1 }] } } },
  36: { noHunt: 'Hunting' },
  50: { ep: 'full' },
  52: { loot: [{ item: 'shortSword' }, { item: 'dagger' }, { item: 'rope' }, kika(20)] },
  53: { ep: -3 },
  54: { need: { 40: { item: 'blackCube12' }, 320: { item: 'blackCube12', not: true } } },
  55: { fight: { rounds: [ictakko] } },
  56: { need: { 208: sommerswerd } },
  57: { fight: { won: { within: 3, to: '6', else: '195' } } },
  58: { fight: { rounds: [surprise(1, -2)] } },
  60: { need: { 270: bow, 192: sommerswerd } },
  // the bet on the pit fight: the fighter is the choice; won in 265 (winnings twice the stake), lost in 225
  61: { stake: { coin: 'kika', min: 10 } },
  63: { give: [{ item: 'kagoniteMail' }] },
  67: { ep: -3, need: { 208: sommerswerd }, fight: { won: { within: 4, to: '228', else: '121' } } },
  // he can evade only at the start of the second round (the importer read any time)
  68: { fight: { evade: { after: 1, to: '169' }, rounds: [{ csMod: -2, if: { wield: true, not: { wield: ['broadsword', 'spear', 'quarterstaff'] } }, note: 'Too short a reach' }] } },
  // the book's footnote: for the three rounds the Sommerswerd is out of reach, only the Dagger of Vashna
  // (+7 against a Darklord) hurts him
  75: { fight: { weaponCs: { daggerVashna: 7 }, rounds: [{ upTo: 3, barred: ['sommerswerd'] }, { upTo: 3, foeLoss: 0, unless: { item: 'daggerVashna' }, note: 'Sommerswerd out of reach' }] } },
  79: { loot: [{ item: 'sword' }, { item: 'dagger' }, { item: 'bow' }, { item: 'quiver' }, { arrows: 4 }, kika(30)] },
  82: { take: [{ arrows: 1 }] },
  83: { fight: { rounds: [{ upTo: 2, heroLoss: 0 }] }, need: { 208: sommerswerd } },
  // the Darklords' weapon he came with adds 12 here, in place of its usual bonus
  88: { fight: { only: ['daggerVashna', 'helshezag'], weaponCs: { daggerVashna: 12, helshezag: 12 } } },
  // more Meals of Gnallia than the Backpack holds
  93: { loot: Array(8).fill({ item: 'gnallia12' }) },
  // a shot at the Drakkar's throat: 0-4 misses, 5 or more kills
  95: { need: { 40: { item: 'blackCube12' }, 320: { item: 'blackCube12', not: true } } },
  99: { bowShot: { 336: [0, 4], 212: [5, 99] } },
  102: { fight: psychic },
  104: { need: { 208: sommerswerd } },
  107: { bowShot: { 245: [0, 6], 211: [7, 99] } },
  113: { need: { 131: bow } },
  114: { fight: psychic },
  118: { need: { 231: bow } },
  119: { take: [{ arrows: 1 }] },
  121: { take: [{ item: 'goldenAmulet12' }] },
  130: { need: { 278: { item: 'blackKey12' }, 29: { item: 'blackKey12', not: true } } },
  131: { take: [{ arrows: 1 }], need: { 259: { any: [{ arrows: 2 }] } } },
  // he fights with the black sword he has just picked up (his only after the fight): +7 here
  133: { fight: { lend: 'helshezag', weaponCs: { helshezag: 7 } } },
  135: { bowShot: { 313: [0, 8], 105: [9, 99] } },
  136: { ep: -4, fight: { rounds: [bare(1, hunt)] } },
  139: { loot: [{ item: 'spear' }, { item: 'dagger' }, { item: 'axe' }, { item: 'ironKey12' }, { meal: 1 }, kika(60)] },
  141: { need: { 40: { item: 'blackCube12' }, 320: { item: 'blackCube12', not: true } } },
  // the draw is the Adgana's, after the fight it is used in
  144: { noHunt: 'Hunting' },
  145: { take: [{ item: 'herbsPouch12' }], loot: [{ item: 'adgana12' }], rnt: null },
  146: { need: { 99: bow } },
  159: { loot: [{ item: 'broninVest' }, { item: 'silverBracers' }] },
  160: { fight: { drain: 1 } },
  162: { need: { 43: kika(1) } },
  166: { give: [{ item: 'crystalExplosive' }], need: { 282: sommerswerd, 229: { item: 'sommerswerd', not: true } } },
  170: { need: { 208: sommerswerd } },
  // he fights with the Dagger: +7 against a Darklord, in place of its usual bonus
  171: { fight: { lend: 'daggerVashna', weaponCs: { daggerVashna: 7 } } },
  // the number drawn is the loss (0 counting as 10), less 2 with the Lore-circle of Solaris
  172: { rolls: loss, lessen: [{ n: 2, if: { circle: ['Circle of Solaris'] } }] },
  176: { need: { 208: sommerswerd, 230: { item: ['daggerVashna', 'helshezag'] }, 238: { any: [{ item: bows, items: ['zejarDulaga'], label: 'a Bow and the Zejar-dulaga' }] } } },
  180: { rolls: loss },
  183: { ep: -4 },
  // the bet in 61 is 10 Kika at least
  184: { need: { 61: kika(10) } },
  185: { take: [{ arrows: 1 }] },
  186: { bowShot: { 313: [0, 8], 105: [9, 99] } },
  187: { loot: [{ item: 'zejarDulaga' }] },
  190: { need: { 208: sommerswerd } },
  193: { need: { 208: sommerswerd } },
  194: { fight: { rounds: [surprise(1, -2)] } },
  198: { fight: { with: 'none' } },
  201: { take: [{ item: 'herbsPouch12' }] },
  202: { take: [{ coin: 'kika', n: 'all' }] },
  // the ranges are for the total: Rope +1, Huntmastery at Primate (4 disciplines) +2, Solaris +3
  206: { rntMod: [{ plus: 1, item: 'rope' }, { plus: 2, disc: 'huntmastery', rank: 4 }, { plus: 3, circle: ['Circle of Solaris'] }], ranges: { 62: [0, 4], 123: [5, 99] } },
  211: { give: [{ arrows: 1 }] },
  220: { ep: -2 },
  221: { need: { 108: kika(1) } },
  224: { fight: { rounds: [bare(2)] } },
  225: { settle: { 61: -1 } },
  226: { ep: -3, fight: { rounds: [ictakko] } },
  228: { loot: [{ item: 'dagger' }, { item: 'sword' }, { item: 'axe' }, { item: 'shortSword' }, { item: 'blanket12' }, { item: 'blackKey12' }, kika(40)] },
  229: { give: [{ item: 'goldenAmulet12' }] },
  // the book's footnote: either Darklord weapon adds 7 against him
  230: { fight: { weaponCs: { daggerVashna: 7, helshezag: 7 } } },
  231: { take: [{ arrows: 1 }] },
  235: { give: [{ item: 'greenMask12' }] },
  236: { take: [{ arrows: 1 }] },
  237: { ep: -1 },
  238: { take: [{ item: 'zejarDulaga' }] },
  239: { fight: { won: { within: 3, to: '272', else: '155' } } },
  240: { loot: [{ item: 'helshezag' }], need: { 310: bow } },
  244: { ep: -4 },
  245: { take: [bowLost] },
  246: { loot: [{ item: 'blackKey12' }] },
  // evasion opens at the start of the third round (the importer read any time)
  247: { fight: { evade: { after: 2, to: '96' }, rounds: [bare(2)] } },
  258: { when: [{ if: { item: ['psychicRing', 'greyRing'] }, ep: -3 }, { unless: { item: ['psychicRing', 'greyRing'] }, ep: -8 }] },
  259: { take: [{ arrows: 2 }], fight: { rounds: [bare(2, hunt)], won: { within: 3, to: '272', else: '155' } } },
  264: { take: [{ arrows: 1 }], fight: psychic },
  265: { settle: { 61: 2 } },
  266: { need: { 302: { item: 'fireseed' } } },
  267: { ep: -8 },
  268: { fight: { rounds: [{ from: 2, behind: 1, offMax: true, note: 'Lasting wounds' }] } },
  271: { loot: [{ item: 'sword' }, { item: 'axe' }, { item: 'broadsword' }, { item: 'bow' }, { item: 'quiver' }, { arrows: 6 }, { item: 'dagger' }, { item: 'mace' }, kika(400)] },
  276: { ep: -3, take: [{ arrows: 1 }], fight: { rounds: [bare(2), ictakko] } },
  282: { give: [{ item: 'korliniumScabbard' }] },
  286: { need: { 57: sommerswerd, 171: { item: 'daggerVashna' } } },
  288: { ep: -2 },
  291: { need: { 208: sommerswerd }, fight: { won: { within: 5, to: '95', else: '199' } } },
  292: { fight: { rounds: [{ upTo: 2, heroLoss: 0 }] } },
  306: { need: { 214: sommerswerd, 88: { item: ['daggerVashna', 'helshezag'] }, 3: { item: ['sommerswerd', 'daggerVashna', 'helshezag'], not: true } } },
  307: { fight: psychic },
  308: { loot: [{ item: 'blackKey12' }, { item: 'blackCube12' }] },
  309: { need: { 77: bow, 128: sommerswerd } },
  310: { take: [{ arrows: 1 }], loot: [{ item: 'spear' }, { item: 'axe' }, { item: 'dagger' }, { item: 'ironKey12' }, { meal: 1 }, kika(60)] },
  // the only Medal is Book 10's; the sergeant keeps it
  314: { need: { 202: kika(1), 126: { gold: 1 }, 269: { item: 'medal10', spend: true } } },
  315: { need: { 103: bow } },
  317: { loot: [{ item: 'sword' }, { item: 'sword' }, { item: 'sword' }, { item: 'axe' }, { item: 'axe' }, { item: 'dagger' }, { item: 'dagger' }, { item: 'bow' }, { arrows: 4 }, { item: 'rope' }, { item: 'herbsPouch12' }] },
  322: { loot: [{ item: 'sword' }, { item: 'sword' }, { item: 'sword' }, { item: 'dagger' }, { item: 'whip12' }, kika(40)] },
  // a shot in the dark: 0-4 and 5-9 and 10 or more (+3 more for Huntmastery at Archmaster, 9 disciplines)
  324: { bowShot: { 25: [0, 4], 193: [5, 9], 287: [10, 99] }, rntMod: [{ plus: 3, disc: 'huntmastery', rank: 9 }] },
  327: { need: { 49: bow } },
  333: { ep: -4 },
  338: { noHunt: 'Hunting' },
  342: { need: { 208: sommerswerd } },
  348: { fight: { drain: 1 } },
  350: { take: [{ item: 'crystalExplosive' }] },
};

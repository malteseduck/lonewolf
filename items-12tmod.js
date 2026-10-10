/* Book 12's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand (see items-01fftd.js for the fields, items-02fotw.js for the later ones, and
   docs/reference/items.md for how). Nothing new in the fields. Notes on this book:
     - The Sommerswerd, the Dagger of Vashna (items-04tcod.js), a Bow and the Rope come with him from
       earlier books or the kit; the table only gates choices on them. The Sommerswerd's choices lead to a death where
       it is drawn in the Darklands; the section says when that is wrong, the page just offers it.
     - Kika (the Darklands' coin, ten to a Gold Crown) are not tracked: the page counts Crowns, and the
       text will not let Crowns stand in for Kika when bribing or betting. Sections that hand out Kika,
       or take them, say so in a note and the player keeps them on the chart; a choice that needs Kika
       is left open, with a note.
     - Arrows fired where the text says outright that one flies are taken from the Quiver here (the
       count stops at none); Random Number shots are spent by the page's own bow shot. 211 returns one.
     - The three armours (Kagonite Chainmail, Bronin Vest, Silver Bracers) add ENDURANCE through the
       item; their COMBAT SKILL is for the player to add (the page counts one armour bonus at most, a
       Shield's).
     - First-round and first-two-round penalties, unarmed opening rounds, doubled psychic bonuses and
       the Ictakko's extra loss are notes, not changes to the fight: they last only some rounds. Every
       surprise attack Huntmastery spares here lasts only its first round or two, so no fight is marked
       ambush.
     - Bonuses that depend on which weapon is used (Helshezag, the Dagger, 12 against Gnaag) are set
       only where the section can be reached with one weapon alone (171, 133); the rest are notes.
     - Junk the dead carry (tobacco, wine, a pipe) is left out. A Pouch of Herbs is an item only so the
       two sections that open it can swap it for the Adgana, or throw it away.
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  crystalExplosive: { name: 'Crystal Explosive', kind: 'special', glyph: 'gems', about: 'A charge of fused crystals strapped to your Backpack. It must go under the Transfusor; the shard in it primes it, and it blows fifteen minutes later.' },
  goldenAmulet12: { name: 'Golden Amulet', kind: 'special', glyph: 'gem-necklace', about: 'Keeps out the heat and poisonous air of the Darklands. Takes no Special Item place beyond the limit.' },
  greenMask12: { name: 'Green Mask', kind: 'special', glyph: 'domino-mask', about: 'A glass-like mask that hides who you are from a casual look. Takes no Special Item place beyond the limit.' },
  korliniumScabbard: { name: 'Korlinium Scabbard', kind: 'special', glyph: 'scabbard', about: 'Keeps the Sommerswerd’s power hidden while it is sheathed. Takes no Special Item place beyond the limit.' },
  helshezag: { name: 'Helshezag', kind: 'special', glyph: 'broadsword', weapon: ['sword'], cs: 5,
    about: 'Kraagenskûl’s black sword: +5 COMBAT SKILL, +7 against a Darklord of Helgedad (the page adds 5). From the second round of every fight you use it in, lose 1 ENDURANCE for good: take that off by hand.' },
  kagoniteMail: { name: 'Kagonite Chainmail', kind: 'special', glyph: 'mail-shirt', ep: 1, about: '+1 ENDURANCE (counted) and +3 COMBAT SKILL (add by hand). Worn under any other body armour.' },
  broninVest: { name: 'Bronin Vest', kind: 'special', glyph: 'leather-vest', ep: 1, about: '+1 ENDURANCE (counted) and +3 COMBAT SKILL (add by hand). Not worn with a Chainmail Waistcoat; fine with a Padded Leather Waistcoat.' },
  silverBracers: { name: 'Silver Bracers', kind: 'special', glyph: 'bracer', ep: 1, about: '+1 ENDURANCE (counted) and +2 COMBAT SKILL (add by hand).' },
  zejarDulaga: { name: 'Zejar-dulaga', kind: 'special', glyph: 'arrow-flights', about: 'A poisoned arrow that never misses its mark, carried in the Quiver in an Arrow’s place.' },
  ironKey12: { name: 'Iron Key', kind: 'special', glyph: 'key' },
  blackKey12: { name: 'Black Key', kind: 'backpack', glyph: 'skeleton-key', about: 'Opens a locked door in the Imperial Sector of Helgedad.' },
  blackCube12: { name: 'Black Cube', kind: 'backpack', glyph: 'cube', about: 'A Nadziranim power crystal, unstable once picked up. Carry it into the Imperial Armoury and it kills you.' },
  adgana12: { name: 'Dose of Adgana', kind: 'backpack', glyph: 'herbs-bundle', about: 'Swallow before a fight: +6 COMBAT SKILL for it (+3 if you have used Adgana before). Afterwards draw a number: on 0 or 1 (0 to 3 if you used it before) you are addicted and lose 4 ENDURANCE for good. Apply by hand.' },
  herbsPouch12: { name: 'Pouch of Herbs', kind: 'backpack', glyph: 'herbs-bundle', about: 'Unknown herbs from a dead officer.' },
  whip12: { name: 'Whip', kind: 'backpack', glyph: 'whip' },
  blanket12: { name: 'Blanket', kind: 'backpack', glyph: 'blanket' },
};

// the number drawn is the loss, 0 counting as 10
const loss = () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], ep: -(n || 10) }));
const sommerswerd = { item: 'sommerswerd' };
const bow = { item: 'bow' };
const kikaNote = (what) => `${what} Kika: the page does not count them; keep them on your chart (10 Kika to a Gold Crown).`;
const unarmed = (rounds) => `you cannot draw a weapon for ${rounds}: those rounds are fought bare-handed, so adjust your COMBAT SKILL for them by hand.`;
const psychic = 'this foe takes psychic attack badly: double the Mindblast or Psi-surge bonus you use (the page does not).';
const kikaGate = (to) => `the way to ${to} needs Kika, which the page does not count: take it only if your chart shows some.`;
const extraLoss = 'unless you have Nexus and are an Archmaster, every wound the Ictakko deals costs 1 more ENDURANCE: take it off by hand.';

export const SECTIONS = {
  // the ENDURANCE lost in the Shadow Gate is the number drawn, 0 counting as 10
  1: { rolls: loss() },
  2: { todo: psychic },
  5: { take: [{ item: 'bow' }, { arrows: 1 }], todo: unarmed('the first round') },
  8: { todo: 'unless you have Huntmastery or Divination, take 2 off your COMBAT SKILL for the first two rounds only.' },
  9: { ep: -3 },
  12: { ep: -2 },
  13: { ep: -5 },
  16: { ep: -3, todo: 'unless you have Huntmastery, take 4 off your COMBAT SKILL for the first two rounds only.' },
  18: { need: { 264: bow } },
  22: { need: { 247: sommerswerd } },
  23: { todo: `without Huntmastery ${unarmed('the first round')}` },
  25: { need: { 208: sommerswerd } },
  32: { todo: unarmed('the first two rounds') },
  42: { ep: -4 },
  43: { todo: 'half your Kika are gone: take them off your chart.' },
  44: { ep: -6 },
  48: { need: { 324: bow } },
  // the Arrow that kills the first bird is not recovered
  49: { take: [{ arrows: 1 }] },
  50: { ep: 'full' },
  52: { loot: [{ item: 'shortSword' }, { item: 'dagger' }, { item: 'rope' }], todo: kikaNote('20') },
  53: { ep: -3 },
  54: { need: { 40: { item: 'blackCube12' }, 320: { item: 'blackCube12', not: true } } },
  55: { todo: extraLoss },
  56: { need: { 208: sommerswerd } },
  58: { todo: 'unless you have Huntmastery, take 2 off your COMBAT SKILL for the first round only.' },
  60: { need: { 270: bow, 192: sommerswerd } },
  61: { todo: 'decide your stake (10 Kika or more, Kika only) and which fighter; write it down. The result follows in the next section.' },
  63: { give: [{ item: 'kagoniteMail' }] },
  67: { ep: -3, need: { 208: sommerswerd } },
  // he can evade only at the start of the second round (the importer read any time)
  68: { fight: { evade: { after: 1, to: '169' } }, todo: 'with any weapon other than a Broadsword, Spear or Quarterstaff, take 2 off your COMBAT SKILL for the whole fight.' },
  75: { todo: 'the Sommerswerd is out of reach for the first three rounds; the book’s footnote says that in those rounds you cannot hurt him without the Dagger of Vashna. Win or survive, then take the Sommerswerd back.' },
  79: { loot: [{ item: 'sword' }, { item: 'dagger' }, { item: 'bow' }, { item: 'quiver' }, { arrows: 4 }], todo: kikaNote('30') },
  82: { take: [{ arrows: 1 }] },
  83: { todo: 'ignore the ENDURANCE you lose in the first two rounds.', need: { 208: sommerswerd } },
  88: { todo: 'the weapon you use adds 12 COMBAT SKILL here in all (in place of its usual bonus): put the difference in by hand. Gnaag is immune to Mindblast but not Psi-surge.' },
  93: { loot: [{ meal: 1 }, { meal: 1 }, { meal: 1 }, { meal: 1 }, { meal: 1 }, { meal: 1 }, { meal: 1 }, { meal: 1 }], todo: 'there are more than ten Meals of Gnallia here; take what the Backpack holds. Each one also restores 2 ENDURANCE when eaten (by hand).' },
  // a shot at the Drakkar's throat: 0-4 misses, 5 or more kills
  99: { bowShot: { 336: [0, 4], 212: [5, 99] } },
  102: { todo: psychic },
  104: { need: { 208: sommerswerd } },
  107: { bowShot: { 245: [0, 6], 211: [7, 99] } },
  113: { need: { 131: bow } },
  114: { todo: psychic },
  118: { need: { 231: bow } },
  119: { take: [{ arrows: 1 }] },
  121: { take: [{ item: 'goldenAmulet12' }] },
  130: { need: { 278: { item: 'blackKey12' }, 29: { item: 'blackKey12', not: true } } },
  131: { take: [{ arrows: 1 }] },
  // he uses the black sword he has just picked up
  133: { fight: { csMod: 7, csNote: 'Helshezag' }, todo: 'you fight with Helshezag (taken up only after the fight): if the page counts another weapon, take its bonus off by hand.' },
  135: { bowShot: { 313: [0, 8], 105: [9, 99] } },
  136: { ep: -4, todo: `without Huntmastery ${unarmed('the first round')}` },
  139: { loot: [{ item: 'spear' }, { item: 'dagger' }, { item: 'axe' }, { item: 'ironKey12' }, { meal: 1 }], todo: kikaNote('60') },
  141: { need: { 40: { item: 'blackCube12' }, 320: { item: 'blackCube12', not: true } } },
  145: { take: [{ item: 'herbsPouch12' }], loot: [{ item: 'adgana12' }], todo: 'the addiction draw is made after a fight in which you used the dose, not now.' },
  146: { need: { 99: bow } },
  159: { loot: [{ item: 'broninVest' }, { item: 'silverBracers' }] },
  160: { fight: { drain: 1 } },
  162: { todo: kikaGate(43) },
  166: { give: [{ item: 'crystalExplosive' }], need: { 282: sommerswerd, 229: { item: 'sommerswerd', not: true } } },
  171: { fight: { csMod: 7, csNote: 'Dagger of Vashna' } },
  // the number drawn is the loss (0 counting as 10), less 2 with the Lore-circle of Solaris
  172: { rolls: loss(), todo: 'with the Lore-circle of Solaris the loss is 2 less (never below 0): give back up to 2 ENDURANCE.' },
  176: { need: { 208: sommerswerd, 230: { item: ['daggerVashna', 'helshezag'] }, 238: { item: 'zejarDulaga' } } },
  180: { rolls: loss() },
  183: { ep: -4 },
  184: { todo: kikaGate(61) },
  185: { take: [{ arrows: 1 }] },
  186: { bowShot: { 313: [0, 8], 105: [9, 99] } },
  187: { loot: [{ item: 'zejarDulaga' }], todo: 'it takes the place of one Arrow in the Quiver: with six Arrows, drop one first.' },
  190: { need: { 208: sommerswerd } },
  193: { need: { 208: sommerswerd } },
  194: { todo: 'unless you have Huntmastery, take 2 off your COMBAT SKILL for the first round only.' },
  198: { fight: { with: 'none' } },
  201: { take: [{ item: 'herbsPouch12' }] },
  202: { todo: 'all your Kika are gone: take them off your chart.' },
  206: { todo: 'add to the number drawn: 1 for a Rope, 2 with Huntmastery at Primate or higher, 3 with the Lore-circle of Solaris.' },
  211: { give: [{ arrows: 1 }] },
  220: { ep: -2 },
  221: { todo: kikaGate(108) },
  224: { todo: unarmed('the first two rounds') },
  225: { todo: 'the Kika you staked are gone: take them off your chart.' },
  226: { ep: -3, todo: extraLoss },
  228: { loot: [{ item: 'dagger' }, { item: 'sword' }, { item: 'axe' }, { item: 'shortSword' }, { item: 'blanket12' }, { item: 'blackKey12' }], todo: kikaNote('40') },
  229: { give: [{ item: 'goldenAmulet12' }] },
  230: { todo: 'with the Dagger of Vashna add 7 COMBAT SKILL (the book’s footnote); with Helshezag the bonus against a Darklord of Helgedad is 7, not 5. Put the difference in by hand.' },
  231: { take: [{ arrows: 1 }] },
  235: { give: [{ item: 'greenMask12' }] },
  236: { take: [{ arrows: 1 }] },
  237: { ep: -1 },
  238: { take: [{ item: 'zejarDulaga' }] },
  240: { loot: [{ item: 'helshezag' }], need: { 310: bow } },
  244: { ep: -4 },
  245: { take: [{ item: 'bow' }] },
  246: { loot: [{ item: 'blackKey12' }] },
  // evasion opens at the start of the third round (the importer read any time)
  247: { fight: { evade: { after: 2, to: '96' } }, todo: unarmed('the first two rounds') },
  258: { todo: 'lose 8 ENDURANCE, or only 3 if you carry a Psychic Ring or a Grey Crystal Ring.' },
  259: { take: [{ arrows: 2 }], todo: `without Huntmastery ${unarmed('the first two rounds')}` },
  264: { take: [{ arrows: 1 }], todo: psychic },
  265: { todo: 'your stake is doubled: add it to your Kika.' },
  266: { need: { 302: { item: 'fireseed' } } },
  267: { ep: -8 },
  268: { todo: 'if you lose more ENDURANCE than the bird in the first round, every point you lose after that is taken from your basic ENDURANCE for good.' },
  271: { loot: [{ item: 'sword' }, { item: 'axe' }, { item: 'broadsword' }, { item: 'bow' }, { item: 'quiver' }, { arrows: 6 }, { item: 'dagger' }, { item: 'mace' }], todo: kikaNote('400') },
  276: { ep: -3, take: [{ arrows: 1 }], todo: `${unarmed('the first two rounds')} Also: ${extraLoss}` },
  282: { give: [{ item: 'korliniumScabbard' }] },
  286: { need: { 57: sommerswerd, 171: { item: 'daggerVashna' } } },
  288: { ep: -2 },
  292: { todo: 'ignore the ENDURANCE you lose in the first two rounds.' },
  306: { need: { 214: sommerswerd, 88: { item: ['daggerVashna', 'helshezag'] }, 3: { item: ['sommerswerd', 'daggerVashna', 'helshezag'], not: true } } },
  307: { todo: psychic },
  308: { loot: [{ item: 'blackKey12' }, { item: 'blackCube12' }] },
  309: { need: { 77: bow, 128: sommerswerd } },
  310: { take: [{ arrows: 1 }], loot: [{ item: 'spear' }, { item: 'axe' }, { item: 'dagger' }, { item: 'ironKey12' }, { meal: 1 }], todo: kikaNote('60') },
  // the only Medal is Book 10's; the sergeant keeps it
  314: { need: { 126: { gold: 1 }, 269: { item: 'medal10', spend: true } }, todo: kikaGate(202) },
  315: { need: { 103: bow } },
  317: { loot: [{ item: 'sword' }, { item: 'axe' }, { item: 'dagger' }, { item: 'bow' }, { arrows: 4 }, { item: 'rope' }, { item: 'herbsPouch12' }] },
  322: { loot: [{ item: 'sword' }, { item: 'dagger' }, { item: 'whip12' }], todo: kikaNote('40') },
  // a shot in the dark: 0-4 and 5-9 and 10 or more (with a +3 more for an Archmaster Huntmaster)
  324: { bowShot: { 25: [0, 4], 193: [5, 9], 287: [10, 99] }, todo: 'with Huntmastery as an Archmaster add 3 more to the total: the page does not. If the choice it opens is wrong, use the Turn to section box.' },
  327: { need: { 49: bow } },
  333: { ep: -4 },
  342: { need: { 208: sommerswerd } },
  348: { fight: { drain: 1 } },
  350: { take: [{ item: 'crystalExplosive' }] },
};

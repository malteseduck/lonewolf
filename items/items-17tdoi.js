/* Book 17's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand from the script's draft (see items-01fftd.js for the fields, docs/reference/book-format.md
   for the later ones, and docs/reference/items.md for how). Notes on this book:
     - Banedon's amulet at 282 is the same kind of Platinum Amulet as Gwynian's (Book 16, 166): one id, so the
       later sections that speak of "your Platinum Amulet" find either.
     - At 171 everything but the Platinum Amulet is taken (Backpack, Weapons, Special Items); at 63 it is
       given back, then the Gold Crowns and the first two things on the Backpack list are lost.
     - The Sommerswerd is barred where the text has him choose not to use it (89, 125, 130, 275) and in the
       fights a footnote says he should not use it in (23, 50, 239, 242); it is the weapon where the text has
       him draw it (110, 167, 214, 277, 341). The Deathlord at 214 is undead (footnote; rules-books.md).
     - Where the text asks after a fight whether he used the Sommerswerd (35, 96, 281, 287), the page fights
       with his best weapon and every way on stays open, with a reminder.
     - 123's number, doubled, is taken off Tagazin at 45 in the first round (a mark for each total).
     - Arrows loosed with no number drawn (244, 281, 287) are taken here; the book has no bow shot by number,
       and no fight in it is a surprise attack or ambush.
     - Gates on earlier adventures (22, 149, 150, 160, 349) are the player's to answer: no table entry.
     - No section pays or finds Lunes: the purse of Lunes (4 to the Crown) has nothing to do here.
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  onyxKey17: { name: 'Onyx Key', kind: 'special', glyph: 'skeleton-key', about: 'A key of green stone with a magic about it, kept in a tunic pocket. It opens the door of the black crystal chamber.' },
  greenGem17: { name: 'Green Gem', kind: 'special', glyph: 'emerald-necklace', about: 'A small green stone on a platinum chain, found on the Ziog’s remains. Kept in a pocket.' },
  powerSpike: { name: 'Power Spike', kind: 'special', weapon: ['dagger'], glyph: 'crystal-wand', about: 'The crystal spike snapped from the helm Naar forged, carried in the belt. It fights as a magical Dagger.' },
  stoneBowl17: { name: 'Stone Bowl', kind: 'backpack', glyph: 'bowl-spiral' },
  crystalTiara17: { name: 'Crystal Tiara', kind: 'backpack', glyph: 'tiara' },
  oiledRope17: { name: 'Coil of Oiled Rope', kind: 'backpack', glyph: 'rope-coil', about: 'Serves wherever a Rope is asked for.' },
  smallSack17: { name: 'Small Sack', kind: 'backpack', glyph: 'swap-bag' },
  spyglass17: { name: 'Spyglass', kind: 'backpack', glyph: 'spyglass' },
  ironKey17: { name: 'Iron Key', kind: 'backpack', glyph: 'key' },
};

// 123's number (0 counting as 1), doubled: what Tagazin has lost before the fight at 45
const WOUNDS = [2, 4, 6, 8, 10, 12, 14, 16, 18];
export const MARKS = Object.fromEntries(WOUNDS.map((n) => [`tagazin${n}`, { name: `Tagazin wounded by ${n}`, about: `your psychic blow cost the Demonlord ${n} ENDURANCE before your fight`, book: true }]));

const sommerswerd = { item: 'sommerswerd' }, noSommerswerd = { item: 'sommerswerd', not: true };
const bowArrows = { any: [{ weapon: ['bow'], arrows: 1 }] };
const rope = ['rope', 'oiledRope17'], sabito = ['sabito', 'sabitoJar13'];
const key = { item: 'onyxKey17' }, noKey = { item: 'onyxKey17', not: true };
// undead foes; without the Sommerswerd (the text has him choose so, or a footnote says he should)
const undead = { undead: true }, plainUndead = { undead: true, barred: ['sommerswerd'] };
// the sun-sword drawn: the foe's blows do nothing in the first two rounds
const sunsword = { with: 'sommerswerd', undead: true, rounds: [{ upTo: 2, heroLoss: 0, note: 'The sun-sword’s light' }] };
// fighting up out of the pit: two-handed weapons only with Grand Weaponmastery at Sun Knight
const pit = { rounds: [{ unless: { disc: 'grandWeaponmastery', rank: 6 }, barred: ['broadsword', 'quarterstaff', 'spear'], note: 'One-handed' }] };
const sensitive = { undead: true, rounds: [{ psi: 2, note: 'Sensitive to psychic attack' }] };
const tagazin = { stop: { foeAt: 25, to: '168' } };
const swordAsked = (yes, no) => `The page fights with your best weapon: if that was the Sommerswerd, the text sends you to ${yes}; if not, ${no}`;
// the Kajarda: a win in six rounds or less, or seven or more
const kajarda = `Win in six rounds or fewer: 32; in seven or more: 213. ${swordAsked(238, 'one of those')}`;
// keep only these places on the Backpack list (Meals first, as the Action Chart shows it)
const keep = (...at) => [{ at: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((p) => !at.includes(p)) }];

export const SECTIONS = {
  1: { need: { 166: { item: 'platinumAmulet16' }, 282: { item: 'platinumAmulet16', not: true } } },
  4: { ep: -2 },
  6: { need: { 287: bowArrows } },
  8: { ep: -10, need: { 287: bowArrows } },
  11: { ep: -2 },
  13: { take: [{ item: sabito, choose: true, dose: true, label: 'Choose the Sabito you swallow' }] },
  15: { need: { 323: { item: rope }, 210: { item: rope, not: true } } },
  16: { ep: 3 },
  23: { fight: plainUndead },
  24: { ep: -8, need: { 244: bowArrows } },
  25: { ep: -10 },
  28: { need: { 219: sommerswerd } },
  31: { fight: sensitive },
  35: { fight: undead, todo: swordAsked(173, 293) },
  40: { need: { 164: sommerswerd, 128: noSommerswerd } },
  42: { fight: undead },
  44: { ep: -3 },
  // the number noted at 123 comes off Tagazin in the first round, as if before it
  45: { fight: { ...tagazin, rounds: WOUNDS.map((n) => ({ upTo: 1, if: { mark: `tagazin${n}` }, foeEach: n, note: 'Your psychic blow' })) } },
  46: { ep: -2 },
  47: { ep: -3 },
  49: { ep: -3 },
  50: { ep: -4, fight: plainUndead },
  52: { ep: -10, need: { 287: bowArrows } },
  // two rounds only: killed in them, 252; else 218
  53: { fight: { stop: { after: 2, to: '218' }, to: '252' } },
  57: { need: { 339: sommerswerd, 220: noSommerswerd } },
  58: { loot: [{ item: 'onyxKey17' }] },
  // his things back, then the gold and the first two on the Backpack list gone
  63: { take: [{ gold: 'all' }], back: ['cell17'], when: [{ take: [{ at: [1, 2] }] }] },
  64: { need: { 238: sommerswerd } },
  66: { ep: -6 },
  67: { fight: pit },
  68: { take: keep(4, 5, 6) },
  73: { loot: [{ item: 'stoneBowl17' }, { item: 'crystalTiara17' }, { item: 'oiledRope17' }] },
  74: { ep: -2, fight: { kind: 'obstacle' } },
  // his weapon turns to dust; the number (0 as 10) is lost, doubled unless he has Deliverance
  75: { take: [{ weapons: 'one' }], zeroTen: true,
    rolls: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].flatMap((n) => [{ range: [n, n], unless: { disc: 'deliverance' }, ep: -2 * n }, { range: [n, n], ep: -n }]) },
  77: { fight: { with: 'powerSpike' } },
  78: { need: { 346: sommerswerd, 170: noSommerswerd } },
  81: { fight: { kind: 'obstacle' } },
  86: { give: [{ item: 'onyxKey17' }] },
  87: { ep: -2 },
  88: { loot: [{ item: 'greenGem17' }] },
  89: { fight: plainUndead },
  90: { need: { 113: sommerswerd, 296: { item: 'powerSpike' }, 215: { item: ['sommerswerd', 'powerSpike'], not: true } } },
  93: { ep: -1 },
  // the Kai-surge loosed in his weakened state costs 2
  96: { ep: -2, fight: undead, todo: kajarda },
  98: { need: { 349: { item: 'greenGem17' }, 237: { item: 'greenGem17', not: true } } },
  103: { take: [{ item: 'onyxKey17' }], need: { 287: bowArrows } },
  110: { fight: sunsword },
  112: { ep: -2 },
  115: { need: { 160: sommerswerd, 43: noSommerswerd } },
  120: { need: { 287: bowArrows } },
  121: { fight: undead },
  // the number (0 as 1), doubled, is noted for the fight at 45
  123: { rolls: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], mark: `tagazin${2 * Math.max(n, 1)}` })) },
  125: { fight: { ...plainUndead, won: { within: 6, to: '32', else: '213' } } },
  126: { ep: -3 },
  128: { give: [{ item: 'powerSpike' }] },
  130: { fight: plainUndead },
  131: { rolls: [{ range: [0, 9], ep: 'drawn' }] },
  132: { ep: -3, fight: undead },
  136: { ep: -3 },
  137: { fight: pit },
  138: { take: keep(4, 6) },
  143: { ep: -4 },
  144: { ep: -4 },
  152: { loot: [{ item: 'smallSack17' }, { item: 'stoneBowl17' }, { item: 'spyglass17' }, { item: 'ironKey17' }, { item: 'oiledRope17' }] },
  155: { ep: 'full' },
  158: { ep: -2 },
  167: { fight: sunsword },
  169: { take: [{ at: [4, 6] }] },
  // all but the Platinum Amulet, kept for 63 (the amulet is put back at once)
  171: { take: [{ item: 'platinumAmulet16', stash: 'amulet17' }, { weapons: 'all', stash: 'cell17' }, { backpack: 'all', stash: 'cell17' },
    { special: 'all', stash: 'cell17' }], back: ['amulet17'] },
  180: { need: { 307: key } },
  184: { ep: -5, take: [{ pick: ['backpack'], n: 3 }] },
  187: { ep: -4 },
  192: { take: [{ item: 'onyxKey17' }] },
  194: { give: [{ item: 'korliniumScabbard' }] },
  199: { need: { 192: key, 71: noKey } },
  203: { ep: -2 },
  204: { loot: [{ item: 'onyxKey17' }] },
  211: { ep: -10 },
  214: { fight: { with: 'sommerswerd', undead: true } },
  216: { fight: tagazin },
  220: { todo: 'Banedon sets the Dessi Stone in the hand weapon you give him: from now on that weapon doubles what an undead foe loses. Note which weapon it is; the page does not apply it' },
  221: { need: { 167: sommerswerd } },
  225: { need: { 246: { item: rope }, 344: { item: rope, not: true } } },
  // one round only: killed in it, 33; else 301
  230: { fight: { stop: { after: 1, to: '301' }, to: '33' } },
  231: { ep: -5 },
  232: { ep: -5 },
  // the Kai-surge loosed at the group costs 1 (a footnote; rules-books.md)
  234: { ep: -1 },
  239: { fight: plainUndead },
  242: { fight: plainUndead },
  243: { fight: undead },
  244: { take: [{ arrows: 1 }] },
  245: { ep: -5 },
  255: { ep: -2 },
  260: { fight: { undead: true, won: { within: 5, to: '37', else: '124' } } },
  261: { need: { 160: sommerswerd, 43: noSommerswerd } },
  264: { fight: { undead: true, evade: { after: 3, to: '76' } } },
  265: { ep: -10, need: { 287: bowArrows } },
  268: { give: [{ item: 'onyxKey17' }] },
  275: { fight: plainUndead },
  276: { ep: -1 },
  277: { fight: { with: 'sommerswerd', undead: true } },
  279: { fight: sensitive },
  280: { ep: -1 },
  281: { ep: -2, take: [{ arrows: 1 }], fight: undead, todo: swordAsked(173, 293) },
  282: { give: [{ item: 'platinumAmulet16' }] },
  283: { need: { 244: bowArrows } },
  285: { take: [{ item: rope, choose: true, label: 'Choose the Rope you drop' }] },
  287: { take: [{ arrows: 1 }], fight: undead, todo: kajarda },
  288: { fight: undead },
  291: { ep: -2 },
  294: { need: { 341: sommerswerd, 75: noSommerswerd } },
  // Grand Huntmastery and Grand Pathsmanship add 1 each; Grand Nexus "as well" adds 1 more
  296: { todo: 'Add 1 for Grand Huntmastery, 1 for Grand Pathsmanship and 1 more for Grand Nexus as well, then take the way your total gives' },
  297: { ep: -5 },
  309: { need: { 13: { item: sabito }, 274: { item: sabito, not: true } } },
  310: { fight: undead },
  312: { take: [{ pick: ['backpack'], n: 2 }] },
  325: { ep: -2 },
  326: { ep: -2 },
  330: { need: { 281: bowArrows } },
  331: { ep: -3 },
  336: { fight: undead },
  339: { need: { 101: { item: 'korliniumScabbard' }, 194: { item: 'korliniumScabbard', not: true } } },
  341: { fight: { ...tagazin, with: 'sommerswerd' } },
  342: { ep: -2 },
};

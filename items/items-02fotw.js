/* Book 2's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand (see items-01fftd.js for the fields, docs/reference/items.md for how). Book 2
   adds to them:
     loot cost   a shop's price: bought as often as he likes
     loot pick   with or: how many of the group he may take (a "choose two")
     rolls gold  Gold Crowns won or lost by the number drawn
     take special: 'all'   every Special Item
     need null   clears a gate the importer set wrongly
     need item   may be a list, any of which will do; ever: having once been given it is enough
     noHunt      Hunting does not excuse the Meal (the Wildlands)
     fight       undead (a blade that doubles against the undead does so), drain (ENDURANCE lost
                 each round unless shielded), with ('none': bare-handed; an item: only it can harm
                 this foe), double (every loss the foe takes is doubled), ambush (csMod is what a
                 surprise attack or ambush costs, which Huntmastery spares)
     bowShot     the Random Number is a bow shot: {to: [lo, hi]}, the range of the total for each
                 choice it decides (a choice left out is open without shooting)
   An item with meal: true is eaten when a Meal is due and he has none (the engine's own items are in
   shared/core.js; the starting kit, the Seal included, is LW.KITS in shared/rules-series.js).
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  seal: { name: 'Seal of Hammerdal', kind: 'special', glyph: 'ring', about: 'The ring that proves your mission to the people of Durenor.' },
  sommerswerd: { name: 'Sommerswerd', kind: 'special', glyph: 'shining-sword', weapon: ['sword', 'broadsword', 'shortSword'], cs: 8, undead: 2,
    about: 'The sun-sword: +8 COMBAT SKILL when you fight with it, and Weaponskill with any sword counts. Undead foes lose double ENDURANCE. It absorbs magic used against you.' },
  magicSpear: { name: 'Magic Spear', kind: 'special', glyph: 'spear-feather', weapon: ['spear'], about: 'A rune-carved spear that can wound a Helghast. It fights as a spear.' },
  ticket: { name: 'Ticket', kind: 'special', glyph: 'ticket', about: 'Your passage on the coach to Port Bax.' },
  whitePass: { name: 'White Pass', kind: 'special', glyph: 'id-card', about: 'A merchant’s pass for Port Bax, good for seven days.' },
  redPass: { name: 'Red Pass', kind: 'special', glyph: 'id-card', about: 'Lets you into the naval quarter of Port Bax.' },
  papers: { name: 'Documents', kind: 'special', glyph: 'wax-seal', about: 'Papers bought from a boy in Port Bax, said to get you a red pass.' },
  rendalimPotion: { name: 'Potent Laumspur Potion', kind: 'backpack', glyph: 'health-potion', heal: 5, about: 'From the herbwarden of Hammerdal. Drink it after a fight.' },
  healingPotion: { name: 'Healing Potion', kind: 'backpack', glyph: 'health-potion', heal: 3 },
  orangePotion: { name: 'Potion of Orange Liquid', kind: 'backpack', glyph: 'round-bottom-flask', about: 'You do not know what it does.' },
  blanket: { name: 'Fur Blanket', kind: 'backpack', glyph: 'blanket' },
  rope: { name: 'Rope', kind: 'backpack', glyph: 'rope-coil', about: 'Thirty feet of it.' },
  goldRing: { name: 'Gold Ring', kind: 'special', glyph: 'diamond-ring' },
};

const shop = (list) => list.map(([item, cost]) => (item === 'meal' ? { meal: 1, cost } : item === 'pack' ? { pack: true, cost } : { item, cost }));
const firstRound = 'you took them by surprise: add 2 to your COMBAT SKILL for the first round only. The engine does not.';
// the knight's watchtower at the border holds the same things, whether he is given them or takes them
const watchtower = [{ item: 'broadsword' }, { item: 'mace' }, { item: 'quarterstaff' }, { item: 'healingPotion' }, { meal: 3 }, { pack: true }, { gold: 12 }];

export const SECTIONS = {
  5: { fight: { undead: true } },
  // the importer read the first round's +2 as the whole fight's
  7: { fight: { csMod: 0 }, todo: firstRound },
  10: { give: [{ item: 'ticket' }] },
  15: { loot: watchtower },
  17: { ep: -5, fight: { undead: true } },
  // the winnings are 3 times the number (0 counts as 10), less the Crown paid for a room
  21: { loot: [{ item: 'dagger' }], rolls: [{ range: [0, 0], gold: 29 }, ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], gold: 3 * n - 1 }))] },
  27: { ep: 2 },
  29: { ep: -2 },
  30: { fight: { undead: true } },
  // a footnote: without a Backpack, Rhygar supplies one
  31: { ep: 6, loot: [{ pack: true }] },
  // the Wildlands: Hunting finds nothing there (346 says so; the owner applied it to Ragadorn and its road)
  32: { noHunt: true },
  36: { need: { 145: { item: ['laumspurHerb', 'potion', 'rendalimPotion'], spend: true } } },
  37: { noHunt: true },
  39: { need: { 346: { item: 'ticket' }, 156: { item: 'ticket', not: true } } },
  40: { ep: 'full', give: [{ item: 'rendalimPotion' }] },
  41: { todo: 'if you take his advice and sleep, restore 1 ENDURANCE.' },
  52: { need: { 338: { item: 'magicSpear' } } },
  55: { loot: [{ item: 'broadsword', cost: 12 }] },
  57: { rolls: [{ range: [0, 0], gold: -10 }, ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], gold: -n }))] },
  58: { take: [{ gold: 10 }] },
  59: { need: { 332: { item: 'magicSpear' } } },
  60: { todo: 'for the first two rounds he cannot strike back: restore any ENDURANCE you lose in them.' },
  62: { need: { 263: { item: 'seal' }, 126: { item: 'papers' } } },
  66: { fight: { undead: true } },
  69: { todo: 'unless you have Mindshield, lose 2 ENDURANCE.' },
  70: { need: { 219: { item: 'crystalStar' } } },
  72: { ep: 1, need: { 56: { gold: 2, spend: true } } },
  75: { need: { 142: { gold: 10, spend: true } } },
  76: { loot: [{ gold: 2 }, { item: 'dagger' }] },
  78: { ep: -1, take: [{ item: 'chainmail' }] },
  80: { need: { 15: { item: 'seal' } } },
  86: { give: [{ item: 'mace' }, { gold: 3 }] },
  // any two of the merchant's goods; each Meal counts as one
  91: { loot: [{ item: 'quarterstaff' }, { item: 'blanket' }, { meal: 1 }, { meal: 1 }, { pack: true }, { item: 'dagger' }, { item: 'rope' }].map((l) => ({ ...l, or: 'cargo', pick: 2 })) },
  93: { todo: 'give the beggars as many Gold Crowns as you wish.' },
  // Healing, a healing potion or Laumspur will do; the importer saw only the discipline
  95: { need: { 239: null } },
  103: { give: [{ item: 'laumspurHerb' }] },
  // he fights with the spear he has just drawn out, the only weapon that can harm it
  106: { ep: -2, give: [{ item: 'magicSpear' }], fight: { with: 'magicSpear', drain: 2 } },
  108: { ep: -2 },
  110: { fight: { unarmed: true } },
  // the number plus 5, less the Crown paid for a room
  116: { rolls: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], gold: n + 4 })) },
  117: { need: { 37: { gold: 3, spend: true }, 148: { gold: 1, spend: true } } },
  // reached only by giving Rhygar the spear (or not having one)
  118: { take: [{ item: 'magicSpear' }] },
  124: { loot: [{ gold: 42 }, { item: 'shortSword' }, { item: 'dagger' }] },
  127: { noHunt: true },
  128: { fight: { undead: true } },
  // bare-handed whatever he carries: the importer's -4 is the engine's own
  131: { fight: { csMod: 0, with: 'none' } },
  132: { loot: [{ item: 'spear' }] },
  134: { need: { 38: { item: 'magicSpear' } } },
  136: { need: { 10: { gold: 20, spend: true } } },
  139: { give: [{ meal: 2 }] },
  141: { ep: -2, take: [{ item: 'chainmail' }] },
  142: { give: [{ item: 'whitePass' }] },
  144: { give: [{ meal: 2 }], take: [{ gold: 'all' }] },
  145: { ep: -5 },
  148: { noHunt: true },
  149: { need: { 223: { item: 'seal' } } },
  154: { ep: -2 },
  157: { fight: { unarmed: true } },
  // the Weaponskill choice opens with the weapon he carries, so the importer leaves it ungated; the weapon is his to check
  160: { need: { 255: { disc: 'weaponskill' } } },
  165: { take: [{ item: 'seal' }], give: [{ gold: 40 }] },
  168: { need: { 314: { gold: 1, spend: true } } },
  // reached only by turning down the fruit on the shore (337)
  171: { ep: -3 },
  178: { meal: true },
  181: { loot: shop([['sword', 4], ['dagger', 2], ['shortSword', 3], ['warhammer', 6], ['spear', 5], ['mace', 4], ['blanket', 3], ['pack', 1]]) },
  187: { loot: [{ item: 'spear' }, { item: 'spear' }, { item: 'sword' }, { item: 'sword' }, { gold: 6 }] },
  189: { ep: -2 },
  194: { take: [{ gold: 'all' }, { weapons: 'all' }, { backpack: 'all' }, { special: 'all' }] },
  195: { need: { 249: { gold: 1, spend: true } } },
  196: { take: [{ item: 'seal' }], give: [{ item: 'sommerswerd' }] },
  198: { ep: -1 },
  217: { need: { 199: { gold: 1, spend: true } } },
  219: { ep: -3 },
  220: { loot: [{ gold: 23 }] },
  226: { need: { 56: { gold: 2, spend: true } } },
  228: { give: [{ meal: 2 }] },
  231: { loot: [{ gold: 5 }, { item: 'dagger' }, { item: 'seal' }] },
  232: { need: { 223: { item: 'seal' } } },
  233: { need: { 37: { gold: 3, spend: true }, 148: { gold: 1, spend: true } } },
  235: { loot: [{ item: 'shortSword' }] },
  237: { fight: { undead: true } },
  238: { todo: 'your weapons wait at the door (keep them on your Action Chart); you are given a token worth 1 Gold Crown here, once only. Play Cartwheel with the medallion and settle your gold by hand.' },
  240: { todo: 'with Healing, restore all your ENDURANCE; without it, half of what you have lost in combat.' },
  246: { need: { 170: { item: 'whitePass' }, 202: { item: 'redPass' }, 327: { item: ['whitePass', 'redPass'], not: true } } },
  250: { need: { 223: { item: 'seal' } } },
  258: { ep: -1 },
  260: { loot: [{ item: 'sword' }] },
  262: { loot: [{ item: 'sword' }, { item: 'mace' }, { item: 'quarterstaff' }, { meal: 1 }, { gold: 6 }, { item: 'orangePotion' }] },
  263: { give: [{ item: 'redPass' }] },
  266: {
    loot: shop([['sword', 4], ['dagger', 2], ['broadsword', 7], ['shortSword', 3], ['warhammer', 6], ['spear', 5], ['mace', 4], ['axe', 3], ['quarterstaff', 3]]),
    todo: 'the weaponsmith buys your weapons for 1 Gold Crown less than his price for them.',
  },
  270: { fight: { csMod: 0 }, todo: firstRound },
  274: { loot: [{ item: 'sword' }, { gold: 6 }, { item: 'mace' }] },
  276: { todo: 'when the contest is over, put your ENDURANCE back to what it was before it.' },
  283: { loot: shop([['sword', 4], ['dagger', 2], ['broadsword', 6], ['spear', 5], ['meal', 2], ['goldRing', 8], ['blanket', 3], ['pack', 1]]) },
  // footnotes: without the Seal he leaves the alchemist's at once; the refused food needs a Meal in its place
  289: { need: { 165: { item: 'seal' } } },
  290: { meal: true },
  298: { fight: { csMod: 0, with: 'none' } },
  299: { need: { 102: { item: 'magicSpear' } } },
  301: { loot: [{ gold: 3 }, { item: 'dagger' }, { item: 'dagger' }, { item: 'dagger' }, { item: 'shortSword' }] },
  302: { loot: watchtower },
  305: { give: [{ gold: 5 }] },
  // he means only to knock the guard out
  306: { fight: { double: true } },
  307: { need: { 140: { item: 'seal' } } },
  308: { todo: 'play Portholes with the medallion: 3 Gold Crowns a throw, 6 won when you beat both. Settle your gold by hand.' },
  313: { ep: -4, take: [{ item: 'magicSpear' }] },
  321: { todo: 'unless you have food in your Backpack, lose 2 ENDURANCE.' },
  // a footnote: the boy takes whatever gold he has, even none
  327: { loot: [{ item: 'papers' }], todo: 'the papers cost 6 Gold Crowns, or all you have if that is less: pay him by hand.' },
  328: { need: { 113: { item: 'crystalStar', ever: true } } },
  329: { give: [{ gold: 10 }] },
  330: { ep: -5 },
  331: { loot: [{ item: 'sword' }, { item: 'dagger' }, { gold: 3 }] },
  332: { fight: { with: 'magicSpear', drain: 2 } },
  337: { take: [{ weapons: 'all' }, { backpack: 'items' }] },
  338: { ep: -2, need: { 349: { item: 'magicSpear', spend: true } } },
  339: { need: { 249: { gold: 1, spend: true } } },
  342: { need: { 72: { gold: 1, spend: true }, 56: { gold: 2, spend: true } } },
  // the Meal here is bought if he has none, and Hunting is no use in the Wildlands
  346: { meal: false, todo: 'eat a Meal from your Backpack, or pay 1 Gold Crown for one here. Hunting does not help in the Wildlands.', need: { 280: { gold: 1, spend: true } } },
  347: { ep: -1 },
};

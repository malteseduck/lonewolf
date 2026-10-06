/* Book 4's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand (see items-01fftd.js for the fields, items-02fotw.js for the later ones, and
   docs/reference/items.md for how). Nothing new in the fields. Notes on this book:
     - Hunting fails in the Wildlands, from the first section that says so (25 or 171) until the one
       that says it is over (120): the Meals asked for in between are marked noHunt. It also fails in
       the Maaken Mines (129, 185, 269).
     - The Pick and the Shovel take two Backpack spaces each in the text; the page counts one, so the
       player keeps the room by hand. The lit Torch at 79 and 123 is not recorded, so one Torch less is
       offered than the crate holds.
     - Where a choice needs two things at once (a Torch and a Tinderbox) or a past visit (Gorn Cove),
       the choice stays open and the player decides.
     - Several fights end by how many rounds they lasted, or stop after a set number: left as todos.
     - The Firesphere, the Sommerswerd and the other Book 3 things are those of items-03tcok.js.
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  onyxMedallion: { name: 'Onyx Medallion', kind: 'special', glyph: 'medal', about: 'Taken from a fallen Vassagonian warrior. It passes for a mark of rank among Vassagonians.' },
  scroll4: { name: 'Scroll', kind: 'special', glyph: 'scroll-unfurled', about: 'A verse written by an astrologer you met: it foretells a sacrifice at the temple.' },
  holyWater4: { name: 'Flask of Holy Water', kind: 'backpack', glyph: 'round-bottom-flask', about: 'An earthenware flask. It bursts into white fire against the black dagger.' },
  dvalSword: { name: 'Captain D’Val’s Sword', kind: 'weapon', weapon: ['sword'], glyph: 'gladius', about: 'A cavalry officer’s sword, engraved with its owner’s name. It fights as a sword. The captain would be glad of it.' },
  ironKey4: { name: 'Iron Key', kind: 'special', glyph: 'skeleton-key', about: 'It opens an iron door above the well chamber.' },
  brassKey4: { name: 'Brass Key', kind: 'special', glyph: 'key', about: 'It opens a locked door in the mines.' },
  whip4: { name: 'Whip', kind: 'backpack', glyph: 'whip' },
  shovel4: { name: 'Shovel', kind: 'backpack', glyph: 'spade', about: 'Takes the room of two Backpack Items; the page counts one.' },
  pick4: { name: 'Pick', kind: 'backpack', glyph: 'war-pick', about: 'A miner’s pickaxe. Takes the room of two Backpack Items; the page counts one.' },
  hourglass4: { name: 'Hourglass', kind: 'backpack', glyph: 'hourglass' },
  daggerVashna: { name: 'Dagger of Vashna', kind: 'special', glyph: 'curvy-knife', weapon: ['dagger'], about: 'A twisted black blade forged for the Darklord Vashna. It fights as a dagger.' },
};

const sommerswerd = { item: 'sommerswerd' };
const noSword = { item: 'sommerswerd', not: true };
const holy = { item: 'holyWater4' };
const dval = { item: 'dvalSword' };
// one crate's worth of Torches (the lit one is not counted)
const torches = (n) => Array.from({ length: n }, () => ({ item: 'torch' }));
const camo = { disc: 'camouflage', rank: 7 };

export const SECTIONS = {
  // what the bandits carried; he keeps what he wants and the Backpack if he has none
  2: { loot: [{ pack: true }, { item: 'sword' }, { item: 'mace' }, { item: 'dagger' }, { item: 'warhammer' }, { gold: 12 }, { meal: 2 }] },
  3: { ep: -1 },
  10: { loot: [{ item: 'onyxMedallion' }] },
  // Captain D'Val's gifts; he may be given a Backpack if he has none
  12: { loot: [{ pack: true }, { meal: 3 }, { item: 'rope' }, { item: 'potion' }, { item: 'sword' }, { item: 'spear' }] },
  // he declines the troupe's supper and eats from his Backpack instead
  13: { meal: true },
  19: { noHunt: true },
  22: { todo: 'one Backpack Item of your choice falls into the crevasse; if you carry none, a Weapon is lost instead (the Torch in your hand does not count).' },
  23: { need: { 282: { item: 'brassKey4' }, 105: { item: 'brassKey4', not: true } } },
  29: { need: { 168: { item: 'firesphere' } } },
  35: { todo: 'with Hunting, or from the rank of Guardian up (7 Disciplines), add 3 to the number drawn before choosing the way on.' },
  36: { todo: 'the way on follows the length of the fight: won in 3 rounds or fewer, turn to 155; in more than 3, to 277 (use the Turn to section box).' },
  40: { need: { 349: { disc: 'tracking', rank: 6 } } },
  44: { loot: [{ gold: 12 }, { meal: 2 }] },
  47: { todo: 'the way on follows the length of the fight: won in more than 5 rounds, turn to 340; in 5 or fewer, to 32 (use the Turn to section box).' },
  52: { ep: -1 },
  54: { need: { 4: { disc: 'healing', rank: 8 } } },
  56: { todo: 'the way on follows the length of the fight: won in 3 rounds or fewer, turn to 69; in more than 3, to 203 (use the Turn to section box).' },
  57: { need: { 327: dval, 289: { item: 'dvalSword', not: true } } },
  62: { todo: 'take 2 off your COMBAT SKILL for the first 3 rounds only, while you are on the ground.' },
  67: { ep: -1, need: { 292: sommerswerd } },
  70: { need: { 305: { item: 'onyxMedallion' } } },
  73: { need: { 283: holy, 325: { item: 'holyWater4', not: true } } },
  74: { ep: 1 },
  75: { ep: -2 },
  77: { fight: { drain: 1 } },
  78: { loot: [{ item: 'holyWater4' }], noHunt: true },
  // a crate by the tunnel mouth: Tinderbox and Torches
  79: { loot: [{ item: 'tinderbox' }, ...torches(5)], todo: 'you need one Torch lit to go on; any others you take each fill a Backpack place.' },
  84: { give: [{ item: 'scroll4' }] },
  // all his Backpack is lost with the boat
  94: { take: [{ backpack: 'all' }] },
  95: { need: { 195: { item: 'badge' } } },
  102: { give: [{ gold: 12 }, { meal: 2 }] },
  103: { ep: -4 },
  109: { loot: [{ gold: 3 }, { item: 'dagger' }, { item: 'sword' }] },
  117: { todo: 'with another Torch and a Tinderbox, or a Kalte Firesphere, you may take the way that needs no draw.' },
  118: { loot: [{ item: 'whip4' }], need: { 308: { item: 'ironKey4' } } },
  122: { ep: -1, fight: { mindforce: 4 } },
  123: { loot: [{ item: 'tinderbox' }, ...torches(6)], todo: 'you need one Torch lit to go on; any others you take each fill a Backpack place.' },
  129: { noHunt: true },
  133: { todo: 'if you lose any ENDURANCE in this fight, even when running, turn to 17 (use the Turn to section box).' },
  137: { ep: 6 },
  141: { noHunt: true },
  147: { todo: 'ignore the ENDURANCE you lose in the first round: the guard is taken by surprise.' },
  152: { loot: [{ item: 'sword' }, { gold: 6 }, { meal: 2 }, { item: 'brassKey4' }] },
  153: { todo: 'take 4 off your COMBAT SKILL for the first 2 rounds only; your weapon is not drawn until the third.' },
  157: { ep: 1 },
  158: { ep: -3, take: [{ backpack: 'all' }] },
  159: { ep: -2 },
  167: { give: [{ pack: true }, { meal: 1 }], loot: [{ item: 'shovel4' }] },
  168: { need: { 34: sommerswerd, 85: noSword } },
  173: { need: { 275: sommerswerd }, todo: 'if you do not have the Sommerswerd, add 2 to the number drawn when you carry a Pick or a Shovel.' },
  176: { ep: -3 },
  182: { need: { 332: { disc: ['tracking', 'hunting'] } } },
  185: { noHunt: true },
  188: { noHunt: true },
  193: { todo: 'only 2 rounds are fought; if you are still alive after them, the way on is open.' },
  194: { todo: 'write down the number drawn (0 counts as 10; Mind Over Matter adds 2): it is how many rounds you may fight underwater. Every round after that costs 2 more ENDURANCE.' },
  213: { loot: [{ item: 'pick4' }, { item: 'shovel4' }, { item: 'axe' }, { item: 'torch' }, { item: 'tinderbox' }, { item: 'hourglass4' }] },
  222: { loot: [{ item: 'dvalSword' }] },
  230: { loot: [{ item: 'sword' }, { item: 'dagger' }, { gold: 9 }, { meal: 2 }] },
  231: { loot: [{ gold: 3 }, { item: 'sword' }, { meal: 1 }] },
  234: { todo: 'write down the number drawn (0 counts as 10; Mind Over Matter adds 2): it is how many rounds you may fight underwater. Every round after that costs 2 more ENDURANCE.' },
  236: { ep: -4 },
  // with no Sommerswerd the Daemonak's bite costs 8 before the way on
  246: { ep: -8, need: { 34: sommerswerd, 85: noSword } },
  258: { need: { 305: { item: 'onyxMedallion' }, 49: camo } },
  260: { todo: 'only 3 rounds are fought; if you are still alive after them, the way on is open.' },
  261: { loot: [{ gold: 8 }, { meal: 1 }] },
  263: { ep: -4 },
  268: { loot: [{ gold: 4 }, { item: 'spear' }, { item: 'broadsword' }, { item: 'ironKey4' }, { item: 'brassKey4' }, { meal: 2 }, { item: 'potion' }] },
  269: { loot: [{ item: 'shovel4' }], noHunt: true },
  270: { need: { 168: { item: 'firesphere' } } },
  // he loses one weapon (his choice when he has two), and the Backpack and Special Items stay
  272: { ep: -5, take: [{ weapons: 'one' }] },
  274: { need: { 283: holy, 325: { item: 'holyWater4', not: true } } },
  275: { ep: -1 },
  279: { need: { 327: dval, 289: { item: 'dvalSword', not: true } } },
  280: { loot: [{ gold: 3 }, { meal: 1 }, { item: 'sword' }] },
  // the flask is thrown
  283: { ep: -3, take: [{ item: 'holyWater4' }] },
  284: { ep: -3 },
  296: { need: { 122: sommerswerd, 274: noSword } },
  302: { loot: [{ item: 'potion' }, { item: 'potion' }, { item: 'alether' }, { item: 'holyWater4' }] },
  303: { ep: -2 },
  318: { need: { 279: { item: 'scroll4' }, 57: { item: 'scroll4', not: true } } },
  // a Pick or a Shovel, not both
  322: { ep: 2, loot: [{ item: 'pick4', or: 'tool' }, { item: 'shovel4', or: 'tool' }] },
  324: { noHunt: true },
  // the captain gets his sword back
  327: { take: [{ item: 'dvalSword' }] },
  333: { todo: 'only one round is fought: the way on follows who lost more ENDURANCE in it, or neither.' },
  339: { noHunt: true },
  340: { ep: -2 },
  341: { ep: -4 },
  342: { take: [{ backpack: 'all' }] },
  350: { give: [{ item: 'daggerVashna' }] },
};

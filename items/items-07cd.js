/* Book 7's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand (see items-01fftd.js for the fields, items-02fotw.js for the later ones, and
   docs/reference/items.md for how). Notes on this book:
     - Captured at the Great Hall (264, or 335 with the Sommerswerd), he loses every weapon and
       weapon-like Special Item into a stash that 15 gives back; the Sommerswerd, kept by Zahda at
       335, is not in it.
     - Bow shots: 225 and 266 are plain draws with Weaponmastery (Bow) counted in, so they are
       marked bowShot. 175 and 328 have rules of their own (Nexus, a Lore-circle), so they are draws
       with ranges for the total and spend the Arrow on arrival, as do the sections where an Arrow is
       fired with no draw.
     - The footnote's falls (137, 301, and 7 on the way) empty the Quiver.
     - The Sommerswerd, a Diamond and a Kalte Firesphere may come from earlier books (same ids).
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  powerKey: { name: 'Power-key', kind: 'special', glyph: 'crystal-shine', about: 'A red gem with sparks inside. It lets you through the power-shield; lose it and you cannot leave the island.' },
  jarLaumspur7: { name: 'Concentrated Laumspur', kind: 'backpack', glyph: 'health-potion', heal: 8, about: 'A large jar of strong Laumspur. Drink it after a fight.' },
  platinumAmulet: { name: 'Kazan-Oud Platinum Amulet', kind: 'special', glyph: 'gem-necklace', about: 'Worn on the wrist. It protects against high temperatures.' },
  skeletonKey7: { name: 'Skeleton Key', kind: 'special', glyph: 'skeleton-key', about: 'Taken from the robed creatures. It opens the oval door of the flooding chamber.' },
  parchment7: { name: 'Parchment', kind: 'special', glyph: 'scroll-unfurled', about: 'Found with the Skeleton Key; kept in a pocket.' },
  goldKey7: { name: 'Gold Key', kind: 'special', glyph: 'key', about: 'Taken from a Zagothal. It opens a small keyhole in a stone door and is lost when used.' },
  silverWhistle7: { name: 'Silver Whistle', kind: 'special', glyph: 'whistle', about: 'Taken from a dead whipmaster. It makes no sound a man can hear.' },
  sabito: { name: 'Vial of Blue Pills', kind: 'backpack', glyph: 'round-bottom-flask', about: 'Sabito root, one full dose: swallowed, it lets you breathe under water for a while. Curing names it.' },
  pouchHerbs7: { name: 'Pouch of Herbs', kind: 'backpack', glyph: 'herbs-bundle', boost: 6, boostAgain: 3, addict: { key: 'adgana', upTo: 1, epMax: -4 },
    about: 'With Curing you know it as Adgana: one dose gives +6 COMBAT SKILL for a fight (+3 for any later dose); after that fight a 0 or 1 drawn means addiction, 4 ENDURANCE less for good.' },
  wineFlask7: { name: 'Flask of Wine', kind: 'backpack', glyph: 'wine-bottle' },
  wineBottle7: { name: 'Bottle of Wine', kind: 'backpack', glyph: 'wine-bottle' },
  waterBottle7: { name: 'Bottle of Water', kind: 'backpack', glyph: 'water-flask' },
  blanket7: { name: 'Blanket', kind: 'backpack', glyph: 'blanket', about: 'Wrapped round the arm it adds 1 COMBAT SKILL against the unseen whipmaster.' },
  redRobe7: { name: 'Red Robe', kind: 'backpack', glyph: 'robe', about: 'A hooded robe. Wrapped round the arm it adds 1 COMBAT SKILL against the unseen whipmaster.' },
};

// the number drawn plus `add` is the loss
const loss = (add) => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], ep: -(n + add) }));
const sommerswerd = { item: 'sommerswerd' };
const noSommerswerd = { item: 'sommerswerd', not: true };
const bow = { item: 'bow' };
const fireseed = { item: 'fireseed' };
const rope = { item: 'rope' };
const noRope = { item: 'rope', not: true };
const spent = [{ arrows: 1 }];
const emptied = [{ arrows: 'all' }];
const n123 = 'the number 123, from a coiled snake';
// venom: his losses doubled unless he has Curing
const venom = { heroLoss: 2, unless: { disc: 'curing' }, note: 'Venom' };
const swords = { weapon: ['sword', 'shortSword', 'broadsword'] };
const sword = { any: [swords] };
const noSword = { any: [{ not: swords }] };
// light in the dark: a Kalte Firesphere, a Lantern, or a Torch and Tinderbox
const lights = [{ item: 'firesphere' }, { item: 'lantern' }, { items: ['torch', 'tinderbox'] }];
const light = { any: lights };
const dark = { any: [{ not: { any: lights } }] };
// weapons taken at the Great Hall, given back at 15
const seized = { weapons: 'all', special: true, stash: 'maze7' };
// the shield's blow: 8, or 6 with Nexus
const shield = { when: [{ unless: { disc: 'nexus' }, ep: -8 }, { if: { disc: 'nexus' }, ep: -6 }] };

export const SECTIONS = {
  1: { give: [{ item: 'powerKey' }] },
  7: { take: emptied },
  10: { take: [{ item: 'fireseed' }] },
  15: { back: ['maze7'], loot: [{ item: 'jarLaumspur7' }, { item: 'platinumAmulet' }] },
  16: { need: { 61: light, 277: dark } },
  18: { ep: -2 },
  19: { fight: { rounds: [{ upTo: 2, csMod: -3, unless: { disc: 'huntmastery' }, note: 'Surprise' }] } },
  26: { rolls: loss(3), lessen: [{ n: 2, if: { mastery: 'sword' } }] },
  27: { fight: { rounds: [{ upTo: 3, csMod: -3, unless: { disc: 'huntmastery' }, note: 'Surprise' }] } },
  31: { give: [{ item: 'skeletonKey7' }, { item: 'parchment7' }], need: { 266: bow } },
  // the weapon he reached in with (a Sword or a Spear, his choice) is torn away
  32: { take: [{ pick: 'weapon', n: 1 }] },
  34: { need: { 347: { item: 'silverWhistle7' } } },
  42: { ep: -3, need: { 174: sommerswerd, 202: noSommerswerd } },
  44: { ep: -3 },
  50: { take: spent },
  53: { ep: -5, need: { 157: fireseed } },
  // the Beastmen's packs
  56: {
    loot: [{ item: 'axe' }, { item: 'axe' }, { item: 'bow' }, { item: 'spear' }, { item: 'spear' }, { item: 'quiver' }, { arrows: 4 }, { meal: 4 }, { item: 'pouchHerbs7' }, { item: 'wineFlask7' }],
  },
  58: { ep: -2 },
  59: { when: [{ unless: { disc: 'nexus', rank: 4 }, ep: -3 }] },
  60: { ep: -4, need: { 230: { item: 'sabito' }, 263: { item: 'sabito', not: true } } },
  66: { need: { 252: sword, 263: noSword } },
  68: { need: { 182: rope } },
  69: { need: { 50: bow } },
  73: { loot: [{ item: 'diamond' }], note: n123 },
  76: { fight: { noShield: true, barred: ['broadsword', 'spear', 'quarterstaff'], rounds: [{ heroLoss: 3, note: 'Venom' }] } },
  79: { take: spent },
  80: { loot: [{ item: 'spear' }, { item: 'shortSword' }, { item: 'shortSword' }, { item: 'axe' }, { item: 'dagger' }, { item: 'dagger' }, { item: 'mace' }, { gold: 6 }] },
  85: { rolls: loss(2), lessen: [{ n: 2, if: { disc: 'huntmastery', rank: 4 } }] },
  88: { ep: -2 },
  90: { need: { 24: { any: [{ disc: 'nexus' }, { item: 'platinumAmulet' }] } } },
  96: { give: [{ item: 'sword' }] },
  97: { need: { 10: fireseed, 317: sommerswerd, 331: { item: ['fireseed', 'sommerswerd'], not: true } } },
  103: shield,
  104: { when: [{ unless: { disc: 'nexus' }, ep: -3 }], need: { 225: bow } },
  107: { ep: -6, need: { 26: sword, 51: { any: [{ item: 'lantern' }, { items: ['torch', 'tinderbox'] }] }, 145: { item: 'firesphere' }, 292: { any: [{ not: { any: [swords, ...lights] } }] } } },
  108: { ep: -5 },
  112: { ep: -1 },
  118: { ep: 'full' },
  120: { ep: -4 },
  122: { take: [{ backpack: 'all' }] },
  126: { fight: { rounds: [{ heroLoss: 2, unless: { disc: 'nexus' }, note: 'Burns' }] } },
  // a weapon of his choice, and the second Backpack Item on his list
  131: { take: [{ weapons: 'one' }, { at: [2] }] },
  134: { ep: -4 },
  143: { need: { 10: fireseed, 317: sommerswerd, 331: { item: ['fireseed', 'sommerswerd'], not: true } } },
  148: { loot: [{ item: 'mace' }, { item: 'leatherWaistcoat' }, { item: 'sword' }, { item: 'helmet' }, { item: 'blanket7' }, { item: 'wineBottle7' }, { item: 'dagger' }, { item: 'potion' }] }, // the Helmet is refused beside the Silver Helm (its `apart`)
  150: { need: { 310: rope } },
  152: { take: spent },
  154: { ep: -3, need: { 310: rope, 211: noRope } },
  155: { ep: -2 },
  157: { take: [{ item: 'fireseed' }] },
  158: { take: [{ meals: 'all' }, { pick: 'packItems', n: 2 }] },
  161: { loot: [{ item: 'spear' }, { item: 'broadsword' }] },
  164: { need: { 7: bow } },
  165: { need: { 335: sommerswerd, 264: noSommerswerd } },
  168: { need: { 32: { any: [{ weapon: ['sword', 'spear'] }] }, 263: { any: [{ not: { weapon: ['sword', 'spear'] } }] } } },
  170: { ep: -4 },
  172: { need: { 347: { item: 'silverWhistle7' } } },
  // a shot through smoke: 3 off the number unless Weaponmastery (Bow) or Nexus
  175: { take: spent, rntMod: [{ plus: -3, not: { any: [{ mastery: 'bow' }, { disc: 'nexus' }] } }], ranges: { 19: [-99, 5], 314: [6, 99] } },
  177: { need: { 225: bow } },
  178: { need: { 191: fireseed }, fight: { rounds: [venom] } },
  181: { need: { 206: bow } },
  182: { give: [{ item: 'sword' }] },
  186: { give: [{ item: 'silverWhistle7' }], loot: [{ item: 'spear' }] },
  187: { need: { 79: bow } },
  190: { ep: -2 },
  191: { take: [{ item: 'fireseed' }] },
  197: { need: { 266: bow } },
  198: { ep: -2 },
  199: { loot: [{ gold: 6 }, { item: 'rope' }, { item: 'redRobe7' }] },
  206: { take: spent },
  208: { need: { 310: rope, 211: noRope } },
  // the door is fought as if unarmed, without the penalty for Nexus
  214: { fight: { with: 'none', noUnarmed: { disc: 'nexus' } } },
  // the weapon is on the floor for the first two rounds
  219: { ep: -6, fight: { rounds: [{ upTo: 2, unarmed: true }, venom] } },
  220: { loot: [{ item: 'axe' }, { item: 'dagger' }] },
  // with Invisibility a second way out, at any time and without loss
  221: { fight: { to: '271', barred: ['bow'], evade: [{ after: 2, to: '229' }, { after: 0, to: '70', if: { disc: 'invisibility' }, free: true, label: 'Slip away unseen' }] } },
  222: { ep: -3 },
  225: { bowShot: { 196: [0, 6], 112: [7, 99] } },
  // the dead warrior's pack: the Power-key is a Special Item, the rest are Backpack Items
  227: { loot: [{ meal: 1 }, { item: 'rope' }, { item: 'blanket7' }, { item: 'dagger' }, { item: 'sabito' }, { item: 'waterBottle7' }, { item: 'powerKey' }] },
  233: { fight: { rounds: [{ foeLoss: 2, mind: true }] } },
  236: { loot: [{ item: 'spear' }, { item: 'broadsword' }] },
  238: { loot: [{ item: 'axe' }, { item: 'shortSword' }, { item: 'dagger' }, { gold: 2 }] },
  // the number drawn is the loss, less 1 with Curing
  241: { rolls: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], ep: -n })), lessen: [{ n: 1, if: { disc: 'curing' } }] },
  250: { ep: 'full' },
  253: { take: spent },
  257: { ep: -2, fight: { csMod: -2, csNote: 'Unseen foe', ambush: true, rounds: [{ csMod: 1, if: { item: ['blanket7', 'redRobe7', 'towel'] }, note: 'Wrapped arm' }] } },
  258: { need: { 289: light, 277: dark } },
  262: { loot: [{ item: 'shortSword' }, { item: 'shield' }] },
  // the Backpack, gold and Special Items stay; only his weapons are taken here
  264: { take: [seized] },
  265: { ep: -2 },
  266: { bowShot: { 75: [0, 6], 162: [7, 99] } },
  267: { ep: 'full' },
  270: { need: { 207: { item: 'skeletonKey7' }, 242: { item: 'skeletonKey7', not: true } } },
  271: { loot: [{ item: 'goldKey7' }] },
  274: { need: { 333: { item: 'goldKey7' }, 54: { item: 'goldKey7', not: true } } },
  276: { take: spent },
  279: { give: [{ item: 'sword' }] },
  284: shield,
  285: { fight: { rounds: [venom] } },
  290: { fight: { double: true } },
  295: { need: { 276: bow } },
  297: { ep: -2, need: { 157: fireseed } },
  298: { need: { 151: sword } },
  301: { fight: { rounds: [venom] } },
  304: { ep: -3 },
  305: { give: [{ item: 'diamond' }] },
  311: { ep: -2 },
  313: { ep: -3, need: { 4: { ep: [10, 99] }, 263: { ep: [-99, 9] } } },
  324: { ep: -4 },
  325: { fight: { rounds: [{ heroEach: 2, note: 'No air' }] } },
  // a shot with a Lore-circle's bonus
  328: { take: spent, rntMod: [{ mastery: 'bow', plus: 3 }, { circle: ['Circle of Fire'], plus: 1 }], ranges: { 232: [-99, 4], 67: [5, 99] } },
  333: { take: [{ item: 'goldKey7' }], loot: [{ item: 'spear' }, { item: 'quarterstaff' }], note: n123 },
  // the Sommerswerd stays with Zahda; the rest is kept for 15. He is struck for 1
  335: { ep: -1, take: [{ item: 'sommerswerd' }, seized] },
  344: { ep: -2 },
  348: { need: { 49: light, 277: dark } },
  183: { note: n123 },
};

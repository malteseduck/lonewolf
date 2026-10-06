/* Book 7's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand (see items-01fftd.js for the fields, items-02fotw.js for the later ones, and
   docs/reference/items.md for how). Nothing new in the fields. Notes on this book:
     - Captured at the Great Hall (264, or 335 with the Sommerswerd), he loses every weapon and
       weapon-like Special Item; 15 gives them back. The table takes the weapons (and the Sommerswerd)
       but cannot remember them, so the player notes them down and restores them by hand at 15.
     - Bow shots: 225 and 266 are plain draws with Weaponmastery (Bow) counted in, so they are
       marked bowShot. 175 and 328 cannot be (a Nexus rule, a Lore-circle bonus) and stay by hand;
       they only spend the Arrow. Sections that say an Arrow is fired with no draw spend one on arrival.
     - The footnote's falls (137, 301, and 7 on the way) empty the Quiver.
     - The Sommerswerd, a Diamond and a Kalte Firesphere may come from earlier books (same ids).
     - Rules the engine has no field for stay as a `todo`: ENDURANCE doubled or tripled in a fight,
       a COMBAT SKILL change for the first rounds only, a Lore-circle bonus in a fight, and gates
       that mix a discipline with an item.
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  powerKey: { name: 'Power-key', kind: 'special', glyph: 'gems', about: 'A red gem with sparks inside. It lets you through the power-shield; lose it and you cannot leave the island.' },
  jarLaumspur7: { name: 'Concentrated Laumspur', kind: 'backpack', glyph: 'health-potion', heal: 8, about: 'A large jar of strong Laumspur. Drink it after a fight.' },
  platinumAmulet: { name: 'Kazan-Oud Platinum Amulet', kind: 'special', glyph: 'gem-necklace', about: 'Worn on the wrist. It protects against high temperatures.' },
  skeletonKey7: { name: 'Skeleton Key', kind: 'special', glyph: 'skeleton-key', about: 'Taken from the robed creatures. It opens the oval door of the flooding chamber.' },
  parchment7: { name: 'Parchment', kind: 'special', glyph: 'scroll-unfurled', about: 'Found with the Skeleton Key; kept in a pocket.' },
  goldKey7: { name: 'Gold Key', kind: 'special', glyph: 'key', about: 'Taken from a Zagothal. It opens a small keyhole in a stone door and is lost when used.' },
  silverWhistle7: { name: 'Silver Whistle', kind: 'special', glyph: 'whistle', about: 'Taken from a dead whipmaster. It makes no sound a man can hear.' },
  sabito: { name: 'Vial of Blue Pills', kind: 'backpack', glyph: 'round-bottom-flask', about: 'Sabito root, one full dose: swallowed, it lets you breathe under water for a while. Curing names it.' },
  pouchHerbs7: { name: 'Pouch of Herbs', kind: 'backpack', glyph: 'herbs-bundle', about: 'With Curing you know it as Adgana: one dose gives +6 COMBAT SKILL for a fight (+3 for any later dose) but may addict. Apply it by hand.' },
  wineFlask7: { name: 'Flask of Wine', kind: 'backpack', glyph: 'wine-bottle' },
  wineBottle7: { name: 'Bottle of Wine', kind: 'backpack', glyph: 'wine-bottle' },
  waterBottle7: { name: 'Bottle of Water', kind: 'backpack', glyph: 'water-flask' },
  blanket7: { name: 'Blanket', kind: 'backpack', glyph: 'blanket', about: 'Wrapped round the arm it adds 1 COMBAT SKILL against the unseen whipmaster.' },
  redRobe7: { name: 'Red Robe', kind: 'backpack', glyph: 'hood', about: 'A hooded robe. Wrapped round the arm it adds 1 COMBAT SKILL against the unseen whipmaster.' },
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
const nest = 'a Helmet and a Silver Helm are not worn together: only one of them counts.';
const note123 = 'make a note of the number 123 in the margin of your Action Chart.';
const doubled = 'unless you have Curing, double every ENDURANCE point you lose in this fight (bite poison).';

export const SECTIONS = {
  1: { give: [{ item: 'powerKey' }] },
  7: { take: emptied },
  10: { take: [{ item: 'fireseed' }] },
  15: { loot: [{ item: 'jarLaumspur7' }, { item: 'platinumAmulet' }], todo: 'put back on your Action Chart every weapon (and the Sommerswerd or other weapon-like Special Item) taken from you when you were sent to the maze.' },
  16: { todo: 'the way on to 61 needs a Kalte Firesphere, a Lantern, or a Torch with a Tinderbox; with none of them take the other.' },
  18: { ep: -2 },
  19: { todo: 'unless you have Huntmastery, take 3 off your COMBAT SKILL for the first two rounds only.' },
  26: { rolls: loss(3), todo: 'with Weaponmastery (Sword) the loss is 2 less: give back up to 2 ENDURANCE.' },
  27: { todo: 'unless you have Huntmastery, take 3 off your COMBAT SKILL for the first three rounds only.' },
  31: { give: [{ item: 'skeletonKey7' }, { item: 'parchment7' }], need: { 266: bow } },
  32: { take: [{ weapons: 'one' }], todo: 'the weapon you used (a Sword or a Spear) is the one lost.' },
  34: { need: { 347: { item: 'silverWhistle7' } } },
  42: { ep: -3, need: { 174: sommerswerd, 202: noSommerswerd } },
  44: { ep: -3 },
  45: { todo: 'with the Lore-circle of Light complete, add 2 to your COMBAT SKILL for this fight.' },
  50: { take: spent },
  53: { ep: -5, need: { 157: fireseed } },
  // the Beastmen's packs
  56: {
    loot: [{ item: 'axe' }, { item: 'axe' }, { item: 'bow' }, { item: 'spear' }, { item: 'spear' }, { item: 'quiver' }, { arrows: 4 }, { meal: 4 }, { item: 'pouchHerbs7' }, { item: 'wineFlask7' }],
  },
  58: { ep: -2 },
  59: { ep: -3, todo: 'with Nexus at the rank of Primate you lose nothing: give the 3 back.' },
  60: { ep: -4, need: { 230: { item: 'sabito' }, 263: { item: 'sabito', not: true } } },
  66: { todo: 'only with a sword may you turn to 252; without one take 263.' },
  68: { need: { 182: rope } },
  69: { need: { 50: bow } },
  73: { loot: [{ item: 'diamond' }], todo: note123 },
  76: { todo: 'you cannot use a Shield or a two-handed weapon (Broadsword, Spear, Quarterstaff) here, and the venom triples every ENDURANCE point you lose in this fight.' },
  79: { take: spent },
  80: { loot: [{ item: 'spear' }, { item: 'shortSword' }, { item: 'shortSword' }, { item: 'axe' }, { item: 'dagger' }, { item: 'dagger' }, { item: 'mace' }, { gold: 6 }] },
  85: { rolls: loss(2), todo: 'with Huntmastery at the rank of Primate the loss is 2 less: give back up to 2 ENDURANCE.' },
  88: { ep: -2 },
  // Nexus or the Amulet: the importer read Nexus alone
  90: { need: { 24: null }, todo: 'only with Nexus or a Kazan-Oud Platinum Amulet may you turn to 24; without either take 324.' },
  96: { give: [{ item: 'sword' }] },
  97: { need: { 10: fireseed, 317: sommerswerd, 331: { item: ['fireseed', 'sommerswerd'], not: true } } },
  103: { ep: -8, todo: 'with Nexus you lose only 6: give 2 back.' },
  104: { ep: -3, todo: 'with Nexus you lose nothing: give the 3 back.', need: { 225: bow } },
  107: { ep: -6, need: { 145: { item: 'firesphere' } }, todo: 'turn to 26 only with a sword, to 51 only with a Lantern or a Torch and Tinderbox, to 145 only with a Kalte Firesphere; with none of these take 292.' },
  108: { ep: -5 },
  112: { ep: -1 },
  118: { ep: 'full' },
  120: { ep: -4 },
  122: { take: [{ backpack: 'all' }] },
  126: { todo: 'unless you have Nexus, double every ENDURANCE point you lose in this fight (burns).' },
  129: { todo: 'if you drink the Adgana before a fight: +6 COMBAT SKILL for it (+3 for any later dose). After the fight draw a number: 0 or 1 and you are addicted, losing 4 ENDURANCE for good (from your starting total).' },
  131: { take: [{ weapons: 'one' }], todo: 'you also lose the second item on your list of Backpack Items: drop it by hand.' },
  134: { ep: -4 },
  143: { need: { 10: fireseed, 317: sommerswerd, 331: { item: ['fireseed', 'sommerswerd'], not: true } } },
  148: { loot: [{ item: 'mace' }, { item: 'leatherWaistcoat' }, { item: 'sword' }, { item: 'helmet' }, { item: 'blanket7' }, { item: 'wineBottle7' }, { item: 'dagger' }, { item: 'potion' }], todo: nest },
  150: { need: { 310: rope } },
  152: { take: spent },
  154: { ep: -3, need: { 310: rope, 211: noRope } },
  155: { ep: -2 },
  157: { take: [{ item: 'fireseed' }] },
  158: { todo: 'all your Meals and two Backpack Items of your choice are lost: drop them by hand.' },
  161: { loot: [{ item: 'spear' }, { item: 'broadsword' }] },
  164: { need: { 7: bow } },
  165: { need: { 335: sommerswerd, 264: noSommerswerd } },
  168: { todo: 'turn to 32 only with a Sword or a Spear; with neither take 263.' },
  170: { ep: -4 },
  172: { need: { 347: { item: 'silverWhistle7' } } },
  // a shot with a total-of-the-draw rule the engine cannot do (Nexus counts as well as Weaponmastery)
  175: { take: spent, todo: 'a bow shot: draw a number and take 3 off it unless you have Weaponmastery (Bow) or Nexus. 5 or lower, turn to 19; 6 or more, turn to 314.' },
  177: { need: { 225: bow } },
  178: { need: { 191: fireseed }, todo: doubled },
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
  214: { todo: 'the door is fought as an enemy with the numbers printed there, as if unarmed (-4 COMBAT SKILL, none with Nexus). The ENDURANCE you lose is fatigue. You may stop at any time.' },
  219: { ep: -6, todo: 'take 4 off your COMBAT SKILL for the first two rounds only (your weapon is on the floor). ' + doubled },
  220: { loot: [{ item: 'axe' }, { item: 'dagger' }] },
  221: { todo: 'you cannot use a Bow in this fight. With Invisibility you may break off at any time without loss (turn to 70).' },
  222: { ep: -3 },
  225: { bowShot: { 196: [0, 6], 112: [7, 99] } },
  // the dead warrior's pack: the Power-key is a Special Item, the rest are Backpack Items
  227: { loot: [{ meal: 1 }, { item: 'rope' }, { item: 'blanket7' }, { item: 'dagger' }, { item: 'sabito' }, { item: 'waterBottle7' }, { item: 'powerKey' }] },
  233: { todo: 'the creature is open to psychic attack: if you use Mindblast or Psi-surge in this fight, double every ENDURANCE point it loses.' },
  236: { loot: [{ item: 'spear' }, { item: 'broadsword' }] },
  238: { loot: [{ item: 'axe' }, { item: 'shortSword' }, { item: 'dagger' }, { gold: 2 }] },
  // the number drawn is the loss, less 1 with Curing
  241: { rolls: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], ep: -n })), todo: 'with Curing the loss is 1 less: give back 1 ENDURANCE.' },
  250: { ep: 'full' },
  253: { take: spent },
  257: { fight: { csMod: -2, csNote: 'Unseen foe', ambush: true }, todo: 'a Blanket or a Red Robe (or a Towel) wrapped round your arm adds 1 COMBAT SKILL.' },
  258: { todo: 'the way on to 289 needs a Kalte Firesphere, a Lantern, or a Torch with a Tinderbox; with none of them take 277 or go back to 30.' },
  262: { loot: [{ item: 'shortSword' }, { item: 'shield' }] },
  // the Backpack, gold and Special Items stay; only his weapons are taken here
  264: { take: [{ weapons: 'all' }], todo: 'your weapon-like Special Items (a Magic Spear, a Bone Sword...) go too. Note every weapon down: you may find them again at 15.' },
  265: { ep: -2 },
  266: { bowShot: { 75: [0, 6], 162: [7, 99] } },
  267: { ep: 'full' },
  270: { need: { 207: { item: 'skeletonKey7' }, 242: { item: 'skeletonKey7', not: true } } },
  271: { loot: [{ item: 'goldKey7' }] },
  274: { need: { 333: { item: 'goldKey7' }, 54: { item: 'goldKey7', not: true } } },
  276: { take: spent },
  279: { give: [{ item: 'sword' }] },
  284: { ep: -8, todo: 'with Nexus you lose only 6: give 2 back.' },
  285: { todo: 'unless you have Curing, double every ENDURANCE point you lose in this fight (poisonous saliva).' },
  290: { fight: { double: true } },
  295: { need: { 276: bow } },
  297: { ep: -2, need: { 157: fireseed } },
  298: { todo: 'turn to 151 only if you have a sword.' },
  301: { todo: doubled },
  304: { ep: -3 },
  305: { give: [{ item: 'diamond' }] },
  311: { ep: -2 },
  313: { ep: -3, need: { 4: { ep: [10, 99] }, 263: { ep: [-99, 9] } } },
  324: { ep: -4 },
  325: { todo: 'you also lose 2 ENDURANCE in every round you fight, whatever the dice say.' },
  // a shot with a Lore-circle bonus the engine does not count
  328: { take: spent, todo: 'a bow shot: draw a number, add 3 with Weaponmastery (Bow) and 1 more with the Lore-circle of Fire complete. 0 to 4, turn to 232; 5 or more, turn to 67.' },
  333: { take: [{ item: 'goldKey7' }], loot: [{ item: 'spear' }, { item: 'quarterstaff' }], todo: note123 },
  // the Sommerswerd is taken too, and he is struck for 1
  335: { ep: -1, take: [{ weapons: 'all' }, { item: 'sommerswerd' }], todo: 'your other weapon-like Special Items go too. Note every weapon down: you may find them again at 15.' },
  344: { ep: -2 },
  348: { todo: 'the way on to 49 needs a Kalte Firesphere, a Lantern, or a Torch with a Tinderbox; with none of them take 277.' },
  183: { todo: note123 },
};

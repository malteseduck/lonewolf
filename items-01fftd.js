/* Book 1's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand (the importer cannot tell reliably what a passage gives or takes; see
   docs/reference/book-format.md, "Item tables"). The engine applies these:
     give   handed to him or pocketed without a choice: taken on arrival if they fit
     loot   found, his to take or leave: a "take" button each; or: only one of a group
     take   lost outright: {item}, {gold}, {weapons: 'all' | 'one'}, {backpack: 'items' | 'all'}
     ep     ENDURANCE gained or lost on arrival; cs: COMBAT SKILL changed for good
     rolls  what a Random Number drawn here does: [{range: [lo, hi], ep, take}]
     meal   a Meal the importer's pattern missed
     todo   what is the player's own choice, as a reminder
     need   choices that open only with an item or gold: {to: {item | gold, not, spend}}
     fight  corrections to what the importer read of a fight: csMod, mindforce (blocked by
            Mindshield), unless (items that spare the csMod), unarmed (csMod is the no-weapon penalty)
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  vordakGem: { name: 'Vordak Gem', kind: 'backpack', glyph: 'cut-diamond', about: 'A large gem that burns to the touch.' },
  tombGems: { name: 'Tomb Guardian Gems', kind: 'backpack', glyph: 'gems', about: 'Twenty gems, carried as a single Backpack Item.' },
  goldenKey: { name: 'Golden Key', kind: 'special', glyph: 'key' },
  silverKey: { name: 'Silver Key', kind: 'special', glyph: 'skeleton-key' },
  scroll: { name: 'Scroll', kind: 'special', glyph: 'scroll-unfurled' },
  message: { name: 'Message', kind: 'special', glyph: 'scroll-quill', about: 'Written on an animal skin.' },
  crystalStar: { name: 'Crystal Star Pendant', kind: 'special', glyph: 'gem-necklace', about: 'A talisman of good fortune, worn on a gold chain.' },
  alether: { name: 'Potion of Alether', kind: 'backpack', glyph: 'standing-potion', about: 'Drink before a fight: +2 COMBAT SKILL for that fight. Apply it by hand.' },
  laumspurHerb: { name: 'Laumspur', kind: 'backpack', glyph: 'herbs-bundle', heal: 3, meal: true, about: 'A handful of the healing herb: eat it to restore 3 ENDURANCE. It serves as a Meal when you have none.' },
  soap: { name: 'Tablet of Perfumed Soap', kind: 'backpack', glyph: 'soap' },
  torch: { name: 'Torch', kind: 'backpack', glyph: 'torch' },
  tinderbox: { name: 'Tinderbox', kind: 'backpack', glyph: 'flint-spark' },
};

export const SECTIONS = {
  9: { need: { 236: { item: 'vordakGem' } } },
  // the Vordaks' -2 is their Mindforce, which Mindshield blocks; the importer read it as a flat -2
  29: { fight: { csMod: 0, mindforce: 2 } },
  34: { fight: { csMod: 0, mindforce: 2 } },
  12: { need: { 262: { gold: 10, spend: true } } },
  15: { loot: [{ item: 'sword' }] },
  20: { loot: [{ pack: true }, { meal: 2 }, { item: 'dagger' }] },
  23: { need: { 326: { item: 'goldenKey' } } },
  33: { give: [{ gold: 3 }] },
  37: { meal: true },
  62: { give: [{ gold: 28 }], loot: [{ meal: 3 }, { item: 'sword' }] },
  76: { ep: -2, give: [{ item: 'vordakGem' }] },
  // the Healing choice is worded "possess and wish to use ... on him", which the importer's pattern misses
  88: { need: { 216: { disc: 'healing' } } },
  94: { give: [{ gold: 16 }] },
  113: { give: [{ item: 'laumspurHerb' }, { item: 'laumspurHerb' }] },
  119: { ep: -2 },
  124: { give: [{ gold: 15 }], loot: [{ item: 'silverKey' }] },
  137: { give: [{ item: 'tombGems' }] },
  144: { ep: -2, todo: 'one item is stolen from your Backpack: drop the one you choose. If you have no Backpack Items, you lose a weapon instead.' },
  146: { ep: -3 },
  148: { loot: [{ item: 'warhammer' }] },
  158: { ep: -6, rolls: [{ range: [6, 9], ep: -4 }] },
  161: { give: [{ item: 'goldenKey' }] },
  162: { take: [{ weapons: 'all' }, { backpack: 'all' }] },
  164: { loot: [{ item: 'alether' }] },
  166: { ep: -4 },
  168: { meal: true },
  170: { fight: { csMod: -3, csNote: 'As the text says', unless: ['torch', 'tinderbox'] } },
  173: { need: { 158: { item: 'silverKey' }, 259: { item: 'silverKey', not: true } } },
  174: { take: [{ weapons: 'all' }, { backpack: 'all' }] },
  // the food is found and eaten in the same breath, so it is put in the pack before the Meal is due
  184: { give: [{ meal: 4 }], loot: [{ gold: 40 }, { item: 'sword' }] },
  188: { rolls: [{ range: [0, 6], take: [{ backpack: 'all' }] }, { range: [7, 9], ep: -3 }] },
  193: { loot: [{ item: 'scroll' }] },
  197: { loot: [{ item: 'shortSword' }, { gold: 6 }] },
  199: { loot: [{ meal: 1 }] },
  // the way on depends on the Endurance left after the loss
  203: { ep: -10, need: { 80: { ep: [10, 999] }, 344: { ep: [-999, 9] } } },
  205: { take: [{ weapons: 'all' }, { backpack: 'items' }] },
  212: { ep: 'full' },
  236: { ep: -6, cs: -1, take: [{ item: 'vordakGem' }] },
  243: { loot: [{ item: 'mace' }] },
  255: { loot: [{ item: 'sword' }] },
  260: { fight: { unarmed: true } },
  263: { loot: [{ gold: 3 }] },
  267: { loot: [{ item: 'message' }, { item: 'dagger' }] },
  269: { give: [{ gold: 10 }] },
  274: { take: [{ weapons: 'all' }] },
  277: { take: [{ weapons: 'one' }] },
  283: { fight: { csMod: 0, mindforce: 2 }, todo: 'you surprised him: add 2 to your COMBAT SKILL for the first round only. The engine does not.' },
  290: { loot: [{ item: 'quarterstaff' }] },
  291: { loot: [{ gold: 6 }, { item: 'dagger', or: 'weapon' }, { item: 'spear', or: 'weapon' }] },
  294: { take: [{ weapons: 'all' }, { backpack: 'all' }] },
  304: { ep: -2, give: [{ item: 'vordakGem' }] },
  305: { loot: [{ item: 'spear' }] },
  307: { give: [{ meal: 1 }], loot: [{ item: 'warhammer' }], todo: 'the Warhammer is yours only in exchange for one of your weapons: drop that one first, then take it.' },
  308: { ep: -1 },
  313: { ep: -1 },
  315: { loot: [{ gold: 6 }, { item: 'soap' }] },
  319: { loot: [{ item: 'dagger' }, { gold: 20 }] },
  320: { ep: -2 },
  342: { fight: { csMod: 0, mindforce: 2 } },
  346: { loot: [{ item: 'spear' }] },
  347: { loot: [{ item: 'shortSword' }, { item: 'tinderbox' }, { item: 'torch' }] },
  349: { give: [{ item: 'crystalStar' }] },
};

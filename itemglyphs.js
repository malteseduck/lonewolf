/* Which glyph (assets/icons/<name>.svg, game-icons.net) stands for each item. A book's own items name
   theirs in their item table (items/items-<code>.js, `glyph`); the engine's standard items are listed
   here, and an entry here wins over a `glyph` in shared/core.js. The item sheet (tools/admin/items.html)
   rewrites this list and the tables, one entry per line, so keep it so. */
export const ITEM_GLYPH = {
  dagger: 'plain-dagger',
  spear: 'barbed-spear',
  mace: 'mace-head',
  shortSword: 'gladius',
  warhammer: 'warhammer',
  sword: 'pointy-sword',
  axe: 'battle-axe',
  quarterstaff: 'wizard-staff',
  broadsword: 'broadsword',
  bow: 'pocket-bow',
  quiver: 'quiver',
  arrows: 'arrow-flights',
  potion: 'health-potion',
  meal: 'meal',
  map: 'treasure-map',
  helmet: 'visored-helm',
  chainmail: 'mail-shirt',
};

/* The glyph's name for an item id; anything typed in by hand gets a pouch or a pendant by its kind. */
export const glyphName = (LW, id) => ITEM_GLYPH[id] || (LW.ITEMS[id] && LW.ITEMS[id].glyph)
  || (id === 'gold' || id === 'coin' ? 'two-coins' : id === 'pack' ? 'backpack'
    : LW.itemKind(id) === 'special' ? 'gem-pendant' : LW.itemKind(id) === 'weapon' ? 'pointy-sword' : 'swap-bag');

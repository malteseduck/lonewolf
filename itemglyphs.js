/* Which glyph (assets/icons/<name>.svg, game-icons.net) stands for each item. A book's own items name
   theirs in their item table (items/items-<code>.js, `glyph`); the engine's standard items are listed
   here, and an entry here wins over a `glyph` in shared/core.js. The item sheet (tools/admin/items.html)
   rewrites this list and the tables, one entry per line, so keep it so. */
import { KIND_GLYPH } from './glyphs.js';

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

/* The glyph's name for an item id; anything else gets its kind's (glyphs.js KIND_GLYPH). */
export const glyphName = (LW, id) => ITEM_GLYPH[id] || (LW.ITEMS[id] && LW.ITEMS[id].glyph)
  || KIND_GLYPH[id === 'coin' ? 'gold' : id === 'gold' || id === 'pack' ? id : ['special', 'weapon'].includes(LW.itemKind(id)) ? LW.itemKind(id) : 'backpack'];

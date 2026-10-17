/* Which glyph (assets/icons/<name>.svg, game-icons.net) the player draws where, apart from the items'
   (itemglyphs.js). The dashboard's icon sheet (tools/admin/icons.html) rewrites these lists, one entry
   per line, so keep them so; WHERE says what each UI_GLYPH entry is for. */

/* the disciplines' medallions, cut from the medallion's colour by a mask so they can glow like the HD ones */
export const DISC_GLYPH = {
  camouflage: 'hood',
  hunting: 'high-shot',
  sixthSense: 'third-eye',
  tracking: 'footsteps',
  healing: 'herbs-bundle',
  weaponskill: 'broadsword',
  mindshield: 'eye-shield',
  mindblast: 'brainstorm',
  animalKinship: 'wolf-howl',
  mindOverMatter: 'magic-palm',
  weaponmastery: 'crossed-swords',
  animalControl: 'stag-head',
  curing: 'healing',
  invisibility: 'invisible',
  huntmastery: 'bowman',
  pathsmanship: 'footprint',
  psiSurge: 'psychic-waves',
  psiScreen: 'magic-shield',
  nexus: 'fire-shield',
  divination: 'crystal-ball',
  // the Grand Master ones, each near its Magnakai counterpart's (only one series' grid shows at a time)
  grandWeaponmastery: 'switch-weapon',
  animalMastery: 'stag-head',
  deliverance: 'healing',
  assimilance: 'domino-mask',
  grandHuntmastery: 'bowman',
  grandPathsmanship: 'footprint',
  kaiSurge: 'psychic-waves',
  kaiScreen: 'magic-shield',
  grandNexus: 'fire-shield',
  telegnosis: 'crystal-ball',
  magiMagic: 'magic-palm',
  kaiAlchemy: 'round-bottom-flask',
};

/* everything else drawn from the set */
export const UI_GLYPH = {
  titleMark: 'wolf-head',
  newAdventure: 'wolf-head',
  introBadge: 'wolf-head',
  kaiSheet: 'wolf-head',
  crest: 'wolf-head',
  tabKai: 'wolf-head',
  tabPack: 'backpack',
  home: 'return-arrow',
  statCs: 'crossed-swords',
  statEp: 'heart-drop',
  statGold: 'two-coins',
  purse: 'two-coins',
  otherPack: 'swap-bag',
  otherSpecial: 'gem-pendant',
  beginFight: 'crossed-swords',
  strike: 'crossed-swords',
  mindblast: 'brainstorm',
  psiSurge: 'psychic-waves',
  cure: 'healing',
  evade: 'run',
  evadeFree: 'invisible',
  foeEmblem: 'crossed-swords',
};

/* an item with no glyph of its own (one typed in by hand, or a table's item without one), by its kind */
export const KIND_GLYPH = {
  gold: 'two-coins',
  pack: 'backpack',
  special: 'gem-pendant',
  weapon: 'pointy-sword',
  backpack: 'swap-bag',
};

/* [group, where it is drawn] for each UI_GLYPH entry, for the icon sheet */
export const WHERE = {
  titleMark: ['Title and panels', 'the wolf between "Lone" and "Wolf" on the title page'],
  newAdventure: ['Title and panels', 'the "A new adventure" plaque on the title page'],
  introBadge: ['Title and panels', 'the badge over a book\'s opening pages'],
  kaiSheet: ['Title and panels', 'beside "Lone Wolf" on the Kai sheet'],
  crest: ['Title and panels', 'the crest between the two weapons in the inventory'],
  tabKai: ['Title and panels', 'the Kai sheet\'s tab medallion'],
  tabPack: ['Title and panels', 'the inventory\'s tab medallion'],
  home: ['Title and panels', 'the medallion back to the title page'],
  statCs: ['Gauges and inventory', 'the Combat Skill gauge'],
  statEp: ['Gauges and inventory', 'the Endurance gauge'],
  statGold: ['Gauges and inventory', 'the Gold Crowns gauge'],
  purse: ['Gauges and inventory', 'the purse lines in the inventory (Gold Crowns and other coins)'],
  otherPack: ['Gauges and inventory', '"Another Backpack Item" when adding by hand'],
  otherSpecial: ['Gauges and inventory', '"Another Special Item" when adding by hand'],
  beginFight: ['Fights', 'the medallion that begins a fight'],
  strike: ['Fights', 'Strike, when he has no weapon in hand'],
  mindblast: ['Fights', 'Mindblast'],
  psiSurge: ['Fights', 'Psi-surge / Kai-surge'],
  cure: ['Fights', 'the healing discipline used in a fight (Curing, Deliverance)'],
  evade: ['Fights', 'Evade, taking a blow'],
  evadeFree: ['Fights', 'Evade, untouched'],
  foeEmblem: ['Fights', 'drawn on the plate of a foe with no picture'],
};

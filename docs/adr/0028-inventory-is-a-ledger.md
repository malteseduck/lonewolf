# 0028. The inventory is a ledger like the Kai panel, with the wolf's-head crest between the weapons

- Status: Accepted
- Date: 2026-10-12
- Amended: 2026-10-17

## Context

The inventory followed the HD equipment sheet's paper doll: weapon and Special Item slots placed as
head, shoulders, chest and belt around Lone Wolf's figure, cut faint from a picture the owner
supplies (in git-ignored `art/`). On 2026-10-12 the owner found the faint figure silly, like a
ragdoll, and chose the Kai wolf's-head crest instead. Without the figure the page was clunky: a
cluster of unlabelled rings in seven near-equal sizes, Special Items split between the doll and a row
below, bare rings everywhere when little was carried, and every item needing a touch to learn its
name. The owner also asked that it hold the most Special Items a book allows (12, ruling R2) and a
Grand Master Backpack of 10 without spreading oddly. Phones are not a target (ruling R12).

## Decision

- The inventory panel is a ledger like the Kai panel, top to bottom: the two weapons, each named
  under its medallion (a mastered one lit; an empty hand a faint sword with "No weapon"); a ruled
  "Special Items n of 12" heading over a list of every Special Item, a small medallion and its name,
  three to a row; a ruled "Backpack n of N" heading over the tiles; then the gold and coins with "Add
  an item by hand" on the same line.
- Between the two weapons is the Kai wolf's head (the `wolf-head` glyph of the title and the Kai
  tab), faint in the page's ink, as a seal. No figure of Lone Wolf is shown, from the owner's art or
  drawn.
- No slot stands for a body part, and no empty Special Item slot is drawn: the list holds what he
  carries, and the Backpack follows right under it rather than at the page's foot. Twelve fit on the
  iPad without scrolling; more (items outside the limit) scroll inside the list, so nothing runs off
  the page.
- The Backpack has as many tiles as the book allows, in two rows (4 x 2 for 8, 5 x 2 for 10), small
  enough that the purse line fits beneath with room. In a tile an item is its glyph alone, without its
  own ring: the tile is its frame. The ironwork stays.
- What an item adds (a weapon's bonus, the Sommerswerd's) is said in its box when touched, never on
  the page.
- Long names do not push the layout about: a Special Item's name stops at three lines, a weapon's at
  two, the rest in its box; a single long word is set smaller, not broken.
- Adding by hand is unchanged: the picker takes the weapons' and Special Items' place.

## Consequences

- `packHTML` in main.js (`.arms`, `.crestmark`, `.specs`, `.pack` with `--cols`, `.ledger .addhand`),
  styled under "inventory" in index.html. The doll, the row of five, the knapsack medallion, the
  flourish, the cut-out code (`heroFromArt`) and the `hero` entry of `art/manifest.json` are gone.
- Do not bring back a paper doll, fixed body-part slots or a figure without the owner's say-so.
- Spec 6.3 states only the intent; this record holds the layout.

## Changes

- 2026-10-12: the cut-out figure replaced by the wolf's-head crest, then the crest moved between the
  two weapons when the paper doll gave way to the ledger.
- 2026-10-12: the Backpack sits right under a short Special Items list, its tiles smaller; bonuses
  only in an item's box; long names capped (owner).
- 2026-10-17: merged in 0009 (the crest).

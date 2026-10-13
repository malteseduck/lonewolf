# 0028. The inventory is a ledger like the Kai panel, not a paper doll

- Status: Accepted
- Date: 2026-10-12
- Amended: 2026-10-12

## Context

The inventory followed the HD equipment sheet's paper doll: weapon and Special Item slots placed as
head, shoulders, chest and belt around Lone Wolf's figure. Once ADR 0009 took the figure away, the
owner found the page clunky: a cluster of unlabelled rings in seven near-equal sizes, Special Items
split between the doll and a row below, bare rings everywhere when little was carried, and every
item needing a touch to learn its name. The owner also asked that it hold the most Special Items a
book allows (12, ADR 0029) and a Grand Master Backpack of 10 without spreading oddly. Phones are
not a target; the iPad is.

## Decision

- The inventory panel is a ledger like the Kai panel, top to bottom: the two weapons, each named
  under its medallion (a mastered one lit; an empty hand a faint sword with "No weapon"), with the wolf's-head crest between them (ADR 0009); a ruled "Special Items n of 12"
  heading over a list of every Special Item, a small medallion and its name, three to a row; a ruled
  "Backpack n of N" heading over the tiles; then the gold and coins with "Add an item by hand"
  on the same line.
- No slot stands for a body part, and no empty Special Item slot is drawn: the list holds what he
  carries, and the Backpack follows right under it rather than at the page's foot. Twelve fit on the
  iPad without scrolling; more (items outside the limit) scroll inside the list, so nothing runs off
  the page.
- The Backpack has as many tiles as the book allows, in two rows (4 x 2 for 8, 5 x 2 for 10), small
  enough that the purse line fits beneath with room. In a
  tile an item is its glyph alone, without its own ring: the tile is its frame. The ironwork stays.
- What an item adds (a weapon's bonus, the Sommerswerd's) is said in its box when touched, never on
  the page.
- Adding by hand is unchanged: the picker takes the weapons' and Special Items' place.

## Consequences

- `packHTML` in main.js (`.arms`, `.specs`, `.pack` with `--cols`, `.ledger .addhand`), styled under
  "inventory" in index.html. The doll, the row of five, the knapsack medallion and the flourish are
  gone.
- Do not bring back a paper doll or fixed body-part slots without the owner's say-so.
- Spec 6.3 states only the intent (everything readable at a glance, the most a book allows held
  without running off the page); this record holds the layout.

## Changes

- 2026-10-12: the Backpack sits right under a short Special Items list instead of at the page's
  foot, and its tiles are smaller (owner).
- 2026-10-12: bonuses only in an item's box, not by its name (owner).
- 2026-10-12: long names no longer push the layout about: a Special Item's name stops at three lines,
  a weapon's at two, the rest in its box; a single long word is set smaller, not broken (owner asked
  for the labels to stop upsetting the layout).

# 0042. An item sheet on the dashboard, where an item's icon is changed and new ones picked from game-icons.net

- Status: Accepted
- Date: 2026-10-17

## Context

Each item's icon is a game-icons.net glyph named in its item table (`glyph`) or, for the engine's
own items, in the code. Choosing one meant guessing names for `tools/fetch_icons.py` and editing
the table by hand, without seeing the icons side by side. The owner asked for a sheet like the
picture and illustration sheets: every item of a book with its icon and what is known about it, and
a way to change the icon, browsing the icons already here and those at the source.

## Decision

- "Open item sheet" at step 5 (Item table) opens `tools/admin/items.html` inline, like the other
  sheets and only there (ADR 0021): the book's own items, then the ones from elsewhere its sections
  name (the engine's, another book's), each with its icon as the inventory draws it and large, its
  fields, its `about`, the sections that offer, give, take or test it, the other books that have it,
  and the items sharing its icon. A card with its kind's default icon is marked.
- Change icon... picks from the icons in `assets/icons/` or from the whole game-icons.net set (its
  list and previews kept in git-ignored `data/reference/game-icons/`). Picking one from the source
  is the owner's go-ahead for that download: it is saved in `assets/icons/` with its square removed
  and credited under its author in `assets/icons/README.txt`, as `fetch_icons.py` does.
- The change is written where the glyph is named: the item's entry in its book's table, or, for the
  engine's own items, `itemglyphs.js` (moved out of `main.js` for this), which every book shares.

## Consequences

- Icons fetched and then left unused stay in `assets/icons/` until removed by hand.
- An engine item's icon changes in every book at once; the sheet says so before saving.

# 0035. A fight's picture: its own, then the same creature in this book, then in another, then a stand-in

- Status: Accepted
- Date: 2026-10-14

## Context

The procedure in `docs/reference/items.md` looked at the owner's `art/plates/` pictures first and
other books only for plain humans. Book 9's Doomwolf was given the owner's bestiary drawing although
the book pictures its own Doomwolves one section before that fight, and its Gourgaz the same drawing
although Book 1 pictures the very same creature (missed because the illustration index did not list
a picture's fights in other sections). The owner set the order.

## Decision

Where a fight's picture comes from, first that applies:

1. **The fight's own picture**, if its section has one.
2. **The same creature in the same book**: any of the book's illustrations, fight pictures included
   (another fight's, or one where the creature is met but not fought), whole or cropped.
3. **The same creature in another book**, likewise.
4. **A stand-in**: the owner's `art/plates/` pictures, the library in `assets/plates/`, or a picture
   found by searching.

Plain human enemies (guards, soldiers, mercenaries, robbers) follow ADR 0010: another book's plain
human and an `art/plates/` stand-in rank alike, chosen for variety.

A picture the owner sets on the picture sheet is the owner's choice and stands whatever the order.

## Consequences

- The illustration index (`tools/ill_index.py`) holds every illustration of every downloaded book,
  fight pictures too, and a picture's fights in other sections (`fought_at`), so steps 2 and 3 are
  a search of it by the creature's name.
- The procedure is `docs/reference/items.md`, "Fight pictures"; the step 7 prompt in
  `tools/admin/prompts.js` gives the same order.

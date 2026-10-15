# 0039. Every book is offered each dashboard step that can work for it

- Status: Accepted
- Date: 2026-10-14
- Amended: 2026-10-14

## Context

The dashboard offered Books 13-20 (the Grand Master series) only their download, because the engine
has none of the series' rules yet (`docs/plan.md`, G1-G5). Book 13 is downloaded and imported, and
the owner asked why it had no other buttons; most steps do not depend on the engine's rules.

The first answer opened the steps for Grand Master books as a special case. The owner called that
the wrong rule: every book should simply get whatever steps would work for it.

## Decision

- Each book is offered every step whose needs it meets, whatever its series; a step is held back
  only by what it actually needs, and says what that is.
- What the steps need: the download, nothing; the import, the book downloaded and known to the
  importer (otherwise the new-book prompt); test play (6) and registering the item table in `main.js`
  `ITEM_TABLES`, the engine's rules for the book's series. Every other step works on any imported book.
- Whether the engine has a series is read from the code (the keys of `LW.SERIES` in
  `shared/rules-series.js`), not from a list of books: when the engine gains a series, its books get
  test play and registering at once.
- Until then, such a book's test play shows as not needed yet and its mark is refused, and its item
  table stops at a warning ("read and checked clean; registering it waits for the engine's ... rules"),
  with a prompt that says not to register it.
- A book not downloaded has only the download to offer: the grid folds every such book, of any series.

## Consequences

- `tools/book_status.py` (`engine_series()`, a book's `playable`, the step states and `mark`),
  `tools/admin/admin.js` (the fold, the download dialog's warning), `tools/admin/prompts.js` (step 5);
  `docs/reference/dashboard.md`.
- Plan G7 is only the engine work itself: once `LW.SERIES` has the Grand Master series, the dashboard
  offers the rest.

## Changes

- 2026-10-14: generalised from "Grand Master books get the engine-free steps" to every book being offered
  the steps that can work for it, with the engine's series read from `shared/rules-series.js` (owner).

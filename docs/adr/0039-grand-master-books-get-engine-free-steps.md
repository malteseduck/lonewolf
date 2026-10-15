# 0039. A Grand Master book gets every dashboard step but test play before the engine has the series

- Status: Accepted
- Date: 2026-10-14

## Context

The dashboard offered Books 13-20 (the Grand Master series) only their download, because the engine
has none of the series' rules yet (`docs/plan.md`, G1-G5). Book 13 is downloaded and imported, and
the owner asked why it had no other buttons; most steps do not depend on the engine's rules.

## Decision

- A downloaded Grand Master book gets every step and its buttons: phrasings (3), the rules addendum
  (4), the reading copy, the item table and its draft (5), fight pictures (7), the map (8) and the
  illustrations (9).
- Test play (6) waits for the engine: it shows as not needed yet, and `book_status.py done <book> 6`
  refuses it.
- The item table is read and checked but not registered in `main.js` `ITEM_TABLES`: step 5 stops at
  a warning ("read and checked clean; registering it waits for the Grand Master engine") rather than
  done, and its prompt tells the agent not to register it.
- A book not yet downloaded is still offered only the download (its row folded, as before).

## Consequences

- `tools/book_status.py` (the Grand Master branch of the step states and `mark`), `tools/admin/prompts.js`
  (step 5's prompt), `tools/admin/admin.js` (the folded row's line); `docs/reference/dashboard.md`.
- Plan G7 shrinks to registering the tables and opening test play once G1-G5 are done.

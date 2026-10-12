# 0029. At most 12 Special Items in every book, Kai ones too

- Status: Accepted
- Date: 2026-10-12

## Context

The books set a limit of 12 Special Items from Book 8; the Kai books (1-5) and Books 6-7 give none,
and the engine applied none there. Asked whether the community reads it otherwise, the only note
found was Project Aon's newsletter saying the rule starts in Book 8. With no rule against it, the
owner chose to hold every book to 12, so the inventory has one limit to show.

## Decision

At most 12 Special Items in every book, Kai, Magnakai and Grand Master. Items the item table marks
`free` (kept out of the limit by the text) still do not count. Anything over 12 may be left at the
Monastery where the book's kit step allows it, as before.

## Consequences

- `LW.specialLimit()` is 12 always (shared/core.js); `LW.putItem` refuses a thirteenth, and the kit
  step (`LW.KitSetup`) asks for some to be left behind.
- rules-books.md marks the Kai books' limit as the owner's, not the books'.
- A character carried into a Kai book with more than 12 (only possible from an old save) keeps them,
  but takes no more until under the limit.

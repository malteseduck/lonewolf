# 0024. The engine is modular and tested before its rules change, and the move changes nothing

- Status: Accepted
- Date: 2026-10-11

## Context

`docs/plan.md` listed the engine work that would retire the item tables' `todo`s, most of it in the
fight, and separately the code still untested because `main.js` runs the page on import. The fight's
rules lived in `main.js`, mixed with its drawing, so the largest engine changes would have been made
without tests. The owner asked for the current engine to be modularized, finalized and tested first,
and for it to work exactly as before: it is known to play well from playing it.

## Decision

- Getting the engine into modules with tests comes before any change to its rules.
- Moving code out of `main.js` is a pure move: the same rules, the same log lines, the same order of
  steps. A difference found on the way (a rule nowhere recorded) is asked about, not fixed in passing
  (ADR 0023 came of this).
- The rules live in `shared/` (`core.js`, `rules-series.js`, `fight.js`), each with its tests;
  storage the page relies on (adventures, backups) in `adventures.js`, with its tests. `main.js`
  draws, animates and takes input, and holds no rules.

## Consequences

- A move of this kind is checked against the code it replaces: the old and new code run side by
  side on the same input (for the fight, 20,000 random fights with the same dice; for the item
  tables, every book), and the result is the same, besides the unit tests.
- New engine rules go into `shared/` with their tests (ADR 0022), not into `main.js`.
- `docs/plan.md` lists what is left of `main.js` that is not drawing or input.

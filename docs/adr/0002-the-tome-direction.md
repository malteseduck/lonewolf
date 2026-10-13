# 0002. The Tome (prototype D) is the player; A-C rejected and historical

- Status: Accepted
- Date: 2026-09-30
- Amended: 2026-10-12

## Context

Four prototypes were built in one sitting. A (open book, pixel woodcuts, Dragon Quest battle) and
B (painted map, paper strips, rewind) "feel like kid games"; B's map and choosing the next place on
it were liked, but see 0004. C (three.js candlelit book, first-person combat) is 3D, which is not
wanted. D, a flat book after Lone Wolf HD Remastered screenshots, was chosen.

On 2026-10-12 the owner declared A-C dead for testing and changes: kept only as a record of what
was tried, for the owner's own reference.

## Decision

- D is the product, at the project root (`index.html`, `main.js`, `plates.js`, `maps.js`).
- Style follows Lone Wolf HD Remastered: framed story page left, panel page right, bronze
  medallions.
- A-C are historical. They stay under `prototypes/` for the owner's reference, but agents do not
  read them, mention them, change them, run them, or check that they still load. The same goes for
  the `shared/` files only they use: `art.js`, `battle.js`, `flow.js`, `book-demo.js`.

## Consequences

- Nothing that reads as a children's game: no pixel art, no bright flat colour, no cartoon shapes
  (spec 6.6).
- A change to `shared/` is checked against the player only. If it breaks A-C, that is accepted.
- The tests skip `prototypes/` and the prototype-only `shared/` files (`tests/js/parse.test.js`).
- Plans and reports leave them out. They are not deleted: the owner keeps them.

## Changes

- 2026-10-12: A-C made historical: not read, mentioned, changed, run or checked; the "kept working"
  rule and the pending deletion dropped.

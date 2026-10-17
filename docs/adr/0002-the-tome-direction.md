# 0002. The Tome is the player: a flat book after Lone Wolf HD, no 3D, the pages first

- Status: Accepted
- Date: 2026-09-30
- Amended: 2026-10-17

## Context

Four prototypes were built in one sitting. A (open book, pixel woodcuts, Dragon Quest battle) and
B (painted map, paper strips, rewind) "feel like kid games"; B's map and choosing the next place on
it were liked, but see 0004. C (three.js candlelit book, first-person combat in fog) is 3D, which is
not wanted in reading or in battle; the owner prefers a good still picture to crude animation. D, a
flat book after Lone Wolf HD Remastered screenshots, was chosen.

On 2026-10-12 the owner declared A-C dead for testing and changes: kept only as a record of what
was tried, for the owner's own reference.

The bronze clockwork round the book once took room from the pages (2026-09-30).

## Decision

- D is the product, at the project root (`index.html`, `main.js`, `plates.js`, `maps.js`).
- Style follows Lone Wolf HD Remastered: framed story page left, panel page right, bronze
  medallions.
- **Flat, no 3D.** Pages are 2D; no real-time 3D anywhere. Combat happens on the book's pages, with
  medallion controls. Creatures are still images of good quality, not animated.
- **The pages come first.** Decoration around the book (the clockwork) never costs the pages space.
- A-C are historical. They stay under `prototypes/` for the owner's reference, but agents do not
  read them, mention them, change them, run them, or check that they still load. The same goes for
  the `shared/` files only they use: `art.js`, `battle.js`, `flow.js`, `book-demo.js`.

## Consequences

- Nothing that reads as a children's game: no pixel art, no bright flat colour, no cartoon shapes
  (spec 6.6).
- Motion is limited to page turns, the Random Number medallion and small combat feedback (spec
  principle 4). Do not add three.js or any 3D library to the player.
- Size decoration into the margins the spread leaves; never shrink the spread for it (spec 6.1).
- A change to `shared/` is checked against the player only. If it breaks A-C, that is accepted.
- The tests skip `prototypes/` and the prototype-only `shared/` files (`tests/js/parse.test.js`).
- Plans and reports leave them out. They are not deleted: the owner keeps them.

## Changes

- 2026-10-12: A-C made historical: not read, mentioned, changed, run or checked; the "kept working"
  rule and the pending deletion dropped.
- 2026-10-17: merged in 0003 (flat pages, no 3D) and 0013 (decoration never costs the pages space).

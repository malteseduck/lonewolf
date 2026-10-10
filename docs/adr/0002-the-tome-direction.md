# 0002. The Tome (prototype D) is the player; A-C rejected

- Status: Accepted
- Date: 2026-09-30

## Context

Four prototypes were built in one sitting. A (open book, pixel woodcuts, Dragon Quest battle) and
B (painted map, paper strips, rewind) "feel like kid games"; B's map and choosing the next place on
it were liked, but see 0004. C (three.js candlelit book, first-person combat) is 3D, which is not
wanted. D, a flat book after Lone Wolf HD Remastered screenshots, was chosen.

## Decision

- D is the product, at the project root (`index.html`, `main.js`, `plates.js`, `maps.js`).
- Style follows Lone Wolf HD Remastered: framed story page left, panel page right, bronze
  medallions.
- A-C live under `prototypes/`, kept working but never extended.

## Consequences

- Nothing that reads as a children's game: no pixel art, no bright flat colour, no cartoon shapes
  (spec 6.6).
- `shared/` is used by A-C too: check they still load after changing it.
- Deleting `prototypes/` waits for the owner (plan.md).

# 0003. Flat pages, no 3D; combat on the book's pages

- Status: Accepted
- Date: 2026-09-30

## Context

Prototype C tried a 3D book and first-person combat in fog. The owner wants no 3D, in reading or
in battle, and prefers a good still picture to crude animation.

## Decision

- Pages are 2D. No real-time 3D anywhere.
- Combat happens on the book's pages, with medallion controls.
- Creatures are still images of good quality, not animated.

## Consequences

- Motion is limited to page turns, the Random Number medallion and small combat feedback (spec
  principle 4).
- Do not add three.js or any 3D library to the player.

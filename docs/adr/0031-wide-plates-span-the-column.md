# 0031. A double-width plate spans the story column; the others keep their size

- Status: Accepted
- Date: 2026-10-12

## Context

Every full-page plate was shown at one width, 56% of the story column. Project Aon draws most plates
one column wide (portrait, 386 px), but a few across both columns (landscape, 772 px: 12 of the 405
across Books 1-12). At 56% those came out cramped, much smaller than in the printed book. The owner
wanted the big ones to fill the page's width without hand-checking each picture, and without
stretching the small ones.

## Decision

- A full-page plate that is wider than it is high spans the whole width of the story column.
- Every other plate keeps its size (portrait plates at 56% of the column, small pictures as before).
- The choice is made from the picture's own shape when it loads, never by hand per picture.

## Consequences

`widenPlates()` in `main.js` adds `.wide` to a landscape `.vignette.full` after each
`renderLeft`, and `index.html` gives `.vignette.full.wide` the column's width
(`docs/reference/interface.md`). Do not list pictures by name to widen or shrink.

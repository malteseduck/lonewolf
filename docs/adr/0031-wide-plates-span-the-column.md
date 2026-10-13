# 0031. Full-page plates shown large: a double-width one spans the column, a portrait one nearly fills the page's height

- Status: Accepted
- Date: 2026-10-12
- Amended: 2026-10-12

## Context

Every full-page plate was shown at one width, 56% of the story column. Project Aon draws most plates
one column wide (portrait, 386 px), but a few across both columns (landscape, 772 px: 12 of the 405
across Books 1-12). At 56% those came out cramped, much smaller than in the printed book. The owner
wanted the big ones to fill the page's width without hand-checking each picture, and without
stretching the small ones.

The owner then found the portrait plates small too, beside the picture opened on its own (larger,
if less sharp).

## Decision

- A full-page plate that is wider than it is high spans the whole width of the story column.
- A portrait plate is shown 21em high (about 92% of the text area's height), its width following its
  shape; every portrait plate in Books 1-12 (width 0.53 to 0.71 of its height) then fits the column.
- The small pictures keep their size.
- The choice is made from the picture's own shape when it loads, never by hand per picture.

## Consequences

`widenPlates()` in `main.js` adds `.wide` to a landscape `.vignette.full` after each
`renderLeft`; `index.html` gives `.vignette.full` its height and `.vignette.full.wide` the column's
width (`docs/reference/interface.md`). Do not list pictures by name to widen or shrink. Drawn this
large, the plates are enlarged from their files on the PC and look a little soft.

## Changes

- 2026-10-12: portrait plates made 21em high instead of 56% of the column wide (about 35% larger).

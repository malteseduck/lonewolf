# 0031. Illustrations: full-page plates shown large, every picture upscaled 2x as WebP beside its original

- Status: Accepted
- Date: 2026-10-12 (shown large); upscaled 2026-10-13
- Amended: 2026-10-17

## Context

Every full-page plate was shown at one width, 56% of the story column. Project Aon draws most plates
one column wide (portrait, 386 px), but a few across both columns (landscape, 772 px: 12 of the 405
across Books 1-12). At 56% those came out cramped. The owner wanted the big ones to fill the page's
width without hand-checking each picture, and without stretching the small ones; then found the
portrait plates small too.

Drawn larger, Project Aon's illustrations looked soft: their files are smaller than the size they
are shown at on the iPad's screen. A trial on one of Book 2's plates compared the browser's own
enlargement, Real-ESRGAN x4plus reduced to 2x, and the line-art model at 2x: x4plus kept the lines
solid and the fine hatching; the line-art model smoothed the hatching away. The owner chose to
upscale every illustration, as WebP to save space, beside the original as the maps do, by a step in
the dashboard (2026-10-13).

## Decision

- A full-page plate that is wider than it is high spans the whole width of the story column.
- A portrait plate is shown 21em high (about 92% of the text area's height), its width following its
  shape; every portrait plate in Books 1-12 (width 0.53 to 0.71 of its height) then fits the column.
- The small pictures keep their size. The choice is made from the picture's own shape when it loads,
  never by hand per picture.
- Every illustration (`ill*.png`, `small*.png`) is upscaled to twice its own size (not to a fixed
  width): Real-ESRGAN x4plus, then LANCZOS down to exactly 2x. Saved as `<name>-2x.webp`, lossy at
  quality 80 (90 looked no different), in the book's folder beside the original, which is never
  changed.
- The player shows the WebP once the importer names it in `book.js`; a fight's picture is inked from
  its own upscaled copy (ADR 0008).
- It is checklist step 9, read from the files, with a Run button in the dashboard. Not gated: it
  downloads nothing. The dashboard's illustration sheet shows every illustration of a book, and any
  one's original beside its upscale, to compare them.

## Consequences

- `widenPlates()` in `main.js` adds `.wide` to a landscape `.vignette.full` after each `renderLeft`;
  `index.html` gives `.vignette.full` its height and `.vignette.full.wide` the column's width
  (`docs/reference/interface.md`). Do not list pictures by name to widen or shrink.
- `tools/ill_upscale.py <book>` makes the copies (skipping those newer than their original; `--force`
  redoes all). `tools/import_projectaon.py` names a section's `-2x.webp` when it exists, and
  `tools/book_status.py` reports step 9 and an import out of date while one is made but not named. The
  offline copy carries the WebP instead of the PNG, except where a fight uses the PNG. Book 2: 50
  pictures, 1.7 MB of originals to 5.5 MB. The sheet is `tools/admin/ills.html`, opened from step 9.
  See `docs/reference/dashboard.md` and `importer.md`.

## Changes

- 2026-10-12: portrait plates made 21em high instead of 56% of the column wide (about 35% larger).
- 2026-10-17: merged in 0033 (upscaled 2x; its fight-picture part went to 0008).

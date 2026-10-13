# 0033. Illustrations upscaled 2x by Real-ESRGAN, as WebP beside the originals

- Status: Accepted
- Date: 2026-10-13

## Context

Drawn larger (ADR 0031), Project Aon's illustrations looked soft: their files are smaller than the
size they are shown at on the iPad's screen. A trial on one of Book 2's plates compared the browser's
own enlargement, Real-ESRGAN x4plus (as for the maps) reduced to 2x, and the line-art model at 2x:
x4plus kept the lines solid and the fine hatching; the line-art model smoothed the hatching away. The
owner chose to upscale every illustration, as WebP to save space, beside the original as the maps do,
by a step in the dashboard.

## Decision

- Every illustration (`ill*.png`, `small*.png`) is upscaled to twice its own size (not to a fixed
  width): Real-ESRGAN x4plus, then LANCZOS down to exactly 2x.
- Saved as `<name>-2x.webp`, lossy at quality 80 (90 looked no different), in the book's folder
  beside the original, which is never changed.
- The player shows the WebP once the importer names it in `book.js`; a fight's picture is still
  inked from the original, so approved fight pictures do not change.
- It is checklist step 9, read from the files, with a Run button in the dashboard. Not gated: it
  downloads nothing.
- The dashboard's illustration sheet shows every illustration of a book, and any one's original
  beside its upscale, to compare them (2026-10-13).
- A book's fight pictures are upscaled the same way, all at once, by "Upscale fight pictures" at
  checklist step 7 (not one by one on the picture sheet): every picture its fights can show, now or
  as approved, each copy beside its source. The book's list of them, `assets/plates/upscaled/<code>.json`,
  makes the player and the sheet show the copy; `plates.json` and the approved pictures keep naming the
  originals, so nothing waits for approval, and a crop (in fractions) fits both. Adjust's "Show
  original" swaps in the picture before the upscale, to compare (2026-10-13).

## Consequences

`tools/ill_upscale.py <book>` makes them (skipping those newer than their original; `--force`
redoes all). `tools/import_projectaon.py` names a section's `-2x.webp` when it exists, and
`tools/book_status.py` reports step 9 and an import out of date while one is made but not named.
The offline copy carries the WebP instead of the PNG, except where a fight uses the PNG. Book 2:
50 pictures, 1.7 MB of originals to 5.5 MB. The sheet is `tools/admin/ills.html`, opened from step 9. Fight pictures: `ill_upscale.py --fights`, `upscaledSrc()` in `platepick.js`. See `docs/reference/dashboard.md` and `importer.md`.

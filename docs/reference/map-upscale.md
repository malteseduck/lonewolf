# Upscaling the printed maps

How each book's printed map becomes the 4K WebP the player shows: Gemini repaints it, and local
tools check the result. The player-side code this needs (fitted modal, zoom cap, canvas size) is in
`docs/plan.md`, next step 3. The checklist step is 10 in `docs/book-checklist.md`.

## Why this chain

All tried on Book 4, 2026-10-06:

| Tried | Result |
|---|---|
| Real-ESRGAN alone (`realesrgan-x4plus`) | Exact, but sharp and flat. Small lettering keeps the scan's smear inside letters such as P and A, because at 1024 px the holes in those letters are already filled. |
| Re-opening those letter holes by script | Broke other letters (T, H, A). Dropped. |
| Gemini (Nano Banana) repaint, by the owner | The look the owner wants: richer, close to the shapes. But it got about 7 labels wrong, turned the banner wing from red to blue, recoloured the lake, added a conifer forest, and swapped palm corners for orange trees. |
| Local Stable Diffusion 1.5 + ControlNet Tile (6 GB GPU) | Adds texture, not understanding: reinvented the key's symbols and the armour drawing, and turned lettering to nonsense. Far short of Gemini. |
| Pasting the faithful lettering onto Gemini's paint | Smudges where Gemini moved a label or a shore; brought the smear back where Gemini's letters were right. Dropped. |

So Gemini paints, and we only check and correct. Colour and style changes are fine if the map
stays "close enough" (owner); the labels must be right.

## The chain, per book

Files, all in `data/projectaon/<code>/` (git-ignored):

| File | What |
|---|---|
| `map.png` | The original, as Project Aon serves it (`/en/xhtml/lw/<code>/map.png`). The player shows it until `map-4k.webp` exists. Never overwrite it; if in doubt, fetch it again from that address. |
| `map-gemini-0.png` | The owner's first Gemini versions, made before this procedure (Books 1-6, 12) |
| `map-2k.png` | Real-ESRGAN of `map.png`, 2048 wide: the picture Gemini gets |
| `map-labels.json` | The label list: every label's exact wording and its box on `map-2k.png` |
| `map-gemini-<n>.png` | Gemini's output, round n, saved by the owner |
| `map-check-<n>/` | `map_check.py`'s output for round n |
| `map-4k.webp` | The result: the last good round, upscaled to 3840 wide |

1. **Upscale for Gemini**:
   `uv run --no-project --python tools/.venv/Scripts/python.exe python tools/map_upscale.py data/projectaon/<code>/map.png data/projectaon/<code>/map-2k.png --width 2048`.
   Gemini reads crisp letters better than the 1024 px scan.
2. **Label list.** EasyOCR (in `tools/.venv`, models in `data/models/easyocr`) finds each label's
   box on `map-2k.png` and drafts its wording. OCR cannot read the scan's smallest labels reliably,
   so correct every wording by eye against the map, and add any label it missed. On Book 4 it
   found 154 boxes and missed the compass N and the scale's 0. The script for this is not written
   yet (`tools/map_labels.py`).
3. **Prompt.** Written per map for the owner to paste into the Gemini app, with `map-2k.png`
   attached. Positions in words, not pixels; Gemini does not place by coordinates. Shape:
   > Repaint this fantasy map as a richer hand-painted illustration, keeping its layout: every
   > coastline, river, road, mountain range, forest and town stays where it is. Keep every label
   > exactly where it is and spell it exactly as listed here, letter for letter: (one line per
   > label: where it is, and the wording in capitals). Do not add, remove or rename any label.

   Then any colour the owner wants kept (Book 4: the banner wing is red).
4. **The owner runs it** in the Gemini app (free, about 1000 px out) and saves the result as
   `map-gemini-<n>.png`.
5. **Check.** OCR the round's labels and match them to the list by position; list every label that
   is wrong, missing or added (the matching script is to be written with step 2's). Then
   `tools/map_check.py data/projectaon/<code>/map-2k.png data/projectaon/<code>/map-gemini-<n>.png data/projectaon/<code>/map-check-<n>`
   for colour (red cells) and shape (blue cells) changes; the owner decides which of those to keep.
   For each fault, write a short edit prompt for the same Gemini chat, one change at a time:
   "Change the label MGONTAINS to MOUNTAINS. Change nothing else." Back to 4 until clean,
   usually 1-3 rounds.
6. **Upscale the last good round**: `tools/map_upscale.py ... map-gemini-<n>.png ... map-4k.webp`
   (default width 3840, WebP quality 90: about 1.3-1.8 MB).
7. **Final check**: step 5's label check on `map-4k.webp`, and a look on the comparison page.
   Then the importer points the book at `map-4k.webp` (plan step 3's code change).

## Tools

- `tools/map_upscale.py`: Real-ESRGAN (`tools/realesrgan/`, the v0.2.5.0 Windows build, git-ignored)
  in 4x passes until wide enough, then LANCZOS to the exact width. Book 4: one pass about 10 s,
  a second about 90 s on the RTX 2060.
- `tools/map_check.py`: SIFT homography of the repaint onto the faithful map (edge error about
  4 px at 4K for Gemini's Book 4), then a 48 px grid: red where the hue moved (Lab a*b* distance
  over 25; richer or darker washes of the same colour pass), blue where outlines were added or lost.
  On Book 4 the blue cells found exactly Gemini's added forest, compass and corner changes.
- A comparison page, `data/projectaon/04tcod/compare.html` (git-ignored): two panes, synced pan
  and zoom, any version in each, file sizes in the menu. Copy it to a book's folder and edit its
  file list.
- Python packages are in `tools/.venv`. This PC's TLS needs `--system-certs` for uv, and
  `truststore.inject_into_ssl()` in Python before any download.

## The Gemini API, if the hand-off gets tedious

Nano Banana 2 has no free API tier: about $0.045 an image at 0.5K up to $0.15 at 4K (third-party
figures, 2026-10). All twelve maps at about three rounds would be $2-5. It needs a key the owner
creates and puts in an environment variable; we never handle the key.

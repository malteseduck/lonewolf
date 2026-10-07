# Upscaling the printed maps

How each book's printed map becomes the 4K WebP the player shows: the place names are erased and
set again in clean type, Gemini repaints the map around them, and local tools check the result,
set again any name Gemini garbled, and upscale it. The player still repaints it in sepia
(`docs/reference/interface.md`). The checklist step is 10 in `docs/book-checklist.md`.

## Why this chain

Tried on Book 4, 2026-10-06:

| Tried | Result |
|---|---|
| Real-ESRGAN alone (`realesrgan-x4plus`) | Exact, but sharp and flat. Small lettering keeps the scan's smear inside letters such as P and A, because at 1024 px the holes in those letters are already filled. |
| Re-opening those letter holes by script | Broke other letters (T, H, A). Dropped. |
| Gemini (Nano Banana) repaint, by the owner | The look the owner wants: richer, close to the shapes. But it got about 7 labels wrong, turned the banner wing from red to blue, recoloured the lake, added a conifer forest, and swapped palm corners for orange trees. |
| Local Stable Diffusion 1.5 + ControlNet Tile (6 GB GPU) | Adds texture, not understanding: reinvented the key's symbols and the armour drawing, and turned lettering to nonsense. Far short of Gemini. |
| Pasting the faithful lettering onto Gemini's paint | Smudges where Gemini moved a label or a shore; brought the smear back where Gemini's letters were right. Dropped. |

So Gemini paints. Colour and style changes are fine if the map stays "close enough" (owner); the
labels must be right. Book 1 (eight rounds, 2026-10-06/07) then found what Gemini can and cannot
letter; see "How Book 1 got here" below.

## The chain, per book

Files, all in `data/projectaon/<code>/` (git-ignored):

| File | What |
|---|---|
| `map.png` | The original, as Project Aon serves it (`/en/xhtml/lw/<code>/map.png`). The player shows it until `map-4k.webp` exists. Never overwrite it; if in doubt, fetch it again from that address. |
| `map-gemini-0.png` | The owner's first Gemini versions, made before this procedure (Books 1-6, 12) |
| `map-2k.png` | Real-ESRGAN of `map.png`, 2048 wide |
| `map-labels.json` | The label list: every label's wording, box on `map-2k.png`, and how to treat it |
| `map-2k-erased.jpg` | `map-2k.png` with the place names erased |
| `map-2k-lettered.jpg` | The same with the place names set again in Cabin: the picture Gemini gets |
| `map-prompt-<n>.txt` | The prompt for round n |
| `map-gemini-<n>.jpg` | Gemini's output, round n, saved by the owner |
| `map-check-<n>/` | Round n's checks: `aligned.png`, `H.json`, `flags.png`, `labels.png` |
| `map-gemini-<n>-x4.png` | Real-ESRGAN 4x of the round kept |
| `map-4k.webp` | The result, 3840 wide, and `map-4k-sheet.png` beside it |
| `compare.html` | The comparison page (below) |

Commands run from the project root as
`uv run --no-project --python tools/.venv/Scripts/python.exe python tools/<script> ...`; `D` below is
`data/projectaon/<code>`.

1. **Upscale the scan**: `map_upscale.py $D/map.png $D/map-2k.png --width 2048`.
2. **Label list.** `map_labels.py draft $D/map-2k.png $D/map-labels.json` gives EasyOCR's boxes
   as a start only (on Book 1 most came back as a stray digit). Correct every wording and box by
   eye, and add what it missed. Each entry: `text` (exact, as printed), `box` [x0, y0, x1, y1],
   `where` (its place in words), `small` (hand-lettered), and `leave: true` on every *place name*.
   The title, banner and shield captions and the key are left as drawn: Gemini copied them right
   in every round. Book 1: 60 labels, 42 place names.
3. **Erase the place names**: `map_erase.py $D/map-2k.png $D/map-labels.json $D/map-2k-erased.jpg`.
   It takes each near-black shape lying mostly inside a name's box, and leaves lines running out of
   it (coasts, roads, the grid), trees and outlined shapes. Look at the result: a letter joined to a
   line survives as a fragment; `clip: true` clears that name's whole box instead (for a name on
   flat ground), and `keep: [[box]]` protects something inside a box (Book 1: a ship).
4. **Set them again**: `map_letter.py $D/map-2k.png $D/map-labels.json $D/map-2k-erased.jpg - $D/map-2k-lettered.jpg --hand "Cabin.ttf|SemiBold" --caps "Cabin.ttf|SemiBold"`.
   Each name's angle and size come from the scan's ink; small names are set 30% larger. Look at
   it and fix by hand what the measuring got wrong: `angle` (degrees), `nudge` [dx, dy], `height`
   (px), `lines` (a name stacked over lines, set level), `spread` (the scale's numbers). Book 1
   needed about 15 such fixes.
5. **Prompt**: `map_labels.py prompt $D/map-labels.json $D/map-prompt-<n>.txt --lettered`. It asks
   for a richly painted repaint (shaded mountains, dense forests, textured water), every label as
   listed, the place names kept in clean sans-serif on clear ground, and nothing added (no fruit,
   foliage or ornaments, no new trees, ships or buildings).
6. **The owner runs it** in a new Gemini chat with `map-2k-lettered.jpg` attached (about 1180 px
   out) and saves `map-gemini-<n>.jpg`.
7. **Check**: `map_check.py $D/map-2k.png $D/map-gemini-<n>.jpg $D/map-check-<n>` (alignment,
   colour and shape flags), then
   `map_labels.py check $D/map-labels.json $D/map-check-<n>/aligned.png $D/map-2k-lettered.jpg`,
   whose `labels.png` puts every label of the input beside the repaint's; read it by eye (the OCR
   diff it prints is a hint only). The owner judges the painting; a new round starts again from 5
   in a new chat. Do not use edit prompts: each edit repaints the whole picture and broke labels
   that were right (Book 1, round 4).
8. **Finish**: `map_upscale.py $D/map-gemini-<n>.jpg $D/map-gemini-<n>-x4.png --width <4x its width>`, then
   `map_letter.py $D/map-2k.png $D/map-labels.json $D/map-gemini-<n>-x4.png $D/map-check-<n>/H.json $D/map-4k.webp --only <numbers> --hand "Cabin.ttf|SemiBold" --caps "Cabin.ttf|SemiBold"`
   with the numbers of the names Gemini garbled. It warps the upscale onto the 4K frame, wipes
   Gemini's thin strokes right round where each of those names goes (all wipes before any
   drawing), sets them again, and removes Gemini's sparkle watermark. Look at
   `map-4k-sheet.png`. A correct name next to a re-set one can lose strokes to the wipe: add it to
   `--only`. Book 1: 12 names re-set.
9. **Re-import** the book (`tools/import_projectaon.py <code>`): it points `map` at
   `map-4k.webp` when that exists.

## Tools

- `tools/map_upscale.py`: Real-ESRGAN (`tools/realesrgan/`, the v0.2.5.0 Windows build, git-ignored)
  in 4x passes until wide enough, then LANCZOS to the exact width. One pass about 10 s on the RTX 2060.
- `tools/map_labels.py`: `draft` (EasyOCR boxes for a first list), `prompt` (the Gemini prompt,
  `--lettered` for step 5) and `check` (OCR hint plus the `labels.png` eye-check sheet).
- `tools/map_erase.py`: erases the `leave` labels; its `LabelInk` (which of the scan's pixels belong
  to a label) is shared with `map_letter.py`, which measures labels with it.
- `tools/map_check.py`: SIFT homography of the repaint onto `map-2k.png` (edge error 1-4 px), saved
  as `H.json`; then a 48 px grid, red where the hue moved (Lab a*b* distance over 25), blue where
  outlines were added or lost. On Book 4 the blue cells found exactly Gemini's added forest.
- `tools/map_letter.py`: sets labels in type, onto `map-2k-erased.jpg` (step 4, `-` for the warp)
  or onto a round's 4K upscale (step 8). See its docstring for every label field.
- `tools/fonts/`: Cabin (used), IM Fell English and Almendra (tried), all OFL; sources in its README.
- The comparison page, `compare.html` in a book's folder (git-ignored): two panes, synced pan and
  zoom, any version in each, file sizes in the menu. Copy Book 1's and edit its file list.
- Python packages are in `tools/.venv`. This PC's TLS needs `--system-certs` for uv, and
  `truststore.inject_into_ssl()` in Python before any download.

## How Book 1 got here

| Round | Input and prompt | Result |
|---|---|---|
| 0 | The owner's earlier try | About 17 labels wrong, mostly the small names |
| (1) | 2048 px PNG, 60-line prompt with places (4 KB) | Refused: "cannot be generated". A 1 MB JPEG and a shorter prompt went through |
| 1 | "Copy each spelling from the picture" | A near copy, which the owner found boring; 16 labels wrong |
| 2 | Asked for a rich repaint, the Book 4 look | Rich, but fruit and vines along the edges and two added shields; 11 labels wrong |
| 3 | Same, with nothing added and steady lines | The look kept; 12 small names wrong, the same ones as before |
| 4 | Round 3 plus edit prompts for those 12 | Fixed none and broke 6 that were right |
| 5 | Asked to leave out 23 labels | Kept 22 of them |
| 6 | 23 labels erased from its picture | None came back; but it painted forest where they were, and type set there at 4K was hard to read |
| 8 | All place names erased and set in Cabin first | One clean sans throughout, on clear ground; 11 small names garbled, re-set at 4K |

Also tried and dropped: copying the scan's letter strokes onto Gemini's paint by script (its letters
and trees are the same dark olive, so neither could be found cleanly), and lettering in IM Fell
English with a light halo (the owner wanted it bigger and bolder, and no halo).

## The Gemini API, if the hand-off gets tedious

Nano Banana 2 has no free API tier: about $0.045 an image at 0.5K up to $0.15 at 4K (third-party
figures, 2026-10). All twelve maps at about two rounds would be $1-4. It needs a key the owner
creates and puts in an environment variable; we never handle the key.

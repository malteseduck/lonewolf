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

The map editor, `http://localhost:8765/tools/map-editor.html` (pick the book at the top, by number, title or code) (served by `python tools/serve.py`, on this PC
only), walks through every step below in one page: a rail of the ten stages (upscale, draft, labels,
measure, lettering, erase and letter, Gemini, check, finish, import), each marked done, not done or
out of date from the files' times. It edits the labels, runs the scripts, copies the prompt and the
lettered picture for Gemini, takes the round's image back (Ctrl+V, drop or file picker), and shows a
suitable background for each stage. The command lines below are still how to run a step by hand.

In the editor each place name has two shapes. Its **box** says where the printed name is: step 3
erases the letters inside it and Measure reads them. Its **frame**, drawn round the new type, is what
gets set: drag it to move the name, its handles to resize it (the type keeps its proportions), the
round handle to turn it. Touching the frame stores the placement as `set` {`at` [x, y], `size`,
`angle`} (centre, type size in map-2k px, degrees), which overrides the measured place and `nudge`,
`height` and `angle`; "Back to measured" drops it. <kbd>E</kbd> or "Erase box" switches the handles
to the box.

Files, all in `data/projectaon/<code>/` (git-ignored):

| File | What |
|---|---|
| `map.png` | The original, as Project Aon serves it (`/en/xhtml/lw/<code>/map.png`). The player shows it until `map-4k.webp` exists. Never overwrite it; if in doubt, fetch it again from that address. |
| `map-gemini-0.png` | The owner's first Gemini versions, made before this procedure (Books 1-6, 12) |
| `map-2k.png` | Real-ESRGAN of `map.png`, 2048 wide |
| `map-labels.json` | The label list: every label's wording, box on `map-2k.png`, and how to treat it |
| `map-2k-erased.jpg` | `map-2k.png` with the place names erased |
| `map-2k-lettered.jpg` | The same with the place names set again in Cabin: the picture Gemini gets |
| `map-style.txt` | Optional: the book's own look, opening the prompt in place of the default (Book 3: snow and ice) |
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
2. **Label list.** `map_labels.py draft $D/map-2k.png $D/map-labels.json` gives OCR boxes as a
   start only. It uses PaddleOCR when `tools/.venv-paddle` exists (see `map_ocr_paddle.py`): on
   Book 4 it read about 55 of 62 labels right, slanted ones included, and missed a few small ones.
   Without it, EasyOCR (on Book 1 most came back as a stray digit). **The owner** corrects every
   wording and box by eye in the map editor, and adds what it missed (owner's call, 2026-10-07: the
   agent does not review the draft, which costs tokens on every map image it looks at; it helps
   only with names the owner asks about). Each entry: `text` (exact, as printed), `box` [x0, y0, x1, y1],
   `where` (its place in words), `small` (hand-lettered), and `retype: true` on every *place name* (erased from the scan and set again in clean type;
   the draft ticks it on every label except one worded like a label another book's list keeps as
   drawn, which catches the key and recurring captions; untick the title, banner and the rest, and
   tick any place name it caught by mistake: a few names are a place on one map and a caption on
   another). The editor groups each label's fields by the step that uses them and hides those that
   do not apply. The **Labels checked** button in step 3 marks this step done (it writes
   `map-labels-checked.txt`; drafting again removes it). A name printed over two lines that OCR read as two
   boxes is joined with **Merge** (`M` then click the other label, or Shift+click it): one label,
   its `lines` top to bottom, the box covering both. Each line is set centred, as most scans print
   them; keep a staggered name as two labels. It replaced a per-label `ok` tick on
   2026-10-07, which meant ticking every box.
   The title, banner and shield captions and the key are left as drawn: Gemini copied them right
   in every round. Book 1: 60 labels, 42 place names.
   Then **measure**: `map_measure.py $D/map-2k.png $D/map-labels.json` writes each lettered
   label's measured ink (`ink`: centre, angle, length, thickness) into the list, so the map editor's
   preview starts from what step 4 will set. Optional: no other tool reads it. Run it once the
   wording and boxes are right, and again after moving a box (the editor outlines stale ones in red).
3. **Erase the place names**: `map_erase.py $D/map-2k.png $D/map-labels.json $D/map-2k-erased.jpg`.
   It takes each near-black shape lying mostly inside a name's box, and leaves lines running out of
   it (coasts, roads, the grid), trees and outlined shapes. Look at the result: a letter joined to a
   line survives as a fragment; `clip: true` clears that name's whole box instead (for a name on
   flat ground), and `keep: [[box]]` protects something inside a box (Book 1: a ship).
4. **Set them again**: `map_letter.py $D/map-2k.png $D/map-labels.json $D/map-2k-erased.jpg - $D/map-2k-lettered.jpg --hand "Cabin.ttf|SemiBold" --caps "Cabin.ttf|SemiBold"`.
   Each name's angle and size come from the scan's ink; small names are set 30% larger. Look at
   it and fix by hand what the measuring got wrong: `angle` (degrees), `nudge` [dx, dy], `height`
   (px), `lines` (a name stacked over lines, set level), `leading` (their line spacing, 1 = the font's own), `spread` (the scale's numbers). Book 1
   needed about 15 such fixes. Since Book 3 the editor's frame does the same by dragging, as `set`.
5. **Prompt**: `map_labels.py prompt $D/map-labels.json $D/map-prompt-<n>.txt --lettered`. It opens
   with `map-style.txt` when the book has one: the default asks for forests and water, and on Book 3
   Gemini painted the snowfields as green woodland and the white sea deep teal. Write one for any map
   that is not temperate land. It asks
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
   with the numbers of the names Gemini garbled (or, leaving out `--only`, tick `reset` on them in
   the map editor, `tools/map-editor.html?book=<code>`, and untick them before the next
   round's check). It warps the upscale onto the 4K frame, wipes
   Gemini's thin strokes right round where each of those names goes (all wipes before any
   drawing), sets them again, and removes Gemini's sparkle watermark. Look at
   `map-4k-sheet.png`. A correct name next to a re-set one can lose strokes to the wipe: add it to
   `--only`. Book 1: 12 names re-set.
9. **Re-import** the book (`tools/import_projectaon.py <code>`): it points `map` at
   `map-4k.webp` when that exists.

## Tools

- `tools/map-editor.html` with `tools/serve.py`: the page that runs all of the above (endpoints in
  serve.py's docstring: `/api/map/<book>/state`, `run/<step>`, `gemini/<n>`; local requests only).
- `tools/map_upscale.py`: Real-ESRGAN (`tools/realesrgan/`, the v0.2.5.0 Windows build, git-ignored)
  in 4x passes until wide enough, then LANCZOS to the exact width. One pass about 10 s on the RTX 2060.
- `tools/map_ocr_paddle.py`: PaddleOCR's reading of a map, run by `map_labels.py` in its own venv,
  `tools/.venv-paddle` (Python 3.12, git-ignored; set-up commands in its docstring). Models in
  `~/.paddlex`.
- `tools/map_labels.py`: `draft` (OCR boxes for a first list), `prompt` (the Gemini prompt,
  `--lettered` for step 5) and `check` (OCR hint plus the `labels.png` eye-check sheet).
- `tools/map_measure.py`: measures each lettered label's ink with the same code `map_letter.py` uses and
  stores it as `ink` in `map-labels.json`, for the map editor's preview.
- `tools/map_erase.py`: erases the `retype` labels; its `LabelInk` (which of the scan's pixels belong
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

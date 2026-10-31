# Upscaling the printed maps

How each book's printed map becomes the 4K WebP the player shows: the place names are erased and
set again in clean type, Gemini repaints the map around them, and local tools check the result,
set again any name Gemini garbled, and upscale it. The player still repaints it in sepia
(`docs/reference/interface.md`). The checklist step is 8 in `docs/book-checklist.md`.

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

**The first pass** (ADR 0004; its steps in `maps/AGENTS.md`): the dashboard's Map step has "Prepare
first pass", which runs `map_review.py prepare <book>`: upscale and draft and clean where they are not
done (a list already there is neither drafted nor cleaned again), then measure, erase, letter, the
review sheets and `work/map-review-fonts.jpg`, the map's names beside each font held. The prompt
beside it hands the rest to a fresh Claude Code session: the font, the corrections, the check and the
style. The owner then finishes in the editor from the short list it leaves.

The map editor, opened only inside the import dashboard (`http://localhost:8766/tools/admin/`, a book's Map step: "Open map editor" or a map step's Open) (served by `python tools/serve.py`, on this PC
only; inside the dashboard's Map step, which picks the book and follows the files the editor changes: `docs/reference/dashboard.md`), walks through every step below in one page: a rail of the ten stages (upscale, draft, labels,
measure, lettering, erase and letter, Gemini, check, finish, import), each marked done, not done or
out of date from the files' times. It edits the labels, runs the scripts, copies the prompt and the
lettered picture for Gemini, takes the round's image back (Ctrl+V, drop or file picker), and shows a
suitable background for each stage. **Compare with** (under the background picker) shows a second
picture right of a divider dragged across the map, or the whole map while C is held, and Swap
exchanges the two: any two of the scan, the lettered picture, the rounds and the 4K map. A round's
`map-check-<n>/aligned.png` lines up with the scan exactly; Gemini's own file only roughly. The two
side trays (labels; tools and the label's fields) slide out to give the map the width, by the tabs on
the map's edges or <kbd>[</kbd> and <kbd>]</kbd>; both start slid out. The command lines below are still how to run a step by hand.

In the editor each place name has two shapes. Its **box** says where the printed name is: step 3
erases the letters inside it and Measure reads them. Its **frame**, drawn round the new type, is what
gets set: drag it to move the name, its handles to resize it (the type keeps its proportions), the
round handle to turn it. Touching the frame stores the placement as `set` {`at` [x, y], `size`,
`angle`} (centre, type size in map-2k px, degrees), which overrides the measured place and `nudge`,
`height` and `angle`; "Back to measured" drops it. <kbd>E</kbd> or "Erase box" switches the handles
to the box.

The owner's work on a map is committed, in `maps/<code>/`: `labels.json` (the label list: every
label's wording, box on `map-2k.png`, and how to treat it), `style.txt` (the book's own look, opening
the prompt in place of the default) and `labels-checked.txt` (step 3 done). Saving keeps the previous
list as `labels.json.bak` (git-ignored). Everything made from the scan is in `data/projectaon/<code>/`
(git-ignored): the scan and the finished map beside `book.js`, which names the map, and every other
step's file in its `work/` subfolder, so the book folder holds only what the importer reads and the
player loads (the map editor and `serve.py` make `work/` when a step first needs it):

| File | What |
|---|---|
| `map.png` | The original, as Project Aon serves it (`/en/xhtml/lw/<code>/map.png`). The player shows it until `map-4k.webp` exists. Never overwrite it; if in doubt, fetch it again from that address. |
| `work/map-gemini-0.png` | The owner's first Gemini versions, made before this procedure (Books 1-6, 12) |
| `work/map-2k.png` | Real-ESRGAN of `map.png`, 2048 wide |
| `work/map-2k-erased.jpg` | `map-2k.png` with the place names erased |
| `work/map-2k-lettered.jpg` | The same with the place names set again in Cabin: the picture Gemini gets, and `map-2k-lettered-sheet.png` beside it |
| `work/map-prompt-<n>.txt` | The prompt for round n |
| `work/map-gemini-<n>.jpg` | Gemini's output, round n, saved by the owner |
| `work/map-check-<n>/` | Round n's checks: `aligned.png`, `H.json`, `flags.png`, `labels.png` |
| `work/map-gemini-<n>-x4.png` | Real-ESRGAN 4x of the round kept |
| `map-4k.webp` | The result, 3840 wide; its sheet is `work/map-4k-sheet.png` |
| `work/map-names.json` | Check names' finding for each label (step 3), by wording |
| `work/map-labels-lettered.json` | The label list step 4 last lettered from, so the editor can tell which later edits matter |
| `work/compare.html` | The comparison page (below) |

Commands run from the project root as
`uv run --project tools python tools/<script> ...`; `D` below is
`data/projectaon/<code>`, `W` is `$D/work` and `L` is `maps/<code>/labels.json`.

1. **Upscale the scan**: `map_upscale.py $D/map.png $W/map-2k.png --width 2048`.
2. **Label list.** `map_labels.py draft $W/map-2k.png $L` gives OCR boxes as a
   start only. It uses PaddleOCR when `tools/.venv-paddle` exists (see `map_ocr_paddle.py`), on the
   GPU: the map is read turned to 0, ±30, ±60 and 90 degrees, at its own size and at twice it, with
   low detection thresholds, and the best read of each place kept. The box round each read is
   grown by Paddle's default unclip ratio, 1.5: at 2.0 it found no more names and its boxes were 1.3
   times the owner's on Book 6, half of them needing shrinking (2026-10-19). On Book 6 it found 57 of the
   owner's 62 labels (51 worded right), where one level pass found 51 (46); Book 7 gave 60 reads
   where that pass gave 45 (2026-10-19). Reads of one letter repeated (a pair of trees as "TT") and
   short reads on end within 80 px of the edge (the frame's ornament) are dropped: 6 on Book 7, none
   of the owner's labels on Books 3-6 and 12. What it misses is hand lettering slanted over mountains or
   trees. **Cleaning the draft**: `map_review.py clean <book>`, run by the agent before it reads the
   list (ADR 0004, "first pass"), drops reads no one could want as a name (a number away from the
   scale, another script's symbols, a letter three times over, two letters or three in lower case that
   are no word of the books), strips a symbol read onto a name, mends a word one letter off a name the
   books hold (marked `mended`: the word as read, and flagged on the sheet), and joins two lines the
   books hold as one name. On the five drafts of Books 14 and 16-19 it dropped 57 reads and none the
   lists kept, and 37 mends had 2 wrong; on the owner's checked lists with their marks taken off it
   drops nothing, joins 3 and mends 11 right names, which is why a mend is flagged. It
   leaves a label alone once it has `named` or a hand `set`. Each read keeps OCR's `slant` (degrees), which the measure below takes where the ink's own
   axis is 3 to 20 degrees off it (a road or tree in the box skews the ink; further off, OCR misread
   a short word): on Books 3-6 and 12 that halved the names set more than 3 degrees from the
   owner's hand angle. Without the venv, EasyOCR (on Book 1 most came back as a stray digit). **The owner** corrects every
   wording and box by eye in the map editor, and adds what it missed, after the agent's first pass
   (ADR 0004; `maps/AGENTS.md` has its budget); the owner may also press Find missed
   labels, below, which spends Sonnet tokens on the map, never the session's. Each entry: `text` (exact, as printed), `box` [x0, y0, x1, y1],
   `where` (its place in words), `small` (hand-lettered), and `retype: true` on every *place name* (erased from the scan and set again in clean type;
   the draft ticks it on every label except those `captions()` finds are surely not a place name
   (D8, 2026-10-15): worded like a label two other maps keep as drawn and none has as a place;
   holding a caption word (map, being, banner, arms, key, legend, scale, miles, leagues); a title's
   other lines, stacked on a line with "map" or "being" or starting "&" (and a panel caption's on
   its caption word); and a key's entries, in a column or row with two recurring ones and one step
   of the key's pitch from them. Scale numbers are not judged. Leave-one-out on Books 1-6 and 12's
   checked lists it found 64 of the 83 labels the owner left as drawn, and unticked no place
   name; what it misses is a title with none of those words (Kalte, the Stornlands) and a key entry
   in a column with fewer than two recurring ones (measured again 2026-10-17, the same: its silence
   leaves a label ticked, the safe side under ADR 0036, so no signs were added). Untick the rest, and tick any place name it
   caught by mistake. **Untick captions** in step 3 saves the list and runs the same judgement on it
   (`map_labels.py retype`), once OCR's wording is corrected: it unticks only, never ticks.
   **Find missed labels** in step 3 saves the list and runs `map_missed.py`: the map in six
   overlapping tiles, every listed box outlined in red and a 100 px grid ruled, goes to Claude Sonnet
   in one headless `claude -p` call (a one-line system prompt, no tools, run outside the project so
   no CLAUDE.md rides along), which lists the lettering outside the boxes with a rough box; each is
   tightened to the ink there and added with `found: "claude"`, outlined in purple and starred in
   the list until the owner presses Checked in its form (or deletes it). About 11-12k tokens and
   20 s a map. On a fresh draft of the checked maps (2026-10-19) it found 3 of the 8 names OCR
   missed (Book 6: 3 of 5), with one false find in five maps, and added 10 on Book 7. Needs `claude`
   signed in on this PC (`claude auth login`).
   **Check names** in step 3 saves the list and runs `map_names.py`, a script (no AI, about 4 s):
   every wording (case, hyphens and a leading "the" ignored) against an index built afresh in
   memory from every downloaded book's `book.js` and `.htm` pages and the other maps' checked
   lists, written to `work/map-names.json`. A wording is a *name* (the whole of it is in the text
   or on another checked map), *words* (each word is, not together), *near* (a word is not, but is
   close to one the books capitalise at least half the times they print it, or another checked map
   holds, after reading a digit as the letter OCR mistakes it for: 2 Z, 0 O, 5 S...) or *unknown*.
   The list marks near with `?` and unknown with `✗`; the label's form shows the suggestions (best
   first, wordings the books hold before others) to press, and **Right as it is**, which stores the
   wording as `named` so the check leaves it be until the wording changes. Map abbreviations (Mt,
   Mtns, R., St) count as words; numbers are not judged. On the checked lists of Books 3-6 and 12
   (2026-10-19) it flagged 2-11 labels a map, mostly names printed only on the map, which take
   Right as it is once.
   **Copy request for Claude** in step 3 saves the list and copies a ready request for what the
   script missed, to paste into Claude Code (the page cannot reach the agent itself); reload the
   editor after the agent has written the file. The editor groups each label's fields by the step that uses them and hides those that
   do not apply. The **Labels checked** button in step 3 marks this step done (it writes
   `maps/<code>/labels-checked.txt`; drafting again removes it). A name printed over two lines that OCR read as two
   boxes is joined with **Merge** (`M` then click the other label, or Shift+click it): one label,
   its `lines` top to bottom, the box covering both. Each line is set centred, as most scans print
   them; keep a staggered name as two labels. It replaced a per-label `ok` tick on
   2026-10-07, which meant ticking every box.
   The title, banner and shield captions and the key are left as drawn: Gemini copied them right
   in every round. Book 1: 60 labels, 42 place names.
   Then **measure**: `map_measure.py $W/map-2k.png $L` writes each lettered
   label's measured ink (`ink`: centre, angle, length, thickness) into the list, so the map editor's
   preview starts from what step 4 will set. Optional: no other tool reads it. Run it once the
   wording and boxes are right, and again after moving a box (the editor outlines stale ones in red).
   Where the ink spans under 0.4 of the box's long side (`SPAN`: a title's strip took in one tall
   letter, or a tower or palm joined to a short name left a speck), the box is measured instead,
   along OCR's `slant` or level; the measure marks it `from_box` and the editor outlines it in red
   to be looked at (Book 7: 2 of 60 after its title was unticked; none on Books 1-6 and 12).
3. **Erase the place names**: `map_erase.py $W/map-2k.png $L $W/map-2k-erased.jpg`.
   It takes each near-black shape lying mostly inside a name's box, and leaves lines running out of
   it (coasts, roads, the grid), trees and outlined shapes. Look at the result: a letter joined to a
   line survives as a fragment; `clip: true` clears that name's whole box instead (for a name on
   flat ground), `joined: true` also clears letters joined to a line running out of the box (a
   river, mountain or flagpole), with that line's ink inside the box except river outlines and
   coasts, told apart as ink with both water and land within a few px (Book 4: Holmgard, Cloeasia;
   letters out at sea have only water round them, so they go: Book 5, Bisutan). Except with `clip`,
   only the ink along the name's line of letters goes: the strip, at whatever angle, of the height
   the name's letter count gives across its box, holding the most ink, then grown while the ink goes
   on (one strip per `lines` entry). So a tight box and the right `text` matter; mountain peaks, tree
   tops, roads and symbols in the box beside the letters stay, as round a slanted name in its level
   box. A shape lying in the box and mostly in the strip is taken whole out to most of a letter's
   height again (capitals, tails); a line joined to the letters only inside the strip. A name of
   several words on one line may bend between them (Book 10, Blackshroud Trail: the strip along
   "Blackshroud" missed "Trail"), so each word of 3 letters or more is looked for again in its share
   of the line, up to 30° off it; its own strip is added where it holds 1.3 times the ink, lies at
   least a quarter on the name's line and is no more than 1.25 times as tall (else it had found the
   peaks or coast beside the word). Of the 429 names on Books 1-10 and 12, 4 changed, each only
   gaining letters (2026-10-20). Checked on the
   owner's lists of Books 4, 5, 6 and 12 (2026-10-19): of 133 keep boxes, 57 are no longer needed
   (3 before) and 66% of the ink they saved now stays without them; what still needs one lies among
   the letters (a mountain line crossing the name, a flag or tower at its end). `keep: [[box]]`
   (the editor's Add keep box, K) protects something inside a box (Book 1: a ship); a fifth number,
   `[x0, y0, x1, y1, degrees]`, turns the box clockwise round its centre (the green box's round
   knob), for something lying on a slant. Small dark
   specks ringed by a name's taken ink (a thick stroke junction read as a tree) go with it.
   A map lettered boldly (its place names' strokes over 6 px at 2k: Book 7, 7.4; Books 1-6 and 12
   are 3.8 to 5.5, and unchanged) has two of the ink tests scaled by its stroke, measured from its
   own boxes (`LabelInk.stroke`): what counts as a tree, 2.4 times the stroke, not 9 px (its letter
   junctions stayed as trees), and the window the ink is judged against, 7 times it, not 31 px (its
   packed letters darkened the window, so their cores were smeared, not taken). Nothing to set;
   map_measure, map_letter and map_missed use the same ink. Book 7 then needed `joined` on 16 names
   (touching a town, road, river or coast) and `clip` on 4 (2026-10-19).
   A letter filled solid (Book 13's hand fills R, a, e, o) is as thick as a tree, and was left as
   a black blot: a thick shape lying mostly in the name's line of letters, no bigger than twice a
   letter's height squared and black (median chroma 4 or less, grey 30 or less; trees and mountain
   shading on Books 3 and 8 are tinted) goes with the name (2026-10-21; it also took leftover blots
   on Books 6, 7 and 10, and smudges the foot of Book 1's monastery tower).
4. **Set them again**: `map_letter.py $W/map-2k.png $L $W/map-2k-erased.jpg - $W/map-2k-lettered.jpg --hand "Cabin.ttf|SemiBold" --caps "Cabin.ttf|SemiBold"` (or the font `maps/<code>/font.txt` names).
   Each name's angle and size come from the scan's ink (the angle from OCR's `slant` where the ink is a little off it, step 2); each one-line name is set at 1.05 times the map's common size (`common_size()`: the median of the
   lettered one-line names fitted to their own ink) times its own fitted size over that to the 0.6 (`PULL`: most of the way to the common size; on Books 3-6 and 12, 16 of 159 names more than 15% off the owner's hand size, where one size a map left 44), unless fitted over 1.25 times it (a title or
   region keeps its own; ADR 0004), and the editor's preview does the same. Look at
   it and fix by hand what the measuring got wrong: `angle` (degrees), `nudge` [dx, dy], `height`
   (px), `lines` (a name stacked over lines, set level), `leading` (their line spacing, 1 = the font's own), `spread` (the scale's numbers). Book 1
   needed about 15 such fixes. Since Book 3 the editor's frame does the same by dragging, as `set`.
   **The review sheets**: `map_review.py sheet <book>` writes `work/map-review-<n>.jpg`, each set name's
   scan crop beside its lettered crop, flagged names first and framed in red, and
   `work/map-review-overview.jpg`, the whole map with every box. `--flagged` leaves out the rest, for
   the check after a correction pass. It prints the flagged indexes:
   `overlap` (touches another name's type), `over` (on what the map kept), `left` (ink stays in its box
   after the erase), `size` (far from the printed name's length, or 1.3 times the map's usual height),
   `off` (away from the printed name), `none` (could not be set), `mended`. It uses the Letter step's
   own placement (`map_letter.masks`). With the fixes on Books 15, 18 and 19 taken off it flagged 9 of the
   11 names fixed by eye; the other two show on the full sheet unflagged. It flags 4 to 18 names a map on
   Books 14-19, and 24 of 48 on Book 7, lettered as boldly as it is.
5. **Prompt**: `map_labels.py prompt $L $W/map-prompt-<n>.txt --lettered`. It opens
   with `maps/<code>/style.txt` when the book has one: the default asks for forests and water, and on Book 3
   Gemini painted the snowfields as green woodland and the white sea deep teal (Book 5: the desert
   came back green). Every book 1-12 has one since 2026-10-08, written from its map, key and text
   (each region's ground, trees as drawn, what must not appear); read it before a book's first round.
   For a new book, `map_labels.py style $L` (the dashboard's "Draft style", once the labels are
   checked) writes a first `style.txt` where there is none or only its draft: the map's title (the
   labels `captions()` reads as one) and a stock sentence for each kind of ground the key names
   (desert, wastelands, snow and ice, volcanoes, marsh, salt lakes, oases, rock spires, mountains,
   hills, plains, forest, lakes), around the default's look. Its first line, `# DRAFT by
   tools/map_labels.py style`, names any key entry it had no sentence for; lines starting `#` are
   left out of the prompt, and the dashboard counts the style done once that line is deleted. The
   regions' own ground and what must not appear are the agent's to add (the map's Copy prompt). It asks
   for a richly painted repaint (shaded mountains, dense forests, textured water), every label as
   listed, the place names kept in clean sans-serif on clear ground (or as `font.txt`'s second line
   describes them), every object already drawn kept in place, the woods free to be filled out, and no
   feature added (no fruit, foliage or ornaments, no new castles, towers, towns, buildings, ruins,
   creatures or ships). It names no ship or compass rose: Book
   12 has neither, and naming them got it two ships in round 1.
   A map drawn as rows of small identical mountain symbols comes back as those symbols recoloured
   (Book 12, round 1): its `style.txt` asks for continuous sculpted ranges over the same ground
   instead, and names what the map does not have.
6. **The owner runs it** in a new Gemini chat with `map-2k-lettered.jpg` attached (about 1180 px
   out) and saves `map-gemini-<n>.jpg`.
7. **Check**: `map_check.py $W/map-2k.png $W/map-gemini-<n>.jpg $W/map-check-<n>` (alignment,
   colour and shape flags), then
   `map_labels.py check $L $W/map-check-<n>/aligned.png $W/map-2k-lettered.jpg`,
   whose `labels.png` puts every label of the input beside the repaint's; read it by eye (the OCR
   diff it prints is a hint only). The owner judges the painting; a new round starts again from 5
   in a new chat. Do not use edit prompts: each edit repaints the whole picture and broke labels
   that were right (Book 1, round 4).
8. **Finish**: `map_upscale.py $W/map-gemini-<n>.jpg $W/map-gemini-<n>-x4.png --width <4x its width>`, then
   `map_letter.py $W/map-2k.png $L $W/map-gemini-<n>-x4.png $W/map-check-<n>/H.json $D/map-4k.webp --sheet $W/map-4k-sheet.png --only <numbers> --hand "Cabin.ttf|SemiBold" --caps "Cabin.ttf|SemiBold"`
   with the numbers of the names Gemini garbled (or, leaving out `--only`, tick `reset` on them in
   the map editor (in the dashboard), and untick them before the next
   round's check). With nothing ticked reset it sets no place name again, only the `fix` labels:
   an upscale only, Gemini's names standing; `--all` (the Finish step's "Set every place name
   again", unchecked by default) sets every one again, which leaves doubled names wherever Gemini
   moved one (Book 12, round 3; ADR 0004). The step says which it will do. It warps the upscale onto the 4K frame, wipes
   Gemini's thin strokes right round where each of those names goes (all wipes before any
   drawing), sets them again, and removes Gemini's sparkle watermark. Look at
   `map-4k-sheet.png`. A correct name next to a re-set one can lose strokes to the wipe: add it to
   `--only`. Book 1: 12 names re-set.
9. **Re-import** the book (`tools/import_projectaon.py <code>`): it points `map` at
   `map-4k.webp` when that exists.

## Tools

- `tools/map-editor.html` with `tools/serve.py`: the page that runs all of the above, opened from the dashboard only (endpoints in
  serve.py's docstring: `/api/map/<book>/state`, `run/<step>`, `gemini/<n>`; local requests only).
  Its colours are the dashboard's (2026-10-08); the label outlines stay bright to read over any map.
  Its steps and the dashboard's jobs share one lock: one runs at a time.
- `tools/map_upscale.py`: Real-ESRGAN (`tools/realesrgan/`, the v0.2.5.0 Windows build, git-ignored)
  in 4x passes until wide enough, then LANCZOS to the exact width. One pass about 10 s on the RTX 2060.
- `tools/map_ocr_paddle.py`: PaddleOCR's reading of a map (turned and doubled passes, merged), run
  by `map_labels.py` in its own venv, `tools/.venv-paddle` (Python 3.12, the GPU build, git-ignored;
  set-up commands in its docstring, or the dashboard's Setup). Models in `~/.paddlex`.
- `tools/map_missed.py`: step 3's Find missed labels (above): tiles, Claude's answer, boxes fitted to
  the ink. Prints counts and tokens, never wordings.
- `tools/map_names.py`: step 3's Check names (above): the books' word index, each wording's
  finding and suggestions. Prints counts and label indexes, never wordings.
- `tools/map_labels.py`: `draft` (OCR boxes for a first list), `retype` (untick what is surely not
  a place name on the corrected list), `style` (a first `style.txt`), `prompt` (the Gemini prompt,
  `--lettered` for step 5) and `check` (OCR hint plus the `labels.png` eye-check sheet).
- `tools/map_measure.py`: measures each lettered label's ink with the same code `map_letter.py` uses and
  stores it as `ink` in `labels.json`, for the map editor's preview.
- `tools/map_erase.py`: erases the `retype` labels; its `LabelInk` (which of the scan's pixels belong
  to a label, only along its line of letters) is shared with `map_letter.py`, which measures labels
  with it.
- `tools/map_review.py`: the agent's first pass: `prepare` and `fonts` (above, "The first pass"), `clean` (step 2) and `sheet` (step 4). Prints
  counts and label indexes, never wordings.
- `tools/map_check.py`: SIFT homography of the repaint onto `map-2k.png` (edge error 1-4 px), saved
  as `H.json`; then a 48 px grid, red where the hue moved (Lab a*b* distance over 25), blue where
  outlines were added or lost. On Book 4 the blue cells found exactly Gemini's added forest.
- `tools/map_letter.py`: sets labels in type, onto `map-2k-erased.jpg` (step 4, `-` for the warp)
  or onto a round's 4K upscale (step 8). See its docstring for every label field.
- `tools/fonts/`: Cabin (used), Darkland Hand (Books 11-13, our own), Darkland Serif (Book 9, our own), Architects Daughter, IM Fell
  English and Almendra (tried), all OFL; sources in its README.
- `tools/map_font.py`: builds Darkland Hand and Darkland Serif (Thin, Light, Regular, Bold each) into `tools/fonts/`. Darkland Serif uses the same nib, still angular, with rounded-diamond bowls (only C, G and c round), an angular S with a round bottom, stronger contrast, a serif at each end of a long steep stroke (an exit flick on a lower-case foot) and closer spacing, after Book 9's calligraphic hand. Darkland Hand: each
  letter a few straight strokes drawn with a chisel nib, after the hand of Books 12 and 13's maps
  (the drawing, the squash, width and spacing are constants at its top). Run it again after
  changing a letter, then Letter.
- `maps/<code>/font.txt`: line 1 names a file in `tools/fonts/`, the font that map's names are
  set in, honoured by every step (ADR 0004). The dashboard's Letter and Finish steps pass it to `map_letter.py` as `--hand` and `--caps`,
  and the editor's preview draws in it; with no file, Cabin SemiBold. An optional line 2 describes
  the lettering for the Gemini prompt in place of "clean sans-serif type" (Book 12: hand-lettered
  in an even felt pen, in angular, runic-looking letters). Book 12's map is lettered by hand
  in angular chisel strokes, so it has `DarklandHand-Regular.ttf` (Thin from 2026-10-16, Regular the same day: Thin looked faint beside the repaint), drawn for it after no
  free font matched (Architects Daughter before it, tried against Patrick Hand, Kalam, Neucha and
  Comic Neue on 2026-10-10; Norse and runic fonts on 2026-10-16). Its names' hand-set sizes were
  scaled then so each spans the printed name's length. Book 9's map has `DarklandSerif-Regular.ttf` (2026-10-20), drawn for it: Darkland Hand with the serifs of its broad-pen hand. Books 14 and 15 have Darkland Hand Regular; Books 16-19 have none, so Cabin (2026-10-30; ADR 0004).
- The comparison page, `work/compare.html` in a book's folder (git-ignored): two panes, synced pan and
  zoom, any version in each, file sizes in the menu. Copy Book 1's and edit its file list (the scan
  and the finished map are `../map.png` and `../map-4k.webp` from there).
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

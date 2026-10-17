# The import dashboard

`http://localhost:8766/tools/admin/`, served by `python tools/serve.py`, on this PC only (its API
refuses other machines, even when the server is bound to the LAN). One page for every book's way from
Project Aon into the player: where each book stands, a button for each step that is a script, the
map editor inline, and a ready prompt for each step that needs Claude Code. Built 2026-10-08.

## The page

- **The grid**: every downloaded book; those not downloaded are folded below (download only). Each book
  is offered every step that can work for it (ADR 0039): test play and registering the item table need
  the engine to have the book's series (`book_status.engine_series()`, the keys of `LW.SERIES`), so a
  Grand Master book has neither yet, its item table stopping at "read and checked". One column per step, grouped as in `docs/book-checklist.md`. Each cell is
  a seal: done, not yet, a warning (stale, or the files and the marks disagree), failed, or not
  needed. The number under a cell is what is left (todos, enemies with no picture, the map's stage).
  "Next" is the first step not done. The icon over each column says who does it: a cog (a script),
  a hand (the owner), a quill (Claude Code).
- **A book** (click its row): every step with its evidence, where it came from (the files, or a hand
  mark), and its buttons: **Run** for a script, **Copy prompt** for an agent step, **Mark done** for a
  hand step, links to the player, the test address and the picture sheet. Under it, the map's own
  steps, as the map editor's rail shows them. Clicking a step's cell scrolls the panel to that step
  and lights it briefly (the map and picture cells open their editor inline instead).
- **The map editor** opens under the grid, full width (the Map cell, "Open map editor", or any
  map step's Open): the same `tools/map-editor.html`, with `?embed=1`, which hides its book picker
  (the dashboard chose the book) and tells the dashboard when its files change, so the grid follows.
  Closing it asks first if it has unsaved label edits. It opens only here (ADR 0021): at its own address it
  shows only a line pointing to the dashboard.
- **The picture sheet** ("Open picture sheet" at step 7), inline under the grid like the map editor and
  only there (`tools/admin/fights.html` at its own address shows only a line pointing to the dashboard). Every kind of enemy in the book with
  the picture the player would show (the same choice as `nextFoe()` in `main.js`), inked as in a
  fight, the sections it is fought in and where the picture comes from. Checklist step 7, after the
  agent's work: the owner looks here and marks it. It opens
  inline under the grid like the map editor (Open picture sheet here, `?embed=1`; the step 7 cell
  only goes to that step's line in the book's list), and on its own. A picture file dropped, pasted or chosen on a card becomes that enemy's
  picture, and so does one by its address (dragged from another site, pasted, or By address...: the server fetches it);
  a new picture asks for its link, or No link (ADR 0038), and Link... gives one to a picture already in `art/`; Adjust crops any card's picture, flips it left to right and sets levels, with the fight panel previewed as it will look (and, for a picture shown from its 2x copy, Show original to compare);
  Remove takes the owner's entry away. Each save redraws the cards and the "with none" count, and the
  dashboard's grid follows. The rules for the entry: `docs/reference/items.md`, "Fight pictures".
- **The illustration sheet** ("Open illustration sheet" at step 9), inline under the grid like the
  others and only there (`tools/admin/ills.html`): every `ill*` and `small*` picture of the book on
  a card, with the sections it is in, marked "not upscaled" until its `-2x.webp` is made, and the
  sizes before and after in its top line. Clicking a card shows the original and the upscale side
  by side at one size; "1:1" draws both at the upscale's own pixels (the original stretched by the
  browser, as the player would) and the two scroll together; the arrow keys go to the next picture.
  It only looks: nothing on it changes a file.
- **Setup** (ADR 0036), above the tools: what the tools need on this PC, from `tools/setup.py`. One line
  while everything is there ("Show" opens it); a row per part, open, while any is missing: uv and
  Node (yours to install), the Python packages (`tools/.venv`, from `tools/pyproject.toml` and `uv.lock`), the npm
  packages, Real-ESRGAN and the map OCR (downloads: gated), the books (a count; each downloaded from
  its row) and `art/` (git-ignored: how many pictures are here, with a link, with none, not asked yet; those missing
  that have a link in `art/sources.json` are fetched again by **Download...**, gated; the rest copied from the old checkout). A missing
  part that a script can install has **Install** (or **Download...**, gated).
- **Whole-project tools**: the offline check, check everything (`check_all.py`), the release.
- **The job log** at the foot: a job's output line by line while it runs. A job started in another
  tab, or before a reload, is followed too.

## Status

`tools/book_status.py` works every step out; the page reads it through `GET /api/admin/status`.

| Step | From | Done when |
|---|---|---|
| 1 Download | files | `sect*.htm` and `gamerulz.htm` in `data/projectaon/<code>/` |
| 2 Import | files | `book.js` there, no broken links, no section without a way on. A warning when it is out of date: the importer or a source page is newer than the last import (`import-report.json`, written every run), or `map-4k.webp` is not named yet |
| 3 Phrasings | hand | marked in `docs/book-status.json`. Until then it shows the leftover scan (`phrasings.json`, from `phrasings_scan.py --json`): not scanned, out of date (older than `book.js` or the importer), N sections to look at (by id), or none left, a warning: the owner's to mark. Once marked, the scan's line is shown beside the mark |
| 4 Rules | both | a `### Book N,` heading in `rules-books.md` and a hand mark. Beside it, the rules diff (`rules-diff.json`, from `rules_diff.py --json`): not diffed, out of date (older than a rules page or the script), or N paragraphs to read against the book before (the number under the cell while there is no addendum) |
| Reading copy | files | `reading.txt` and `items-reading.txt` newer than `book.js` (not a checklist step) |
| 5 Item table | files | `items-<code>.js` registered in `main.js` `ITEM_TABLES`, and `check-items.json` (from `check_items.mjs --json`) clean and newer than the table and `book.js`. A table that still starts with the draft's line (`// DRAFT by tools/items_draft.mjs`) is not done, however clean |
| 6 Test play | hand | marked. Until then it shows the walk (`walk.json`, from `walk_book.mjs --json`): not walked, out of date (older than `book.js`, the item table or the engine), N sections to look at (by id), or nothing to look at with how many sections were reached; the play-through and its mark stay the agent's. Once marked, the walk's line is shown beside the mark |
| 7 Fight pictures | both | every enemy in `book.js` has a plate of its own or a `plates.json` match (the importer's "0 with none", worked out afresh, so a new `plates.json` entry counts at once), and the owner's hand mark once they have looked at the sheet. All pictured but not marked is a warning (saying how many are the script's picks, `draft` entries not yet adjusted or removed). Marking it done pins every fight's picture (`assets/plates/approved/<code>.json`, `plates_pin.mjs --approve`); unmarking lets them go. A fight that would now show another picture (a `plates.json` change, a re-import) is a warning naming its sections, with **Approve picture changes...** (gated); until then the player keeps the approved picture. The owner's own change on the sheet re-pins that enemy at once. The sheet says once, in its top line, whether the book is approved ("all approved <date>", "N wait for your approval", "not approved yet"); only a card waiting for approval is marked (a badge, showing the new picture), with "Show only these" to hide the rest |
| 8 Map | files | `map-4k.webp` made and named by `book.js` |
| 9 Illustrations | files | every `ill*.png` and `small*.png` has its `-2x.webp` beside it (`ill_upscale.py`), and `book.js` names them (a warning, and the import out of date, until a re-import does) |

`docs/book-status.json` (committed) holds only the hand marks: `{"books": {"<code>": {"<step>":
"<date>"}}}`. The checklist's table is generated from all of this (`book_status.py checklist`, run
by every mark), so there is one source; edit the files or the marks, never the table.

### Marking a step

```sh
python tools/book_status.py done <book> <step>     # book: code or number; step: 1-9
python tools/book_status.py undo <book> <step>     # a hand mark only
python tools/book_status.py show <book>            # every step with its evidence
python tools/book_status.py                        # one line per book
```

For a hand step `done` records today's date (step 4 only once the addendum's heading exists, step 7
only once every enemy has a picture and every picture its fights can show has an up-to-date 2x copy
listed in `assets/plates/upscaled/<code>.json`). For a
step read from the files it checks them instead (step 5 runs `check_items.mjs --json` first) and
exits 1 naming what is missing. Every copy-prompt but step 7's ends with this command, so an agent marks its own
step; step 7 is the owner's to mark, from the page, after looking at the sheet (its prompt has the
agent run `show` instead).

## Server: `/api/admin/*` in `tools/serve.py`

| Request | Does |
|---|---|
| `GET status` | `book_status.all_status()`, and the job running |
| `POST run/<stage>?book=<code or number>` | starts a job; `{"confirm": "<code>"}` in the body for a gated stage (`"all"` for re-import all), else 428 |
| `GET setup` | `setup.status()`: `[{id, label, what, state: ok\|missing\|info, detail, install, gated, size}]` |
| `GET jobs` | the last ten jobs (in memory; gone when the server restarts) |
| `GET jobs/<id>?from=<n>` | a job's state, exit code and lines from n; the page polls it every 0.8 s |
| `POST mark/<book>/<step>` (`?undo=1`) | `book_status.mark()` |
| `POST picture-url` | `{url}`: the picture at an address, or the one its page names (`og:image`), fetched by `tools/art_sources.py`: `{type, data}` (base64); the page shrinks and saves it as a dropped file |
| `POST art-link` | `{src, url}` (`url` null: no link): the link of a picture already in `art/`, into `art/sources.json` |
| `GET ills?book=<code>` | the illustration sheet's list, `ill_upscale.listing()`: `[{name, bytes, big, bigBytes, sections}]`, file names, sizes and section ids only |
| `POST plate` | the picture sheet: `{book, enemy, image?, link?, crop?, levels?, flip?, remove?}` (`image` base64 WebP, up to 25 MB): the owner's picture for one enemy, saved as `art/plates/<book>/<slug of the name>.webp` (never a path from the request) and entered in `plates.json` by `tools/plates_file.py`, which keeps the file's one-entry-per-line layout; `link` (an address, or null for none) recorded in `art/sources.json` with a new picture |

The stages are a fixed table, `ADMIN_STAGES`: the command is built from it and a code from
`book_status.CATALOGUE`, never from the request. One job at a time, sharing the map editor's lock,
so a map step and a dashboard job never run together (409 while busy; each side shows what runs).

| Stage | Runs | Gated |
|---|---|---|
| `fetch` | `fetch_projectaon.py <code>` | yes: a download |
| `fetch-rules` | `fetch_projectaon.py <code> --rules` | yes: a download |
| `add-book` | `add_book.py <code>`: a downloaded book the importer does not know gets its `BOOKS` entry ("Add to importer", beside the new-book prompt) | |
| `import` | `import_projectaon.py <code>` (books the importer knows) | yes, every time: it rewrites `book.js` |
| `reading` | `reading_copy.py <code>`, then `item_sections.py <code>` | |
| `map-style` | `map_labels.py style maps/<code>/labels.json`: a first `style.txt` from the label list's title and key (map-upscale.md, step 5), never over the book's own ("Draft style" in the map's steps, once the labels are checked) | |
| `phrasings-scan` | `phrasings_scan.py <code> --json`: step 3's leftover scan (importer.md, "The leftover scan"), written to `phrasings.json` beside the book ("Scan phrasings", once imported) | |
| `rules-diff` | `rules_diff.py <code> --json`: step 4's diff (below, Scripts), written to `rules-diff.json`, `rules-diff.txt` and `rules-draft.md` beside the book ("Diff rules", once the rules pages are on disk) | |
| `walk` | `node walk_book.mjs <code> --json`: step 6's walk (rules-engine.md, "The walk"), written to `walk.json` beside the book ("Walk the book", once imported) | |
| `items-draft` | `node items_draft.mjs <code>`: step 5's draft (items.md, "The draft"); with a table already there, only `items-draft.js` beside the book and the comparison | |
| `check-items` | `node check_items.mjs <code> --json` | |
| `approve-pictures` | `node plates_pin.mjs <code> --approve` | gated: the owner's approval of changed fight pictures |
| `pictures-draft` | `ill_index.py`, then `plates_draft.py <code>`: step 7's draft (items.md, "The draft"), a `plates.json` entry marked `draft` for each enemy with no picture that it can match; shown while any has none ("Draft pictures") | |
| `fights-up` | `ill_upscale.py --fights <code>` (step 7's Upscale 2x: every picture the book's fights can show, now or approved; about 5-10 s a picture) | |
| `ills` | `ill_upscale.py <code>` (Real-ESRGAN on this PC; about 3 s a picture) | |
| `offline` | `offline_check.py` | |
| `check` | `check_all.py` (re-imports every book, ADR 0022) | |
| `release` | `release.py` (the last commit to the iPad, docs/reference/offline.md) | yes |
| `setup-venv`, `setup-npm` | `setup.py install venv` (`uv sync --project tools`), `install npm` (`npm ci`); through `uv run --no-project`, so that setup.py reports what is missing rather than uv installing it first | |
| `setup-realesrgan` | `setup.py install realesrgan`: the v0.2.5.0 Windows zip from GitHub (about 45 MB); only the program, its DLLs and `models/` are written into `tools/realesrgan/` | yes: a download |
| `setup-art` | `art_sources.py fetch`: every picture in `art/sources.json` with a link and no file here, fetched again and shrunk to 2000 px as the sheet does (through the venv: Pillow) | yes: a download |
| `setup-ocr` | `setup.py install ocr`: `tools/.venv-paddle` (Python 3.12) with PaddleOCR (about 1 GB) | yes: a download |

**Gated stages** open a dialog first: the book, what is fetched or rewritten (about 400 files, 4 MB
for a download), and for an import the dates (when `book.js` was made, the newest source page, when
the importer last changed, `map-4k.webp`) and whether the import is out of date; then a tick "I
approve" before the button works. The release dialog shows, from `GET /api/admin/release`
(`release.py --status`), the commit to release, the one released now, the commits between and how
many files have uncommitted changes (left out). The server refuses the run without the confirmation. This makes
the step deliberate, not secure: **an agent driving the browser never presses a gated button**;
downloads and imports still need the owner's word (AGENTS.md).

## Scripts behind it

- `tools/book_status.py`: above.
- `tools/setup.py`: what a checkout needs (above, Setup); `setup.py` lists it, `--json` as the page
  reads it, `install <part>` installs one, `install all` the venv and the npm packages (a fresh
  checkout's first step, before the server can run from tools/.venv: AGENTS.md, Run it).
- `python tools/add_book.py <code>`: a book the importer does not know is added to its `BOOKS` table
  (ADR 0036): number, series and title from `book_status.CATALOGUE`, one line before the table's
  closing brace. Writes the importer only, imports nothing; refuses a book already there or not in the
  catalogue. The new-book prompt has the agent check the rules pages for what the entry cannot
  supply (discipline, rank and Lore-circle names).
- `tools/import_projectaon.py` also writes `data/projectaon/<code>/import-report.json`: the figures
  its report prints, counts and ids only.
- `tools/reimport_all.py [book ...]`: re-imports every imported book (or those named) and compares
  the figures before and after (from `book.js` and `import-report.json`): worse is more broken links,
  sections with no way on or enemies with no picture, or fewer sections; anything else that moved is
  listed. Where `book.js` changed, or the reading copy or item check is older than it, it makes the
  reading copy again and re-runs `check_items.mjs --json`; item-check errors count as worse. Exits 1
  if any book got worse. Run after any importer change.
- `python tools/phrasings_scan.py <code>`: step 3's scan of what the importer left as text (ADR 0036;
  `docs/reference/importer.md`, "The leftover scan"); `--json` also writes `phrasings.json` beside the book. Kinds and
  section ids only.
- `python tools/rules_diff.py <code>`: step 4's diff (ADR 0036): each rules page against the previous
  book's, paragraph by paragraph (same, changed with the numbers that moved, new, gone; the footnotes
  and errata are the book's own and not compared). `--json` writes beside the book `rules-diff.json`
  (the figures), `rules-diff.txt` (the changed and new paragraphs, old and new, for the agent) and
  `rules-draft.md`, a skeleton addendum: what reads with certainty from its usual shape (the gold, "a
  Random Number" plus N in the Gold Crowns paragraph; the kit, the list above "List the N items you
  choose"; the footnotes' section ids), every other line and every Engine line a todo. Page names,
  paragraph numbers and figures only on the console.
- `node tools/walk_book.mjs <code>`: step 6's walk of the book with the engine, two stand-in characters (ADR 0036;
  `docs/reference/rules-engine.md`, "The walk"); `--json` also writes `walk.json` beside the book. Section ids, counts and
  the engine's own reasons only.
- `node tools/items_draft.mjs <code>`: step 5's draft of the item table (ADR 0036; `docs/reference/items.md`,
  "The draft"). Writes `items/items-<code>.js` only where there is none, else `items-draft.js` beside the
  book, compared with the table; counts and section ids only.
- `python tools/plates_draft.py <code>`: step 7's draft of the fight pictures (ADR 0035, 0036; `docs/reference/items.md`,
  "Fight pictures", "The draft"). `--dry` prints only; `--compare` drafts a book whose pictures are set afresh, without
  its own entries, and counts how often it picks the same picture. Names and file names only.
- `python tools/map_labels.py retype|style maps/<code>/labels.json`: the map's two drafts (D8, ADR 0036;
  `docs/reference/map-upscale.md`, steps 2 and 5): `retype` unticks what is surely not a place name
  (the map editor's Untick captions, step 3), `style` writes a first `style.txt` marked as a draft,
  which the map's "Style for the prompt" shows as the agent's until its first line is deleted.
  Label numbers and reasons only on the console.
- `node tools/check_items.mjs <code> --json` also writes `check-items.json` beside the book.
- `python tools/offline_check.py --json` prints its figures as one JSON object.
- `tools/check_all.py`: `npm test` and pytest beside `reimport_all.py`; once the re-import is done,
  together, `check_items.mjs --json` for every book with an item table, `plates_pin.mjs --all --json`
  (pictures waiting for approval are a note, not a failure) and `offline_check.py`. A line as each
  step ends, the tail of a failed one's output; exits 1 on any failure. About 6 s. The syntax check
  is now each suite's parse test (ADR 0022).

## The prompts

`tools/admin/prompts.js`, one per agent step: phrasings (3), rules addendum (4), item table (5, and
a fix prompt when `check_items` reports errors), test play-through (6), fight pictures (7), the map's
style and its retype ticks, and a new book the importer does not know. Each is pasted into a fresh
Claude Code session in the project, which loads AGENTS.md by itself, so a prompt does not repeat its
rules: it gives the book, the figures the dashboard has (counts only, never the books' words), the
procedure's file, and the `book_status.py done` line. Where a step has a script (ADR 0036), its prompt
says the script's output is a head start, not the whole job: the agent judges it, makes its own pass
for what the script cannot know, and fixes what it finds in the importer or the table, never by
widening the script for one book's case. Change a procedure, change its prompt.

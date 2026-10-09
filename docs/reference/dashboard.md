# The import dashboard

`http://localhost:8765/tools/admin/`, served by `python tools/serve.py`, on this PC only (its API
refuses other machines, even when the server is bound to the LAN). One page for every book's way from
Project Aon into the player: where each book stands, a button for each step that is a script, the
map editor inline, and a ready prompt for each step that needs Claude Code. Built 2026-10-08.

## The page

- **The grid**: books 1-12 (13-20, Grand Master, folded below: download only, since the engine has
  no Grand Master rules), one column per step, grouped as in `docs/book-checklist.md`. Each cell is
  a seal: done, not yet, a warning (stale, or the files and the marks disagree), failed, or not
  needed. The number under a cell is what is left (todos, enemies with no picture, the map's stage).
  "Next" is the first step not done. The icon over each column says who does it: a cog (a script),
  a hand (the owner), a quill (Claude Code).
- **A book** (click its row): every step with its evidence, where it came from (the files, or a hand
  mark), and its buttons: **Run** for a script, **Copy prompt** for an agent step, **Mark done** for a
  hand step, links to the player, the test address and the picture sheet. Under it, the map's own
  steps, as the map editor's rail shows them.
- **The map editor** opens under the grid, full width (the Map cell, "Open map editor here", or any
  map step's Open): the same `tools/map-editor.html`, with `?embed=1`, which hides its book picker
  (the dashboard chose the book) and tells the dashboard when its files change, so the grid follows.
  Closing it asks first if it has unsaved label edits. It still works on its own at its own address.
- **The picture sheet**, `tools/admin/fights.html?book=<code>`: every kind of enemy in the book with
  the picture the player would show (the same choice as `nextFoe()` in `main.js`), inked as in a
  fight, the sections it is fought in and where the picture comes from. Checklist step 7. It opens
  inline under the grid like the map editor (the step 6 or 7 cell, or Open picture sheet here;
  `?embed=1`), and on its own. A picture file dropped, pasted or chosen on a card becomes that enemy's
  picture; Adjust crops any card's picture and sets levels, with the fight panel previewed as it will look;
  Remove takes the owner's entry away. Each save redraws the cards and the "with none" count, and the
  dashboard's grid follows. The rules for the entry: `docs/reference/items.md`, "Fight pictures".
- **Whole-project tools**: the offline check, re-import all and compare, the syntax check.
- **The job log** at the foot: a job's output line by line while it runs. A job started in another
  tab, or before a reload, is followed too.

## Status

`tools/book_status.py` works every step out; the page reads it through `GET /api/admin/status`.

| Step | From | Done when |
|---|---|---|
| 1 Download | files | `sect*.htm` and `gamerulz.htm` in `data/projectaon/<code>/` |
| 2 Import | files | `book.js` there, no broken links, no section without a way on. A warning when it is out of date: the importer, a source page or `map-4k.webp` is newer than `book.js` |
| 3 Phrasings | hand | marked in `docs/book-status.json` |
| 4 Rules | both | a `### Book N,` heading in `rules-books.md` and a hand mark |
| Reading copy | files | `reading.txt` and `items-reading.txt` newer than `book.js` (not a checklist step) |
| 5 Item table | files | `items-<code>.js` registered in `main.js` `ITEM_TABLES`, and `check-items.json` (from `check_items.mjs --json`) clean and newer than the table and `book.js` |
| 6 Fight pictures | files | every enemy in `book.js` has a plate of its own or a `plates.json` match (the importer's "0 with none", worked out afresh, so a new `plates.json` entry counts at once) |
| 7, 8, 9 | hand | marked |
| 10 Map | files | `map-4k.webp` made and named by `book.js` |

`docs/book-status.json` (committed) holds only the hand marks: `{"books": {"<code>": {"<step>":
"<date>"}}}`. The checklist's table is generated from all of this (`book_status.py checklist`, run
by every mark), so there is one source; edit the files or the marks, never the table.

### Marking a step

```sh
python tools/book_status.py done <book> <step>     # book: code or number; step: 1-10
python tools/book_status.py undo <book> <step>     # a hand mark only
python tools/book_status.py show <book>            # every step with its evidence
python tools/book_status.py                        # one line per book
```

For a hand step `done` records today's date (step 4 only once the addendum's heading exists). For a
step read from the files it checks them instead (step 5 runs `check_items.mjs --json` first) and
exits 1 naming what is missing. Every copy-prompt ends with this command, so an agent marks its own
step; the owner marks only what is theirs (7, 9), from the page.

## Server: `/api/admin/*` in `tools/serve.py`

| Request | Does |
|---|---|
| `GET status` | `book_status.all_status()`, and the job running |
| `POST run/<stage>?book=<code or number>` | starts a job; `{"confirm": "<code>"}` in the body for a gated stage (`"all"` for re-import all), else 428 |
| `GET jobs` | the last ten jobs (in memory; gone when the server restarts) |
| `GET jobs/<id>?from=<n>` | a job's state, exit code and lines from n; the page polls it every 0.8 s |
| `POST mark/<book>/<step>` (`?undo=1`) | `book_status.mark()` |
| `POST plate` | the picture sheet: `{book, enemy, image?, crop?, levels?, remove?}` (`image` base64 WebP, up to 25 MB): the owner's picture for one enemy, saved as `art/plates/<book>/<slug of the name>.webp` (never a path from the request) and entered in `plates.json` by `tools/plates_file.py`, which keeps the file's one-entry-per-line layout |

The stages are a fixed table, `ADMIN_STAGES`: the command is built from it and a code from
`book_status.CATALOGUE`, never from the request. One job at a time, sharing the map editor's lock,
so a map step and a dashboard job never run together (409 while busy; each side shows what runs).

| Stage | Runs | Gated |
|---|---|---|
| `fetch` | `fetch_projectaon.py <code>` | yes: a download |
| `fetch-rules` | `fetch_projectaon.py <code> --rules` | yes: a download |
| `import` | `import_projectaon.py <code>` (books the importer knows) | yes, every time: it rewrites `book.js` |
| `reading` | `reading_copy.py <code>`, then `item_sections.py <code>` | |
| `check-items` | `node check_items.mjs <code> --json` | |
| `offline` | `offline_check.py` | |
| `syntax` | `syntax_check.py` | |
| `reimport-all` | `reimport_all.py` | yes |

**Gated stages** open a dialog first: the book, what is fetched or rewritten (about 400 files, 4 MB
for a download), and for an import the dates (when `book.js` was made, the newest source page, when
the importer last changed, `map-4k.webp`) and whether the import is out of date; then a tick "I
approve" before the button works. The server refuses the run without the confirmation. This makes
the step deliberate, not secure: **an agent driving the browser never presses a gated button**;
downloads and imports still need the owner's word (AGENTS.md).

## Scripts behind it

- `tools/book_status.py`: above.
- `tools/import_projectaon.py` also writes `data/projectaon/<code>/import-report.json`: the figures
  its report prints, counts and ids only.
- `tools/reimport_all.py [book ...]`: re-imports every imported book (or those named) and compares
  the figures before and after (from `book.js` and `import-report.json`): worse is more broken links,
  sections with no way on or enemies with no picture, or fewer sections; anything else that moved is
  listed. Exits 1 if any book got worse. Run after any importer change.
- `node tools/check_items.mjs <code> --json` also writes `check-items.json` beside the book.
- `python tools/offline_check.py --json` prints its figures as one JSON object.
- `tools/syntax_check.py`: `node --check` on every `.js`/`.mjs` (an ES module through a `.mjs`
  copy in a temporary folder, which catches a `const` declared twice) and `py_compile` on every `.py`,
  skipping `data/`, `art/`, `node_modules/` and the venvs. Exits 1 on any failure.

## The prompts

`tools/admin/prompts.js`, one per agent step: phrasings (3), rules addendum (4), item table (5, and
a fix prompt when `check_items` reports errors), fight pictures (6), test play-through (8), the map's
style and its retype ticks, and a new book the importer does not know. Each is self-contained: the
hard rules, the book, the figures the dashboard has (counts only, never the books' words), the
procedure's file, and the `book_status.py done` line. Change a procedure, change its prompt.

# Lone Wolf player

A personal-use player for the Lone Wolf gamebooks, styled after *Lone Wolf HD Remastered*.
Plain HTML/CSS/JS, no build step, no dependencies to install.

Read `docs/spec.md` before changing behaviour. It is the statement of intent.
`docs/reference/` describes the code as it is.

## What is live

The player is the page at the project root: `index.html`, `main.js`, `plates.js`, `maps.js`
(it began as "prototype D", the Tome). `prototypes/` holds three earlier experiments the owner
rejected (A and B "feel like kid games", C is 3D, which is not wanted). Leave them working but do
not extend them. `shared/` is used by all of them, so check A-C still load after changing it.

## Run it

```sh
python tools/serve.py
```

Then open http://localhost:8765/. It is `http.server` plus the backups API (`backups/`, git-ignored;
see Storage in `docs/reference/architecture.md`). `.claude/launch.json` has the same
server as `lone-wolf` for the preview tools. It must be served: `main.js` is an ES module.

The import dashboard is http://localhost:8765/tools/admin/ (this PC only): every book's steps, the
script steps' buttons, the map editor inline, and a prompt for each agent step
(`docs/reference/dashboard.md`). Never press its gated buttons (download, import, re-import all):
those are the owner's go-ahead.

To serve it to other devices on the home network (the "lan" server; `lone-wolf-lan` in
`.claude/launch.json`):

```sh
python tools/serve.py 8765 --bind 0.0.0.0
```

Then open `http://<the PC's LAN address>:8765/` on the device (`ipconfig` shows it). Plain HTTP, so
no service worker and no offline copy; for that, see `docs/reference/offline.md`.
`python tools/offline_check.py` prints what the offline copy would hold (sizes, largest files) and
exits 1 if the page names a file that is missing; run it after adding or moving a file the page loads.

There are no automated tests and no linter. `python tools/syntax_check.py` runs `node --check` on
every script and `py_compile` on the Python. Plain `node --check` on a root `.js` file misses a
`const` declared twice, so the script checks each ES module through a `.mjs` copy (do the same by
hand: copy the file to a `.mjs` name in the scratchpad).

## Verify a change

Drive the page in the browser and look at it. For reaching a particular state, the page exposes a
console hook:

```js
__lw.game            // the LW.Game in play: .hero, .s (state), .book, .go(id)
__lw.render()        // redraw after changing state by hand
__lw.BOOKS           // add a stand-in book here to test rules without real text
__lw.begin(id, fresh, anew)
```

`__lw.game.go('17'); __lw.render()` jumps to a section. Using this overwrites the owner's save for
that book, so clear the keys you dirtied afterwards (see `docs/reference/architecture.md`) and say so.

## Saving tokens: hand menial work to a Sonnet subagent

The owner pays for every token. Work that needs no judgement goes to a subagent on the cheaper
model (Agent tool, `model: "sonnet"`), not to the main model: running the importer or a checker and
reporting its figures, re-importing books after an importer change, copying or renaming files,
downloading files the owner has already approved, `node --check` / `py_compile` runs, applying an
edit already decided down to the exact text, measuring image sizes or crops by script, git
add/commit of finished work. Give it the exact commands, paths and what to report back, and the
hard rules below that touch the task (no book prose in output, no downloads not approved). Keep on
the main model: deciding what to change, reading the books' rules, design and layout, judging
pictures by eye, and anything the owner is waiting to discuss. Do not split a small step off when
explaining it would cost more than doing it.

## Hard rules

- **No book content in the repository or in your output.** Project Aon's text and images live in
  `data/projectaon/` (git-ignored) and nowhere else. Do not paste section text into code,
  comments, docs, commit messages or chat. When inspecting imported data, print counts and ids,
  not prose.
- **Downloading a book needs the owner's go-ahead for that download.** Books 1-12 are fetched
  (2-12 on 2026-10-01, for their art; not imported yet). Ask, naming the books and rough size,
  before running `tools/fetch_projectaon.py` for any other. Importing a book is a separate step;
  ask before importing 2-12 too.
- **No real-time 3D, no pixel art, no bright flat colour.** See spec section 6.6.
- **Automate only what is certain.** If a rule cannot be read reliably from the text, leave it as
  text and rely on the by-hand controls (spec principle 2 and 3).
- **Mark a finished book step** with `python tools/book_status.py done <book> <step>` (the checklist's
  number) and report what it prints; it says NOT done, and why, if the files disagree.
- **The books' rules** are in `docs/reference/rules-books.md`, read from their rules pages (in our
  words, numbers as printed). Check a rule there before implementing it, and keep its Engine column
  true when the engine changes.

## Conventions

- Code in `shared/` is classic scripts hanging functions on a global `LW` (except `ink.js`). The
  player's own code at the root is ES modules. Do not add a bundler or a framework.
- Everything inside the book is sized in `em` off `--bw` (book width), so the whole spread scales
  with the window. Do not use px for anything inside `.book`.
- All colour comes from the CSS custom properties at the top of `index.html`.
- No plain geometric shapes: the owner finds them stark. Use real image assets, or vector drawing
  detailed enough to pass for the engraved art beside it. Images
  in the repo must be free to redistribute (CC0 or similar; say where they came from, as
  `assets/icons/README.txt` does). Project Aon images stay in `data/projectaon/` and are
  only restyled at runtime. Downloading a new asset pack needs the owner's go-ahead.
- **The map is the book's own printed map**, restyled at runtime (`maps.js`). The owner dropped
  the custom maps on 2026-10-05: no replicas, made-up places, town plans or travel on the map.
  Their symbols are kept in git-ignored `art/reference/map-symbols/from-game/`.
- **Our own work about a book is committed; the book is not.** Item tables are `items-<code>.js`;
  a map's label list, repaint style and step marks are in `maps/<code>/`. Anything copied or made
  from Project Aon's text or images (reading copies, upscales, repaints, prompts) stays in
  `data/projectaon/<code>/`.
- **A book's items** (what each section gives, takes, or needs) are read and written by hand in
  `items-<code>.js`, following `docs/reference/items.md`. Where the text leaves
  the choice to the player, write a `todo`, never a guess. Every fight needs a picture: the same
  page says where to find one.
- Art borrowed for personal use (Lone Wolf HD screenshots and the like) lives in `art/`, which is
  git-ignored except `art/manifest.json`. Reference images (fan maps) live in git-ignored
  `data/reference/`, with their sources in `SOURCES.txt`. Never move either anywhere committed.
- HTML is built as template strings. Pass every piece of book or user text through `esc()`.
- Comments say why, briefly. Match the density of the file you are in.

## Lore

The Lone Wolf fandom wiki, https://lonewolf.fandom.com/wiki/ (one page per character, creature,
place and book, e.g. `/wiki/Zahda`), is a good source for what things look like and who they are:
use it when searching for a fight picture, and to clarify a passage whose meaning is unclear. It is
fan-written (CC BY-SA): the book's own text wins where they differ, rules still come from the rules
pages (`docs/reference/rules-books.md`), and its text is not copied into the repository either.

## Things that will bite you

- **Shell heredocs have silently truncated files here** when the content contained certain quote
  patterns. Write files with the Write tool, or write a patch script to the scratchpad and run it.
- Python's server in its default HTTP/1.0 mode cut files over ~510 KB short on Windows (the old
  "connection reset on first load"). `tools/serve.py` speaks HTTP/1.1, which fixes it; plain
  `python -m http.server` still has it.
- Over HTTPS (Tailscale) or at an address with `?offline`, the page is served by the service worker's
  copy and changes appear only after its sync and a reload (docs/reference/offline.md). On
  `http://localhost:8765/` there is no service worker.
- The browser console keeps errors from earlier page loads. Confirm an error is current before
  chasing it.
- Re-run `python tools/import_projectaon.py <book>` after changing the importer; the page loads
  the generated `data/projectaon/<book>/book.js`, not the HTML.

## Docs

| File | Holds |
|---|---|
| `docs/spec.md` | Intent: purpose, principles, game rules, presentation. Change it when the owner changes their mind. |
| `docs/reference/architecture.md` | File map, load order, state, storage keys |
| `docs/reference/book-format.md` | The book data model, field by field |
| `docs/reference/rules-engine.md` | How the rules are implemented and where |
| `docs/reference/importer.md` | The downloader and importer: what is parsed and how |
| `docs/reference/interface.md` | The interface: pages, panels, map, combat, art pipeline |
| `docs/reference/offline.md` | Playing offline on the iPad: Tailscale setup, the service worker, updates |
| `docs/reference/items.md` | The procedure for a book's item table and its fight pictures: reading, icons, checks |
| `docs/reference/map-upscale.md` | Upscaling the printed maps: Gemini repaint, label list, checks, Real-ESRGAN to 4K WebP |
| `docs/reference/rules-books.md` | The books' rules: common, Kai, Magnakai, and an addendum per book; what the engine applies |
| `docs/reference/dashboard.md` | The import dashboard (`tools/admin/`): its status rules, `book_status.py`, the `/api/admin` jobs, the prompts |
| `docs/book-checklist.md` | Every step each book goes through; its table is generated. **Check it before starting work on a book. When a step is finished, run `python tools/book_status.py done <book> <step>`**: it records a hand step, checks a step read from the files, and rewrites the table. Never edit the table by hand. |
| `docs/plan.md` | Work outside the book steps (engine gaps, notes for later), decisions made, what the player can do. **Read this first in a new session.** Where each book stands is the dashboard's, not this file's. |

Keep them current: a change to behaviour updates the matching reference file in the same piece of
work, and `plan.md` when work outside the book steps moves between done and not done.

# Lone Wolf player

A personal-use player for the Lone Wolf gamebooks, styled after *Lone Wolf HD Remastered*.
Plain HTML/CSS/JS, no build step, no dependencies to install.

Read `docs/spec.md` and the index in `docs/adr/README.md` before changing behaviour, art, or a
tool's output, and the rulings in `docs/adr/rulings.md` for the area you touch (a book's readings
before working on that book). The spec is the statement of intent, design, and architecture; the
ADRs (one per topic) and rulings (one line each) are the owner's decisions, and they are binding:
never reverse or work around one without the owner's say-so in chat. When the owner decides
something, record it in the same piece of work (rules in `docs/adr/README.md`): amend the topic's
ADR in place if it has one (a reversal too: there are no superseded records), add a ruling if it is
small, a new ADR only for a topic none covers. Change the spec too if the intent/design/architecture
itself changed. When you record a decision, search `docs/spec.md` for its subject and bring any
sentence it contradicts into line. Cite them as "ADR NNNN" or "ruling Rn". The spec says what
a thing must achieve, not details of how it looks, is laid out, or implementation details: that belongs in an ADR or the reference.
`docs/reference/` describes the code as it is.

## What is live

The player is the page at the project root: `index.html`, `main.js`, `plates.js`, `maps.js`
(it began as "prototype D", the Tome). `prototypes/` and the `shared/` files only they use
(`art.js`, `battle.js`, `flow.js`, `book-demo.js`) are historical (ADR 0002): do not read, mention,
run, check or change them. A change to `shared/` is checked against the player only.

The devices are the iPad, mainly, and the PC; phones are not supported (ruling R12).

## Run it

**Every Python run goes through uv**, the project's tools and one-off scripts alike, never plain
`python` or the venv's own exe: `python tools/x.py` in this file means
`uv run --project tools python tools/x.py`, from the project root. Tell subagents the
same. `tools/` is a uv project (ADR 0037): its packages are in `tools/pyproject.toml`, their exact
versions in `tools/uv.lock`, its venv is `tools/.venv`, and `uv run --project tools` installs what
the lock says before running. Add a package with `uv add --project tools <name>`, never `uv pip install`.
(`tools/setup.py` alone runs with `--no-project`, so it reports what is missing instead.)

```sh
python tools/serve.py
```

On a fresh checkout, `uv run --no-project python tools/setup.py install all` installs the venv and
the npm packages (`setup.py` alone lists what is there); the dashboard's Setup panel does the same
and the downloads. Then open http://localhost:8766/. It is `http.server` plus the backups API (`backups/`, git-ignored;
see Storage in `docs/reference/architecture.md`). `.claude/launch.json` has the same
server as `lone-wolf` for the preview tools. It must be served: `main.js` is an ES module.

The import dashboard is http://localhost:8766/tools/admin/ (this PC only): every book's steps, the
script steps' buttons, the map editor inline, and a prompt for each agent step
(`docs/reference/dashboard.md`). Never press its gated buttons (download, import, re-import all):
those are the owner's go-ahead.

To serve it to other devices on the home network (the "lan" server; `lone-wolf-lan` in
`.claude/launch.json`):

```sh
python tools/serve.py 8766 --bind 0.0.0.0
```

Then open `http://<the PC's LAN address>:8766/` on the device (`ipconfig` shows it). Plain HTTP, so
no service worker and no offline copy; for that, see `docs/reference/offline.md`.
`python tools/offline_check.py` prints what the offline copy would hold (sizes, largest files) and
exits 1 if the page names a file that is missing; run it after adding or moving a file the page loads.

Unit tests (ADR 0022) guard the main functionality: Vitest for the JavaScript in `tests/js/`, pytest
for the Python tools in `tests/py/`, a couple of seconds each. Run both before committing.

- **Test first (TDD)**: for a new rule or behaviour, write the failing test that states it, then the
  code that makes it pass, then tidy. A bug fix starts with a test that shows the bug.
- **New core or main functionality gets new tests in the same piece of work**: a new rule the engine
  applies, a new thing the importer reads, a new tool or dashboard job, a new item-table field. A
  change to existing main functionality updates its tests. Say in the report which tests were added.
- **Test the main paths and the higher-level behaviour**, as the player or the owner would see it
  (a section's choices open or closed, a fight's result, a book imported with its gates, a backup
  saved and listed), not every function call or every line. One test that drives a whole path beats
  several that each check a helper. No tests for drawing details, wording or prototype-only code.

Tests use stand-in data of their own, never book text, need
neither `data/projectaon/` nor the network, and start no server. Each suite also parses every
script of its language (`parse.test.js`, `test_parse.py`), which is the syntax check.

```sh
npm test
uv run --project tools python -m pytest
```

(`npm install` once for Vitest; pytest is in `tools/.venv`.) There is no linter.

`uv run --project tools python tools/check_all.py` (the dashboard's "Check everything") puts the real books through every
script, and both suites alongside (about 6 s): re-import every book against its last report, every item table's
check, the approved fight pictures, the offline copy. Run it after changing the importer, an item
table or anything the books' data goes through.

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

## Saving tokens: hand mechanical work to a Sonnet subagent (ADR 0041)

The owner pays for every token, and the point of a subagent is to spend fewer of them. Before
handing work off, weigh it: a subagent starts cold, so the brief, its own reading and its report all
cost tokens. Hand it off when the work is mechanical and big enough that the cheaper model doing it
costs less than the main model doing it: many tool calls, long output to wade through, or a job
whose result can be reported in a few lines. Do it yourself when it is a call or two, when you
already hold the context it needs, or when writing the brief would take about as long as the work.

Mechanical means the agent only needs it done, not decided: running the importer or a checker and
reporting its figures, re-importing books after an importer change, copying or renaming files,
downloading files the owner has already approved, `node --check` / `py_compile` runs, applying an
edit already decided down to the exact text, measuring image sizes or crops by script, git
add/commit of finished work, a broad search whose answer is a list of places. Use the Agent tool
with `model: "sonnet"`. Give it the exact commands, paths and what to report back (figures and ids,
not dumps), and the hard rules below that touch the task (no book prose in output, no downloads not
approved, Python through uv). Keep on the main model: deciding what to change, reading the books'
rules, design and layout, judging pictures by eye, and anything the owner is waiting to discuss.

## Separate sessions: when to start one, on which model (ADR 0041)

Start a new session when the owner asks for work on a different topic from this session's, or when
a piece of work turns out to be independent of it (another book, another tool, a fix spotted in
passing), rather than piling it into this session's context. Keep a quick thing (a question, one
edit, a few tool calls) here. Pick the model by the work, as for subagents: Sonnet for mechanical or
well-specified work, Opus where it needs judgement (design, reading the books' rules, judging art).
Give it a brief that stands on its own: the files, what done looks like, the hard rules that touch it.

## Separate sessions work in a worktree (ADR 0041)

A new session started for a separate piece of work (not this one's own task) runs in its own git
worktree, on its own branch, never in the main checkout. It commits only when the owner asks; when it
does, it also merges the branch back into `main` with any conflicts resolved (both sides' changes kept, then `npm test` and
`uv run --project tools python -m pytest` run again on the result); the worktree's session does the
merge itself (in the app, its `sync_with_base_branch` brings `main` in first). Nothing is pushed and
no release is made: those stay the owner's call.

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
- **Our own work about a book is committed; the book is not.** Item tables are `items/items-<code>.js`;
  a map's label list, repaint style and step marks are in `maps/<code>/`; what each picture and enemy
  is, in our own words, is in `about/` (never 8 of the book's words in a row: `tools/about_check.py`);
  a fight picture made with AI from a text prompt alone moves to `assets/plates/` (ADR 0042). Anything copied or made
  from Project Aon's text or images (reading copies, upscales, repaints, prompts) stays in
  `data/projectaon/<code>/`.
- **A book's items** (what each section gives, takes, or needs) are read and written by hand in
  `items/items-<code>.js`, following `docs/reference/items.md`. Where the text leaves
  the choice to the player, write a `todo`, never a guess. Every fight needs a picture: the same
  page says where to find one.
- Art borrowed for personal use (Lone Wolf HD screenshots and the like) lives in `art/`, which is
  git-ignored except `art/manifest.json` and `art/sources.json` (each picture's link, ADR 0038). Reference images (fan maps) live in git-ignored
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
- The iPad (Tailscale) is served the last *release* (`python tools/serve.py --release` on 8765, always running, started with Windows), not
  the working copy: a change reaches it only after a commit and `python tools/release.py`, which is
  the owner's call. Over HTTPS or at an address with `?offline`, the page is served by the service
  worker's copy and changes appear only after its sync and a reload (docs/reference/offline.md). On
  `http://localhost:8766/` there is no service worker.
- The browser console keeps errors from earlier page loads. Confirm an error is current before
  chasing it.
- Re-run `python tools/import_projectaon.py <book>` after changing the importer; the page loads
  the generated `data/projectaon/<book>/book.js`, not the HTML.

## Docs

| File | Holds |
|---|---|
| `docs/spec.md` | Intent: purpose, principles, game rules, presentation. Change it when the owner changes the intent. |
| `docs/adr/` | The owner's decisions, binding: an ADR per topic, its index grouped by topic in `README.md`; small decisions and book readings as one-line rulings in `rulings.md`. Every change, a reversal included, amends the record in place (dated in its Changes list); a new ADR only for a new topic. |
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
| `docs/plan.md` | Work not yet done outside the book steps (engine gaps, what is not yet checked, notes for later), in order. **Read this first in a new session.** Not what the player does (that is `docs/reference/`) nor where each book stands (the dashboard's). |

Keep them current: a change to behaviour updates the matching reference file in the same piece of
work; when work in `plan.md` is finished, take it out of `plan.md` (the reference file records it).

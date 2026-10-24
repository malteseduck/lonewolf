# Lone Wolf player

A personal-use player for the Lone Wolf gamebooks, styled after *Lone Wolf HD Remastered*.
Plain HTML/CSS/JS, no build step, no dependencies to install.

Before changing behaviour, art, or a tool's output, read `docs/spec.md` (intent), the index in
`docs/adr/README.md` and the rulings in `docs/adr/rulings.md` for the area you touch (a book's
readings before working on that book). ADRs and rulings are the owner's decisions and binding: never
reverse or work around one without the owner's say-so in chat. When the owner decides something,
record it in the same piece of work, as `docs/adr/README.md` says, and bring any sentence of the spec
it contradicts into line. Cite them as "ADR NNNN" or "ruling Rn". `docs/reference/` describes the
code as it is.

## What is live

The player is the page at the project root: `index.html`, `main.js`, `plates.js`, `maps.js` and their
modules. `prototypes/` and the `shared/` files only they use (`art.js`, `battle.js`, `flow.js`,
`book-demo.js`) are historical (ADR 0002): do not read, mention, run, check or change them. A change
to `shared/` is checked against the player only. The devices are the iPad, mainly, and the PC;
phones are not supported (ruling R12).

## Run it

**Every Python run goes through uv** (ADR 0037), tools and one-off scripts alike, never plain
`python` or the venv's exe: `python tools/x.py` in this file means
`uv run --project tools python tools/x.py`, from the project root. Tell subagents the same. Add a
package with `uv add --project tools <name>`, never `uv pip install`.

`python tools/serve.py` serves http://localhost:8766/ (`lone-wolf` in `.claude/launch.json`); it
must be served, as `main.js` is an ES module. The import dashboard is
http://localhost:8766/tools/admin/ (`docs/reference/dashboard.md`). Never press its gated buttons
(download, import, re-import all): those are the owner's go-ahead. Run `python tools/offline_check.py`
after adding or moving a file the page loads.

## Tests (ADR 0022)

```sh
npm test
uv run --project tools python -m pytest
```

Run both before committing. Test first: a new rule or behaviour starts with the failing test that
states it, a bug fix with a test that shows the bug. New main functionality (an engine rule, an
importer reading, a tool or dashboard job, an item-table field) gets tests in the same piece of work;
say in the report which. Test the main paths as the player or owner would see them, not every
helper. Tests use stand-in data of their own, never book text, and need neither
`data/projectaon/` nor the network nor a server.

`python tools/check_all.py` (the dashboard's "Check everything") puts the real books through every
script and both suites: run it after changing the importer, an item table, `about/`, or anything the
books' data goes through.

## Verify a change

Drive the page in the browser and look at it. The console hook reaches a particular state:

```js
__lw.game            // the LW.Game in play: .hero, .s (state), .book, .go(id)
__lw.render()        // redraw after changing state by hand
__lw.BOOKS           // add a stand-in book here to test rules without real text
__lw.begin(id, fresh, anew)
```

`__lw.game.go('17'); __lw.render()` jumps to a section. It overwrites the owner's save for that book:
clear the keys you dirtied (`docs/reference/architecture.md`, Storage) and say so.

## Subagents and sessions (ADR 0041)

The owner pays for every token. Hand work to a Sonnet subagent (`model: "sonnet"`) when it is
mechanical and big enough that it costs less there: running the importer or a checker and reporting
figures, re-imports, copying files, approved downloads, applying an edit already decided, broad
searches whose answer is a list. Give it exact commands, paths, what to report (figures and ids, not
dumps) and the hard rules that touch it. Keep on the main model: deciding what to change, reading the
books' rules, design, judging pictures, and anything the owner is waiting to discuss.

Work on a different topic, or independent of this session's, goes to a new session with a brief that
stands on its own, Sonnet or Opus by the work as above. It runs in its own worktree and branch,
commits only when the owner asks, then merges into `main` itself (conflicts resolved keeping both
sides, both suites run again). Nothing is pushed or released: that is the owner's call.

## Hard rules

- **No book content in the repository or in your output.** Project Aon's text and images live in
  `data/projectaon/` (git-ignored) and nowhere else. Do not paste section text into code, comments,
  docs, commit messages or chat. When inspecting imported data, print counts and ids, not prose.
- **Downloading a book needs the owner's go-ahead for that download**, naming the books and rough
  size; importing one is a separate ask. Which books are downloaded and imported is in
  `docs/book-checklist.md` and on the dashboard.
- **No real-time 3D, no pixel art, no bright flat colour** (spec 6.6).
- **Automate only what is certain.** A rule that cannot be read reliably from the text stays text,
  with the by-hand controls (spec principles 2 and 3).
- **Mark a finished book step** with `python tools/book_status.py done <book> <step>` and report what
  it prints; it says NOT done, and why, if the files disagree.
- **The books' rules** are in `docs/reference/rules-books.md`. Check a rule there before implementing
  it, and keep its Engine column true when the engine changes.

## Conventions

- Code in `shared/` is classic scripts hanging functions on a global `LW` (except `ink.js`); the
  player's code at the root is ES modules. No bundler, no framework.
- Everything inside `.book` is sized in `em` off `--bw`, never px. All colour comes from the CSS
  custom properties at the top of `index.html`.
- No plain geometric shapes: use real image assets, or drawing detailed enough to pass beside the
  engraved art. Images in the repo must be free to redistribute, with their source noted (as
  `assets/icons/README.txt` does). A new asset pack needs the owner's go-ahead.
- **The map is the book's own printed map**, restyled at runtime (`maps.js`; ADR 0004): no replicas,
  made-up places, town plans or travel on it.
- **Our own work about a book is committed; the book is not** (ADR 0042). Item tables in `items/`,
  map label lists and styles in `maps/<code>/`, our descriptions in `about/` (never 8 of the book's
  words in a row: `tools/about_check.py`), AI-made fight pictures in `assets/plates/`. Anything copied
  or made from Project Aon's text or images stays in `data/projectaon/<code>/`.
- **A book's items** are read and written by hand in `items/items-<code>.js`, following
  `docs/reference/items.md`; where the text leaves the choice to the player, a `todo`, never a guess.
  Every fight needs a picture: the same page says where to find one.
- Borrowed art lives in git-ignored `art/` (its links in `art/sources.json`, ADR 0038), reference
  images in git-ignored `data/reference/`. Never move either anywhere committed.
- HTML is built as template strings. Pass every piece of book or user text through `esc()`.
- Comments say why, briefly. Match the density of the file you are in.

## Lore

The Lone Wolf fandom wiki, https://lonewolf.fandom.com/wiki/ (e.g. `/wiki/Zahda`), is good for what
things look like and who they are, when searching for a fight picture or for an unclear passage. It
is fan-written (CC BY-SA): the book wins where they differ, rules come from `rules-books.md`, and its
text is not copied into the repository.

## Things that will bite you

- **Shell heredocs have silently truncated files here.** Write files with the Write tool, or write a
  patch script to the scratchpad and run it.
- Plain `python -m http.server` cuts files over ~510 KB short on Windows; `tools/serve.py` (HTTP/1.1)
  does not.
- The iPad is served the last *release* (port 8765, ruling R13), not the working copy; a release is the
  owner's call. Over HTTPS or with `?offline` the service worker's copy is served
  (`docs/reference/offline.md`); localhost:8766 has none.
- The browser console keeps errors from earlier page loads. Confirm an error is current first.
- Re-run `python tools/import_projectaon.py <book>` after changing the importer: the page loads the
  generated `book.js`, not the HTML.

## Docs

| File | Holds |
|---|---|
| `docs/plan.md` | Work not yet done outside the book steps, in order. **Read this first in a new session.** |
| `docs/book-checklist.md` | Every step each book goes through; generated, never edited by hand. Check it before working on a book. |
| `docs/spec.md` | Intent: purpose, principles, game rules, presentation |
| `docs/adr/` | The owner's decisions: an ADR per topic (index in `README.md`), small ones in `rulings.md` |
| `docs/reference/architecture.md` | File map, load order, state, storage keys |
| `docs/reference/book-format.md` | The book data model, field by field |
| `docs/reference/rules-engine.md` | How the rules are implemented and where |
| `docs/reference/rules-books.md` | The books' rules, per series and per book; what the engine applies |
| `docs/reference/importer.md` | The downloader and importer |
| `docs/reference/interface.md` | The interface: pages, panels, map, combat, art pipeline |
| `docs/reference/items.md` | A book's item table and its fight pictures |
| `docs/reference/map-upscale.md` | Upscaling the printed maps |
| `docs/reference/dashboard.md` | The import dashboard, `book_status.py`, the jobs, the prompts |
| `docs/reference/offline.md` | Playing offline on the iPad |

A change to behaviour updates the matching reference file in the same piece of work; finished work
leaves `plan.md`. This file holds instructions only, never state (what is imported, timings, dates):
that belongs in the files above (ruling R21).

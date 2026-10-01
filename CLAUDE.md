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
python -m http.server 8765 --bind 127.0.0.1
```

Then open http://localhost:8765/. `.claude/launch.json` has the same
server as `lone-wolf` for the preview tools. It must be served: `main.js` is an ES module.

There are no automated tests and no linter. `node --check <file>` catches syntax errors, but on
the root `.js` files it misses a `const` declared twice; copy the file to a `.mjs` name in the
scratchpad and check that to catch it.

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

## Hard rules

- **No book content in the repository or in your output.** Project Aon's text and images live in
  `data/projectaon/` (git-ignored) and nowhere else. Do not paste section text into code,
  comments, docs, commit messages or chat. When inspecting imported data, print counts and ids,
  not prose.
- **Downloading a book needs the owner's go-ahead for that download.** Books 2-12 have not been
  fetched. Ask, naming the books and rough size, before running `tools/fetch_projectaon.py`.
- **No real-time 3D, no pixel art, no bright flat colour.** See spec section 6.6.
- **Automate only what is certain.** If a rule cannot be read reliably from the text, leave it as
  text and rely on the by-hand controls (spec principle 2 and 3).
- Numbers marked "(verify)" in the spec are from memory. Do not present them as checked.

## Conventions

- Code in `shared/` is classic scripts hanging functions on a global `LW` (except `ink.js`). The
  player's own code at the root is ES modules. Do not add a bundler or a framework.
- Everything inside the book is sized in `em` off `--bw` (book width), so the whole spread scales
  with the window. Do not use px for anything inside `.book`.
- All colour comes from the CSS custom properties at the top of `index.html`.
- No plain geometric shapes: the owner finds them stark. Use real image assets, or vector drawing
  detailed enough to pass for the engraved art beside it (as `buildings.js` does). Images
  in the repo must be free to redistribute (CC0 or similar; say where they came from, as
  `assets/map/WIDMAN-README.txt` does). Project Aon images stay in `data/projectaon/` and are
  only restyled at runtime. Downloading a new asset pack needs the owner's go-ahead.
- **A book's travel on the map** is made by hand, step by step, in `docs/reference/map-places.md`.
  The importer reports where a book stands on it; follow it for every new book.
- **Map symbols** look engraved, like the Widman set: sepia ink only, no colour, no rim. For a
  new map feature, first reuse what exists: a Widman stamp (`mountain range forest tree`; its settlement stamps do
  not match the official icons) or a building in `buildings.js` (`castle monastery tower keep house
  temple obelisk bridge`). If neither fits, add a vector drawing to `buildings.js` the same way (see
  "Map symbols" in `docs/reference/interface.md`). Never cut symbols out of map images: at their
  resolution they come out blurred and carry stray colour.
- Art borrowed for personal use (Lone Wolf HD screenshots and the like) lives in `art/`, which is
  git-ignored except `art/manifest.json`. Reference images (fan maps) live in git-ignored
  `data/reference/`, with their sources in `SOURCES.txt`. Never move either anywhere committed.
- HTML is built as template strings. Pass every piece of book or user text through `esc()`.
- Comments say why, briefly. Match the density of the file you are in.

## Things that will bite you

- **Shell heredocs have silently truncated files here** when the content contained certain quote
  patterns. Write files with the Write tool, or write a patch script to the scratchpad and run it.
- The local server sometimes resets a connection on first load. Reload before debugging.
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
| `docs/reference/map-places.md` | The procedure for putting a book on the map: places, layout, checks |
| `docs/plan.md` | State of the work, decisions made, what is waiting on the owner, next steps. **Read this first in a new session.** |

Keep them current: a change to behaviour updates the matching reference file in the same piece of
work, and `plan.md` when something moves between done and not done.

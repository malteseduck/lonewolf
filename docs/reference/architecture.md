# Architecture

How the code is laid out today. Intent lives in `docs/spec.md`.

## File map

```
index.html                  the player: markup, all CSS, script tags
main.js                     ES module: state, rendering, input, combat, title page
plates.js                   ES module: ink creatures, inkPlate (restyles an illustration), figure, frame, gear
maps.js                     ES module: map specs, the Lastlands data, the stamp painters
replica.js                  ES module: reads a printed map into coast outlines and terrain grids
art/manifest.json           optional: map an enemy sprite key to an image file in art/
assets/map/                 widman.png + widman.json: engraved map symbols (CC0), built by tools/build_map_atlas.py
CLAUDE.md, README.md
docs/                       spec, plan, reference
shared/                     used by the player and the prototypes (classic scripts on a global LW)
  core.js                   rules data (Combat Results Table, Kai disciplines, items) and LW.Game, the book runner
  rules-series.js           per-series rules (Kai/Magnakai), Lore-circles, ranks, carried character, character dialog
  book-demo.js              LW.BOOK_DEMO: the original 20-section demo chapter, with map locations
  ui.js                     LW.UI helpers: el, esc, wait, toast, createHero (Kai only), pickRandom, chart; LW.sfx (blips)
  sfx-soft.js               replaces LW.sfx with noise/sine sounds and adds LW.drone (player only)
  ink.js                    ES module: procedural parchment, leather, wood, ink-wash scenes
  art.js, battle.js, flow.js, shared.css   pixel sprites, Dragon Quest battle, shared flow: prototypes A and B only
prototypes/                 earlier experiments, kept working, not developed
  index.html                chooser page for the three
  a-book/, b-map/, c-3d/    load ../../shared
tools/
  fetch_projectaon.py       downloads one book into data/projectaon/<code>/
  import_projectaon.py      converts it to data/projectaon/<code>/book.js and rewrites data/projectaon/index.js
  build_map_atlas.py        packs the downloaded Widman symbol pack into assets/map/widman.png
data/projectaon/            git-ignored. Downloaded pages and images, generated book.js files, index.js;
                            maps/: sheets 1-2 of Project Aon's Maps of Magnamund (reference for LASTLANDS.detail)
.claude/launch.json         local server definition (python http.server on 8765)
```

## Load order

```
shared/core.js              defines LW, LW.Game, Kai rules
shared/book-demo.js         LW.BOOK_DEMO
data/projectaon/index.js    document.writes a <script> for each imported book -> LW.BOOKS[code]
shared/ui.js                LW.UI, LW.sfx
shared/sfx-soft.js          overrides LW.sfx
shared/rules-series.js      adds Magnakai, overrides LW.has and LW.heroCS, adds LW.Character, LW.UI.chooseCharacter
main.js (module)            imports ./shared/ink.js, ./plates.js, ./maps.js (which imports ./replica.js)
```

Order matters: `rules-series.js` overrides functions defined in `core.js` and needs `LW.UI`.
If `data/projectaon/index.js` is missing the page still runs with the demo only (one 404).

Paths to imported books (`index.js`'s script tags, each book's `assets`) are written by the
importer relative to the project root, where `index.html` sits. Move the page and the importer
must change with it.

## Runtime state

`LW.Game` (in `core.js`) owns play state in `game.s`:

| Field | Meaning |
|---|---|
| `hero` | the character (see `rules-engine.md`) |
| `at` | current section id (string) |
| `trail` | `[{id, via}]`: every section visited, with the choice text that led there |
| `events` | strings describing what happened on arrival (meal eaten, healing) |
| `rolled` | the Random Number drawn in this section, or null |
| `fought` | `{sectionId: true}` for combats already won |
| `looted` | `{sectionId:index: true}` for demo loot already taken |

`game.history` is an array of JSON snapshots of `s`, one per step, used by `rewind(n)` (prototype B).

The player keeps its own view state in module variables in `main.js`:
`mode` (`title` | `story` | `battle`), `panel` (`kai` | `pack` | `map`), `sel` (selected item or
discipline), `B` (the fight in progress, or null), `busy` (input lock during animations),
`mapScan` (show the printed map instead of the journey map).

Rendering is whole-page: `render()` rebuilds the left page (`leftHTML`) and the right page
(`renderRight`) from state. The map node and the fight node are built once and re-attached.
All clicks are handled by one delegated listener on `#book` reading `data-*` attributes.

## Storage

All in `localStorage`, every access wrapped in try/catch.

| Key | Holds |
|---|---|
| `lw-save` | the player's save for the demo chapter: `{s, history}` |
| `lw-save-<code>` | the player's save for an imported book, e.g. `lw-save-01fftd` |
| `lw-book` | id of the last book opened, to resume on load |
| `lw-character` | the carried character: `{hero, from, fromTitle, completed: [codes]}` |
| `lw-sound` | `on` or `off` |
| `lw-proto-book`, `lw-proto-map`, `lw-proto-3d` | saves for prototypes A, B, C |

Every page is the same origin on localhost, so they share this storage.

## Console hook

`window.__lw = { game, render(), BOOKS, begin(id, fresh, anew) }`, defined at the end of
`main.js`, for driving the page while testing.

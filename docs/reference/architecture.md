# Architecture

How the code is laid out today. Intent lives in `docs/spec.md`.

## File map

```
index.html                  the player: markup, all CSS, script tags
main.js                     ES module: state, rendering, input, combat, title page
plates.js                   ES module: ink creatures, inkPlate (restyles an illustration), figure, frame, gear
maps.js                     ES module: printedCanvas, the book's printed map repainted in sepia
items-01fftd.js             ES module: Book 1's items and what each section gives, takes or gates, by hand
                            (docs/reference/book-format.md, "Item tables")
sw.js                       service worker: the offline copy (docs/reference/offline.md)
manifest.webmanifest        the Home Screen app: name, colours, icons (assets/app/)
art/manifest.json           optional pictures in art/: enemy sprites, Lone Wolf's figure (inventory), the Kai panel portrait
assets/icons/               discipline glyphs from game-icons.net (CC BY 3.0, credited in README.txt)
assets/fonts/               the page's three fonts and fonts.css, from Google Fonts (SIL OFL, licences beside them)
assets/app/                 the Home Screen icon (README.txt says how it was made)
assets/plates/              plates.json: pictures for enemies their book does not picture; free engravings
                            from Wikimedia Commons (credited in README.txt)
CLAUDE.md, README.md
docs/                       spec, plan, reference
shared/                     used by the player and the prototypes (classic scripts on a global LW)
  core.js                   rules data (Combat Results Table, Kai disciplines, items) and LW.Game, the book runner
  rules-series.js           per-series rules (Kai/Magnakai), Lore-circles, ranks, carried character, character dialog, starting kits
  book-demo.js              LW.BOOK_DEMO: the original 20-section demo chapter, with map locations (prototypes only)
  ui.js                     LW.UI helpers: el, esc, wait, toast, createHero (Kai only), pickRandom, chart; LW.sfx (blips, prototypes only)
  ink.js                    ES module: procedural parchment, leather, wood, ink-wash scenes
  art.js, battle.js, flow.js, shared.css   pixel sprites, Dragon Quest battle, shared flow: prototypes A and B only
prototypes/                 earlier experiments, kept working, not developed
  index.html                chooser page for the three
  a-book/, b-map/, c-3d/    load ../../shared
tools/
  serve.py                  the local server: static files, backups/ (api/backups), the offline list (api/offline)
  fetch_projectaon.py       downloads one book into data/projectaon/<code>/
  import_projectaon.py      converts it to data/projectaon/<code>/book.js and rewrites data/projectaon/index.js
  reading_copy.py           writes data/projectaon/<code>/reading.txt, the book as text to read
  item_sections.py          lists the sections that may give, take or need items; writes them to read
  check_items.mjs           checks items-<code>.js against the book (node)
  fetch_icons.py            fetches game-icons.net glyphs into assets/icons/, background removed
                            (the four above: docs/reference/items.md)
  map_upscale.py            Real-ESRGAN upscale of a printed map to a set width, saved as WebP or PNG
  map_check.py              aligns a repainted map to the faithful one, flags colour and shape changes
                            (both: docs/reference/map-upscale.md; Python in tools/.venv)
  realesrgan/               git-ignored. Real-ESRGAN's Windows build, used by map_upscale.py
maps/<code>/                the owner's work on each book's printed map, committed: labels.json (the label
                            list), style.txt (the repaint's look), labels-checked.txt (step 3 done);
                            labels.json.bak is git-ignored (docs/reference/map-upscale.md)
data/projectaon/            git-ignored. Downloaded pages and images, generated book.js files, index.js;
                            maps/: sheets 1-2 of Project Aon's Maps of Magnamund (reference only)
data/reference/             git-ignored. Reference images fetched for the owner: a fan-made world map of
                            Magnamund (4658x5234, World Anvil); SOURCES.txt says where each came from;
                            symbol-packs/: downloaded engraved symbol packs (Hogenburg, Donia, Walser; unused)
art/reference/map-symbols/  git-ignored. Map symbols kept from the dropped custom maps; from-game/ holds
                            the Widman sheet and Hogenburg symbols the game used, with their READMEs
.claude/launch.json         local server definition (tools/serve.py on 8765)
```

## Load order

```
shared/core.js              defines LW, LW.Game, Kai rules
data/projectaon/index.js    document.writes a <script> for each imported book -> LW.BOOKS[code]
shared/ui.js                LW.UI (LW.sfx blips: prototypes only)
shared/rules-series.js      adds Magnakai, overrides LW.has and LW.heroCS, adds LW.Character, LW.UI.chooseCharacter, LW.KITS
main.js (module)            imports ./shared/ink.js, ./plates.js, ./maps.js
```

Order matters: `rules-series.js` overrides functions defined in `core.js` and needs `LW.UI`.
If `data/projectaon/index.js` is missing the page still loads (one 404), with nothing to play.

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

`game.history` is an array of JSON snapshots of `s`, one per step, used by `rewind(n)` (prototype B)
and `back(k)` (the player, which keeps only the last `REWIND` = 3: `game.keep`).

The player keeps its own view state in module variables in `main.js`:
`mode` (`title` | `story` | `battle`), `panel` (`kai` | `pack` | `map`), `sel` (selected item or
discipline), `B` (the fight in progress, or null), `busy` (input lock during animations),
`shelf` (the title page shows the open
adventure's books rather than the list of adventures), `forgetting` (the adventure whose "forget" is
asking to be confirmed), `renaming` (the adventure whose name box is open), `restoring` (the restore row open on a plaque: `{id, files, chosen}`), `adv` (the adventures, as stored in `lw-adventures`).

`book` and `game` are null until a book is opened.

Rendering is whole-page: `render()` rebuilds the left page (`leftHTML`) and the right page
(`renderRight`) from state. The fight node is built once and re-attached.
All clicks are handled by one delegated listener on `#book` reading `data-*` attributes.

## Storage

All in `localStorage`, every access wrapped in try/catch.

Play is kept in **adventures**: separate games, each with its own save for every book and its own
carried character. `<n>` below is the adventure's id, `1`, `2`, ...; a new one takes the highest id
plus one. Forgetting an adventure removes every `lw-a<n>-*` key.

**Backups.** An adventure's "backup" button (`backupAdventure` in `main.js`) writes its whole state
as JSON: `{kind: 'lone-wolf adventure backup', version: 1, made, adventure: {id, book, name?}, keys:
{<every lw-a<n>-* key>: its parsed value}}`, named `<name>.<yyyy>.<mm>.<dd>.<hh>.<mm>.json` (the adventure's
name, or "Adventure II"; local time, 24-hour; a second backup in the same minute replaces the first). A page cannot write to
disk, so `tools/serve.py` does it: the page POSTs to `api/backups/<name>` and the server writes
`backups/<name>` in the project (git-ignored), with no dialog. Served any other way (plain
`http.server`, which answers a POST with 501), the file is downloaded instead. With the PC out of
reach (no answer within 20 s) the backup waits in `lw-pending-backups`, and `flushBackups` sends it
when the PC answers again (a sync reaching it, or the device coming online).

The offline copy keeps its files in the Cache API, not localStorage: see
`docs/reference/offline.md`.

**Restore** (`openRestore`) lists the backups from `GET api/backups` (newest first) in a drop-down on
the plaque, with "replace it" (or "restore it"), "other file" (a file input, for a backup kept
elsewhere; asks "Replace it with <file>?") and "cancel". With no server list, or none kept, it goes
straight to the file input. An adventure's own "restore" replaces it: `putBackup` removes that
adventure's `lw-a<n>-*` keys and writes the backup's in their place. The "restore" under "A new
adventure" makes it a new adventure with the next id instead, so nothing already kept is
overwritten. Either way each `lw-a<old>-*` key is written as `lw-a<n>-*` (a value kept as a string
goes back as it is, anything else as JSON), the last book comes from the backup, and its name too
when it has one. A file that is not a version-1 backup, or that holds another adventure's keys, is
refused with a toast.

| Key | Holds |
|---|---|
| `lw-adventures` | `{list: [{id, book, name?}], at}`: the adventures, the last book each had open, the name the owner gave it (optional), and the one open now (resumed on load) |
| `lw-a<n>-save-<code>` | adventure n's save for a book: `{s, history}`, e.g. `lw-a1-save-01fftd` |
| `lw-a<n>-character` | adventure n's carried character: `{hero, from, fromTitle, completed: [codes]}` |
| `lw-pending-backups` | backups made with the PC out of reach, waiting to be sent: `[{name, text}]` |
| `lw-proto-book`, `lw-proto-map`, `lw-proto-3d` | saves for prototypes A, B, C |

Before adventures, saves were `lw-save-<code>`, `lw-character` and `lw-book` (and `lw-save` for the
demo chapter). On the first load without `lw-adventures`, `loadAdventures()` in `main.js` moves
the first three into adventure 1. An old `lw-save` is left where it is, unused.

Every page is the same origin on localhost, so they share this storage. Each device and browser
has its own: a game on the iPad is not the one on the PC.

## Console hook

`window.__lw = { game, render(), BOOKS, begin(id, fresh, anew) }`, defined at the end of
`main.js`, for driving the page while testing.

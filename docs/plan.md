# Plan and state

Working notes: where the project stands and what comes next. Rough; to be refined with the owner.
Last updated 2026-10-01.

## How we got here

The owner wants a better way to play the Lone Wolf gamebooks than the Project Aon web edition
with a separate action chart (and than their own 1993 Turbo Pascal version). Four prototypes were
built in one sitting:

| | What | Owner's verdict |
|---|---|---|
| A `prototypes/a-book` | open book, pixel woodcuts, Dragon Quest battle | "feels like a kid game" |
| B `prototypes/b-map` | painted map, paper strips, rewind | "feels like a kid game". Liked: the map, choosing the next place on it |
| C `prototypes/c-3d` | three.js candlelit book, first-person fog combat | No 3D wanted, in reading or in battle |
| D (was `prototype-d-tome`) | flat book after Lone Wolf HD screenshots | **Chosen direction** |

D is now the product and lives at the project root (`index.html`, `main.js`, `plates.js`,
`maps.js`, `art/`). A-C were moved under `prototypes/` with their chooser page.

Decisions the owner has made:

- Style follows Lone Wolf HD Remastered: framed story page left, panel page right, bronze medallions.
- No 3D. Combat is on the book's pages with controls.
- Creatures are still images of good quality, not crude animation.
- The map matters, including travelling by choosing the next place on it, more linear than LWHD.
- Personal use only, so Project Aon content may be downloaded and restyled locally. It never
  goes into the repository.
- The clockwork gear should not take space from the pages.
- A single choice that is only a page reference reads "Continue".
- Carry-over between books: support both, default to continuing the same character.

## State of the player

Working and checked by playing in the browser:

- Adventures (save slots, 2026-10-01): several games at once, each with its own book saves and
  carried character; listed on the title page, with a new one and forget. The demo chapter is no
  longer offered. Older saves move into adventure I on first load.
- Items handled by the engine for Book 1 (2026-10-01): `items-01fftd.js`, read by hand: 61
  sections give, offer, take or gate items, gold, Meals or Endurance, or correct a misread fight
  (the Vordaks' -2 is now Mindforce, which Mindshield blocks; the Burrowcrawler's darkness is spared
  by a Torch and Tinderbox); 12 book items with their own icons (game-icons.net). Tested on a
  stand-in hero, not yet in a play-through. The procedure and its tools are in
  docs/reference/items.md; books 2-12 each need a table when imported.
- Going back up to three sections (2026-10-01): on the death panel, and on the map by touching a
  place passed lately. Saves keep only those three snapshots now. Not offered where the recent
  sections were all at the one place and he is alive (the map has nothing to touch).
- Title page: the adventures, then an adventure's imported books, with continue / start over / new character.
- Story page: frame, script text, drop cap, illustrations in place, arrival events, choices.
- Panels: Kai, laid out like the HD character sheet (ink portrait from the owner's screenshot,
  ruled ledgers, a framed grid of every discipline with drawn game-icons glyphs), inventory (likewise
  after the HD equipment sheet: worn slots over the portrait, a tiled Backpack; slots,
  Backpack grid, by-hand gold and item controls), map.
- Random Number medallion on the page; automatic gating of choices where the ranges are clean.
- Combat on the page: plate, medallion commands, dial, round log, evasion, wounds.
- Book 1 (Flight from the Dark) downloaded and imported: 350 sections, no broken links.
- Battle plates made from the book's illustrations, restyled as sepia ink, shown whole with ruled
  frames cut away and every edge faded (2026-10-01). Enemies the book does not picture borrow
  another book's illustration or a free engraving (`assets/plates/plates.json`). Emblem fallback.
- LWHD-style sepia maps stamped from engraved CC0 symbols (Widman): the demo's country (with
  travel), and a redrawn, zoomable replica of the Lastlands read from Book 1's printed map, with
  extra detail for central Sommerlund from the Maps of Magnamund. Book 1's journey is a view of it,
  Book 1 travels on the map like the demo: about 55 made-up places, every section assigned one
  (`places-01fftd.js`).
  Lone Wolf is a sepia figure over a bronze arrow that walks between places, cut out at load from
  a Lone Wolf HD screenshot the owner keeps in `art/`.
- Series rules: Kai and Magnakai disciplines, ranks, Lore-circles, Weaponmastery, Psi-surge.
- Character carry-over between books.
- Docs: spec, reference, CLAUDE.md.

Tested only against stand-in data, not real text:

- Magnakai rules and carry-over (tested with copies of the demo chapter marked as other books).
- The importer on any book other than Book 1.

Not checked at all: a full play-through of Book 1; the phone layout; prototypes A-C after the
changes to `shared/core.js` and `shared/ui.js` (they were loaded once after the move to
`prototypes/`, not played).

## Waiting on the owner

- **Import books 2-12?** Downloaded on 2026-10-01 for their art (the owner said not to import yet).
  Needed before Magnakai can be tested on real text.

## Next steps

1. **Import books 2-12** once the owner says so, and read the importer's report for
   every one. Fix whatever the reports show (broken links, sections with no way on, oddly low
   counts). Expect new phrasings for gates, Random Number and combat in later books.
2. **Verify the rules against the books' rules pages**: the Combat Results Table, Lore-circle
   bonuses, Psi-surge cost and threshold, Weaponmastery, ranks, and whether Kai Disciplines keep
   their effects in Magnakai books. The importer could read the rules pages to make this checkable.
   Update the numbers and remove "(verify)" from the spec as each is confirmed.
3. **Per-book starting equipment** and the discipline/equipment choices at the start of each book.
   Today a new Magnakai character gets a simplified kit.
4. **Play Book 1 through** and fix what the importer misread, and anything the item table missed
   or got wrong.
5. **Map travel for books 2-12.** Book 1 has it. Each further book follows
   docs/reference/map-places.md (made-up places by hand, tools to lay out and check them).
   Books 2-5 can use the Lastlands replica if their journeys stay on it; the Magnakai books need
   a replica of their own printed maps first. Book 1's sweep is clean (2026-10-01).
6. **Items and fight pictures for books 2-12**, by docs/reference/items.md on importing each:
   the item table, and a plate-library entry for every enemy the importer lists "with none". Book 1
   is done (2026-10-01). Check by eye which illustration each enemy borrows (`PLATE_FIXES`, and the
   library's generic soldier/robber entries).

Smaller things noted along the way:

- Laumspur in combat is a house rule; the books do not allow it. Decide.
- Bow and Arrow rules; Special Item limit.
- Title page gets crowded with twelve books.
- `data/reference/magnamund-world-goodwin.png` (a fan-made world map, git-ignored) is there to
  lay out maps for the Magnakai books, whose printed maps cover other parts of Magnamund.
- Replica: the hand-placed rivers, roads and towns were read off the printed map by eye and are
  approximate. Book 1's places were laid out by a force layout: check them by playing, and move any
  that sit oddly (some horse-route places ended up east of the highway). All 350 sections were checked on
  the map on 2026-09-30 (no errors, every destination in view); Alema, the river bank and the barge
  were moved onto their water then. Books 2-5 use the same
  map and could reuse it; Magnakai books need their own.
- Delete `prototypes/` (and `shared/art.js`, `battle.js`, `flow.js`) once the owner is sure.

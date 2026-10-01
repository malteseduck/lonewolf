# Plan and state

Working notes: where the project stands and what comes next. Rough; to be refined with the owner.
Last updated 2026-09-30.

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

- Title page listing the demo chapter and imported books, with continue / start over / new character.
- Story page: frame, script text, drop cap, illustrations in place, arrival events, choices.
- Panels: Kai (scores, modifiers, rank, Lore-circles, discipline medallions), inventory (slots,
  Backpack grid, by-hand gold and item controls), map.
- Random Number medallion on the page; automatic gating of choices where the ranges are clean.
- Combat on the page: plate, medallion commands, dial, round log, evasion, wounds.
- Book 1 (Flight from the Dark) downloaded and imported: 350 sections, no broken links.
- Battle plates made from the book's illustrations, restyled as sepia ink. Emblem fallback.
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

- **Download books 2-12?** Asked, not yet answered. About 4 MB each from Project Aon. Needed
  before Magnakai can be tested on real text.

## Next steps

1. **Get the go-ahead and fetch books 2-12**, import each, and read the importer's report for
   every one. Fix whatever the reports show (broken links, sections with no way on, oddly low
   counts). Expect new phrasings for gates, Random Number and combat in later books.
2. **Verify the rules against the books' rules pages**: the Combat Results Table, Lore-circle
   bonuses, Psi-surge cost and threshold, Weaponmastery, ranks, and whether Kai Disciplines keep
   their effects in Magnakai books. The importer could read the rules pages to make this checkable.
   Update the numbers and remove "(verify)" from the spec as each is confirmed.
3. **Per-book starting equipment** and the discipline/equipment choices at the start of each book.
   Today a new Magnakai character gets a simplified kit.
4. **Play Book 1 through** and fix what the importer misread. Decide how much item handling to
   automate (pick-ups are the most frequent by-hand step).
5. **Map travel for real books.** Needs a location per section. Options: author it by hand per
   book, or derive stages from the section graph. Then a map spec per book in `maps.js`.
6. **Enemy plates for unpictured enemies**, and a check by eye of which illustration each enemy
   borrows in books 2-12 (`PLATE_FIXES`).

Smaller things noted along the way:

- Laumspur in combat is a house rule; the books do not allow it. Decide.
- Bow and Arrow rules; Special Item limit.
- Title page gets crowded with twelve books.
- `data/reference/magnamund-world-goodwin.png` (a fan-made world map, git-ignored) is there to
  lay out maps for the Magnakai books, whose printed maps cover other parts of Magnamund.
- Replica: the hand-placed rivers, roads and towns were read off the printed map by eye and are
  approximate. Book 1's places were laid out by a force layout: check them by playing, and move any
  that sit oddly (some horse-route places ended up east of the highway). Books 2-5 use the same
  map and could reuse it; Magnakai books need their own.
- Delete `prototypes/` (and `shared/art.js`, `battle.js`, `flow.js`) once the owner is sure.

# Plan and state

Working notes: where the project stands and what comes next. Rough; to be refined with the owner.
Last updated 2026-10-02.

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
- Carry-over between books: support both, default to continuing the same character. Carried over:
  scores, disciplines, Weapons, Special Items and gold, not the Backpack's contents (as the books
  say; 2026-10-02).
- Book 2's readings (2026-10-01): Hunting does not excuse a Meal anywhere in the Wildlands, Ragadorn
  and its coast road included (32, 37, 127, 148, 346). Documents and the Gold Ring are Special
  Items; the Healing Potion, Potion of Orange Liquid, Fur Blanket and Rope Backpack Items. "Some
  Laumspur" (36) is the herb or any Laumspur potion, and one is used up. "Ever been given" (328)
  counts a Pendant since lost. "No pass" (246) closes when he holds either pass.

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
- Introduction (2026-10-01): a new game opens on the book's "The Story So Far" (imported from
  `tssf.htm`), with "Begin" to turn to section 1. Book 1 re-imported with it; the importer reads
  it for every book.
- Title page: the adventures, then an adventure's imported books, with continue / start over / new character.
- Story page: frame, script text, drop cap, illustrations in place, arrival events, choices.
- Panels: Kai, laid out like the HD character sheet (ink portrait from the owner's screenshot,
  ruled ledgers, a framed grid of every discipline with drawn game-icons glyphs), inventory (likewise
  after the HD equipment sheet: worn slots over the portrait, a tiled Backpack; slots,
  Backpack grid, by-hand gold and item controls), map.
- Random Number medallion on the page; automatic gating of choices where the ranges are clean.
- Combat on the page: plate, medallion commands, dial, round log, evasion, wounds.
- Book 1 (Flight from the Dark) downloaded and imported: 350 sections, no broken links.
- Book 2 (Fire on the Water) imported 2026-10-01 at the owner's word: 350 sections, 31 with combat,
  20 auto and 7 free Random Number, 31 with discipline gates, 52 illustrated, 18 dead ends, 7 forced
  Meals, 7 paragraphs of introduction; no broken links, none without a way on. Loads in the page;
  not yet played. 16 kinds of enemy have no plate. Lists (shop wares, finds) and signposts were dropped by the importer until
  2026-10-01; they are paragraphs now.
- Items handled by the engine for Book 2 (2026-10-01): `items-02fotw.js`, 109 sections, 13 book
  items with icons. New in the engine for it, all rules the text states: the Sommerswerd (+8 in
  combat, Weaponskill with any sword counts, undead foes lose double), Special Items that fight
  (the Magic Spear), fights only one weapon can win and bare-handed ones, Helghast mind drain per
  round, shops (buy as often as you like), "choose any two", gold won or lost by a number, losing
  every Special Item. The Seal of Hammerdal comes with the starting kit. Tried section by section on a
  stand-in hero, not yet in a play-through. The inventory's "add by hand" lists the open book's
  own items.
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
- Book 2 travels on the map (2026-10-02): 46 made-up places in six legs, each a close view of its
  own, since the journey crosses most of the Lastlands (`places-02fotw.js`). It begins on a drawn
  plan of Holmgard's harbour (city.js, after the owner's Sorcery! sample): the inn, the quay, the
  ship at anchor. Every section placed;
  the checker and the sweep are clean for Books 1 and 2; sea places are in water and land places on
  land by the replica's reading. The Rymerift's channel is drawn on Book 2's map only. Looked at by
  eye in each leg, not yet played.
- Series rules: Kai and Magnakai disciplines, ranks, Lore-circles, Weaponmastery, Psi-surge.
- Character carry-over between books.
- Every rule in docs/reference/rules-books.md (2026-10-02): each book's starting kit as a second
  page of the character dialog (gold, given items, the choice, weapons kept, the Monastery), the
  Shield and the other kit items, the 12 Special Item limit, safekeeping of items and gold, the
  Bow (useless hand to hand; shots that spend Arrows and add Weaponmastery), the improved
  disciplines' numbers (Tutelary and Scion-kai unarmed and +4, Archmaster Psi-surge and Curing,
  read as once a book), Huntmastery against an ambush, Laumspur eaten as a Meal. The potion in a
  fight stays our house rule. Tried in the page on stand-in books 2, 8, 11 and 12, not on real
  Magnakai text; bow shots and ambushes need marking in each Magnakai book's item table.
- Docs: spec, reference, CLAUDE.md.

Tested only against stand-in data, not real text:

- Magnakai rules and carry-over (tested with copies of the demo chapter marked as other books).
- The importer on books 3-12 (Book 2's report is clean; its sections not yet played).

Not checked at all: a full play-through of Book 1; the phone layout; prototypes A-C after the
changes to `shared/core.js` and `shared/ui.js` (they were loaded once after the move to
`prototypes/`, not played).

## Waiting on the owner


- **Import books 3-12?** Downloaded on 2026-10-01 for their art. Book 2 imported at the owner's
  word; ask before each further one. Needed before Magnakai can be tested on real text.

## Next steps

1. **Book 2: fight pictures** (step 5 below; its item table, map places and starting kit are done).
2. **Import books 3-12** once the owner says so, and read the importer's report for
   every one. Fix whatever the reports show (broken links, sections with no way on, oddly low
   counts). Expect new phrasings for gates, Random Number and combat in later books.
3. **Play Book 1 through** and fix what the importer misread, and anything the item table missed
   or got wrong.
4. **Map travel for books 2-12.** Book 1 has it. Each further book follows
   docs/reference/map-places.md (made-up places by hand, tools to lay out and check them).
   Books 2-5 can use the Lastlands replica if their journeys stay on it; the Magnakai books need
   a replica of their own printed maps first. Book 1's sweep is clean (2026-10-01); Book 2 is done
   (2026-10-02), in legs.
5. **Items and fight pictures for books 2-12**, by docs/reference/items.md on importing each:
   the item table (in the Magnakai books, mark ambushes and bow shots: the engine applies them only there), and a plate-library entry for every enemy the importer lists "with none". Book 1
   is done (2026-10-01); Book 2 has its item table, and 16 enemies with no picture. Check by eye which illustration each enemy borrows (`PLATE_FIXES`, and the
   library's generic soldier/robber entries).
6. **Redraw the town plans from the Sommerlund City Maps** (owner, 2026-10-02). The owner's copies
   of the campaign's preview images are in git-ignored `art/reference/sommerlund-city-maps/`:
   Holmgard (and a larger King's Reach detail), Anskaven, Toran, Tyso, Moytura, Ruanon,
   Silvershore, the Kai Monastery's plans, the country, the Sommer Isles. First redraw Book 2's
   Holmgard harbour plan (`CITIES.holmgard` in city.js, invented so far) on the King's Reach: the
   harbour, the rivers coming in, the bridges, the citadel by the water. Keep the Good Cheer Inn,
   the stairs, the quay and the ship where section 1's run of sections needs them, and re-check
   Book 2's places on it. Then, as each book is mapped, use a reference wherever its journey walks
   a town's streets (candidates, to confirm from the text: Toran, Ruanon, Moytura, the Kai Monastery).
   Towns with no reference (Ragadorn, Port Bax, Hammerdal and the Magnakai books' cities) are made
   up from the book. Both ways are in docs/reference/map-places.md, "Drawing a town plan": take only
   the layout from a reference, draw it in our own sepia style, and use only the books' names.
   The campaign funded a later Mattioli map of Ragadorn (and Helgedad): look for it before making
   Ragadorn up. Varetta and Barrakeesh were stretch goals that were not reached.

Smaller things noted along the way:

- Title page gets crowded with twelve books.
- `data/reference/magnamund-world-goodwin.png` (a fan-made world map, git-ignored) is there to
  lay out maps for the Magnakai books, whose printed maps cover other parts of Magnamund.
- Replica: the hand-placed rivers, roads and towns were read off the printed map by eye and are
  approximate. Book 1's places were laid out by a force layout: check them by playing, and move any
  that sit oddly (some horse-route places ended up east of the highway). All 350 sections were checked on
  the map on 2026-09-30 (no errors, every destination in view); Alema, the river bank and the barge
  were moved onto their water then. Books 2-5 use the same
  map and could reuse it; Magnakai books need their own.
- Book 2's map: places worth a look in play are the border cluster between Gorn Cove and Port Bax
  (nine made-up places in a small corner of the printed map), the Tarnalin's insides, and the
  Ragadorn districts. Each leg is now painted at the size shown and the next one ahead
  of time (2026-10-02); not yet timed in a visible pane. Holmgard's plan is invented (no plan exists): check it
  reads as the harbour section 1 describes.
- Delete `prototypes/` (and `shared/art.js`, `battle.js`, `flow.js`) once the owner is sure.

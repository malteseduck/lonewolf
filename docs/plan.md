# Plan and state

Working notes: where the project stands and what comes next. Rough; to be refined with the owner.
Last updated 2026-10-03.

## Next steps

1. **Play Book 1 through** and fix what the importer misread, and anything the item table missed
   or got wrong.
2. **Books 3-12, one book at a time**, in order (2.1 to 2.10). Finish one book before starting
   the next. Each book gets the same three pieces of work (see "Work for each book" below): map
   travel, items and fight pictures, and town plans. All ten were imported on 2026-10-03, and each
   report has no broken links and no section without a way on (figures in
   docs/reference/importer.md, Results). None has a places file, an item table or town plans yet,
   so all ten read without travel on the map.

   - **2.1 Book 3, The Caverns of Kalte.** Map: the Lastlands replica, if the journey stays on it.
     Fight pictures: 14 of 17 kinds of enemy have none. Random Number left free: 6 (2 changed by a
     weapon in hand or an oil, 4 count by the number). Also: 1 failed ending (61); the sledge food
     is left to the text. Fan map to check against: Ikaya.
   - **2.2 Book 4, The Chasm of Doom.** Map: the Lastlands replica, if the journey stays on it.
     Fight pictures: 5 of 32 have none. Random Number left free: 4 (one on the condition "Hunting,
     or a rank", one on a Pick or Shovel, 2 count by the number). Fan map to check against: the
     Maaken Mines.
   - **2.3 Book 5, Shadow on the Sand.** Map: the Lastlands replica, if the journey stays on it.
     Fight pictures: 8 of 28 have none. Random Number left free: 5 (one on a lost arm, one against
     COMBAT SKILL, one inside a fight, 2 count by the number). Also: 2 puzzles (58, 331), which use
     the "Turn to section" box. Town plan: Ikaresh, from its fan map. Fan maps to check against:
     Barrakeesh Palace and the sewers. Barrakeesh has no Mattioli map (a stretch goal of that
     campaign that was not reached).
   - **2.4 Book 6, The Kingdoms of Terror.** Map: needs a replica of the book's own printed map
     first. Fight pictures: 10 of 21 have none. Random Number left free: 14 (6 bow shots, using
     Weaponmastery with Bow, one of them a three-number draw; one on a shield; one a tournament; 6
     count by the number). Also: mark bow shots and ambushes in the item table. Varetta has no
     Mattioli map (a stretch goal not reached), so it is made up from the book.
   - **2.5 Book 7, Castle Death.** Map: needs a replica of its own printed map first. Fight
     pictures: 14 of 23 have none. Random Number left free: 8 (4 bow shots, or a Lore-circle beside
     one; 4 count by the number). Also: 2 puzzles; mark bow shots and ambushes. Fan map to check
     against: Kazan-Oud.
   - **2.6 Book 8, The Jungle of Horrors.** Map: needs a replica of its own printed map first.
     Fight pictures: 12 of 21 have none. Random Number left free: 3 (2 bow shots, 1 counts by the
     number). Also: 4 puzzles; mark bow shots and ambushes.
   - **2.7 Book 9, The Cauldron of Fear.** Map: needs a replica of its own printed map first.
     Fight pictures: 7 of 28 have none. Random Number left free: 7 (bow or dagger throws, one with
     a Bow choice; 2 count by the number). Also: 3 puzzles; the Psychic Ring's +8 (214) is left as
     text, so check it against the engine's own weapon bonus; mark bow shots and ambushes.
   - **2.8 Book 10, The Dungeons of Torgar.** Map: needs a replica of its own printed map first.
     Fight pictures: 15 of 30 have none. Random Number left free: 8 ("missile bonuses", a weapon in
     hand, 4 count by the number). Also: mark bow shots and ambushes.
   - **2.9 Book 11, The Prisoners of Time.** Map: needs a replica of its own printed map first.
     Fight pictures: 18 of 25 have none. Random Number left free: 10 ("missile bonuses", a Rope, 4
     count by the number). Also: the Ironheart Broadsword's +8 (204) is left as text, so check it
     against the engine's own weapon bonus; mark bow shots and ambushes.
   - **2.10 Book 12, The Masters of Darkness.** Map: needs a replica of its own printed map first.
     Fight pictures: 20 of 39 have none. Random Number left free: 10 ("bow-skill bonuses", a rope, 4
     count by the number). Also: Helshezag's and a weapon's increased power (88, 133) are left as
     text, so check them against the engine's own weapon bonus; mark bow shots and ambushes.

### Work for each book

- **Map travel**, by docs/reference/map-places.md (made-up places by hand, and tools to lay them
  out and check them). Books 3-5 can use the Lastlands replica if their journeys stay on it. The
  Magnakai books (6-12) need a replica of their own printed maps first.
  `data/reference/magnamund-world-goodwin.png` (a fan-made world map, git-ignored) helps lay those
  maps out.
- **Items and fight pictures**, by docs/reference/items.md. Write the item table: in the Magnakai
  books, mark ambushes and bow shots, because the engine applies them only there. Add a
  plate-library entry for every enemy the importer lists "with none". The Random Number draws left
  free go into the item table. "Count by the number" means the draw gives gold or Endurance (write
  `rolls`) or plays a game. In every book, first-round penalties, unarmed opening rounds and
  doubled psychic bonuses are left as text. The item table can carry them as a `todo`, or mark the
  fight as an `ambush`.
- **Town plans**, by docs/reference/map-places.md, "Drawing a town plan" (the references, all
  git-ignored, are listed there). Use a Mattioli map wherever the journey walks a town's streets.
  The candidates are Toran, Ruanon, Moytura and the Kai Monastery; confirm from the text which book
  each belongs to. Use the fan maps named in each book's step to check how those legs' places sit.
  Towns with no reference (most of the Magnakai books' cities) are made up from the book.

Smaller things noted along the way:

- Book 2's fight pictures were shown to the owner on 2026-10-03 (all 35 on one sheet). They asked
  only for new thieves: the Street Thief Leader, 1 and 2 and the Trickster now use ink drawings the
  owner supplied, in git-ignored `art/plates/` (personal use; plates.json points at them, and a
  checkout without them falls back to the drawn emblem). Four more of theirs wait there for later
  books' fights: a grey masked rogue with daggers, an elf swordsman, two swordswomen (Book 4's hooded
  bandit leader, section 233, may suit the hooded swordsman too).
- The guards followed the same day, from drawings the owner supplied: the Watchtower Guard (helm, by
  a tower), the two Bridge Guards and the Border Guard (Durenese, spears, gold) have one each; the six
  Town Guards of section 296 share a picture of six guards together. The Zombie Crew has a horde drawing of the owner's; the
  Zombie Captain keeps Book 2's own picture, which shows him. The three Villagers of section 90 (an angry
  mob, a sword among them) have one owner-supplied drawing each; three more of theirs (two painted
  peasants, a spearman) are spare in `art/plates/`. The Sailor has the owner's drawing
  of a sailor on deck, and the Knight of the White Mountain one of a knight with sword and shield.
- Saved for later, 2026-10-03: `art/reference/bestiary/gourgaz-zlanbeast-vordak-doomwolf.webp`, the
  owner's photo of a printed bestiary spread with ink drawings of a Gourgaz, a Zlanbeast (Kraan), a
  Vordak and a Doomwolf. To cut each one out as a fight picture (Book 1 has all four; later books
  have more): the page is photographed at an angle with text wrapped round the drawings, so each
  needs a careful crop, and the shadowed paper a levels setting.
- Citadel's 1980s Lone Wolf miniature catalogues, downloaded 2026-10-03 at the owner's word, in
  `art/reference/citadel-c41/` (12 scans; personal use, the site says not to copy; SOURCES.txt).
  Only the Dec 1984 flyer is line drawings: `cutouts.json` there gives crops for 14 of its figures
  (Vordak, Bandit, Vonotar, Young Thaumaturgist, Lone Wolf, Citadel Guard, Guard Officer, three
  Giaks and a row of them, Helghast, Gourgaz, Prince Pelethar), ready for plate entries in later
  books. The flyer is copied to `art/plates/` so the iPad gets it. Book 2's two Szalls (a breed of
  Giak) now use two of its Giaks, so no Book 2 enemy is left on a stand-in.
- Offline on the iPad works (2026-10-03, docs/reference/offline.md): Tailscale serves the player at
  `https://maltesepc.tail20dd6b.ts.net/` (`tailscale serve --bg 8765`, tailnet only); the iPad's
  Home Screen copy played with no connection. `tools/serve.py` must run on the PC for it to sync.
- The page froze twice on 2026-10-02 (a full map sweep, then switching books). Found and fixed:
  `showTerrain` asked for a repaint "once the stamps are loaded" when the printed map was what was
  missing, and the stamps already were, so it looped without yielding. Since the fix the full
  sweep runs clean on both books (350 sections each, no problems).
- Town plans to look at in play: Ragadorn's and Gorn Cove's long runs across town (the view steps
  back to show them); the labels of the square and the Good Cheer Inn, which sit close; whether
  the Graveyard's crypt reads as the book describes it.
- Title page gets crowded with twelve books.
- Replica: the hand-placed rivers, roads and towns were read off the printed map by eye and are
  approximate. Book 1's places were laid out by a force layout: check them by playing, and move any
  that sit oddly (some horse-route places ended up east of the highway). All 350 sections were checked on
  the map on 2026-09-30 (no errors, every destination in view); Alema, the river bank and the barge
  were moved onto their water then. Books 2-5 use the same
  map and could reuse it; Magnakai books need their own.
- Book 2's map: places worth a look in play are the border cluster between Gorn Cove and Port Bax
  (nine made-up places in a small corner of the printed map) and the Tarnalin's insides. Each leg is now painted at the size shown and
  the next one ahead of time (2026-10-02); not yet timed in a visible pane.
- Delete `prototypes/` (and `shared/art.js`, `battle.js`, `flow.js`) once the owner is sure.

## Waiting on the owner

- **Full-size fan maps** (optional): the Project Aon forum's attachments need a login. If the owner
  saves them into `art/reference/projectaon-forum-maps/`, they replace the thumbnails there.

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
- Books 3-12 imported 2026-10-03 at the owner's word (figures in docs/reference/importer.md,
  Results). The importer learned the later books' phrasings, reading only what is certain: gates
  on several disciplines (any or all), a discipline and a rank together, and Lore-circles; Random
  Number ranges with minus signs, "5 or more" and "below 7", and the bonuses the text adds to the
  number for a discipline, a rank, a Lore-circle, his Endurance or each Magnakai Discipline (the
  page shows the sum, as for a bow shot); a choice taken instead of drawing beside the ranges;
  COMBAT SKILL changes that hold for the whole fight, given or spared by a discipline; foes immune
  to Mindblast but not Psi-surge; mind drain unless shielded; evasion in the first round only;
  puzzles ("Turn to section" on the page); Book 3's ending short of death (`end: 'failed'`); verse
  set as lines; footnote marks dropped. Re-imported Books 1 and 2 with it: Book 1 gains a gate
  (211), a dust penalty (229) and the right evasion wait (169), and stops reading a torch's,
  a Mindforce's and a first-round change as whole-fight ones (its item table already corrected
  them; 170's -3 now lives in the table); Book 2 gains two automatic draws (12, 122) and a gate (25),
  and stops applying first-round +2s (7, 270) and the no-weapon -4 to an armed hero (110, 157).
  Both still have 0 enemies with no picture.
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
  Book 2 (2026-10-02): every enemy has a picture. Its council of travellers are cut from the book's
  own portrait page, the Helghast and zombies use its own plates, and its guards, villagers, sailor
  and card cheat borrow other books' plain humans; the Zombie Captain and the guards no longer show
  Book 4's turbaned warrior. Library entries can be limited to one book (`book`). Not yet shown to
  the owner.
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
- Town plans for Books 1 and 2 (2026-10-02), each a leg of its own, drawn by hand in
  `towns-<book>.js` from the books' text and the references in docs/reference/map-places.md
  ("Drawing a town plan"): Book 1's Holmgard (the whole city, from the Sommerlund City Maps' layout)
  and the Graveyard of the Ancients (a crypt plan: its rooms and passages under the necropolis);
  Book 2's Holmgard harbour (redrawn on the King's Reach), Ragadorn (after the fan map: two walled
  halves and the one bridge, 23 places for its streets), Gorn Cove (a village on its cove) and Port
  Bax (on Port Brax's bones: the harbour, the naval quadrant's wall and Red Gate, the castle). Book
  1 now travels in legs too (the Lastlands, then the two plans). Houses keep out from under every
  building; `cityClashes` is clean on every plan; every town section was checked in the panel
  (figure and rings in view; the view steps back for a road across town). Hogenburg's fountains,
  sepulchres and a monument are in use (`assets/map/hogenburg`). Not yet played.
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

- Magnakai rules and carry-over (tested with copies of the demo chapter marked as other books;
  since 2026-10-03 also a few real sections of Books 6 and 12: a Random Number bonus, a fight with
  a discipline's bonus, a foe immune to Mindblast only, evasion in the first round only).
- Books 3-12: imported and their sections render; none played.

Not checked at all: a full play-through of Book 1; the phone layout; prototypes A-C after the
changes to `shared/core.js` and `shared/ui.js` (they were loaded once after the move to
`prototypes/`, not played).

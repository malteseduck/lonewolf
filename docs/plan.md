# Plan and state

Working notes: where the project stands and what comes next. Rough; to be refined with the owner.
Last updated 2026-10-05.

## Next steps

Where each book stands, step by step: `docs/book-checklist.md`.

1. **Play Book 1 through** and fix what the importer misread, and anything the item table missed
   or got wrong. A mechanical sweep ran 2026-10-03 (all 350 sections, three runs with test
   characters, both checkers): no errors, no unmarked dead end, every fight and draw works. Then (same day) every gate, fight and draw was read against the text: fixed 43 (evade
   only after three rounds: an importer fix, which also corrected Book 7's 301), 88 (the Healing
   choice ungated) and 203 (the way on follows his Endurance: `need.ep`). Left to the player, as
   the engine keeps no count of them: kill within four rounds (231, 339), lost no Endurance in the
   fight (227). A run reached 350 in 27 sections. Done; the owner's own play-through is checklist
   step 9.
2. **Books 3-12, one book at a time**, in order (2.1 to 2.10). Finish one book before starting
   the next. Each book gets the same work (see "Work for each book" below): items and fight
   pictures. All ten were imported on 2026-10-03, and each
   report has no broken links and no section without a way on (figures in
   docs/reference/importer.md, Results). Books 3-12 have their item tables (4-12 on 2026-10-05).

   - **2.1 Book 3, The Caverns of Kalte.** Fight pictures: 14 of 17 kinds of enemy have none. Random Number left free: 6 (2 changed by a
     weapon in hand or an oil, 4 count by the number). Also: 1 failed ending (61); the sledge food
     is left to the text.
   - **2.2 Book 4, The Chasm of Doom.** Fight pictures: 5 of 32 have none. Random Number left free: 4 (one on the condition "Hunting,
     or a rank", one on a Pick or Shovel, 2 count by the number).
   - **2.3 Book 5, Shadow on the Sand.** Fight pictures: 8 of 28 have none. Random Number left free: 5 (one on a lost arm, one against
     COMBAT SKILL, one inside a fight, 2 count by the number). Also: 2 puzzles (58, 331), which use
     the "Turn to section" box.
   - **2.4 Book 6, The Kingdoms of Terror.** Fight pictures: 10 of 21 have none. Random Number left free: 14 (6 bow shots, using
     Weaponmastery with Bow, one of them a three-number draw; one on a shield; one a tournament; 6
     count by the number). Also: mark bow shots and ambushes in the item table.
   - **2.5 Book 7, Castle Death.** Fight pictures: 14 of 23 have none. Random Number left free: 8 (4 bow shots, or a Lore-circle beside
     one; 4 count by the number). Also: 2 puzzles; mark bow shots and ambushes.
   - **2.6 Book 8, The Jungle of Horrors.** Fight pictures: 12 of 21 have none. Random Number left free: 3 (2 bow shots, 1 counts by the
     number). Also: 4 puzzles; mark bow shots and ambushes.
   - **2.7 Book 9, The Cauldron of Fear.** Fight pictures: 7 of 28 have none. Random Number left free: 7 (bow or dagger throws, one with
     a Bow choice; 2 count by the number). Also: 3 puzzles; the Psychic Ring's +8 (214) is left as
     text, so check it against the engine's own weapon bonus; mark bow shots and ambushes.
   - **2.8 Book 10, The Dungeons of Torgar.** Fight pictures: 15 of 30 have none. Random Number left free: 8 ("missile bonuses", a weapon in
     hand, 4 count by the number). Also: mark bow shots and ambushes.
   - **2.9 Book 11, The Prisoners of Time.** Fight pictures: 18 of 25 have none. Random Number left free: 10 ("missile bonuses", a Rope, 4
     count by the number). Also: the Ironheart Broadsword's +8 (204) is left as text, so check it
     against the engine's own weapon bonus; mark bow shots and ambushes.
   - **2.10 Book 12, The Masters of Darkness.** Fight pictures: 20 of 39 have none. Random Number left free: 10 ("bow-skill bonuses", a rope, 4
     count by the number). Also: Helshezag's and a weapon's increased power (88, 133) are left as
     text, so check them against the engine's own weapon bonus; mark bow shots and ambushes.

### Work for each book

- **Items and fight pictures**, by docs/reference/items.md. Write the item table: in the Magnakai
  books, mark ambushes and bow shots, because the engine applies them only there. Add a
  plate-library entry for every enemy the importer lists "with none". The Random Number draws left
  free go into the item table. "Count by the number" means the draw gives gold or Endurance (write
  `rolls`) or plays a game. In every book, first-round penalties, unarmed opening rounds and
  doubled psychic bonuses are left as text. The item table can carry them as a `todo`, or mark the
  fight as an `ambush`.

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
- Book 1's fight pictures, reviewed with the owner 2026-10-03: the Vordak and Doomwolf 1-4 now use
  the bestiary's drawings; Giak, Giak 1, Giak 2 and Giaks the Citadel flyer's Giaks (all `over`
  entries, since the importer gave them the book's Giaks-on-wolves plate); the Leader and Soldier 1
  of section 180 the flyer's Guard Officer and Citadel Guard, Soldier 2 the spare veteran; the
  Robber the spare masked rogue. The rest keep their pictures.
- Offline on the iPad works (2026-10-03, docs/reference/offline.md): Tailscale serves the player at
  `https://maltesepc.tail20dd6b.ts.net/` (`tailscale serve --bg 8765`, tailnet only); the iPad's
  Home Screen copy played with no connection. `tools/serve.py` must run on the PC for it to sync.
- Title page gets crowded with twelve books.
- Book 2 test-played 2026-10-03: every gate, fight and draw read against the text (one fault: 160's
  discipline choices were open to all, fixed in the importer), all 350 sections stepped through, a
  run reached 350. Left open, harmlessly: "if you have no money / do not have it" routes.
- Delete `prototypes/` (and `shared/art.js`, `battle.js`, `flow.js`) once the owner is sure.

## Waiting on the owner

Nothing at present.

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
- The map is the book's own printed map (2026-10-05). No custom maps or made-up places.
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
- Going back up to three sections (2026-10-01): on the death panel. Saves keep only those three
  snapshots now.
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
- Item tables for Books 4-12 (2026-10-05): `items-04tcod.js` to `items-12tmod.js`, written by one
  agent per book and reviewed: every book `check_items.mjs` clean, registered in `ITEM_TABLES`, loaded
  in the page with a stand-in hero (gifts, a bow shot, an Arrow spent, a herb gate). 90-121 sections
  and 9-22 book items each; 18-46 `todo`s each. In review: one id per object across books (the
  Dagger of Vashna, Silver Bow of Duadon, Oede Herb, Rendalim's Elixir, Gallowbrush and Onyx
  Medallion were each defined twice; Book 3's key had taken Book 1's `silverKey`), and Arrow or
  Torch counts the text does not give were made `todo`s or offered in full. Not yet played through.
  What the engine cannot hold, left as `todo`s (candidates for engine work, the owner to choose): a
  fight change for the first round or two only (most ambushes are this, so few fights are marked
  `ambush`); a fight stopped after some rounds or at an Endurance; his own losses doubled or halved;
  a Lore-circle bonus in one fight; a gate needing two items together (a Torch and a Tinderbox) or an
  Arrow; equipment taken away and handed back later (Books 5, 7, 9); Book 12's Kika. The importer
  reads "Discipline X or the rank of Y" choices as one condition (Book 11 301 and 343, Book 12 188):
  an importer fix.
- Battle plates made from the book's illustrations, restyled as sepia ink, shown whole with ruled
  frames cut away and every edge faded (2026-10-01). Enemies the book does not picture borrow
  another book's illustration or a free engraving (`assets/plates/plates.json`). Emblem fallback.
  Book 2 (2026-10-02): every enemy has a picture. Its council of travellers are cut from the book's
  own portrait page, the Helghast and zombies use its own plates, and its guards, villagers, sailor
  and card cheat borrow other books' plain humans; the Zombie Captain and the guards no longer show
  Book 4's turbaned warrior. Library entries can be limited to one book (`book`). Not yet shown to
  the owner.
- Map: the book's own printed map, repainted sepia, draggable.
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

# Plan

Work not yet done that is not a book step. Rough; to be refined with the owner. Last updated
2026-11-02. What the player does now is in `docs/reference/`, what it is meant to do in
`docs/spec.md`, and the owner's decisions in `docs/adr/`; finished work leaves this file for those.

Where each book stands, step by step, is not kept here: the import dashboard
(`http://localhost:8766/tools/admin/`, `docs/reference/dashboard.md`) works it out from the files and
the hand marks, and `docs/book-checklist.md` holds the same table. Work found here that belongs to
every book can become a step or a check there.

## Next steps

In order of importance. The owner picks what is done, and when. Books 1-29 are downloaded and
imported.

### Classify the AI fight pictures

Every AI-made picture is in git-ignored `art/plates/` (ADR 0042). The owner goes through them on the
Picture sources sheet and marks "Made with AI" each one made from the prompt alone, which commits it.

### The New Order series (Books 21 on)

The series is in the engine, the importer and the page (ADR 0047; `docs/reference/rules-books.md`).
Book 21 (`21votm`) goes through its steps as usual (`docs/book-checklist.md`). What is left:

1. Books 22-29, the last on Project Aon, are downloaded and imported. Each adds its kit to `LW.KITS`
   at its step 4, and until then a hero begins it without one. A later book that gates on a Kai
   Weapon by name would need a Condition for it (Book 21 has none).
2. **Each of Books 22-29 to "human ready"** (ruling R32): every step an agent can do, done and
   marked, so that what is left is the owner's alone (step 7's proposals settled and marked; the
   map's Labels checked, Gemini rounds and Finish). A book is run when the owner asks, in book
   order, one at a time (the importer, `rules-books.md`, `LW.KITS` and `main.js` are shared, and
   each book's rules diff and carried items build on the one before). Each agent step goes to a
   fresh subagent on the main model with the dashboard's prompt for it (`tools/admin/prompts.js`):
   1. Step 3, phrasings (Book 22's is done); `check_all.py` after any importer change.
   2. The reading copy made again (`reading_copy.py`, `item_sections.py`).
   3. Step 4, the rules addendum, and the book's kit in `LW.KITS`.
   4. Step 5, the item table from the script's draft: its todos read, icons fetched, checker clean,
      registered.
   5. Step 6, test play: the walk, then the book played in Node; misreadings fixed in the importer
      or the table, what stays left to the player listed under "Engine work found in play".
   6. Step 9, illustrations upscaled 2x, then re-imported through `check_all.py` (Book 29 has none).
   7. Step 7 rechecked: an enemy renamed or read afresh by steps 3 or 6 has its `plates.json` entry
      or proposal row redone. The first round of proposals and the maps' first pass were done
      2026-11-01 (notes for the owner in git-ignored `data/projectaon/first-pass-notes.md`).
   8. `book_status.py show` confirms every mark; the book's line in those notes is brought up to date.

   Any engine change beyond the kit is asked of the owner first and the run stops there. The agent
   never commits: the owner checks the book, then asks for its commit, one a book. Book 21 is
   human ready (2026-11-02): step 7's proposals and the map's own steps wait for the owner.

### Fight balance

The owner's to decide later: fights feel too easy, and lesser enemies and bosses could be ruled apart. The findings
and options are in `docs/reference/fight-balance.md`.

### Engine work found in play

What a book's play-through left to the player that the engine could take over:

- **A trader who buys any Special Item at one price** (Book 8's 139: 8 Gold Crowns each, the Ring
  just bought excepted). `sell` takes item ids only; a `special: price` with an `except` list would
  do it.
- **A flag that came after the hero passed its section** (Book 9's 142 and 323: "visited Varetta or
  a hut on the Ruanon Pike" before). The hut is Book 4's `visitedStargazer` (84); Varetta would be a
  flag set at Book 6's 158, Gwynian's cellar, on every way to its end. A hero made since 2026-10-12
  has `flagsRead` and is never backfilled, so one who played Book 6 before the new flag would find the
  gate shut wrongly. With the backfill run once per flag (`flagsRead` a list of the flags read), both
  sections could be gated. Book 10 asks the same of lands: Talestria (6, 179) and the Danarg (80,
  142, 219, 328), both crossed in Book 8, and the Stornlands (200, 306), where which books count is
  the owner's reading; flags set on Book 8's way through each would gate them. Book 13's 285 asks
  for the town of Quarlen or the ruins of Maaken in an earlier book: Maaken is Book 4's
  `visitedMaakenTemple`, Quarlen would be a flag set at Book 6's 332 (the town reached), which the
  backfill would also need. Book 14's 186 asks for Mogaruith, reached in Book 13: a flag set where
  Book 13 enters it would gate it. Book 16 asks the same three times: Varetta, Tahou or the
  Ruanon Pike hut (12, 279), Aarnak (105), and Kaag or Mogaruith (250). Book 17 asks for the Battle of
  Cetza or Darke (22), the Isle of Ghosts (149, 160, 349) and the Plane of Darkness (150). Book 18
  asks for Varetta (56), a hut on Raider's Road, Tahou or Lake Vorndarol (90, 112, 194, 308),
  Stonewatch (121), Garthen or Torgar (175), Quarlen or the Isle of Ghosts (240), and Ixia or Lake
  Vorndarol (280). Book 23's 1 asks whether he visited Caeno in an earlier New Order book (165 or
  299, both left open): a flag set where Book 22 reaches the city would gate it.
- **The weapon he fights with, chosen in the fight.** The engine fights with the weapon that adds
  most, so a choice the text leaves to him is not his: Book 12's Helshezag, which costs 1 ENDURANCE
  for good a round, is taken up only where a fight names it (133, 230, 88), so "if you wish to use
  it" at 104 and 342 (and in later books) cannot be taken; and the best weapon is picked before a
  fight's penalty on its kind is counted (Book 12's 68: -2 with any weapon but a broadsword, spear or
  quarterstaff, so a mastered spear can lose to a sword it ties with). Book 16's 345 leads on by
  whether the Deathstaff was used, and the page takes it only when it adds most; Book 17's 35 and 281
  (173 or 293) and 96 and 287 (238, else by the rounds) by whether the Sommerswerd was. Book 17's 220
  sets the Dessi Stone in the weapon he hands over, which then doubles an undead foe's losses: a mark
  on the weapon chosen would carry it. A weapon picker on the fight's panel would do all of these.
- **Things kept from one place** (Book 9's 154: "if you kept any of the items you found in the hut",
  190 or 265). The hut's Rope and Lantern are found elsewhere too, so holding them proves nothing; a
  mark set when a loot entry is taken (`loot: [{ item, mark }]`) would do it.
- **A draw that asks whether the number is even or odd** (Book 14's 177 and 232, Book 15's 105, Book 16's
  285). `ranges` takes intervals only, so both ways stay open after the draw; an `even` / `odd`
  range would gate them.
- **A gate on a rank not yet reached** (Book 17's 254 and 300: "if you have Kai-surge (Kai-screen) but
  have yet to reach" Sun Lord (Sun Thane)). The engine can gate it already, `any: [{ disc, not: { rank } }]`,
  as Book 19's table does (270 from 36, 47, 108 and 317; 208 from 128; 146 from 334) and Book 20's; the
  importer leaves "have yet to" open, so Book 17's 216 and 131 stay open beside 123 and 223 for one who
  has the rank, and Book 18's 301 (52, Kai-alchemy below Sun Thane, beside 273 and 137) the same. The
  importer reading it, or those tables writing it, would shut them. The walk's two stand-ins never
  hold such a Discipline below its rank, so it lists these ways as never opened (Book 19's 36 -> 270
  and 128 -> 208).
- **A duel at a fixed Combat Ratio** (Book 19's 304: -4 whatever his bonuses, the foe's ENDURANCE his
  own at the start, 4 less with the Bronze Disc, stopped when the foe's falls to 10). A fight field for
  a set ratio and a foe's ENDURANCE taken from his would do it; it is the table's todo there.
- **A share of the Backpack, his choice** (Book 18's 317: short of 20 Gold Crowns, half the Backpack
  Items as well as a Special Item). `pick` takes a count only; `n: 'half'` (rounded as the owner
  rules) would take it. It is the table's todo there.
- **The last places of the Backpack** (Book 20's 330: the items in the last three places lost; 8 takes
  the first three, `at: [1, 2, 3]`). `at` counts from the front only; places counted from the end
  (with how empty places count left to the owner) would take it. It is the table's todo there.
- **ENDURANCE given up to raise a draw** (Book 21's 51 and 197: 1 added to the number for each point
  he chooses to lose). Both are free draws with a todo; an `rntMod` paid in ENDURANCE, the points set
  before the draw, would take them. Book 23's bribes ask the same of Gold Crowns: 1 added for each
  Crown offered past the first 2 (112, 209); the stake takes the Crowns, and an `rntMod` counted from
  the stake would add the points. Book 24's 328 adds every Crown offered (8 or less to 32, 9 or more to
  234), its todo there.
- **A Discipline lost for the rest of the book** (Book 24's 61, 289 and 334: one Grand Master
  Discipline of his choice, given back after the book). The player keeps it unused by hand; a `pick`
  of a Discipline that the gates and bonuses then leave out until the book ends would take it. It is
  the table's todo there.
- **A money changer** (Book 23's 37: 5 Lune for each Gold Crown; 74: 4 Torqs for each, which 161's
  gate then asks for). A loot entry buys an item in any coin but cannot buy a coin with Gold Crowns, as
  its `coin` names the price's coin; a buy of so many of a coin for one Crown, as often as he likes,
  would take both. They are the table's todos there; the walk lists 161 -> 236 as never opened.
- **A fee or, short of it, an item** (Book 23's 32: 8 Lune or 2 Gold Crowns, else 1 Weapon or 1
  Backpack Item of his choice). The section has one way on, so no gate can split it; a `take` that
  asks the price first and a `pick` only when he is short would take it. It is the table's todo there.
- **Offerings that give back ENDURANCE** (Book 21's festival: 182, 1 for each Gold Crown laid down; 277,
  3 for each Backpack Item; 103, 6 for each Special Item but the Moonstone and the Iron Skull). 182's
  stake takes the Crowns but not the points; a stake or a pick that restores so much a unit would take
  all three. They are the table's todos there.
- **A Special Item that heals when used** (Book 22's Pouch of Seota Dust, given at 167: 10 ENDURANCE,
  once). `heal` and the Laumspur button take Backpack Items only, so the player drops it and adds the
  points by hand; `heal` read on a Special Item too would take it.

### Book notes outside the steps

Things to check while a book goes through its steps, which no step asks for:

- Book 3's sledge food is left to the text.
- Book 3: what its 2026-10-09 play-through left to the player is now applied (Sixth Sense below
  Guardian, the Effigy or the Sommerswerd at 173, 108's two ways out in mid-fight); check it in the
  next play.
- Book 13's 16 asks for Baylon's Bough Fungi, found in Book 11 (146), a Backpack Item: Book 12's
  rules carry only Weapons and Special Items, so no character can bring them to Book 13 and 277
  never opens (ruling R18 keeps them after 277). The owner's reading: leave it, or carry Book 11's
  Backpack Items through Book 12 (as the Grand Master series carries them in).
- Book 2's `labels.json` is still a copy of Book 1's, kept apart so Book 2 can gain its own city
  maps. Its `style.txt` is its own (written for a repaint never made), not the one the map was
  painted with.

### Pictures in hand for later fights

For step 7 in the books still open (all git-ignored, personal use):

- The owner's drawings in `art/plates/` not yet used: an elf swordsman, two swordswomen (Book 4's
  hooded bandit leader, section 233, may suit the hooded swordsman too) and two painted peasants.
- `art/plates/bestiary-gourgaz-zlanbeast-vordak-doomwolf.webp`: the owner's photo of a printed
  bestiary spread. Its Vordak and Doomwolf are used; the Gourgaz and the Zlanbeast or Kraan need a
  careful crop (photographed at an angle, text wrapped round) and a levels setting.
- Citadel's Dec 1984 Lone Wolf miniatures flyer (`art/plates/citadel-c41-flyer-1984.jpg`; personal
  use, the site says not to copy): line drawings, eight crops used in Books 1-2; more may suit.
- The illustration index (`data/projectaon/ill-index.json`, `about/ill-notes.json`) notes all 405 pictures
  of Books 1-20, for borrowing another book's picture (items.md, "Fight pictures").
- **What each picture and enemy is** (`about` and `foes`, ADR 0008), left for the owner: reading
  them on the sheets and correcting any; about 110 pictures, mostly small, say the text does not say
  what they show. The stand-ins' entries still describe the picture itself (owner to decide). The
  small pictures have no `shows` note (`--missing`, "no note").

### Rules sweep once the series is done (after Book 20)

Book addenda are written per book and checked by the rules diff, so they need no re-read. What can
fall behind is the rest:

- **Engine features reaching back.** A mechanic added for a later book (as `grandBow`, `wieldCost`,
  coin purses and stakes were) may cover a spot an earlier book left to the player or as a `todo`.
  Each time one is added, grep the earlier addenda in `rules-books.md` and the item tables for "left
  to the player", "by hand" and `todo` that it now covers (mechanical: a Sonnet subagent's job).
- **The series sections.** After Book 20, read the common, Kai, Magnakai and Grand Master sections
  of `rules-books.md` once against what the engine does then, and bring every Engine column and
  "Book N lists ..." line into line.

### Oddities the unit tests noticed

Maybe deliberate, so left: `plates_file.put()` drops an entry's earlier crop or levels when saved
without them; the importer marks the highest section `victory` even when it is a dead end;
`map_labels.py` defines `norm` twice.

### Not yet checked

- Magnakai rules in play: Books 6-12 played through with the engine in Node from 2026-10-21 to
  2026-10-23; not yet on the iPad.
- The baked 4K map on the iPad: its load time, fit, pinch zoom and long-press.

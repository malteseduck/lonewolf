# Plan

Work not yet done that is not a book step. Rough; to be refined with the owner. Last updated
2026-10-25. What the player does now is in `docs/reference/`, what it is meant to do in
`docs/spec.md`, and the owner's decisions in `docs/adr/`; finished work leaves this file for those.

Where each book stands, step by step, is not kept here: the import dashboard
(`http://localhost:8766/tools/admin/`, `docs/reference/dashboard.md`) works it out from the files and
the hand marks, and `docs/book-checklist.md` holds the same table. Work found here that belongs to
every book can become a step or a check there.

## Next steps

In order of importance. The owner picks what is done, and when. Books 1-16 and 20 are imported;
importing Books 17-19 (downloaded) is the owner's go-ahead.

### The New Order series (Books 21 on)

A fourth series, with a hero of the player's own instead of Lone Wolf. Book 21 (`21votm`, 350
sections, 23 fights) was downloaded on 2026-10-22 for a first look, not imported; its rules pages are
in `data/projectaon/21votm/`, and the Readers' Handbook's New Order pages in
`data/projectaon/readers-handbook/`. Downloading Books 22 on, and importing any of them, is the
owner's go-ahead. Rough size: about one and a half times Book 13's Grand Master work (G1-G7), then
each book's steps as usual. In order:

1. **The owner's readings**, before the engine work: the rank you set out at (the Handbook's rank
   table starts at 4 disciplines, Book 21 gives 5); Grand Weaponmastery with Bow (+5 in Book 21,
   +3 in the Handbook); whether a Grand Master Lone Wolf may carry into Book 21 or the series always
   starts a new Kai; Deliverance's "once every 20 days" (once a book, as ruling R9?); the Kai Weapon's
   higher bonus (by hand in the fight, or marked on fights in the item table); Book 21's other
   currencies (tracked, or left to the text).
2. **The series as tables**, a refactor worth doing first: the rules that branch on the series by a
   chain of tests (`LW.heals`, `hunts`, `shielded` and the like, about 58 places in
   `shared/rules-series.js`, 17 in `main.js`) read from `LW.SERIES` instead, so a series is added
   in one place. No change to play; the suites guard it.
3. **The rules read**: a New Order section in `docs/reference/rules-books.md` from Book 21's rules
   pages (scores 25/30 + a Random Number, five of 16 disciplines and one a book, +1 COMBAT SKILL and
   +2 ENDURANCE for each past five, the ranks, the four new disciplines, Curing's 10 a book, the
   Kai Weapon, gold 20 + a Random Number), Book 21's addendum, and a New Order ADR for the owner's
   readings.
4. **The series in the engine**: `LW.SERIES` for New Order (its disciplines, first five, ranks, base
   scores, Grand Weaponmastery's single first weapon), Astrology, Herbmastery, Elementalism and
   Bardsmanship as gates, Curing's cap of 10 a book, the bonus for disciplines past five. Tests
   first.
5. **The hero of the player's own**: a name (the Kai-name tables, or typed), and his or her pronouns,
   at setting out; every place the page writes "Lone Wolf" or "he" (the Kai panel, the shelf, the
   book's end, the portrait) takes them from the hero. A New Order adventure is its own adventure,
   as another Lone Wolf is now.
6. **The Kai Weapon**: chosen or picked at random at setting out, a Special Item kept for the whole
   series, +5 in a fight, its higher bonus as item 1 decides, and Grand Weaponmastery's +5 beside it
   when the weapon type is mastered.
7. **The importer**: the series' books, the four discipline names, ranks looked up within the
   series ("Kai Grand Master Senior" is rank 1 of the Grand Master series, the start of the New
   Order), and the Kai Weapon's gates. Then Book 21 is imported (the owner's go-ahead) and goes
   through its steps.
8. **The page**: a fourth band of numerals on the title page and a New Order shelf; the Kai sheet's
   16 medallions (two rows of eight) fitting on the iPad; medallion art for the four new
   disciplines.
9. **Book 21's currencies** at setting out (the exchange for Ren, the mixed pouch), if item 1 says
   to track them.

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
  Vorndarol (280).
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
- The 4K map's fit, zoom and 4096 px canvas cap on the iPad.

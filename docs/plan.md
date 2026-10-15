# Plan

Work not yet done that is not a book step. Rough; to be refined with the owner. Last updated
2026-10-12. What the player does now is in `docs/reference/`, what it is meant to do in
`docs/spec.md`, and the owner's decisions in `docs/adr/`; finished work leaves this file for those.

Where each book stands, step by step, is not kept here: the import dashboard
(`http://localhost:8766/tools/admin/`, `docs/reference/dashboard.md`) works it out from the files and
the hand marks, and `docs/book-checklist.md` holds the same table. Work found here that belongs to
every book can become a step or a check there.

## Next steps

In order of importance. The engine is in modules and tested before its rules change (ADR 0024:
done 2026-10-11 for the fight, the item tables and the adventures; what is left is under "Code to
make testable"). Books 1-12 are imported and being played; the engine now applies nearly all their
`todo`s (2026-10-12). The Grand Master series is needed before Book 13 can be played; Book 13 is
imported (2026-10-14). Each item ends with why it stands where it
does: "Needs" is a hard dependency, "judgement" an order chosen, not forced. The owner picks what is
done, and when.

### Dashboard: a script for every step (ADR 0036)

Every book step gets a button that runs a script; where judgement is needed the script writes a
draft or a report (certain readings filled in, the rest `todo` or listed by section id), and the
agent's Copy prompt refines it. In the owner's order (2026-10-14; D1, Setup, D2, the item table's
draft, D3, the fight pictures' draft, and D4, the phrasings scan, done that day, and D5, the walk,
on 2026-10-15: dashboard.md, items.md "The draft" twice, importer.md "The leftover scan",
rules-engine.md "The walk"):

- D6. **Rules diff** (step 4): the book's rules pages against the previous book's, page by page, and
  a skeleton addendum (kit numbers, new pages) for the owner to check.
- D7. A book the importer does not know: added to its table from the catalogue by script.
- D8. Map: a default `style.txt` and a heuristic for the retype ticks (the key, scale, title).
  The Gemini repaint stays the owner's (ADR 0036).
- D9. **Art source links** (ADR 0038): a committed list of each `art/` picture's link; the picture
  sheet takes a picture by URL (fetched by the server, link recorded) and asks for a link on drop or
  paste ("no link" allowed); Setup counts what can be fetched again and fetches it (gated). The
  pictures already there get links from the owner.

Each new script gets tests of its main path and a line in `docs/reference/dashboard.md`; each prompt
tells the agent to start from the script's output. Judgement: before the Grand Master work, so the
scripts are tried on Books 10-12's open steps first.

### The item tables' last todos

The engine work that retires the tables' `todo`s was done on 2026-10-12 (rules-engine.md, book-format.md;
ADRs 0026, 0027): 323 todos then, 17 now (the games of chance done the same day). The rest, in order of how often they come up; teach the engine a
case when it is met in play, rather than flagging it (ADR 0027):

1. **Shops**: one item only (B6 10), at most N (B6 123), selling Arrows by the four (B6 98), paying with an
   item when short of gold (B6 17), a price in Special Items or gold (B6 212).
2. **Fights**: rounds set by a number drawn (B4 194, 234), a draw after each round he would have lost
   Endurance in (B3 88), losses that come off his maximum after round 1 (B12 268).
3. **Items**: a Helmet and the Silver Helm not counting together (B7 148, a series rule); a stake of items
   (B9 115, 204); the Backpack halved by a coin (B9 91); which remedy was used when he has several (B8
   178, 331, 349); a draw against the Crowns thrown (B3 152); a weapon the text does not name (B11 8).
4. **Display**: during a contest in target points (Book 6's final) the Endurance gauge shows the points.

Left to the player whatever the engine does: whether to sleep (B2 41 is now applied by `came`), the Arrows
spent at B8 164 (the text gives no number), the puzzles, and B5 162's climb (a by-hand stop, `byHand`).

### Grand Master series (Book 13 on)

Book 13's rules were read on 2026-10-10 (rules-books.md, "Grand Master series"). The importer knows
Book 13 (2026-10-11: its disciplines, ranks, and foes `immune: 'psi'`), but the engine has none of
its rules. Until it does, Book 13's gates on Grand Master Disciplines would never open (no character
holds one) and a carried hero would play it by Kai rules. Importing it is the owner's go-ahead, apart
from this work.

**Engine work**, in order (G1 first: everything else reads the series):

- G1. A third series in `LW.SERIES` (`grandmaster`: twelve disciplines, `first: 4`, field
  `grandmaster`, the twelve ranks), and every `series === 'magnakai'` test in `rules-series.js`,
  `main.js` (Lore-circles row, `skilled`, the ambush) made to say what
  a Grand Master book does. Not started (2026-10-11: `LW.SERIES` has `kai` and `magnakai` only).
- G2. Setting out: a new character 25 + RN / 30 + RN, holding all Kai and Magnakai Disciplines; four
  Grand Master Disciplines; Grand Weaponmastery's two weapons (then one a book, as Weaponmastery's
  three then one); from Book 14, +1 COMBAT SKILL and +2 ENDURANCE for each discipline past four. A
  carried character keeps his scores with every bonus, and is not offered a re-roll (ADR 0019).
  Needs: G1.
- G3. Carrying into the series: the Backpack's items kept, Meals not (ADR 0011); Special Items cut
  to the ten listed, the others dropped (ADR 0019); Lore-circle COMBAT SKILL folded into his base
  score (the engine adds it per fight, and only in Magnakai books). Needs: G1.
- G4. Book 13's kit in `LW.KITS[13]` (gold 20 + RN; choose 5), and Monastery storage in this series
  too (the Backpack of 10, `LW.backpackMax`, and the 12 Special Items, `LW.specialLimit`, are done:
  they wait only on `series: 'grandmaster'` from G1). Needs: G1; after G3 (judgement: the same setting-out step).
- G5. Disciplines with numbers: Grand Weaponmastery +5 (replacing Weaponmastery, not added; Bow +5,
  Mentora's +2 not added), Kai-surge (+8 at 1 a round, Mindblast +4, not at 6 or less) in `LW.psi` and
  the fight's medallions, Deliverance (20 back at 8 or less, in the fight like Archmaster Curing; once
  a book, ADR 0019), Grand Huntmastery in `LW.hunts`; a carried character's chosen Magnakai
  Disciplines keep their numbers until replaced by their Grand Master counterparts (ADR 0018). Book
  13's 8 foes immune to Mindblast and Psi-surge but not Kai-surge (31, 45, 120, 156, 157, 186, 212,
  243) are read by the importer and already deaf to the first two; Kai-surge must get through (295
  is Mindblast only). Needs: G1. The psychic multipliers it builds on (fight `rounds` `psi`) are done.
- G6. The Kai sheet's grid of twelve disciplines and their glyphs, and the ranks. Needs: G1.
- G7. Then register the Grand Master item tables in `main.js`. The dashboard opens their test play and
  registering by itself once `LW.SERIES` has the series (ADR 0039). Needs: G1-G5.

**Decided 2026-10-10** (the Readers' Handbook downloaded that day, then the owner): ADR 0018 (which
earlier disciplines keep their numbers: a carried character's chosen Magnakai ones, replaced by
their Grand Master counterparts), ADR 0011 amended (Backpack Items carry into the series, Meals not),
ADR 0019 (other Special Items dropped, Deliverance once a book, no re-roll). G2, G3 and G5 follow
them.

### Book notes outside the steps

Things to check while a book goes through its steps, which no step asks for:

- Weapon bonuses the item tables give as the fight's `csMod`, to check in play against the engine's
  own weapon bonus (that the two do not add): Book 9's Psychic Ring +8 (214), Book 11's Ironheart
  Broadsword +8 (204). Book 12's Helshezag (133) and weapon of increased power (88) now use `lend` /
  `weaponCs`, which replace the weapon's own bonus; check those in play too.
- Book 3's sledge food is left to the text.
- Book 3's play-through (2026-10-09): what it left to the player is now applied (Sixth Sense below
  Guardian, the Effigy or the Sommerswerd at 173, 108's two ways out in mid-fight); check it in the next play.
- Book 2's map files are copies of Book 1's (2026-10-09), kept apart so Book 2 can gain its own city
  maps. Its `style.txt` is its own (written for a repaint never made), not the one the map was
  painted with.

### Pictures in hand for later fights

For step 7 in the books still open (all git-ignored, personal use):

- The owner's drawings in `art/plates/` not yet used (2026-10-11): an elf swordsman, two swordswomen
  (Book 4's hooded bandit leader, section 233, may suit the hooded swordsman too) and two painted
  peasants. The spearman went to Book 5's sentry.
- `art/plates/bestiary-gourgaz-zlanbeast-vordak-doomwolf.webp` (a copy of the one in
  `art/reference/bestiary/`): the owner's photo of a printed bestiary spread. Its Vordak and Doomwolf
  are used (Books 1 and 3, the Vordak in every book); the Gourgaz and the Zlanbeast or Kraan need a
  careful crop (photographed at an angle, text wrapped round) and a levels setting.
- Citadel's Dec 1984 Lone Wolf miniatures flyer (`art/plates/citadel-c41-flyer-1984.jpg`; personal
  use, the site says not to copy): line drawings, eight crops used in Books 1-2 (Giaks, a leader, a
  soldier). The other catalogue scans and their `cutouts.json` are no longer on disk.
- The illustration index (`data/projectaon/ill-index.json`, `ill-notes.json`) notes all 405 pictures
  of Books 1-20 (2026-10-11), for borrowing another book's picture (items.md, "Fight pictures").

### Oddities the unit tests noticed

Maybe deliberate, so left: `plates_file.put()` drops an entry's earlier crop or levels when saved
without them; the importer marks the highest section `victory` even when it is a dead end;
`map_labels.py` defines `norm` twice.

### Code to make testable

The engine's rules are out of `main.js` (ADR 0024, 2026-10-11): the fight is `LW.Fight`
(shared/fight.js), the item tables `LW.applyItems` and `LW.itemByName` (core.js), an adventure lost
(`game.lost`) and the character a book begins with (`LW.Character.carries`), adventures and backups
`adventures.js`, each with tests, and each checked against the old code. Left:

- `main.js` is drawing and input; `shown`, `storyText`, `roman`, `itemGlyph` and `kitName`/`kitAbout`
  are wording and drawing, which ADR 0022 leaves untested.
- `import_projectaon.py`, `item_sections.py`, `reading_copy.py` and `fetch_projectaon.py` do their
  work on import; their tests run a copy as a whole. (`check_items.mjs` and `plates_pin.mjs` export
  their work since 2026-10-11.)

### Not yet checked

- Magnakai rules and carry-over: tested with copies of the demo chapter marked as other books, and
  (2026-10-03) a few real sections of Books 6 and 12 (a Random Number bonus, a fight with a
  discipline's bonus, a foe immune to Mindblast only, evasion in the first round only); not played
  through a real Magnakai book.
- The 4K map's fit, zoom and 4096 px canvas cap on the iPad.

# Plan

Work not yet done that is not a book step. Rough; to be refined with the owner. Last updated
2026-10-16. What the player does now is in `docs/reference/`, what it is meant to do in
`docs/spec.md`, and the owner's decisions in `docs/adr/`; finished work leaves this file for those.

Where each book stands, step by step, is not kept here: the import dashboard
(`http://localhost:8766/tools/admin/`, `docs/reference/dashboard.md`) works it out from the files and
the hand marks, and `docs/book-checklist.md` holds the same table. Work found here that belongs to
every book can become a step or a check there.

## Next steps

In order of importance. The engine is in modules and tested before its rules change (ADR 0022:
done 2026-10-11 for the fight, the item tables and the adventures; what is left is under "Code to
make testable"). Books 1-12 are imported and being played; the engine now applies nearly all their
`todo`s (2026-10-12). The Grand Master series is needed before Book 13 can be played; Book 13 is
imported (2026-10-14). Each item ends with why it stands where it
does: "Needs" is a hard dependency, "judgement" an order chosen, not forced. The owner picks what is
done, and when.

### The item tables' last todos

The engine work that retires the tables' `todo`s was done on 2026-10-12 (rules-engine.md, book-format.md;
ADR 0027, ruling R3): 323 todos then, 16 now (the games of chance done the same day; Book 4's underwater fights 2026-10-17). The rest, in order of how often they come up; teach the engine a
case when it is met in play, rather than flagging it (ADR 0027):

1. **Shops**: one item only (B6 10), at most N (B6 123), selling Arrows by the four (B6 98), paying with an
   item when short of gold (B6 17), a price in Special Items or gold (B6 212).
2. **Fights**: a draw after each round he would have lost
   Endurance in (B3 88), losses that come off his maximum after round 1 (B12 268).
3. **Items**: a Helmet and the Silver Helm not counting together (B7 148, a series rule); a stake of items
   (B9 115, 204); the Backpack halved by a coin (B9 91); which remedy was used when he has several (B8
   178, 331, 349); a draw against the Crowns thrown (B3 152); a weapon the text does not name (B11 8).
4. **Display**: during a contest in target points (Book 6's final) the Endurance gauge shows the points.

Left to the player whatever the engine does: whether to sleep (B2 41 is now applied by `came`), the Arrows
spent at B8 164 (the text gives no number), the puzzles, and B5 162's climb (a by-hand stop, `byHand`).

### Grand Master series (Book 13 on)

Book 13's rules were read on 2026-10-10 (rules-books.md, "Grand Master series"). The importer knows
Book 13 (2026-10-11: its disciplines, ranks, and foes `immune: 'psi'`); the engine has the series (G1)
setting out (G2), carrying in (G3), the new disciplines' numbers (G5) and the Kai sheet (G6), so the
engine work is done; what is left for Book 13 are its book steps after the item table (done 2026-10-17). Importing Books
14-20 is the owner's go-ahead.

**Engine work**, in order (G1 first: everything else reads the series):

- G1 done 2026-10-16 (rules-engine.md, "rules-series.js"): `LW.SERIES.grandmaster`, the gates, the
  chosen Magnakai numbers. Since then the dashboard offers Book 13's test play (ADR 0036).
- G2 done 2026-10-16 (rules-engine.md, "Setting out"): 25 + RN / 30 + RN, four disciplines then one a
  book with +1 / +2 past four, Grand Weaponmastery's weapons in `hero.grandMastery`, no re-roll. Book
  13's walk now leaves one fight unwon (38, a foe at 50 the section lets him evade).
- G3 done 2026-10-16 (rules-engine.md, "Grand Master book"): Backpack Items kept, Meals not; Special
  Items cut to the ten, at the Monastery too; Lore-circle COMBAT SKILL folded in.
- G4 done 2026-10-16: Book 13's kit step keeps the Monastery (Special Items over 12, gold over 50)
  for a Grand Master character, as in the Magnakai books; it needed no change, only its test.
- G5 done 2026-10-17 (rules-engine.md, "Grand Master book"): Grand Weaponmastery, Kai-surge (through
  Book 13's foes immune to Mindblast and Psi-surge), Deliverance, Grand Huntmastery, each in place of
  its Magnakai counterpart's number.
- G6 done 2026-10-17 (interface.md, "kai"): the Kai sheet's grid of twelve, six a row, with their
  glyphs; the ranks were already in G1.
- G7 done 2026-10-17: nothing to register yet. `LW.SERIES` has the series, so the dashboard offers the
  Grand Master books test play (step 6) and asks for their item tables to be registered in `main.js`
  `ITEM_TABLES` as part of step 5 (ADR 0036); Book 13's was registered with its table on 2026-10-17.

**Decided 2026-10-10** (the Readers' Handbook downloaded that day, then the owner): ADR 0011 (which
earlier disciplines keep their numbers: a carried character's chosen Magnakai ones, replaced by
their Grand Master counterparts; Backpack Items carry into the series, Meals not; other Special Items
dropped; no re-roll) and ruling R9 (Deliverance once a book). G2, G3 and G5 follow them.

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

The engine's rules are out of `main.js` (ADR 0022, 2026-10-11): the fight is `LW.Fight`
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

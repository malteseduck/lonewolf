# Plan

Work not yet done that is not a book step. Rough; to be refined with the owner. Last updated
2026-10-21. What the player does now is in `docs/reference/`, what it is meant to do in
`docs/spec.md`, and the owner's decisions in `docs/adr/`; finished work leaves this file for those.

Where each book stands, step by step, is not kept here: the import dashboard
(`http://localhost:8766/tools/admin/`, `docs/reference/dashboard.md`) works it out from the files and
the hand marks, and `docs/book-checklist.md` holds the same table. Work found here that belongs to
every book can become a step or a check there.

## Next steps

In order of importance. The owner picks what is done, and when. Books 1-14 are imported; importing
Books 15-20 (downloaded) is the owner's go-ahead.

### The item tables' last todos

16 `todo`s are left in the item tables (Books 3-14). Teach the engine a case when it is met in play,
rather than flagging it (ADR 0027). In order of how often they come up:

1. **Items**: a Helmet and the Silver Helm not counting together (B7 148, a series rule); a stake of
   items (B9 115, 204); the Backpack halved by a coin (B9 91); which one was used when he has several
   (remedies, B8 178, 331, 349; Lantern or Torch, B14 223); a draw against the Crowns thrown (B3 152);
   a weapon the text does not name (B11 8).
2. **Draws**: two numbers drawn and compared, the first with a discipline's bonus (B5 360: second
   lower, higher or the same).
3. **Disciplines**: a Meal due with Grand Huntmastery but not Grand Nexus (B14 86); Magi-magic's
   Flameshaft offered by a footnote (B14 243).
4. **Display**: during a contest in target points (Book 6's final) the Endurance gauge shows the
   points.

Left to the player whatever the engine does: the Arrows spent at B8 164 (the text gives no number),
whether B13 277's fungi are used up (the text does not say), the puzzles, and B5 162's climb (a
by-hand stop, `byHand`).

### Book notes outside the steps

Things to check while a book goes through its steps, which no step asks for:

- Weapon bonuses the item tables give as the fight's `csMod`, to check in play against the engine's
  own weapon bonus (that the two do not add): Book 9's Psychic Ring +8 (214), Book 11's Ironheart
  Broadsword +8 (204). Book 12's Helshezag (133) and weapon of increased power (88) use `lend` /
  `weaponCs`, which replace the weapon's own bonus; check those in play too.
- Book 3's sledge food is left to the text.
- Book 3: what its 2026-10-09 play-through left to the player is now applied (Sixth Sense below
  Guardian, the Effigy or the Sommerswerd at 173, 108's two ways out in mid-fight); check it in the
  next play.
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
- The illustration index (`data/projectaon/ill-index.json`, `ill-notes.json`) notes all 405 pictures
  of Books 1-20, for borrowing another book's picture (items.md, "Fight pictures").
- **What each picture and enemy is** (`about` and `foes`, ADR 0008), left for the owner: reading
  them on the sheets and correcting any; about 110 pictures, mostly small, say the text does not say
  what they show. The stand-ins' entries still describe the picture itself (owner to decide). The
  small pictures have no `shows` note (`--missing`, "no note").

### Oddities the unit tests noticed

Maybe deliberate, so left: `plates_file.put()` drops an entry's earlier crop or levels when saved
without them; the importer marks the highest section `victory` even when it is a dead end;
`map_labels.py` defines `norm` twice.

### Not yet checked

- Magnakai rules in play in Books 7-12 (Book 6 played through on 2026-10-21; Book 12 tried on a few sections).
- The 4K map's fit, zoom and 4096 px canvas cap on the iPad.

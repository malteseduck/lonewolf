# Plan

Work not yet done that is not a book step. Rough; to be refined with the owner. Last updated
2026-10-11. What the player does now is in `docs/reference/`, what it is meant to do in
`docs/spec.md`, and the owner's decisions in `docs/adr/`; finished work leaves this file for those.

Where each book stands, step by step, is not kept here: the import dashboard
(`http://localhost:8766/tools/admin/`, `docs/reference/dashboard.md`) works it out from the files and
the hand marks, and `docs/book-checklist.md` holds the same table. Work found here that belongs to
every book can become a step or a check there.

## Next steps

In order of importance. Books 1-12 are imported and being played, so the engine work that retires
their `todo`s comes first; the Grand Master series is needed before Book 13 can be played, and Book
13 is not imported yet (that is the owner's go-ahead). Each item ends with why it stands where it
does: "Needs" is a hard dependency, "judgement" an order chosen, not forced. The owner picks what is
done, and when.

### Engine work to retire the item tables' todos

Every `todo` in `items-*.js` (2026-10-11: 323 across Books 1-12) is a rule the page leaves to the
player. These are the changes that would let it apply them. Sections are given as book/section; a
few in Books 1, 3, 4 and 9 hold no `todo`, the rule being left to the text shown. Each change, when
made, replaces the `todo`s it covers and updates the matching reference file. Not started.

1. **A by-hand way out of a fight and to any section** (found playing Book 3, 2026-10-09): the
   Turn to section box shows only in puzzle sections, and a fight can be left only by Evade, which
   costs a blow. The `todo`s that named the box were reworded to what the page can do (Books 3, 4
   and 6, 2026-10-09: fight on, then give back the ENDURANCE lost past the stopping point). A box
   under every section's choices, and a "stop the fight here" control without the blow, would spare
   those workarounds, and let B3 108's way on be taken in mid-fight.
   *First* (judgement): small, and the fallback for every fight the engine cannot yet end (3) and
   every way on it cannot see.
2. **Fight changes for some rounds only** (about 55): a COMBAT SKILL change for the first N rounds,
   spared by a discipline (most ambushes and surprises; Huntmastery spares many); fighting unarmed
   for the first N rounds; ignoring his own or the enemy's losses in the first N rounds. With it,
   `ambush` can be marked where the penalty lasts only some rounds. B1 283; B2 7, 60, 270; B3 241,
   260; B4 62, 147, 153; B5 4, 106, 119, 159, 280, 316, 393; B6 12, 114, 155, 254, 270; B7 19, 27,
   219; B8 183, 251, 252, 298, 323; B9 46, 116, 148, 182, 285; B10 28, 251, 336; B11 10, 68, 77,
   220, 256, 319; B12 5, 8, 16, 23, 32, 58, 83, 136, 194, 224, 247, 259, 276, 292.
   *Most `todo`s*, and the round-by-round fight state that 3 and 6 build on.
3. **The fight's length deciding the way on, or ending it** (about 40): won in N rounds or fewer
   goes one way; only N rounds are fought; one round, decided by who lost more; stop when he loses
   any ENDURANCE; break off when the enemy is down to N. B1 227, 231, 339; B3 32, 123, 138, 147,
   158, 164, 180, 200, 208, 259, 263, 296; B4 36, 47, 56, 133, 193, 260, 333; B5 244, 357; B6 78,
   201, 344; B8 257; B9 82, 104, 244; B10 41, 187, 286, 336, 349; B11 22, 97, 201, 206, 274.
   Needs: 2. The next most sections (30 with a `todo`), and it replaces 1's workaround in them.
4. **An ENDURANCE change unless (or if) he has something** (about 35): a discipline, a discipline
   at a rank, a Lore-circle, an item, or having eaten; and a drawn loss made smaller by one. B2 69,
   321; B3 27, 83, 129, 132, 150, 258, 299, 331; B5 264, 393; B6 171, 306; B7 26, 59, 85, 103, 104,
   241, 284; B9 61, 291; B10 29, 166, 203, 233; B11 118, 217, 299, 313, 332; B12 172, 258.
   Judgement: as many `todo`s as 5, and cheap: the conditions are `LW.meets`, which `csIf` already
   uses.
5. **Losing items by the player's choice or by place in the list** (about 35): a prompt to pick N
   Backpack Items, Special Items or a weapon to lose (with the text's fallback when he has none);
   losses by position ("the second and fourth Backpack Items"); half his Meals or gold; the weapon
   he used. B1 144, 307; B3 16, 18; B4 22; B5 19, 40, 270; B6 144, 166; B7 32, 131, 158; B8 178,
   187, 258, 269, 331, 349; B9 91, 201, 235, 261, 273; B10 11, 43, 210, 265, 340; B11 12, 73, 179,
   277, 338.
   Judgement: many `todo`s, none in a fight. Before 12, which can use the same prompt.
6. **Multiplied or extra losses in a fight** (about 25): his losses doubled, tripled, halved, or +1
   or +2 a wound, unless he has a discipline (at a rank); a fixed loss every round (cold, a drain
   the dice do not give, rounds underwater past a drawn count); the enemy's losses raised (an ally
   striking, psychic attack doubled). B3 88, 180; B4 194, 234; B6 270; B7 76, 126, 178, 219, 233,
   285, 301, 325; B8 52, 155, 159, 199; B9 82; B10 172; B11 34, 298; B12 55, 226, 268, 276.
   Needs: 2, where the change starts or stops after some rounds.
7. **Wagers, stakes, selling and paying what he can** (about 25): a stake chosen by the player and
   won or lost by the next section or a draw; selling weapons and goods to a shop; a price "or all
   you have"; a price that depends on where he came from. B2 93, 238, 266, 308, 327; B3 152; B6 10,
   17, 50, 62, 76, 98, 113, 123, 212, 220, 223, 245, 284; B9 115, 163, 204, 319; B10 218; B12 61,
   225, 265, 314.
   Judgement: by count. Before 13, whose bribes and bets are stakes in another coin.
8. **Choices that need more than "any of these items"** (about 25): two items together (a Torch and
   a Tinderbox, or a Lantern, or a Firesphere: the light-source gate; a Blowpipe and a Sleep Dart);
   a count (4 Meals, 2 Arrows, 2 Backpack Items); any weapon of a kind (any sword; an edged weapon).
   B3 36, 290 (Sixth Sense below the rank of Guardian), 173 (an Effigy, or the Sommerswerd without
   one), 277 (any weapon); B4 117; B5 19, 313; B6 339; B7 16, 66, 107, 168, 258, 298, 348; B8 194,
   214; B10 131, 256; B11 126, 168, 234, 260; B12 131.
   Judgement: by count; extends `need.any`.
9. **Random Number changes the importer cannot express** (about 15): by an item carried (a Rope, a
   Pick or Shovel), the weapon in his hand, a discipline at a rank, a Lore-circle, a dead arm; a
   draw measured against his COMBAT SKILL; and on a bow shot, a discipline's extra or a penalty
   without Weaponmastery. B3 86, 96; B4 35, 173; B5 23, 127; B6 340; B7 175, 328; B9 215, 216, 239;
   B10 128; B11 244; B12 206, 324.
   Judgement: by count; extends `rntMod`.
10. **Other whole-fight conditions** (about 20): a weapon's bonus against one foe (the Jewelled Mace,
    the Dagger of Vashna and Helshezag against a Darklord, Gnaag's 12 in all); a penalty by weapon
    kind; no Shield or no two-handed weapon; no Bow; no evading; no potion before the fight; an item
    wrapped round the arm; fighting with a weapon not yet in the inventory; bare-handed unless he has
    a discipline (Nexus); a companion's bonus for the later fights only; a bonus for
    having fought a foe in an earlier book; wounds carried over from an earlier fight with the same
    foes (B3 32). B3 170, 328; B5 57, 253; B6 343; B7 76, 214, 221, 257; B9 309; B10 54, 304; B11
    201; B12 68, 75, 88, 133, 230.
    Judgement: after 2, in the same fight set-up.
11. **Psychic bonuses changed for one foe** (about 12): Mindblast or Psi-surge doubled, tripled, or
    worth 4, or only partly blocked; mind fights with their own COMBAT SKILL (fixed 15; counted from
    Disciplines and rings). B5 64, 110; B8 52, 74; B10 81, 254; B11 270; B12 2, 102, 114, 264, 307.
    Judgement: before Grand Master G5, whose Kai-surge goes into the same psychic bonus.
12. **Equipment taken away and given back later**: the page keeps what was taken and restores it.
    B5 69 to 14, and the Sommerswerd 350 to 400; B7 264, 335 to 15; B9 170, 174, 312 to 54, 177, and
    the pickpocket 155.
    Judgement: after 5.
13. **Other currencies**: Book 12's Kika (B12 43, 52, 79, 139, 162, 184, 202, 221, 228, 271, 310,
    322) and Book 9's Lune (B9 163, 253).
    Judgement: after 7.
14. **Lasting conditions**: losing 2 ENDURANCE a section until a Laumspur potion (B5 63); the dead arm
    (no Shield, -3 until cured: B5 2, 162, 166); the korovax infection (B8 156); Adgana and its
    addiction (B7 129, B12 145); COMBAT SKILL lower for this adventure only (B8 71); healing half
    the ENDURANCE lost in a fight, or all with Healing (B2 240; B5 20, 135, 161); ENDURANCE put back
    after a contest (B2 276).
    Judgement: few `todo`s, each its own rule.
15. **Small item rules**: items with doses (B9 25; Book 8's Larnuma and Book 11's Silver Flask);
    extra Meals the text asks for (B3 294; B9 11; B12 93's Gnallia heals 2); a Special Item outside
    the limit of 12 (B10's Signet Ring); a Helmet and the Silver Helm not counting together (B7
    148); an item that takes an Arrow's place in the Quiver (B12 187); a weapon the text does not
    name (B11 8); a torch in hand (B4 79, 123); a Meal that may be bought on the spot (B2 346; B6 253,
    307); swapping one item for another (B8 242); a draw that ends the adventure (B3 94).
    Judgement: one or two sections each.
16. **Notes on the Action Chart**: a number to remember (B7 73, 183, 333) and things done in an
    earlier book (B3 128, 250, 268; B5 57; B9 142).
    Judgement: few, and the player keeps them on the chart meanwhile.
17. **Book 6's archery tournament**: Target points in place of ENDURANCE, a three-number draw, a
    borrowed bow's penalty, a bow that breaks on a 0. B6 26, 214, 298, 340.
    Last (judgement): one episode in one book.

Left to the player whatever the engine does: whether to sleep (B2 41), the Arrows spent at B8 164
(the text gives no number), and the puzzles.

### Grand Master series (Book 13 on)

Book 13's rules were read on 2026-10-10 (rules-books.md, "Grand Master series"). The importer knows
Book 13 (2026-10-11: its disciplines, ranks, and foes `immune: 'psi'`), but the engine has none of
its rules. Until it does, Book 13's gates on Grand Master Disciplines would never open (no character
holds one) and a carried hero would play it by Kai rules. Importing it is the owner's go-ahead, apart
from this work.

**Engine work**, in order (G1 first: everything else reads the series):

- G1. A third series in `LW.SERIES` (`grandmaster`: twelve disciplines, `first: 4`, field
  `grandmaster`, the twelve ranks), and every `series === 'magnakai'` test in `rules-series.js`,
  `core.js` (`specialLimit`) and `main.js` (Lore-circles row, `skilled`, the ambush) made to say what
  a Grand Master book does. Not started (2026-10-11: `LW.SERIES` has `kai` and `magnakai` only).
- G2. Setting out: a new character 25 + RN / 30 + RN, holding all Kai and Magnakai Disciplines; four
  Grand Master Disciplines; Grand Weaponmastery's two weapons (then one a book, as Weaponmastery's
  three then one); from Book 14, +1 COMBAT SKILL and +2 ENDURANCE for each discipline past four. A
  carried character keeps his scores with every bonus, and is not offered a re-roll (ADR 0019).
  Needs: G1.
- G3. Carrying into the series: the Backpack's items kept, Meals not (ADR 0011); Special Items cut
  to the ten listed, the others dropped (ADR 0019); Lore-circle COMBAT SKILL folded into his base
  score (the engine adds it per fight, and only in Magnakai books). Needs: G1.
- G4. Book 13's kit in `LW.KITS[13]` (gold 20 + RN; choose 5), a Backpack of 10 (`LW.MAX_BACKPACK`,
  8 for every book now, made per series), the 12 Special Item limit and Monastery storage in this
  series too. Needs: G1; after G3 (judgement: the same setting-out step).
- G5. Disciplines with numbers: Grand Weaponmastery +5 (replacing Weaponmastery, not added; Bow +5,
  Mentora's +2 not added), Kai-surge (+8 at 1 a round, Mindblast +4, not at 6 or less) in `LW.psi` and
  the fight's medallions, Deliverance (20 back at 8 or less, in the fight like Archmaster Curing; once
  a book, ADR 0019), Grand Huntmastery in `LW.hunts`; a carried character's chosen Magnakai
  Disciplines keep their numbers until replaced by their Grand Master counterparts (ADR 0018). Book
  13's 8 foes immune to Mindblast and Psi-surge but not Kai-surge (31, 45, 120, 156, 157, 186, 212,
  243) are read by the importer and already deaf to the first two; Kai-surge must get through (295
  is Mindblast only). Needs: G1; after engine item 11 (judgement).
- G6. The Kai sheet's grid of twelve disciplines and their glyphs, and the ranks. Needs: G1.
- G7. Then the dashboard can offer Books 13-20 their later steps (it shows them download only,
  dashboard.md), and Book 13's item table and fight pictures can follow. Needs: G1-G5.

**Decided 2026-10-10** (the Readers' Handbook downloaded that day, then the owner): ADR 0018 (which
earlier disciplines keep their numbers: a carried character's chosen Magnakai ones, replaced by
their Grand Master counterparts), ADR 0011 amended (Backpack Items carry into the series, Meals not),
ADR 0019 (other Special Items dropped, Deliverance once a book, no re-roll). G2, G3 and G5 follow
them.

### Book notes outside the steps

Things to check while a book goes through its steps, which no step asks for:

- Weapon bonuses the item tables give as the fight's `csMod`, to check in play against the engine's
  own weapon bonus (that the two do not add): Book 9's Psychic Ring +8 (214), Book 11's Ironheart
  Broadsword +8 (204), Book 12's Helshezag (133); Book 12's weapon of increased power (88) is still a
  `todo`.
- Book 3's sledge food is left to the text.
- Book 3's play-through (2026-10-09) left to the player, beyond the todos: a Guardian with Sixth
  Sense sees both 341 and 124 at 36 and 290, and one with both an Effigy and the Sommerswerd both 34
  and 164 at 173 (engine item 8); 108's way on cannot be taken in mid-fight (engine item 1).
- Book 4's `work/` still holds the trial files from the first map experiments (`map-esrgan-*`,
  `map-gemini-esrgan-4k.webp`, `map-repaint-2k-test1.png`, the first `compare.html`). Book 4's map is
  done (checklist step 8), so they can be deleted when the owner says.
- Book 2's map files are copies of Book 1's (2026-10-09), kept apart so Book 2 can gain its own city
  maps. Its `style.txt` is its own (written for a repaint never made), not the one the map was
  painted with.

### Pictures in hand for later fights

For step 6 in the books still open (all git-ignored, personal use):

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

### Bugs the unit tests found (2026-10-11)

Each is a test marked as an expected failure (`it.fails` / `xfail(strict=True)`); fixing one turns
its test red until the mark is taken off. Most important first.

1. `serve.py` `do_POST`: a refused upload (backup name, 404, maplabels 400) answers without reading
   the body, so on a kept-alive connection the next request gets a 400. `_map_upload` does it right.
2. `import_projectaon.py:147` `gate()`: `n't` never matches, so a choice gated on lacking a
   discipline written with "haven't"/"don't" reads as needing it. Check whether any book words it so.
3. `import_projectaon.py:245` `number_rules()`: "However, if" (lower-case) is not read, so such a
   Random Number section comes out free. Check the books for the wording before changing it.
4. `map_labels.py:134` `sheet()`: one label (or none) crashes the check sheet.
5. `release.py:84`: a borrowed file not committed, when none is git-ignored, is refused with git's
   error instead of "Commit them first".
6. `serve.py:80` `NAME` accepts a trailing newline; `serve.py:510` `release_dir()` raises on a
   `CURRENT` file holding `[]` or `{"dir": null}`.
7. `shared/core.js` ~197: the default `heroCS` drops the Shield with the Sommerswerd (it is
   one-handed). Dead in the player (`rules-series.js` replaces it); prototypes only.

Untested oddities, maybe deliberate: `plates_file.put()` drops an entry's earlier crop or levels when
saved without them; the importer marks the highest section `victory` even when it is a dead end;
`map_labels.py` defines `norm` twice.

### Code to make testable

- `main.js` runs the page on import, so it has no tests. Move its pure parts into a module and test
  them: `applyItems` first (lays an item table over a book), then backups (`parseBackup`, `backupOf`,
  `backupName`, `pending`), adventures and save keys, `knownItem`, `shown`, `storyText`, `roman`,
  `itemGlyph`, `kitName`/`kitAbout`, `deaf`/`allDeaf`.
- `check_items.mjs`, `plates_pin.mjs`, `import_projectaon.py`, `item_sections.py`, `reading_copy.py`
  and `fetch_projectaon.py` do their work on import; their tests run a copy as a whole. Functions
  that can be imported would allow finer tests.

### Not yet checked

- Magnakai rules and carry-over: tested with copies of the demo chapter marked as other books, and
  (2026-10-03) a few real sections of Books 6 and 12 (a Random Number bonus, a fight with a
  discipline's bonus, a foe immune to Mindblast only, evasion in the first round only); not played
  through a real Magnakai book.
- The phone layout.
- Prototypes A-C after the changes to `shared/core.js` and `shared/ui.js` (loaded once after the move
  to `prototypes/`, not played).
- The 4K map's fit, zoom and 4096 px canvas cap on the iPad.

### Other

- Other Project Aon pictures (illustrations, plates) stay at their own resolution for now.
- Delete `prototypes/` (and `shared/art.js`, `battle.js`, `flow.js`) once the owner is sure.

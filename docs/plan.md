# Plan and state

Working notes: work that is not a book step, decisions made, and what the player can do. Rough; to
be refined with the owner. Last updated 2026-10-10.

Where each book stands, step by step, is not kept here: the import dashboard
(`http://localhost:8766/tools/admin/`, `docs/reference/dashboard.md`) works it out from the files and
the hand marks, and `docs/book-checklist.md` holds the same table. Work found here that belongs to
every book can become a step or a check there.

## Next steps

### Engine work to retire the item tables' todos

Every `todo` in `items-*.js` (2026-10-05: 334 across Books 1-12) is a rule the page leaves to the
player. These are the changes that would let it apply them, the importer's gaps first. Sections
are given as book/section; each change, when made, replaces the `todo`s it covers and updates the
matching reference file. Not started; the owner picks which, and in what order.

**Importer gaps** (the importer reads these wrongly or not at all)

1. **"Discipline X or rank Y" choices** (done 2026-10-05): `need.any`, a list of conditions any one of
   which opens the choice (conditions may also hold `item`). The importer reads it when every
   "or have/reached" part parses (B8 72, B12 188); the item tables carry the rest (B3 289, B7 90,
   B11 301, 343), where the text has "or six Disciplines" or an item; there an `any` need replaces
   the importer's gate whole. B12 14, 77 are a discipline and a rank together, read rightly.
2. **Whole-fight bonuses on a condition the importer skips** (done 2026-10-06): `cs_rule` now reads
   Lore-circles and ranks in `csIf` / `csUnless`, a condition with no comma after it, "an additional
   N", and "(i.e. ...)" inside the sentence. B6 71, B7 45, B8 30, 47, 183, 308, 339, B11 341; their
   `todo`s are gone. B11 270 lost a misread +1 its item table already zeroed.
3. **Fights the importer missed** (done 2026-10-06): the doors (B6 156, B7 214) are fights, with
   "ENDURANCE (RESISTANCE points)" and "cease 'combat' at any time" read as evasion at any time. B7
   214 fights bare-handed (`with: 'none'`); with Nexus the penalty is given back by hand (`todo`).
   Neither door has a fight picture yet (emblem).

**Engine changes** (most `todo`s first)

4. **Fight changes for some rounds only** (about 50): a COMBAT SKILL change for the first N rounds,
   spared by a discipline (most ambushes and surprises; Huntmastery spares many); fighting unarmed
   for the first N rounds; ignoring his own or the enemy's losses in the first N rounds. With it,
   `ambush` can be marked where the penalty lasts only some rounds. B1 283; B2 7, 60, 270; B3 241,
   260; B4 62, 147, 153; B5 4, 106, 119, 159, 280, 316, 393; B6 12, 114, 155, 254, 270; B7 19, 27,
   219; B8 183, 251, 252, 298, 323; B9 46, 116, 148, 182, 285; B10 28, 251, 336; B11 10, 68, 77,
   220, 256, 319; B12 5, 8, 16, 23, 32, 58, 83, 136, 224, 247, 259, 276, 292.
5. **Losing items by the player's choice or by place in the list** (about 35): a prompt to pick N
   Backpack Items, Special Items or a weapon to lose (with the text's fallback when he has none);
   losses by position ("the second and fourth Backpack Items"); half his Meals or gold; the weapon
   he used. B1 144, 307; B3 16, 18; B4 22; B5 19, 40, 270; B6 144, 166; B7 32, 131, 158; B8 178,
   187, 258, 269, 331, 349; B9 91, 201, 235, 261, 273; B10 11, 43, 210, 265, 340; B11 12, 73, 179,
   277, 338.
6. **An ENDURANCE change unless (or if) he has something** (about 35): a discipline, a discipline
   at a rank, a Lore-circle, an item, or having eaten; and a drawn loss made smaller by one. B2 69,
   321; B3 27, 83, 129, 132, 150, 258, 299, 331; B5 264, 393; B6 171, 306; B7 26, 59, 85, 103, 104,
   241, 284; B9 61, 291; B10 29, 166, 203, 233; B11 118, 217, 299, 313, 332; B12 172, 258.
7. **Multiplied or extra losses in a fight** (about 25): his losses doubled, tripled, halved, or +1
   or +2 a wound, unless he has a discipline (at a rank); a fixed loss every round (cold, a drain
   the dice do not give, rounds underwater past a drawn count); the enemy's losses raised (an ally
   striking, psychic attack doubled). B3 88, 180; B4 194, 234; B6 270; B7 76, 126, 178, 219, 233,
   285, 301, 325; B8 52, 155, 159, 199; B9 82; B10 172; B11 34, 298; B12 55, 226, 268, 276.
8. **The fight's length deciding the way on, or ending it** (about 35): won in N rounds or fewer
   goes one way; only N rounds are fought; one round, decided by who lost more; stop when he loses
   any ENDURANCE; break off when the enemy is down to N. B1 227, 231, 339; B3 32, 123, 138, 147,
   158, 164, 180, 200, 208, 259, 263, 296; B4 36, 47, 56, 133, 193, 260, 333; B5 244, 357; B6 78, 201, 344; B8 257; B9 82, 104, 244;
   B10 41, 187, 286, 336, 349; B11 22, 97, 201, 206, 274.
9. **Choices that need more than "any of these items"** (about 20): two items together (a Torch and
   a Tinderbox, or a Lantern, or a Firesphere: the light-source gate; a Blowpipe and a Sleep Dart);
   a count (4 Meals, 2 Arrows, 2 Backpack Items); any weapon of a kind (any sword; an edged weapon).
   B3 36, 290 (Sixth Sense below the rank of Guardian), 173 (an Effigy, or the Sommerswerd without
   one), 277 (any weapon); B4 117; B5 19, 313; B6 339; B7 16, 66, 107, 168, 258, 298, 348; B8 194, 214; B10 131, 256; B11
   126, 168, 234, 260; B12 131.
10. **Random Number changes the importer cannot express** (about 20): by an item carried (a Rope, a
    Pick or Shovel), the weapon in his hand, a discipline at a rank, a Lore-circle, a dead arm; and
    on a bow shot, a discipline's extra or a penalty without Weaponmastery. B3 86, 96; B4 35, 173;
    B5 23; B6 340; B7 175, 328; B9 215, 216, 239; B10 128; B11 244; B12 206, 324.
11. **Wagers, stakes, selling and paying what he can** (about 25): a stake chosen by the player and
    won or lost by the next section or a draw; selling weapons and goods to a shop; a price "or all
    you have"; a price that depends on where he came from. B2 93, 238, 266, 308, 327; B3 152; B6 10,
    17, 50, 62, 76, 98, 113, 123, 212, 220, 223, 245, 284; B9 115, 163, 204, 319; B10 218; B12 61,
    225, 265, 314.
12. **Psychic bonuses changed for one foe** (about 12): Mindblast or Psi-surge doubled, tripled, or
    worth 4, or only partly blocked; mind fights with their own COMBAT SKILL (fixed 15; counted from
    Disciplines and rings). B3 137; B5 64, 110; B8 52, 74; B10 81, 254; B11 270; B12 2, 102, 114,
    264, 307.
13. **Other whole-fight conditions** (about 15): a weapon's bonus against one foe (the Jewelled Mace,
    the Dagger of Vashna and Helshezag against a Darklord, Gnaag's 12 in all); a penalty by weapon
    kind; no Shield or no two-handed weapon; no Bow; no evading; no potion before the fight; an item
    wrapped round the arm; fighting with a weapon not yet in the inventory; a bonus for having fought
    a foe in an earlier book; wounds carried over from an earlier fight with the same foes (B3 32).
    B3 170, 328; B5 57, 253; B6 343; B7 76, 221, 257; B10 54, 304; B11 201;
    B12 68, 75, 88, 133, 230.
14. **Equipment taken away and given back later**: the page keeps what was taken and restores it.
    B5 69 to 14, and the Sommerswerd 350 to 400; B7 264, 335 to 15; B9 170, 174, 312 to 54, 177, and
    the pickpocket 155.
15. **Lasting conditions**: losing 2 ENDURANCE a section until a Laumspur potion (B5 63); the dead arm
    (no Shield, -3 until cured: B5 2, 162, 166); the korovax infection (B8 156); Adgana and its
    addiction (B7 129, B12 145); COMBAT SKILL lower for this adventure only (B8 71); healing half
    the ENDURANCE lost in a fight, or all with Healing (B2 240; B5 20, 135, 161); ENDURANCE put back
    after a contest (B2 276).
16. **Book 6's archery tournament**: Target points in place of ENDURANCE, a three-number draw, a
    borrowed bow's penalty, a bow that breaks on a 0. B6 26, 214, 298, 340.
17. **Other currencies**: Book 12's Kika (B12 43, 52, 79, 139, 202, 228, 271, 310, 322) and Book 9's
    Lune (B9 163, 253).
18. **Small item rules**: items with doses (B9 25; Book 8's Larnuma and Book 11's Silver Flask);
    extra Meals the text asks for (B3 294; B9 11; B12 93's Gnallia heals 2); a Special Item outside
    the limit of 12 (B10's Signet Ring); a Helmet and the Silver Helm not counting together (B7
    148); an item that takes an Arrow's place in the Quiver (B12 187); a weapon the text does not
    name (B11 8); a torch in hand (B4 79, 123); a Meal that may be bought on the spot (B2 346; B6 253,
    307); swapping one item for another (B8 242); a draw that ends the adventure (B3 94).
19. **Notes on the Action Chart**: a number to remember (B7 73, 183, 333) and things done in an
    earlier book (B3 128, 250, 268; B5 57; B9 142).
20. **A by-hand way out of a fight and to any section** (found playing Book 3, 2026-10-09): the
    Turn to section box shows only in puzzle sections, and a fight can be left only by Evade, which
    costs a blow. The item-table todos that named the box were reworded to what the page can do
    (Books 3, 4 and 6, 2026-10-09: fight on, then give back the ENDURANCE lost past the stopping
    point; B6 170's Huntmastery bonus is now an `rntMod`). A box under every section's choices, and a
    "stop the fight here" control without the blow, would spare those workarounds until item 8 is done.

Left to the player whatever the engine does: whether to sleep (B2 41), and the puzzles.

### Grand Master series (Book 13 on)

Book 13's rules were read on 2026-10-10 (rules-books.md, "Grand Master series"); the engine has none
of them. Not started. Until it does, the importer can learn Book 13 but its gates on Grand Master
Disciplines would never open (no character holds one) and a carried hero would play it by Kai rules.

**Engine work**, roughly in order:

1. A third series in `LW.SERIES` (`grandmaster`: twelve disciplines, `first: 4`, field
   `grandmaster`, the twelve ranks), and every `series === 'magnakai'` test in `rules-series.js`,
   `core.js` (`specialLimit`) and `main.js` (Lore-circles row, `skilled`, the ambush) made to say what
   a Grand Master book does.
2. Setting out: a new character 25 + RN / 30 + RN, holding all Kai and Magnakai Disciplines; four
   Grand Master Disciplines; Grand Weaponmastery's two weapons (then one a book, as Weaponmastery's
   three then one); from Book 14, +1 COMBAT SKILL and +2 ENDURANCE for each discipline past four.
3. Carrying into the series: the Backpack kept, Special Items cut to the ten listed, Lore-circle
   COMBAT SKILL folded into his base score (the engine adds it per fight, and only in Magnakai books).
4. Book 13's kit in `LW.KITS[13]` (gold 20 + RN; choose 5), a Backpack of 10 (`LW.MAX_BACKPACK` per
   series), the 12 Special Item limit and Monastery storage in this series too.
5. Disciplines with numbers: Grand Weaponmastery +5 (replacing Weaponmastery, not added; Bow +5,
   Mentora's +2 not added), Kai-surge (+8 at 1 a round, Mindblast +4, not at 6 or less) in `LW.psi` and
   the fight's medallions, Deliverance (20 back at 8 or less, in the fight like Archmaster Curing),
   Grand Huntmastery in `LW.hunts`; a foe immune to Mindblast and Psi-surge but not Kai-surge (Book 13
   has 8: 31, 45, 120, 156, 157, 186, 212, 243; 295 is Mindblast only, which the importer reads).
6. The Kai sheet's grid of twelve disciplines and their glyphs, and the ranks. (The title page shows
   Books 13-20 since 2026-10-11.)

**Decided 2026-10-10** (the Readers' Handbook downloaded that day, then the owner): ADR 0018 (which
earlier disciplines keep their numbers: a carried character's chosen Magnakai ones, replaced by
their Grand Master counterparts), ADR 0011 amended (Backpack Items carry into the series, Meals not),
ADR 0019 (other Special Items dropped, Deliverance once a book, no re-roll). Step 2 above follows
them: the scores carried with every bonus; step 3 cuts the Special Items and keeps the Backpack.

### Kai Disciplines in the Magnakai books (ADR 0018, decided 2026-10-10)

Done 2026-10-11 (rules-engine.md): `hero.completed`, set when setting out, decides it. Hunting
spares the Meal except where `noHunt` is marked, and says to eat by hand in desert or wasteland
(the owner's choice). Item tables could mark such Magnakai sections `noHunt`; none do yet.

### Book notes outside the steps

Things to check while a book goes through its steps, which no step asks for:

- Weapon bonuses left as text, to check against the engine's own weapon bonus: Book 9's Psychic
  Ring +8 (214), Book 11's Ironheart Broadsword +8 (204), Book 12's Helshezag and a weapon's
  increased power (88, 133).
- Book 3's sledge food is left to the text.
- Book 3's play-through (2026-10-09) left to the player, beyond the todos: a Guardian with Sixth
  Sense sees both 341 and 124 at 36 and 290, and one with both an Effigy and the Sommerswerd both 34
  and 164 at 173 (item 9); 108's way north (198, a death) cannot be taken in mid-fight.
- Book 4's `work/` holds trial files from the first map experiments (`map-esrgan-*`,
  `map-gemini-esrgan-4k.webp`, `map-repaint-2k-test1.png`, the first `compare.html`): delete them
  when Book 4's map is done.
- Book 2's map files are copies of Book 1's (2026-10-09), kept apart so Book 2 can gain its own city
  maps. Its `style.txt` is its own (written for a repaint never made), not the one the map was
  painted with.

### Pictures in hand for later fights

For step 6 in the later books (all git-ignored, personal use):

- The owner's ink drawings in `art/plates/` not yet used: an elf swordsman, two swordswomen (Book
  4's hooded bandit leader, section 233, may suit the hooded swordsman too), two painted peasants
  and a spearman.
- `art/reference/bestiary/gourgaz-zlanbeast-vordak-doomwolf.webp`: the owner's photo of a printed
  bestiary spread (a Gourgaz, a Zlanbeast or Kraan, a Vordak, a Doomwolf). Book 1 uses its Vordak
  and Doomwolf; the others need a careful crop (photographed at an angle, text wrapped round) and a
  levels setting.
- Citadel's 1980s Lone Wolf miniature catalogues (`art/reference/citadel-c41/`, 12 scans; personal
  use, the site says not to copy; SOURCES.txt). Only the Dec 1984 flyer is line drawings:
  `cutouts.json` gives crops for 14 of its figures (Vordak, Bandit, Vonotar, Young Thaumaturgist,
  Lone Wolf, Citadel Guard, Guard Officer, three Giaks and a row of them, Helghast, Gourgaz, Prince
  Pelethar). The flyer is copied to `art/plates/` so the iPad gets it.

### Other

- The 4K map's fit, zoom and 4096 px canvas cap are not yet checked on the iPad.
- Other Project Aon pictures (illustrations, plates) stay at their own resolution for now.
- Delete `prototypes/` (and `shared/art.js`, `battle.js`, `flow.js`) once the owner is sure.

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

The decisions the owner has made are in `docs/adr/` (since 2026-10-10), one record each, binding
on every agent.

## State of the player

Working and checked by playing in the browser:

- Adventures (save slots, 2026-10-01): several games at once, each with its own book saves and
  carried character; listed on the title page, with a new one and forget. The demo chapter is no
  longer offered. Older saves move into adventure I on first load.
- Going back up to three sections (2026-10-01): on the death panel. Saves keep only those three
  snapshots now.
- Introduction (2026-10-01): a new game opens on the book's "The Story So Far" (imported from
  `tssf.htm`), with "Begin" to turn to section 1.
- Title page: the adventures, then an adventure's books one series at a time (Kai, Magnakai, Grand
  Master; 2026-10-11), with continue / start over / new character.
- Story page: frame, script text, drop cap, illustrations in place, arrival events, choices.
- Panels: Kai, laid out like the HD character sheet (ink portrait from the owner's screenshot,
  ruled ledgers, a framed grid of every discipline with drawn game-icons glyphs), inventory (likewise
  after the HD equipment sheet: worn slots over the portrait, a tiled Backpack; slots,
  Backpack grid, by-hand gold and item controls), map.
- Random Number medallion on the page; automatic gating of choices where the ranges are clean.
- Combat on the page: plate, medallion commands, dial, round log, evasion, wounds.
- Item tables (`items-<code>.js`, docs/reference/items.md): the engine gives, offers, takes and
  gates what the text says, and corrects misread fights. Rules it gained for them, all stated in the
  text: the Sommerswerd (+8 in combat, Weaponskill with any sword counts, undead foes lose double),
  Special Items that fight (the Magic Spear), fights only one weapon can win and bare-handed ones,
  Helghast mind drain per round, shops (buy as often as you like), "choose any two", gold won or
  lost by a number, losing every Special Item, `need.any` gates. The inventory's "add by hand" lists
  the open book's own items.
- Battle plates made from the book's illustrations, restyled as sepia ink. Enemies the book does not
  picture borrow another book's illustration, a free engraving or the owner's own picture
  (`assets/plates/plates.json`, entries limited to one book with `book`). Emblem fallback.
- Map: the book's own printed map, repainted and upscaled to 4K, shown sepia, draggable.
- Series rules: Kai and Magnakai disciplines, ranks, Lore-circles, Weaponmastery, Psi-surge.
- Character carry-over between books.
- Every rule in docs/reference/rules-books.md (2026-10-02): each book's starting kit as a second
  page of the character dialog (gold, given items, the choice, weapons kept, the Monastery), the
  Shield and the other kit items, the 12 Special Item limit, safekeeping of items and gold, the
  Bow (useless hand to hand; shots that spend Arrows and add Weaponmastery), the improved
  disciplines' numbers (Tutelary and Scion-kai unarmed and +4, Archmaster Psi-surge and Curing,
  read as once a book), Huntmastery against an ambush, Laumspur eaten as a Meal. The potion in a
  fight stays our house rule.
- Offline on the iPad (2026-10-03, docs/reference/offline.md).
- Releases: the iPad is served the last release, not the working copy (2026-10-10, `tools/release.py`,
  the dashboard's Release button, the release server on 8765 started with Windows; edit server on 8766).
- Docs: spec, reference, CLAUDE.md.

Tested only against stand-in data, not real text:

- Magnakai rules and carry-over (tested with copies of the demo chapter marked as other books;
  since 2026-10-03 also a few real sections of Books 6 and 12: a Random Number bonus, a fight with
  a discipline's bonus, a foe immune to Mindblast only, evasion in the first round only).

Not checked at all: the phone layout; prototypes A-C after the changes to `shared/core.js` and
`shared/ui.js` (they were loaded once after the move to `prototypes/`, not played).

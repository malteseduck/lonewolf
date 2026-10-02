# The books' rules

The rules as Books 1–12 state them, read from each book's rules pages (game rules, disciplines,
equipment, combat, ranks, Lore-circles, improved disciplines, the tables, footnotes), downloaded
2026-10-02 into `data/projectaon/<book>/` (`tools/fetch_projectaon.py <book> --rules`). Written in
our own words; numbers and lists are the books'. A common rule set first, then what the Magnakai
series changes, then an addendum for each book. **Engine** says where the player implements a rule,
or that it does not (then it is applied by hand, or noted as a gap in docs/plan.md).

The rules pages differ between books mostly in wording; every rule below was compared book by book.
Section-specific rules (a fight's modifier, an item's use) are in each book's text and its item
table, not here.

## Common rules (Books 1–12)

### The character

| Rule | Engine |
|---|---|
| COMBAT SKILL = 10 + a Random Number; ENDURANCE = 20 + a Random Number | `LW.makeHero` |
| ENDURANCE never rises above the score he started with (items and Lore-circles raise the maximum itself) | yes |
| At 0 ENDURANCE or below he is dead and the adventure is over | yes |
| A Random Number is 0–9; 0 counts as zero unless a section says 0 = 10 | yes |

### Carrying

| Rule | Engine |
|---|---|
| At most 2 Weapons; only one is used in a fight | `LW.MAX_WEAPONS`, `LW.armedWith` |
| At most 8 Backpack Items, Meals included (each Meal is one) | `LW.MAX_BACKPACK` |
| One Backpack only (a footnote, Book 2) | yes (`noPack`) |
| Special Items are not in the Backpack; the text says how each is carried | yes |
| At most 50 Gold Crowns, in the Belt Pouch | yes |
| An item named with capitals in the text can be taken; unless called a Special Item, it is a Backpack Item | item tables |
| Backpack Items may be dropped or swapped at any time except in a fight | by hand |
| Gold may be taken from any enemy killed and searched (when the text says so) | item tables |

### Meals and healing

| Rule | Engine |
|---|---|
| When told to eat, eat a Meal or lose 3 ENDURANCE | `sec.meal` |
| Hunting (Kai) spares the Meal, **except in wasteland and desert**; each book names its own such land | `LW.hunts`; per-section `noHunt` |
| A healing (Laumspur) potion restores 4 ENDURANCE, drunk **after** a fight, never just before one; other potions say their own effect | yes, with our exception below |
| *Our exception, kept by the owner (2026-10-02)*: a healing potion may be drunk during a fight without costing a round. The books allow it only after a fight | the fight's Laumspur medallion (spec 4.3) |
| Food that the text says serves as a Meal is eaten when a Meal is due and he has none | `meal: true` on the item |

### Combat

| Rule | Engine |
|---|---|
| Combat Ratio = his COMBAT SKILL with every bonus, minus the enemy's | `B.ratio()` |
| Each round: a Random Number, crossed with the ratio on the Combat Results Table, gives both sides' ENDURANCE loss; K kills outright | `LW.combatRound` |
| The table is the same in every book; the engine's copy was checked cell by cell (2026-10-02) | `CRT_ROWS` in core.js |
| Ratio columns: ≤−11, −10/−9, −8/−7, −6/−5, −4/−3, −2/−1, 0, +1/+2, +3/+4, +5/+6, +7/+8, +9/+10, ≥+11 | `LW.crtColumn` |
| Rounds go on until one side is at 0 or below | yes |
| No weapon: −4 COMBAT SKILL, bare hands | yes (less with Weaponmastery from Tutelary: see the Magnakai series) |
| Evasion only where the text offers it: the round is fought, only his loss counts, and he is away | yes (`evade`) |
| Several enemies "one at a time" are fought in turn; "as one enemy" is one combat line | importer |

### Carrying a character on

| Rule | Engine |
|---|---|
| A completed book's COMBAT SKILL, ENDURANCE, disciplines, Weapons and Special Items carry into the next | `LW.Character` |
| Gold carries; each book's starting gold is **added** to it (still at most 50) | yes |
| Backpack Items and Meals do not carry over: the rules pages name only Weapons and Special Items | yes: the Backpack starts empty (`chooseCharacter`) |
| A new character may start at any book, with that book's own kit | yes: Book 1 by `makeHero`, later books by `LW.KITS` |

## Kai series (Books 1–5)

### Kai Disciplines

A new character has **five**. A character carried on chooses **one more for each book completed**:
six in Book 2, seven in Book 3, eight in Book 4, nine in Book 5; completing Book 5 with all of
Books 1–4 behind him makes him a Kai Master with all ten. *Engine*: the character dialog
(`LW.UI.chooseCharacter`): new = five, carried = one more.

| Discipline | Effect | Engine |
|---|---|---|
| Camouflage | Hide in the country; pass as a native in towns | gates only |
| Hunting | No Meal needed when told to eat, except in wasteland and desert | yes |
| Sixth Sense | Warns of danger, reads strangers | gates only |
| Tracking | Finds the path and hidden people or things | gates only |
| Healing | +1 ENDURANCE for each section passed without a fight, up to the maximum | yes |
| Weaponskill | +2 COMBAT SKILL in a fight with one weapon, chosen by Random Number: 0 Dagger, 1 Spear, 2 Mace, 3 Short Sword, 4 Warhammer, 5 Sword, 6 Axe, 7 Sword, 8 Quarterstaff, 9 Broadsword | yes (the table, Sword twice) |
| Mindshield | No ENDURANCE lost to an enemy's Mindforce | yes (`shielded`) |
| Mindblast | +2 COMBAT SKILL, used with a weapon, unless the enemy is immune | yes |
| Animal Kinship | Talks with some animals | gates only |
| Mind Over Matter | Moves small objects | gates only |

### Ranks

By the number of Kai Disciplines: 1 Novice, 2 Intuite, 3 Doan, 4 Acolyte, 5 Initiate (where the
books begin), 6 Aspirant, 7 Guardian, 8 Warmarn (or Journeyman), 9 Savant, 10 Master.
*Engine*: `LW.SERIES.kai.ranks`; the importer's rank gates use the same.

## Magnakai series (Books 6–12)

### Entering the series

- A character entering at Book 6 (new or carried) holds all ten Kai Disciplines and chooses
  **three** Magnakai Disciplines (rank Kai Master Superior). With Weaponmastery he masters
  **three** weapons.
- Each Magnakai book completed adds **one** Magnakai Discipline and **one** mastered weapon.
- The Kai effects are restated as Magnakai ones (Book 6's equipment page: Weaponmastery for weapons,
  Huntmastery for Meals), so in a Magnakai book only Magnakai Disciplines act. *Engine*: yes
  (`rules-series.js`); the spec's interpretation is confirmed.
- Gold over 50 may be left in safekeeping at the Kai Monastery. *Engine*: yes: at a book's start
  (the kit step) the excess goes to `hero.storedGold`, and may be drawn on at a later book's start.

### Magnakai Disciplines

| Discipline | Effect | Engine |
|---|---|---|
| Weaponmastery | +3 COMBAT SKILL with a mastered weapon; with the Bow, +3 to the Random Number of a shot | yes (`LW.bowShot` for the Bow) |
| Animal Control | Command and read animals; fight well from the saddle | gates only |
| Curing | +1 ENDURANCE for each section without a fight, up to the maximum; cures disease and wounds, knows herbs and potions | yes (the +1) |
| Invisibility | Hide even in the open; mask heat and scent; pass as a native | gates only |
| Huntmastery | No Meal ever needed, desert and wasteland included; **ignores the extra COMBAT SKILL lost to a surprise attack or ambush** | yes; the ambush where the item table marks a fight `ambush` |
| Pathsmanship | Right path, foreign writing, tracks, traps, always knows north | gates only |
| Psi-surge | +4 COMBAT SKILL at 2 ENDURANCE a round; or Mindblast, +2 at no cost (not both); not at 6 ENDURANCE or less; not on immune enemies | yes (`LW.psi`) |
| Psi-screen | No ENDURANCE lost to Mindforce; resists illusion and hypnosis | yes (`shielded`) |
| Nexus | Withstands heat and cold; moves objects | gates only |
| Divination | Senses danger, hidden enemies, intentions; telepathy | gates only |

The weapons that can be mastered: Spear, Dagger, Mace, Short Sword, Warhammer, Bow, Axe, Sword,
Quarterstaff, Broadsword. *Engine*: `LW.WEAPONS` (the Bow is one).

### Lore-circles

Holding every discipline of a circle adds, for good, to COMBAT SKILL and ENDURANCE:

| Circle | Disciplines | COMBAT SKILL | ENDURANCE |
|---|---|---|---|
| Fire | Weaponmastery, Huntmastery | +1 | +2 |
| Light | Animal Control, Curing | 0 | +3 |
| Solaris | Invisibility, Huntmastery, Pathsmanship | +1 | +3 |
| Spirit | Psi-surge, Psi-screen, Nexus, Divination | +3 | +3 |

*Engine*: `LW.CIRCLES`, checked (2026-10-02).

### Ranks

By the number of Magnakai Disciplines: 1 Kai Master, 2 Kai Master Senior, 3 Kai Master Superior
(where the series begins), 4 Primate, 5 Tutelary, 6 Principalin, 7 Mentora, 8 Scion-kai,
9 Archmaster, 10 Kai Grand Master. *Engine*: `LW.SERIES.magnakai.ranks`.

### Improved Disciplines

From Book 7 each book lists what a rank adds to some disciplines. A rank's improvements are first
printed in the book named, and hold from then on. A carried character reaches each rank in the book
that first prints it, so the engine goes by rank alone (`LW.mkRank`). Those with numbers:

| Rank (first in) | Discipline | Improvement | Engine |
|---|---|---|---|
| Tutelary (Book 8) | Weaponmastery | Unarmed: −2 COMBAT SKILL instead of −4 | yes |
| Mentora (Book 10) | Weaponmastery | +2 to the Random Number with a bow or thrown weapon | yes for the Bow, when the Bow is a mastered weapon (owner's reading, 2026-10-02); a thrown weapon is the text's |
| Scion-kai (Book 11) | Weaponmastery | +4 (not +3) with a mastered weapon; unarmed −1 | yes |
| Archmaster (Book 12) | Curing | Once in 100 days, at 6 ENDURANCE or less in a fight, restore 20 | yes, read as **once a book** (no book spans 100 days of play we can count); a Curing medallion in the fight |
| Archmaster (Book 12) | Psi-surge | +6 at 1 ENDURANCE a round; Mindblast +3; not at 4 ENDURANCE or less | yes (`LW.psi`) |

The others widen what a discipline lets the text offer, and the text gates them:
Primate (Book 7): Animal Control repels an attacking animal; Curing slows poison; Huntmastery climbs
unaided; Psi-surge shakes objects apart; Nexus resists fumes. Tutelary (Book 8): Invisibility
draws attention away; Pathsmanship senses an ambush within 500 yards unless weak; Psi-screen resists
charms and hostile telepathy; Divination recognises magic. Principalin (Book 9): Animal Control
calls a woodland animal; Invisibility silences movement; Huntmastery far sight; Psi-surge sows
doubt; Nexus puts out fires. Mentora (Book 10): Curing neutralises poison; Pathsmanship leaves no
tracks; Psi-screen wards off spirits; Divination sees past events in a place. Scion-kai (Book 11):
Invisibility changes appearance; Pathsmanship speaks with any sentient creature and hides from
magical detection; Psi-screen turns hostile psychic energy; Divination spirit-walks. Archmaster
(Book 12): Animal Control commands most animals; Huntmastery keen hearing, smell and night sight;
Nexus limited immunity to fire, gas and acid.

### Equipment rules new in the series

| Rule | From | Engine |
|---|---|---|
| Bow: used only when the text allows; needs a Quiver and an Arrow, one Arrow a shot; useless hand to hand (armed only with a Bow, fight as unarmed). A Quiver holds six Arrows | Book 6 | yes: `ranged` weapons; `hero.arrows`; a section's `bowShot` |
| Special Items: at most 12 carried; more may be left at the Monastery | Book 8 | yes (`LW.specialLimit`) |
| Special Items may be left in safekeeping at the Monastery between books | Book 5 | yes: `hero.stored`, in the kit step |

## Book addenda

What each book adds to the common and series rules above: its starting kit, its own rules, the
improved disciplines it introduces, and its footnote rulings. Each section is complete for its
book without the other books' sections. "Choose N" lists are what the book offers to add to what he
carries. From Book 2 on, starting gold is 10 + a Random Number, added to any he carries.
*Engine*: Book 1's kit is `makeHero`'s; every later book's is `LW.KITS` in rules-series.js, offered
after the disciplines in the character dialog (gold, given items, the choice, his weapons, the
Monastery). Clothing is named there but not tracked.

### Book 1, Flight from the Dark (Kai)

- **Gold**: a Random Number (0–9).
- **Kit**: Axe; Backpack with 1 Meal; Map of Sommerlund (Special). Then one more thing by Random
  Number: 1 Sword, 2 Helmet (Special, +2 ENDURANCE), 3 two Meals, 4 Chainmail Waistcoat (Special,
  +4 ENDURANCE), 5 Mace, 6 Healing Potion (4 ENDURANCE after a fight, one dose), 7 Quarterstaff,
  8 Spear, 9 12 Gold Crowns, 0 Broadsword. *Engine*: yes (`bonusItem`).
- **Footnotes**: Laumspur gathered as food counts as a Meal when eaten as one, and restores 3
  ENDURANCE as well (113); take as many Torches as will fit, one Backpack space each (347); the
  Crystal Star Pendant may be kept, and later books ask whether he ever had it (349). *Engine*: the
  Laumspur heals 3 and is eaten as a Meal when he has none (`meal: true`); the Torches are one find;
  "ever had" is `hero.had`.

### Book 2, Fire on the Water (Kai)

- **Kit**: a Map and the **Seal of Hammerdal** (Special, a ring). Choose any **2** of: Sword, Short
  Sword, two Meals, Chainmail Waistcoat (Special, +4 ENDURANCE), Mace, Healing Potion (4 after a
  fight, one dose), Quarterstaff, Spear, Shield (Special, +2 COMBAT SKILL in a fight), Broadsword;
  carried Weapons may be exchanged for these. *Engine*: yes (`LW.KITS[2]`; the Shield is `shield`).
- **Meals**: Hunting does not spare a Meal in the Wildlands (Ragadorn, its coast road, the coach
  road east; section 346).
- **The Sommerswerd** (Special, weapon-like): +8 COMBAT SKILL in a fight; Weaponskill with Sword,
  Short Sword or Broadsword adds 2 (+10 in all, not more); fights as a one-handed sword; undead
  enemies lose double ENDURANCE; absorbs magic used against him; loses its power for good if anyone
  but a Kai Lord fights with it. *Engine*: yes.
- **The Magic Spear** (Special, weapon-like): the one weapon that wounds this book's Helghast;
  fights as a spear. *Engine*: yes.
- **Footnotes**: a Backpack from Rhygar if he has none (31); the bridge password works only if
  learned in this reading (47); the Collector's Edition loses only the Seal in the robbery (194, an
  allowed variant); a fresh Meal after refusing the poisoned food (290); without the Seal he leaves
  the alchemist's at once (289); the boy sells the papers for whatever gold he has, and they need no
  Backpack (327). *Engine*: all in its item table.

### Book 3, The Caverns of Kalte (Kai)

- **Kit**: winter clothing; Map of Kalte (Special). Choose any **2** of: Sword, Short Sword, Padded
  Leather Waistcoat (Special, +2 ENDURANCE), Spear, Mace, Warhammer, Axe, Potion of Laumspur (4
  after a fight, one dose), Quarterstaff, Special Rations (one Meal), Broadsword.
- **Meals**: Kalte is icy desert: Hunting never provides a Meal. The mission's food is on his
  sledge; a Meal costs 3 ENDURANCE only when neither the sledge nor a Meal in his Backpack is at
  hand.
- **Footnotes**: one Bone Sword is a Kalkoth rib blade, +1 COMBAT SKILL in Kalte (Collector's
  Edition, 4); section 61 ends the book without his death, and the next book cannot follow it; only
  a red (concentrated) Laumspur potion serves at 139.

### Book 4, The Chasm of Doom (Kai)

- **Kit**: Map of the Southlands and a Badge of Rank (Special). Choose up to **6** of: Warhammer,
  Dagger, two Potions of Laumspur (4 each after a fight), Sword, Spear, five Special Rations (a
  Meal and a Backpack space each), Mace, Chainmail Waistcoat (Special, +4 ENDURANCE), Shield
  (Special, +2 COMBAT SKILL in a fight).
- **Meals**: Hunting fails in the Wildlands south of the Pass of Moytura, until the Ruanon Forest.
- **Footnotes**: a Backpack from Captain D'Val if he has none (12); keep the Tinderbox from 79 or
  123 unless he has another way to relight the torch.

### Book 5, Shadow on the Sand (Kai)

- **Kit**: a map of Vassagonia (Special). Choose up to **4** of: Dagger, Potion of Laumspur (4
  after a fight, one dose), Sword, Spear, two Special Rations (a Meal and a Backpack space each),
  Mace, Shield (Special, +2 COMBAT SKILL in a fight).
- **Safekeeping**: before setting out, Special Items may be left at the Kai Monastery: safe, but
  not usable. *Engine*: yes (the kit step).
- **Meals**: Hunting fails in the desert.
- **Completion**: finishing Books 1–5 makes him a Kai Master, and he goes on to the Magnakai series.
- **Footnotes**: in the fight at 20, half of the ENDURANCE lost (rounded down) comes back after
  winning or evading; the puzzles at 58 and 331 are answered by the sections that say they are.

### Book 6, The Kingdoms of Terror (Magnakai)

- **First Magnakai book**: the Magnakai rules above start here.
- **Gold**: above 50 may be left in safekeeping at the Monastery.
- **Kit**: a map of the Stornlands (Special). Choose any **5** of: Sword, Potion of Laumspur (4
  after a fight, one dose), Warhammer, Bow, Quiver (Special, six Arrows), four Special Rations (a
  Meal and a Backpack space each), Quarterstaff, Padded Leather Waistcoat (Special, +2 ENDURANCE),
  Rope, Dagger, Tinderbox, Axe.
- **Footnotes**: the Sommerswerd and the Dagger of Vashna are Special Items: when told to lose a
  Weapon, he loses an ordinary one if he has one (4); a night's lodging may be paid with a Backpack
  Item or Weapon (17); in the bow fight at 26 only the Bow counts, and Weaponmastery with Bow gives
  +3 COMBAT SKILL there; the shop buys 4 Arrows for 1 Gold Crown (98); the bow at 252 adds 3 more to
  shots, on top of Weaponmastery.

### Book 7, Castle Death (Magnakai)

- **Kit**: a map of the Magi's land (Special). Choose any **5** of: Sword, Bow, Quiver (Special, six
  Arrows), Rope, Potion of Laumspur (4 after a fight, one dose), Lantern (lights itself), Mace,
  three Meals, Dagger, three Fireseeds (Special; burst into flame when thrown against something
  hard).
- **Improved Disciplines introduced: Primate** (4 disciplines): Animal Control repels an attacking
  animal; Curing slows a poison; Huntmastery climbs without aids; Psi-surge shakes an object apart;
  Nexus resists fumes.
- **Footnotes**: the Jewelled Mace may give +5 COMBAT SKILL at 27; the Silver Helm and a Helmet are
  not worn together (148); any Arrows are lost in the falls at 137 and 301; the Sommerswerd keeps
  its power, as no one but a Kai Lord fought with it (335).

### Book 8, The Jungle of Horrors (Magnakai)

- **Kit**: a map of the jungle-swamp (Special). Choose any **5** of: Sword, Bow, Quiver (Special,
  six Arrows), Rope, Potion of Laumspur (4 after a fight, one dose), Lantern (lights itself), Mace,
  three Meals, Dagger, three Fireseeds (Special; burst into flame when thrown).
- **Special Items**: at most 12 carried from here on; more may be left at the Monastery.
  *Engine*: yes.
- **Money**: none in the Danarg; in Talestria 4 Lune = 1 Gold Crown.
- **Improved Disciplines introduced: Tutelary** (5): **Weaponmastery: unarmed costs only 2 COMBAT
  SKILL, not 4**; Invisibility draws an enemy's eye elsewhere; Pathsmanship senses an ambush within
  500 yards unless he is weak from wounds or hunger; Psi-screen resists charms and hostile
  telepathy; Divination recognises magical things unless they are shielded. *Engine*: the
  Weaponmastery number, yes.
- **Footnotes**: keep the Pass (1) and the Lodestone (202), which many sections assume; only the
  Sommerswerd serves against the Helghast at 60.

### Book 9, The Cauldron of Fear (Magnakai)

- **Kit**: a map of Anari (Special). Choose any **5** of: Sword, Bow, Quiver (Special, six Arrows),
  Rope, Potion of Laumspur (4 after a fight, one dose), Lantern (lights itself), Mace, three Meals,
  Dagger, three Fireseeds (Special; burst into flame when thrown).
- **Money**: Anari's Lune, 4 to the Gold Crown.
- **Improved Disciplines introduced: Principalin** (6): Animal Control calls a woodland animal to
  help; Invisibility makes no sound; Huntmastery sees far at will; Psi-surge sows doubt in an
  enemy; Nexus puts out fires by will.
- **Footnotes**: a Tutelary with Weaponmastery fights unarmed at −2 (316); weapon-like Special
  Items not found at 177 may still be recovered later.

### Book 10, The Dungeons of Torgar (Magnakai)

- **Kit**: a map of Ghatan (Special). Choose any **5** of: Sword, Bow, Quiver (Special, six Arrows),
  Rope, Potion of Laumspur (4 after a fight, one dose), Lantern (lights itself), Mace, three Meals,
  Dagger, Potion of Alether (+2 COMBAT SKILL for one fight, drunk just before it).
- **Money**: Eru's Lune, 4 to the Gold Crown.
- **Improved Disciplines introduced: Mentora** (7): **Weaponmastery: +2 to the Random Number with a
  bow or a thrown weapon**; Curing neutralises any poison; Pathsmanship leaves no tracks, even in
  snow; Psi-screen wards off spirits; Divination sees a past event where it happened. *Engine*: the
  Weaponmastery number, yes, for the Bow.
- **Footnotes**: when told to lose a Weapon, a weapon-like Special Item goes only if he has no
  ordinary Weapon (11, 210); the Dagger of Vashna at 142 likewise, or he may keep it; at 203 a 0
  counts as 10, and at least 1 point is lost even with Curing's −3.

### Book 11, The Prisoners of Time (Magnakai)

- **Kit**: a carried character takes **no new kit** and no gold, and nothing goes into or out of
  safekeeping at the start. A new character: a Backpack with 2 Meals, gold (10 + a Random Number),
  and any **6** of: Sword, Bow, Quiver (Special, six Arrows), Rope, Potion of Laumspur (4 after a
  fight, one dose), Lantern (lights itself), Mace, three Meals, Dagger.
- **Improved Disciplines introduced: Scion-kai** (8): **Weaponmastery: +4 COMBAT SKILL (not +3)
  with a mastered weapon, and unarmed costs only 1**; Invisibility changes his appearance;
  Pathsmanship speaks with any sentient creature and hides him from magical detection; Psi-screen
  turns hostile psychic energy; Divination spirit-walks (his body lies helpless meanwhile; if
  either dies, both do). *Engine*: the Weaponmastery numbers, yes.
- **Footnote**: the book is very hard for a new or average character.

### Book 12, The Masters of Darkness (Magnakai)

- **Kit**: a map of the Darklands (Special); cold-weather clothing and a waterproof cape. Choose
  any **6** of: Sword, Bow, Quiver (Special, six Arrows), Rope, Potion of Laumspur (4 after a fight,
  one dose), Lantern (lights itself), Mace, four Meals, Dagger, Quarterstaff, Axe.
- **Improved Disciplines introduced: Archmaster** (9): **Curing: once in 100 days, at 6 ENDURANCE
  or less in a fight, restore 20**; **Psi-surge: +6 COMBAT SKILL at 1 ENDURANCE a round, Mindblast
  +3, unusable at 4 ENDURANCE or less**; Animal Control commands most animals; Huntmastery keen
  hearing, smell and night sight; Nexus limited immunity to fire, toxic gas and acid. *Engine*: the
  Curing and Psi-surge numbers, yes (Curing once a book).
- **Footnotes**: his base ENDURANCE itself can be lowered (240, 268), and at 0 he is dead even if
  armour keeps his current score above it; the Dagger of Vashna adds 7 COMBAT SKILL against a
  Darklord of Helgedad (75, 230); at 75 he cannot harm Kraagenskûl for three rounds without it.

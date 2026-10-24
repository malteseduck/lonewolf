# The books' rules

The rules as Books 1–13 state them, read from each book's rules pages (game rules, disciplines,
equipment, combat, ranks, Lore-circles, improved disciplines, the tables, footnotes), downloaded
2026-10-02 into `data/projectaon/<book>/` (`tools/fetch_projectaon.py <book> --rules`; Book 13's read
2026-10-10 from its full download). Written in
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
| At most 8 Backpack Items, Meals included (each Meal is one) | `LW.backpackMax` |
| *Owner*: at most 12 Special Items, as from Book 8 (the Kai books set no limit; ruling R2) | `LW.specialLimit` |
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
| Combat Ratio = his COMBAT SKILL with every bonus, minus the enemy's | `LW.Fight#ratio` (fight.js); house rule: counted as +10 at most (`LW.RATIO_CAP`, ruling R1), so the "+11 or more" column is never used |
| Each round: a Random Number, crossed with the ratio on the Combat Results Table, gives both sides' ENDURANCE loss; K kills outright | `LW.combatRound` |
| The table is the same in every book; the engine's copy was checked cell by cell (2026-10-02) | `CRT_ROWS` in core.js |
| Ratio columns: ≤−11, −10/−9, −8/−7, −6/−5, −4/−3, −2/−1, 0, +1/+2, +3/+4, +5/+6, +7/+8, +9/+10, ≥+11 | `LW.crtColumn` |
| Rounds go on until one side is at 0 or below | yes |
| No weapon: −4 COMBAT SKILL, bare hands | yes (less with Weaponmastery from Tutelary: see the Magnakai series) |
| Evasion only where the text offers it: the round is fought, only his loss counts, and he is away | yes (`evade`) |
| A door fought as an enemy ("RESISTANCE points"): the normal rules, his losses the effort | yes (`kind: 'obstacle'`); leaving it costs no blow and Mindblast does not touch it (rulings R23, R24) |
| Several enemies "one at a time" are fought in turn; "as one enemy" is one combat line | importer |

### Carrying a character on

| Rule | Engine |
|---|---|
| A completed book's COMBAT SKILL, ENDURANCE, disciplines, Weapons and Special Items carry into the next | `LW.Character` |
| Gold carries; each book's starting gold is **added** to it (still at most 50) | yes |
| Backpack Items and Meals do not carry over: the rules pages name only Weapons and Special Items | yes: the Backpack starts empty (`LW.HeroSetup`) |
| A new character may start at any book, with that book's own kit | yes: Book 1 by `makeHero`, later books by `LW.KITS` |

## Kai series (Books 1–5)

### Kai Disciplines

A new character has **five**. A character carried on chooses **one more for each book completed**:
six in Book 2, seven in Book 3, eight in Book 4, nine in Book 5; completing Book 5 with all of
Books 1–4 behind him makes him a Kai Master with all ten. *Engine*: setting out
(`LW.HeroSetup`): new = five, carried = one more.

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
  (`rules-series.js`); the spec's interpretation is confirmed. *But* the Lone Wolf Club newsletters
  (in the Readers' Handbook, downloaded 2026-10-10) rule that a character who completed Books 1–5
  keeps Healing's +1 a section (not added to Curing's) and Hunting's spared Meals in the Magnakai
  books (Summer Special 1987, 8, 10). The owner adopted that (ADR 0011). *Engine*: yes (`LW.heals`,
  `LW.hunts`); as the Magnakai books do not mark desert and wasteland, Hunting spares the Meal and
  the page reminds him to eat by hand in such a place.
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
| Psi-surge | +4 COMBAT SKILL at 2 ENDURANCE a round; or Mindblast, +2 at no cost (not both); not at 6 ENDURANCE or less; not on immune enemies | yes (`LW.psi`); a foe the text makes immune to Mindblast "but not Psi-surge" still takes Psi-surge (`immune: 'mindblast'`) |
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

## Grand Master series (Books 13–20)

Read from Book 13's rules pages (2026-10-10). **The engine applies it** (Book 13's engine work, G1-G7, done 2026-10-17): the series
itself (`LW.SERIES.grandmaster`, 2026-10-16: its disciplines, ranks, gates, and which earlier numbers
remain), setting out (G2, 2026-10-16: the scores, the disciplines past four, Grand Weaponmastery's
weapons), carrying in (G3), the Grand Master Disciplines' numbers (G5, 2026-10-17) and the Kai sheet (G6); what the engine leaves to the player is said in each row; the owner's readings are ADR 0011.

Book 13's footnote points to Project Aon's Readers' Handbook for what the earlier disciplines still
do. Its rules pages (Kai, Magnakai, Grand Master, New Order, the rules FAQ, the newsletter excerpts,
three Topical Guide pages) were downloaded on 2026-10-10 into git-ignored
`data/projectaon/readers-handbook/`. Its rulings come from the Lone Wolf Club newsletters (marked
**LWCN** below, with the issue); where the Handbook gives only its editors' advice, it says so.

### What the Kai and Magnakai Disciplines still do

| Rule | Engine |
|---|---|
| He holds every Kai and Magnakai Discipline; the text offers the Magnakai ones by name (Book 13: Nexus, Divination, Invisibility, Psi-surge, Animal Control) and assumes those with no number | `LW.has` |
| Only a character who completed Books 1–12 keeps the numbers of his Magnakai Disciplines (LWCN Summer Special 1987, 10, 28). Partly completed: the Handbook leaves it to the reader. *Owner*: any carried character keeps the numbers of those he chose (ADR 0011) | `LW.chose` (`hero.magnakai`) |
| Those numbers: Huntmastery spares Meals unless the text says not; Curing +1 ENDURANCE a section without a fight; Weaponmastery +3 (+4 from Scion-kai) and +2 on bow or thrown shots; Psi-surge +4 at 2 a round, Mindblast +2 (an Archmaster's +6 at 1, +3) | yes, at his Magnakai rank |
| A Grand Master Discipline replaces its Magnakai counterpart's number, never adds to it: Grand Weaponmastery with a weapon he had mastered is +5, not +8 or +9 (LWCN 28) | yes (`LW.grand`): Grand Weaponmastery, Kai-surge, Deliverance, Grand Huntmastery each in place of the Magnakai number |
| The +1 a section without a fight carries on into the series only for a character who played and survived the Magnakai books: a hidden reward for loyal readers (LWCN 28) | yes, with Curing chosen (ADR 0011) |
| Deliverance replaces Archmaster Curing. "Once every 20 days" has no official ruling; the Handbook suggests once an adventure. *Owner*: once a book (ADR 0011) | yes (`LW.cureOf`) |

### Entering the series

| Rule | Engine |
|---|---|
| A new character: COMBAT SKILL = **25** + a Random Number, ENDURANCE = **30** + a Random Number | yes (`LW.SERIES.grandmaster.base`) |
| A carried character (Books 1–12 behind him) keeps his COMBAT SKILL and ENDURANCE, Lore-circle bonuses included in them | yes: circle ENDURANCE stays in his scores; circle COMBAT SKILL, added per fight in a Magnakai book, is folded into his score as he enters (`enterGrand`) |
| Discipline bonuses of the earlier series do not raise his permanent scores; only a character who completed the earlier books benefits from them (above) | yes: nothing adds them to his scores (`LW.chose` gives them in play) |
| Weapons, **Backpack Items** and gold carry over (unlike every earlier book). Whether Meals do is left open: the Handbook calls dropping them optional. *Owner*: Meals do not (ADR 0011) | yes |
| A carried character may instead re-roll: the rules say he "can" carry his scores; the Handbook lists ways to start afresh but gives no ruling. *Owner*: no re-roll; he keeps his scores and bonuses (ADR 0011) | yes (`LW.HeroSetup` draws no scores for him) |
| Only these Special Items carry into the series: Crystal Star Pendant, Sommerswerd, Silver Helm, Dagger of Vashna, Silver Bracers, Jewelled Mace, Silver Bow of Duadon, Helshezag, Kagonite Chainmail, Korlinium Scabbard. A character who begins the series at Book 13 uses this list throughout; later books alter it for one who begins there. *Owner*: the others are dropped (ADR 0011) | yes (`LW.SERIES.grandmaster.keeps`), carried or at the Monastery, on entering the series; between Grand Master books his Special Items all carry, until a later book's rules say otherwise |

### Carrying

| Rule | Engine |
|---|---|
| At most 2 Weapons; at most **10** Backpack Items, Meals included | `LW.backpackMax` (for `series: 'grandmaster'`, which G1 adds) |
| At most 12 Special Items; more may be left at the Monastery | `LW.specialLimit` (12 in every book, ruling R2); the Monastery at a book's start (the kit step: `store`) |
| Gold: at most 50; more may be left at the Monastery | yes, at a book's start (the kit step: `storeGold`) |
| Bow: as in the Magnakai series (a Quiver and an Arrow a shot, useless hand to hand) | yes (`ranged`, `hero.arrows`, `bowShot`) |
| Some sections give Grand Weaponmastery with Bow its own bonus (3 to 5); the Handbook advises using the section's number in place of the +5. *Owner*: the section's number (ruling R10) | yes (an item table's `grandBow`) |

### Grand Master Disciplines

A character begins at rank Kai Grand Defender with **four**; each Grand Master book completed adds
**one**. Each discipline beyond the first four adds **+1 COMBAT SKILL and +2 ENDURANCE** to his
basic scores, for good. *Engine*: yes, the four and one a book (`LW.SERIES.grandmaster.first`), and the
bonus when he sets out (`LW.readyHero`, once each).

| Discipline | Effect | Engine |
|---|---|---|
| Grand Weaponmastery | +5 COMBAT SKILL with a mastered weapon; two weapons at the start, one more for each Grand Master book completed; with the Bow, +5 to the Random Number of a shot | yes (`hero.grandMastery`; `weaponParts`, `weaponBonus`) |
| Animal Mastery | Controls hostile non-sentient creatures; speaks with birds and fish | gates only |
| Deliverance (Advanced Curing) | Once every 20 days, at 8 ENDURANCE or less in a fight, restore 20 | yes, once a book (ruling R9; `LW.cureOf`, the fight's medallion) |
| Assimilance (Advanced Invisibility) | Changes his appearance for days; near undetectable in open land | gates only |
| Grand Huntmastery | No Meal needed when told to eat; sees in total darkness | the Meal (`LW.hunts`); the darkness, gates only |
| Grand Pathsmanship | Resists hostile plants; senses ambush in woods | gates only |
| Kai-surge | +8 COMBAT SKILL at 1 ENDURANCE a round, or Mindblast +4 at no cost; not with Psi-surge or Mindblast at once; not at 6 ENDURANCE or less | yes (`LW.psi`; gets through a foe immune to Mindblast and Psi-surge, `immune: 'psi'`) |
| Kai-screen | Mind fortresses for himself and others, stronger by rank (the text gives it a COMBAT SKILL penalty to spare: 221, 325) | shields from a foe's mind attack (`LW.shielded`), as Psi-screen |
| Grand Nexus | Withstands flame and acid for an hour or more | gates only |
| Telegnosis (Advanced Divination) | Longer, safer spirit-walking | gates only |
| Magi-magic | Old Kingdom battle-spells | gates only |
| Kai-alchemy | Left-handed magic spells | gates only |

The weapons that can be mastered are the same ten as Weaponmastery's.

Footnote rulings (Project Aon's): Grand Weaponmastery's bonus **replaces** Weaponmastery's, it is
not added to it; and the Mentora +2 on bow shots is not added to Grand Weaponmastery's +5. *Engine*: yes.

### Ranks

By the number of Grand Master Disciplines: 1 Kai Grand Master Senior, 2 Kai Grand Master Superior,
3 Kai Grand Sentinel, 4 Kai Grand Defender (where the series begins), 5 Kai Grand Guardian, 6 Sun
Knight, 7 Sun Lord, 8 Sun Thane, 9 Grand Thane, 10 Grand Crown, 11 Sun Prince, 12 Kai Supreme
Master. *Engine*: `LW.SERIES.grandmaster.ranks`.

### Improved Disciplines

Promised by rank in later books; Book 13 lists none, Book 14 those of Kai Grand Guardian, Book 15 those of Sun Knight (their addenda). The Handbook gathers those of Books 14–20 by
rank; the ones with numbers, for when those books come: Grand Weaponmastery at Sun Knight (6)
wields two-handed weapons one-handed, at Sun Lord (7) sets a non-magical blade alight for +1
enemy loss a winning round, at Grand Crown (10) +3 bare-handed; Kai-surge at Kai Grand Guardian (5)
attacks up to three foes at once, at Sun Lord (7) a Kai-blast (two Random Numbers added, 0 = 1, at
4 ENDURANCE), at Sun Prince (11) a Kai-ray once a fight (15 more damage at 4 ENDURANCE, not at 10 or
less).

## Book addenda

What each book adds to the common and series rules above: its starting kit, its own rules, the
improved disciplines it introduces, and its footnote rulings. Each section is complete for its
book without the other books' sections. "Choose N" lists are what the book offers to add to what he
carries. From Book 2 on, starting gold is 10 + a Random Number, added to any he carries.
*Engine*: Book 1's kit is `makeHero`'s; every later book's is `LW.KITS` in rules-series.js, offered
after the disciplines when setting out (gold, given items, the choice, his weapons, the
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
- **The sewer door** (156) is battered down by the normal combat rules, his losses the effort.
  *Engine*: yes, an obstacle (rulings R23, R24).

### Book 7, Castle Death (Magnakai)

- **Kit**: a map of the Magi's land (Special). Choose any **5** of: Sword, Bow, Quiver (Special, six
  Arrows), Rope, Potion of Laumspur (4 after a fight, one dose), Lantern (lights itself), Mace,
  three Meals, Dagger, three Fireseeds (Special; burst into flame when thrown against something
  hard).
- **Improved Disciplines introduced: Primate** (4 disciplines): Animal Control repels an attacking
  animal; Curing slows a poison; Huntmastery climbs without aids; Psi-surge shakes an object apart;
  Nexus resists fumes.
- **Footnotes**: the Jewelled Mace may give +5 COMBAT SKILL at 27; the Silver Helm and a Helmet are
  not worn together (148: *Engine*: yes, the Silver Helm's `apart` refuses either beside the other); any Arrows are lost in the falls at 137 and 301; the Sommerswerd keeps
  its power, as no one but a Kai Lord fought with it (335).
- **The tunnel door** (214) is lifted by the normal combat rules, bare-handed unless he has Nexus, his
  losses the effort. *Engine*: yes, an obstacle (rulings R23, R24).

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
- **Money**: Anari's Lune, 4 to the Gold Crown. Engine: Lune found, paid and lost are counted in their own purse (`hero.coins`, item tables), apart from the Gold Crowns.
- **Improved Disciplines introduced: Principalin** (6): Animal Control calls a woodland animal to
  help; Invisibility makes no sound; Huntmastery sees far at will; Psi-surge sows doubt in an
  enemy; Nexus puts out fires by will.
- **Footnotes**: a Tutelary with Weaponmastery fights unarmed at −2 (316); weapon-like Special
  Items not found at 177 may still be recovered later. *Engine*: kept apart from the rest when he is
  stripped, given back at 54, or at 350 with his Weapons (item table).

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
  counts as 10, and at least 1 point is lost even with Curing's −3. *Engine*: yes (item table); the
  Dagger of Vashna opens 142 as a Dagger and is kept there (the footnote's alternative).

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
  *Engine*: the Dagger's 7 and those three rounds through the item table (`weaponCs`, `rounds`); 268's
  losses off his maximum after a first round he lost (`rounds` `offMax`, `behind`); Helshezag's 1 a
  round from the second, off his base (240; the item's `wieldCost`, taken up only where a fight names
  it or he has no other weapon). Death at a base of 0 under armour, no.
- **Meals**: past 200 Kai Hunting no longer feeds him in the Darklands; Huntmastery still does.
  *Engine*: yes (`noHunt: 'Hunting'` at 36, 144, 338).
- **Armour**: Kagonite Chainmail +3 COMBAT SKILL and +1 ENDURANCE, Bronin Vest +3 and +1 (not with a
  Chainmail Waistcoat), Silver Bracers +2 and +1. *Engine*: yes (`fightCs`, `ep`, `apart`).
- **Money**: Kika, 10 to the Gold Crown (in the text). *Engine*: counted in their own purse
  (`hero.coins`), found, staked, paid and lost through the item table.

### Book 13, The Plague Lords of Ruel (Grand Master)

The first Grand Master book. Read from its own rules pages (game rules, disciplines, equipment, combat,
levels, improved disciplines, wisdom, footnotes; the book has no Lore-circles page). *Engine*: the
series (G1), setting out (G2), carrying into the series (G3), its kit, gold and the Monastery (G4),
the new disciplines' numbers (G5) and the Kai sheet (G6). Also in place:
`LW.backpackMax` (10 for `series: 'grandmaster'`) and `LW.specialLimit` (12).

- **Scores**: a new character: COMBAT SKILL = **25** + a Random Number (0 counts as zero), ENDURANCE =
  **30** + a Random Number. ENDURANCE can never rise above its value at the start of the adventure; at
  zero or below he is dead. One who completed any of Books 1-12 may carry his scores over, Lore-circle
  bonuses included; the Disciplines he mastered then still help in play (Weaponmastery, Curing,
  Psi-surge), but only if he completed those books, and their bonuses do not raise his permanent
  scores. *Engine*: the scores, yes (25 and 30 for a new character; a carried one keeps his); the
  earlier Disciplines' help in play, for the Magnakai ones he chose (`LW.chose`).
- **Carried over**: Weapons (still two at most) and Backpack Items (now up to **ten**); Gold Crowns.
  Of the Special Items only the Crystal Star Pendant, Sommerswerd, Silver Helm, Dagger of Vashna,
  Silver Bracers, Jewelled Mace, Silver Bow of Duadon, Helshezag, Kagonite Chainmail and Korlinium
  Scabbard. *Engine*: yes (G3).
- **Disciplines**: he holds every Kai and Magnakai Discipline (the book summarises them) and chooses
  **four** Grand Master Disciplines as a Kai Grand Defender. From Book 14, each Grand Master
  Discipline past four adds 1 to his basic COMBAT SKILL and 2 to his basic ENDURANCE; completing this
  book earns a further Discipline in Book 14. *Engine*: yes (the four, one a book, the bonus past four).

| Grand Master Discipline | Effect | Engine |
|---|---|---|
| Grand Weaponmastery | +5 COMBAT SKILL with a mastered weapon (two to start, one more for each Grand Master book completed); the weapons are the ten of Weaponmastery (Spear, Dagger, Mace, Short Sword, Warhammer, Bow, Quarterstaff, Broadsword, Axe, Sword); with the Bow, +5 to a Random Number picked for a shot. Replaces Weaponmastery's bonus, not added to it; Mentora's +2 on bow shots is not added to the +5 | yes (`hero.grandMastery`; `weaponParts`, `weaponBonus`) |
| Animal Mastery | Considerable control over hostile non-sentient creatures; talks with birds and fish and uses them as guides | gates only |
| Deliverance (Advanced Curing) | In a fight at 8 ENDURANCE or less, restore 20; once every 20 days (owner: once a book, ruling R9) | yes (`LW.cureOf`) |
| Assimilance (Advanced Invisibility) | Striking changes of appearance lasting a few days; almost undetectable in open country | gates only |
| Grand Huntmastery | Sees in total darkness, keener touch and taste; no Meal ticked off when told to eat | the Meal (`LW.hunts`); the rest, gates only |
| Grand Pathsmanship | Resists entrapment by hostile plants; keen awareness of ambush in woods and dense forest | gates only |
| Kai-surge | Psychic attack: +8 COMBAT SKILL, costing 1 ENDURANCE a round; or Mindblast +4 at no cost. Not together with Psi-surge or Mindblast; not at 6 ENDURANCE or less | yes (`LW.psi`; gets through a foe immune to Mindblast and Psi-surge, `immune: 'psi'`) |
| Kai-screen | Mind fortresses for himself and others in psychic combat, stronger with rank (sections 221 and 325 give a COMBAT SKILL penalty of 3 without it) | shields from a foe's mind attack (`LW.shielded`) |
| Grand Nexus | Withstands flames and acids an hour or more; grows with rank | gates only |
| Telegnosis (Advanced Divination) | Spirit-walks far longer with fewer ill effects; duration and the body's protection grow with rank | gates only |
| Magi-magic | Old Kingdom battle-magic of the Vakeros (Shield, Power Word, Invisible Fist); grows with rank | gates only |
| Kai-alchemy | Left-handed magic (Lightning Hand, Levitation, Mind Charm); grows with rank, and crafts new Kai weapons and artefacts | gates only |

"Gates only" means the importer reads a section's check on the Discipline, which can open once the
hero can hold it; no effect is applied.

- **Gold**: 20 + a Random Number, added to any he carries. At most 50 in the Belt Pouch; the rest may
  be left at the Monastery. *Engine*: yes, `gold: 20` in `LW.KITS[13]`; the purse's 50 and the Monastery for the rest.
- **Kit**: a map of the Dark Realm of Ruel (Special Item). Choose any **5** of: Sword, Bow, Quiver
  (Special Item, six Arrows), Axe, four Meals, Rope, Potion of Laumspur (4 ENDURANCE after a fight,
  one dose, never just before one), Spear, Dagger; added to what he carries. Weapons and Bow are
  carried in the hand, the Quiver over the shoulder, Meals, Rope and Potion in the Backpack.
  *Engine*: yes, `LW.KITS[13]`, with Monastery storage for Special Items.
- **Carrying**: two Weapons; ten Backpack Items, Meals included, one Backpack; twelve Special Items,
  the surplus left at the Monastery; fifty Gold Crowns. No food when told to eat: lose 3 ENDURANCE.
  *Engine*: the ten and the twelve, yes (`LW.backpackMax`, `LW.specialLimit`); the rest as in the
  other books.
- **Bow**: used only when the section allows; needs a Quiver and an Arrow, one Arrow a shot; useless
  hand to hand. *Engine*: yes (`ranged`, `hero.arrows`, `bowShot`).
- **Money**: Palmyrion's Lune, 4 to the Gold Crown. *Engine*: counted in their own purse
  (`hero.coins`) through the item table.
- **Combat**: as before, with the Grand Master bonuses and Special Items added to COMBAT SKILL; Kai-surge
  also costs 1 ENDURANCE each round it is used (the example: the Combat Ratio +5, a roll of 2, he loses 3
  plus 1). Evasion only where the section allows it: that round is fought, the enemy's losses are
  ignored and only he loses ENDURANCE. *Engine*: yes.
- **Ranks**: Kai Grand Master Senior, Superior, Kai Grand Sentinel, Kai Grand Defender (this book's
  start), Kai Grand Guardian, Sun Knight, Sun Lord, Sun Thane, Grand Thane, Grand Crown, Sun Prince,
  Kai Supreme Master: one more with each Grand Master book. *Engine*: yes (`LW.SERIES.grandmaster.ranks`).
- **Improved Disciplines**: none are listed; the page promises them in later books, and gives Grand Nexus
  at Grand Thane (passing freely through Shadow Gates) as the one example.
- **Footnotes**: the riddle at 48 is answered by 146 (26 is a wrong answer); the combination lock
  riddle at 158 and 227 is answered by 15; the other sections are not marked correct. *Engine*: left
  to the player, a puzzle.
- **Wisdom**: choose the four Disciplines with care; completing earlier books is an advantage but not
  needed for this one.

### Book 14, The Captives of Kaag (Grand Master)

Read from its own rules pages against Book 13's (tools/rules_diff.py, 2026-10-17): the combat rules,
levels, combat results and Random Number Table are unchanged; the book has no Lore-circles page.

- **Scores**: a new character: COMBAT SKILL = **25** + a Random Number (0 counts as zero), ENDURANCE =
  **30** + a Random Number. ENDURANCE can never rise above its value at the start of the adventure; at
  zero or below he is dead. One who completed any of Books 1-13 may carry his scores over, including
  the Weaponmastery, Curing and Psi-surge bonuses earned in the Kai (1-5) and Magnakai (6-12) books;
  those bonuses help in play only if he completed those books, and do not raise his permanent scores
  (footnote 1). *Engine*: the scores, yes (25 and 30 for a new character; a carried one keeps his);
  the earlier Disciplines' help in play, for the Magnakai ones he chose (`LW.chose`).
- **Carried over**: Weapons (still two at most) and Backpack Items (up to **ten**); Gold Crowns. A
  character coming from the Kai or Magnakai books keeps only these Special Items: Crystal Star
  Pendant, Sommerswerd, Silver Helm, Dagger of Vashna, Silver Bracers, Jewelled Mace, Silver Bow of
  Duadon, Helshezag, Kagonite Chainmail, Korlinium Scabbard; one coming from Book 13 keeps all his
  Special Items. *Engine*: yes (`LW.SERIES.grandmaster.keeps` on entering the series; between Grand
  Master books everything carries).
- **Disciplines**: he holds every Kai and Magnakai Discipline and four Grand Master Disciplines. One
  who completed Book 13 chooses **one more** Grand Master Discipline and adds **+1** to his basic COMBAT
  SKILL and **+2** to his basic ENDURANCE (footnote 2); in all, each Grand Master Discipline past four
  adds 1 and 2, kept for later books. Completing this book earns a further Discipline in Book 15.
  *Engine*: yes (the four, one a book, the bonus past four: `LW.SERIES.grandmaster.first`,
  `LW.readyHero`).

| Grand Master Discipline | Effect | Engine |
|---|---|---|
| Grand Weaponmastery | +5 COMBAT SKILL with a mastered weapon (two to start, one more for each Grand Master book completed); the weapons are the ten of Weaponmastery (Spear, Dagger, Mace, Short Sword, Warhammer, Bow, Quarterstaff, Broadsword, Axe, Sword); with the Bow, +5 to a Random Number picked for a shot. Replaces Weaponmastery's bonus, not added to it; Mentora's +2 on bow shots is not added to the +5 (footnote 3) | yes (`hero.grandMastery`; `weaponParts`, `weaponBonus`) |
| Animal Mastery | Considerable control over hostile non-sentient creatures; talks with birds and fish and uses them as guides | gates only |
| Deliverance (Advanced Curing) | In a fight at 8 ENDURANCE or less, restore 20; once every 20 days (owner: once a book, ruling R9) | yes (`LW.cureOf`) |
| Assimilance (Advanced Invisibility) | Striking changes of appearance lasting a few days; almost undetectable in open country | gates only |
| Grand Huntmastery | Sees in total darkness, keener touch and taste; no Meal ticked off when told to eat | the Meal (`LW.hunts`); the rest, gates only |
| Grand Pathsmanship | Resists entrapment by hostile plants; keen awareness of ambush in woods and dense forest | gates only |
| Kai-surge | Psychic attack: +8 COMBAT SKILL, costing 1 ENDURANCE a round; or Mindblast +4 at no cost. Not together with Psi-surge or Mindblast; not at 6 ENDURANCE or less | yes (`LW.psi`) |
| Kai-screen | Mind fortresses for himself and others in psychic combat, stronger with rank | shields from a foe's mind attack (`LW.shielded`) |
| Grand Nexus | Withstands flames and acids an hour or more; grows with rank | gates only |
| Telegnosis (Advanced Divination) | Spirit-walks far longer with fewer ill effects; duration and the body's protection grow with rank | gates only |
| Magi-magic | Old Kingdom battle-magic of the Vakeros; grows with rank | gates only |
| Kai-alchemy | Left-handed magic; grows with rank, and crafts new Kai weapons and artefacts | gates only |

"Gates only" means the importer reads a section's check on the Discipline (and on a rank, as at 107),
which opens when the hero holds it; no effect is applied.

- **Gold**: 20 + a Random Number, added to any he carries. At most 50 in the Belt Pouch; the rest may
  be left at the Monastery. No foreign money is named on the rules pages. *Engine*: yes, `gold: 20`
  in `LW.KITS[14]`; the purse's 50 and the Monastery for the rest.
- **Kit**: a map of the Darklands. Choose any **5** of: Sword, Bow, Quiver (Special Item, six
  Arrows), Axe, four Meals (a Backpack space each), Rope, Potion of Laumspur (4 ENDURANCE after a
  fight, one dose, never just before one), Spear, Dagger; added to what he carries. Weapons and Bow
  are carried in the hand, the Quiver over the shoulder, Meals, Rope and Potion in the Backpack.
  *Engine*: yes, `LW.KITS[14]` (the map as a Special Item, `mapDarklands`, not given twice to one who
  kept Book 12's), with Monastery storage for Special Items.
- **Carrying**: two Weapons; ten Backpack Items, Meals included, one Backpack; twelve Special Items,
  the surplus left at the Monastery; fifty Gold Crowns. No food when told to eat: lose 3 ENDURANCE.
  *Engine*: yes (`LW.backpackMax`, `LW.specialLimit`, the Meal rule).
- **Bow**: used only when the section allows; needs a Quiver and an Arrow, one Arrow a shot; useless
  hand to hand. *Engine*: yes (`ranged`, `hero.arrows`, `bowShot`).
- **Combat**: as in Book 13, with the Grand Master bonuses and Special Items added to COMBAT SKILL;
  Kai-surge costs 1 ENDURANCE each round it is used. Evasion only where the section allows it: that
  round is fought, the enemy's losses are ignored and only he loses ENDURANCE. *Engine*: yes.
- **Ranks**: Kai Grand Master Senior, Superior, Kai Grand Sentinel, Kai Grand Defender, Kai Grand
  Guardian, Sun Knight, Sun Lord, Sun Thane, Grand Thane, Grand Crown, Sun Prince, Kai Supreme Master,
  by the number of Grand Master Disciplines. *Engine*: yes (`LW.SERIES.grandmaster.ranks`).
- **Improved Disciplines introduced: Kai Grand Guardian** (5 Disciplines): Animal Mastery summons a
  few forest animals as loyal allies, outdoors only; Assimilance raises a fog within 15 yards that
  blinds normal sight and infravision, lasting longer by rank; Grand Huntmastery moves faster over any
  ground, on foot or mounted, to outrun pursuit; **Kai-surge attacks up to three enemies at once in
  psychic combat**; Kai-screen gives Mindblend, hiding his mind from a hostile probe; Magi-magic gives
  two battle-spells: Splinter (shatters bottles, mirrors, windows and the like; range by rank) and
  Flameshaft (sets an Arrow's tip alight with a flame hard to put out). *Engine*: gates only (a
  section's check on the Discipline and the rank); Kai-surge against several foes at once, no: the
  engine fights one enemy at a time, so it is left to the player.
- **Footnotes**: the locks are puzzles answered by the sections that say so: the Kagonite door lock
  (127, 319) by 3, the torture-chamber exit lock (220) by 8, the steel-sheathed doors (181) by 20;
  the Discipline offered at 23, 131 and 320 may be chosen only if he has not used it already; at 186
  he gets rid of a Drakkarim uniform if he wears one; at 243 a Kai Grand Guardian with Magi-magic may
  cast Flameshaft on the inflammable liquid, spending an Arrow, and turn to 52. *Engine*: the puzzles,
  left to the player; Flameshaft at 243 is a choice the item table adds (`add`), its Arrow taken at 52;
  the rest by hand.
- **Wisdom**: choose the Disciplines with care; completing earlier books is an advantage but not
  needed for this one.

### Book 15, The Darke Crusade (Grand Master)

Read from its own rules pages against Book 14's (tools/rules_diff.py, 2026-10-24): the levels, combat
results and Random Number Table are unchanged; the book has no Lore-circles page.

- **Scores**: a new character: COMBAT SKILL = **25** + a Random Number (0 counts as zero), ENDURANCE =
  **30** + a Random Number. ENDURANCE can never rise above its value at the start of the adventure; at
  zero or below he is dead. One who completed any of Books 1-14 may carry his scores over, including
  the Weaponmastery, Curing and Psi-surge bonuses earned in the Kai (1-5) and Magnakai (6-12) books;
  those bonuses help in play only if he completed those books, and do not raise his permanent scores
  (footnote 2). *Engine*: the scores, yes (25 and 30 for a new character; a carried one keeps his);
  the earlier Disciplines' help in play, for the Magnakai ones he chose (`LW.chose`).
- **Carried over**: Weapons (still two at most) and Backpack Items (up to **ten**); Gold Crowns. A
  character coming from the Kai or Magnakai books keeps only these Special Items: Crystal Star
  Pendant, Sommerswerd, Silver Helm, Dagger of Vashna, Silver Bracers, Jewelled Mace, Silver Bow of
  Duadon, Helshezag, Kagonite Chainmail, Korlinium Scabbard; one coming from Book 13 or 14 keeps all
  his Special Items. *Engine*: yes (`LW.SERIES.grandmaster.keeps` on entering the series; between
  Grand Master books everything carries).
- **Disciplines**: he holds every Kai and Magnakai Discipline and four Grand Master Disciplines. For
  **each** Grand Master book he completed (13, 14), he chooses one more Grand Master Discipline and
  adds **+1** to his basic COMBAT SKILL and **+2** to his basic ENDURANCE (footnote 3); in all, each
  Grand Master Discipline past four adds 1 and 2, kept for later books. Completing this book earns a
  further Discipline in Book 16. *Engine*: yes (the four, one a book, the bonus past four:
  `LW.SERIES.grandmaster.first`, `LW.readyHero`).

| Grand Master Discipline | Effect | Engine |
|---|---|---|
| Grand Weaponmastery | +5 COMBAT SKILL with a mastered weapon (two to start, one more for each Grand Master book completed); the weapons are the ten of Weaponmastery (Spear, Dagger, Mace, Short Sword, Warhammer, Bow, Quarterstaff, Broadsword, Axe, Sword); with the Bow, +5 to a Random Number picked for a shot. Replaces Weaponmastery's bonus, not added to it; Mentora's +2 on bow shots is not added to the +5 (footnote 4) | yes (`hero.grandMastery`; `weaponParts`, `weaponBonus`) |
| Animal Mastery | Considerable control over hostile non-sentient creatures; talks with birds and fish and uses them as guides | gates only |
| Deliverance (Advanced Curing) | In a fight at 8 ENDURANCE or less, restore 20; once every 20 days (owner: once a book, ruling R9) | yes (`LW.cureOf`) |
| Assimilance (Advanced Invisibility) | Striking changes of appearance lasting a few days; almost undetectable in open country | gates only |
| Grand Huntmastery | Sees in total darkness, keener touch and taste; no Meal ticked off when told to eat | the Meal (`LW.hunts`); the rest, gates only |
| Grand Pathsmanship | Resists entrapment by hostile plants; keen awareness of ambush in woods and dense forest | gates only |
| Kai-surge | Psychic attack: +8 COMBAT SKILL, costing 1 ENDURANCE a round; or Mindblast +4 at no cost. Not together with Psi-surge or Mindblast; not at 6 ENDURANCE or less | yes (`LW.psi`) |
| Kai-screen | Mind fortresses for himself and others in psychic combat, stronger with rank | shields from a foe's mind attack (`LW.shielded`) |
| Grand Nexus | Withstands flames and acids an hour or more; grows with rank | gates only |
| Telegnosis (Advanced Divination) | Spirit-walks far longer with fewer ill effects; duration and the body's protection grow with rank | gates only |
| Magi-magic | Old Kingdom battle-magic of the Vakeros; grows with rank | gates only |
| Kai-alchemy | Left-handed magic; grows with rank, and crafts new Kai weapons and artefacts | gates only |

"Gates only" means the importer reads a section's check on the Discipline (and on a rank), which
opens when the hero holds it; no effect is applied.

- **Gold**: 20 + a Random Number, added to any he carries. At most 50 in the Belt Pouch; the rest may
  be left at the Monastery. *Engine*: yes, `gold: 20` in `LW.KITS[15]`; the purse's 50 and the
  Monastery for the rest.
- **Money**: Nyras's Kika, 10 to the Gold Crown. *Engine*: counted in their own purse (`hero.coins`),
  found, staked, paid and lost through the item table.
- **Kit**: a map of the Western Tentarias. Choose any **5** of: Sword, Bow, Quiver (Special Item, six
  Arrows), Axe, four Meals (a Backpack space each), Rope, Potion of Laumspur (4 ENDURANCE after a
  fight, one dose, never just before one), Spear, Dagger; added to what he carries. Weapons and Bow
  are carried in the hand, the Quiver over the shoulder, Meals, Rope and Potion in the Backpack.
  *Engine*: yes, `LW.KITS[15]` (the map as a Special Item, `mapTentarias`), with Monastery storage for
  Special Items.
- **Carrying**: two Weapons; ten Backpack Items, Meals included, one Backpack; twelve Special Items,
  the surplus left at the Monastery; fifty Gold Crowns. No food when told to eat: lose 3 ENDURANCE.
  *Engine*: yes (`LW.backpackMax`, `LW.specialLimit`, the Meal rule).
- **Bow**: used only when the section allows; needs a Quiver and an Arrow, one Arrow a shot; useless
  hand to hand. *Engine*: yes (`ranged`, `hero.arrows`, `bowShot`).
- **Combat**: as in Book 14, with the Grand Master bonuses and Special Items added to COMBAT SKILL;
  Kai-surge costs 1 ENDURANCE each round it is used. Evasion only where the section allows it: that
  round is fought, the enemy's losses are ignored and only he loses ENDURANCE. *Engine*: yes.
- **Ranks**: Kai Grand Master Senior, Superior, Kai Grand Sentinel, Kai Grand Defender, Kai Grand
  Guardian, Sun Knight, Sun Lord, Sun Thane, Grand Thane, Grand Crown, Sun Prince, Kai Supreme Master,
  by the number of Grand Master Disciplines. *Engine*: yes (`LW.SERIES.grandmaster.ranks`).
- **Improved Disciplines, Kai Grand Guardian** (5 Disciplines): Animal Mastery summons a few forest
  animals as loyal allies, outdoors only; Assimilance raises a fog within 15 yards that blinds normal
  sight and infravision, lasting longer by rank; Grand Huntmastery moves faster over any ground, on
  foot or mounted, to outrun pursuit; **Kai-surge attacks up to three enemies at once in psychic
  combat**; Kai-screen gives Mindblend, hiding his mind from a hostile probe; Magi-magic gives two
  battle-spells: Splinter (shatters bottles, mirrors, windows and the like; range by rank) and
  Flameshaft (sets an arrow's tip alight with a flame hard to put out). *Engine*: gates only (a
  section's check on the Discipline and the rank); Kai-surge against several foes at once, no: the
  engine fights one enemy at a time, so it is left to the player.
- **Improved Disciplines introduced: Sun Knight** (6 Disciplines): Grand Weaponmastery wields the
  two-handed weapons (Broadsword, Quarterstaff, Spear) one-handed at full effect; Deliverance heals a
  serious wound in another creature by the laying on of hands, faster by rank; Grand Pathsmanship
  repels normal-sized insects within three yards, range and number growing by rank; Grand Nexus feigns
  death in suspended animation, keeping only his hearing; Telegnosis speaks telepathically over about
  100 miles, farther by rank; Kai-alchemy gives two Brotherhood Spells: Halt Missile (stops one
  missile aimed at his life in mid-air for 2-3 seconds; more missiles by rank) and Strength (greater
  strength for a short time, to move heavy things or raise COMBAT SKILL and ENDURANCE in a fight; the
  page prints no numbers). *Engine*: gates only (a section's check on the Discipline and the rank);
  none has a number to apply: a section that gives Strength a number is read in the item table, else
  it is left to the player.
- **Footnotes**: the locks are puzzles answered by the sections that say so: the dragon door lock
  (221) by 5, the octagonal door lock (89) by 40. At 25 he turns to 315 only if he met Captain Prarg
  at the Battle of Cetza (Book 10); 315's account of that meeting does not match Book 10's. At 190 and
  312 the Kai-surge used costs 1 ENDURANCE. At 290 the use of Kai-alchemy on the lock may be taken as
  optional. 72 and 194 cannot be reached (72 is the same as 349 and 185, 194 a lesser 19). The land
  is spelt Nyras in this book (Nyraz earlier). *Engine*: the puzzles, left to the player; the meeting
  with Prarg is not recorded from Book 10, so the choice at 25 is left to the player; the ENDURANCE
  at 190 and 312 and the choice at 290 are for the item table (step 5); 72 and 194, nothing.
- **Wisdom**: choose the Disciplines with care; completing earlier books is an advantage but not
  needed for this one.

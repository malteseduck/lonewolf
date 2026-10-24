# Rules engine

Where each rule in `docs/spec.md` section 4 is implemented. Three files, loaded by the main page in
this order: `shared/core.js` (series-independent rules and the Kai defaults), `shared/rules-series.js`
(adds Magnakai and overrides some functions) and `shared/fight.js` (the fight). The prototypes load
only `core.js`. `main.js` holds no rules: it draws, animates and takes input (ADR 0022). Each part
has its tests in `tests/js/` (`core-*`, `rules-series`, `fight`).

## The hero object

```js
{
  name, cs, ep, epMax,
  disciplines: [...],        // Kai discipline ids
  magnakai: [...],           // Magnakai discipline ids (absent until the character enters that series)
  grandmaster: [...],        // Grand Master discipline ids (likewise)
  series: 'kai'|'magnakai'|'grandmaster', // the ruleset of the book being played; set when a book is started
  weaponskill: 'sword'|null, // Kai Weaponskill weapon, drawn from LW.WEAPONSKILL_TABLE (the books' table)
  had: [ids],               // every item he has ever been given (LW.putItem), for "if you have ever been given"
  mastery: [...],            // Magnakai Weaponmastery weapons
  grandMastery: [...],       // Grand Weaponmastery weapons (its own list: a weapon may be in both)
  grandEarned: 0,            // Grand Master Disciplines past four already added to his scores
  circleEp: 0,               // Endurance already granted by Lore-circles
  weapons: [...],            // max 2
  backpack: [...],           // item ids; Meals are counted separately
  meals: 0,                  // Meals count toward the 8 Backpack slots
  special: [...],
  gold: 0,                   // max 50
  noPack: true,              // the Backpack itself is lost: no Backpack Items or Meals until one is found
  arrows: 0,                 // Arrows in the Quiver, at most LW.MAX_ARROWS (6)
  stored: [ids],             // Special Items left at the Kai Monastery (Book 5 on): kept, not usable
  storedGold: 0,             // Gold Crowns left there (Book 6 on)
  cured: 'code',             // the book an Archmaster's Curing (or Deliverance) last gave its 20 in
  completed: ['01fftd', ...], // the books he had completed when he set out on this one (from LW.Character's record; [] when new)
  found,                     // transient flag used for a toast after creation
  marks: {id: true | n},     // lasting conditions and flags (LW.MARKS); n: the book number it lasts for
  stash: {key: {items, gold}}, // what was taken to be given back later (take ... stash, back)
  coins: {kika: n, lune: n}, // other coins (LW.COINS)
  notes: [text],             // notes the text asks for on the Action Chart
  doses: {id: n},            // doses left of an item that has several
  used: {key: n},            // addictive draughts swallowed (item.addict.key)
  lastLoss, lastWeapon,      // what the last fight cost him, and the weapon he fought it with
  flagsRead: true,           // flags tracked from the start (LW.makeHero). A hero saved before 2026-10-12 lacks it:
                             // main.js backfillFlags reads his flags once from the adventure's saves of earlier
                             // books, only where a trail passed the section that sets one (LW.flagsFrom)
  assumed: ['visitedGornCove'], // flags of LW.ASSUME already settled (LW.makeHero fills it); one missing is given
                             // once when he is carried into a book it names (LW.assumeMarks, ADR 0011)
}
```

Item ids are keys of `LW.ITEMS`, or `pack:Name` / `spec:Name` for items typed in by hand.
`LW.itemName(id)` and `LW.itemKind(id)` handle both. A book's own items join `LW.ITEMS` through
`LW.addItems` (from its item table). `LW.putItem(hero, id)` puts one where it belongs, or returns why
it does not fit (two weapons, a full Backpack: `LW.backpackMax(hero)`, 8, or 10 in the Grand Master series; no Backpack); `LW.dropItem(hero, id)` takes one
away; both handle Special Items' Endurance. `putItem` also refuses a thirteenth Special
Item (`LW.specialLimit`: 12 in every book, ruling R2). And one an item's `apart` keeps from another he wears (the Silver Helm and a Helmet, either way). `LW.hasItem(hero, id)` checks any list.

## core.js

| What | Where |
|---|---|
| Random Number | `LW.rand10()` |
| Combat Results Table | `CRT_ROWS` -> `LW.CRT`; `LW.crtColumn(ratio)`; `LW.combatRound(ratio, roll)` returns `{enemy, hero}` losses, `Infinity` for a kill. Checked against the books' table (2026-10-02) |
| Kai disciplines, items, limits | `LW.DISCIPLINES`, `LW.ITEMS` (with the kit items: `shield` has `fightCs: 2`, `leatherWaistcoat` `ep: 2`, each book's map), `LW.WEAPONS`, `LW.MAX_WEAPONS`, `LW.MAX_BACKPACK`, `LW.backpackMax(hero)`, `LW.MAX_ARROWS`, `LW.bookNumber`, `LW.specialLimit(hero)` |
| New Kai character | `LW.makeHero({csRoll, epRoll, disciplines, bonusItem})`. Book 1's kit: Axe, one Meal, the map, gold = Random Number; Book 1's bonus item table. For a later book the dialog empties it and gives that book's kit |
| Default hooks | `LW.has`, `LW.heals`, `LW.hunts`, `LW.rankCount`, `LW.heroCS` (all replaced by `rules-series.js` when it is loaded) |
| Item tables | `LW.applyItems(book, table)`: lays a book's `items-<code>.js` over its sections, once (book-format.md, "Item tables"). `LW.itemByName(name, first)`: the item a typed name is, the open book's own (`first`) tried first |
| Conditions | `LW.meets(hero, cond, ctx)`, `LW.condName(cond)`: disciplines (any, or all), rank, Lore-circles, Endurance now; from item tables also items (any, or all), weapons of a kind held or in hand (`ctx.weapon` in a fight, else `LW.inHand`), Weaponskill / Weaponmastery (`LW.skilledWith`), counts, gold, marks, `any`, `not` (book-format.md, Conditions). `need.any` is a list of them, any one opening the choice (checked in `choices()`) |
| Lasting conditions, coins | `LW.MARKS` (from the tables' `MARKS`, through `LW.addItems(items, marks)`), `LW.marksOf(hero)` (those in force in this book); `LW.COINS` |
| Item uses | `LW.useUp(hero, id)`: one dose, else the item. `LW.counted(hero)` (Special Items under the limit, without `free` ones), `LW.quiverRoom(hero)` (Arrows, less what rides in their place) |
| Book runner | `class Game` |

`Game` methods:

- `start(hero)`, `go(id, via)`: move to a section. `go` applies arrival effects in order:
  `sec.ep`; once per section, `arrive(sec)`: `effects()` of the section (`cs`, `epMax`, `healLost`
  (a share of `hero.lastLoss` back), the losses in `take` through `lose()`, `back` through
  `unstash()`, `mark` / `unmark`, `settle`), then of each `when` entry that `holds()` (its `if`,
  `unless`, `ate`: a Meal eaten here or in the section before, `s.ateAt`; `came`), the gifts in
  `sec.give` through `takeLoot`, `sec.note` onto `hero.notes`, `sec.todo` as a "By hand:" event;
  `sec.lose`; forced Meals, `sec.meal` of them (hunting exempts, else eat a Meal, else a Backpack
  item with `meal: true` (healing its `heal`), else one bought for `sec.mealCost`, else -3 EP); a
  lasting condition's `ep` for every section passed; then +1 EP healing if the section has no combat. `sec.mealUnless`, a
  Condition, spares the Meal in Hunting's place.
- `lose(take)`: an item (or the first held of a list), gold / Meals (`'half'`, `'all'`), a coin,
  weapons (`'all'`, `'one'`, `'used'`: `hero.lastWeapon`; `special: true` takes weapon-like Special
  Items too), Arrows, Special Items, the Backpack; `at` by place in the list as shown (`listed()`:
  Meals first); `pick`, the player's choice: pending in `s.picks`, resolved one medallion at a time by
  `pickLoss(id)` (`pickable()` lists them), all at once when he has no more than asked, `else` when he
  has none (`n` by list: his first pick picks the list); `choose`, the one of a list of ids he used (his pick when he holds
  several); `halve`, half a list lost on a coin. Any entry with `stash` keeps what it takes in `hero.stash[key]` (`drop()`); `unstash(b)`
  gives it back (or the kinds in `only`), saying what will not fit, which `loot()` then offers on that section (`back:<key>:<n>`) to take once there is room; `forfeit` drops a stash for good.
- `setStake(n)` (`sec.stake`: paid now with `spend`, else kept in `s.stakes` until a `settle`),
  `settle(key, by)`, `sell(id)` (`sec.sell` prices; `'arrows'` sells `sec.sell.arrows.n` at once), `came()` (the section before).
- A game of chance (`sec.game`, book-format.md): `game` is the game in hand (`s.game`, begun afresh on
  each visit; its token kept in `s.tokens` by section), `bet(n, pick)` puts a stake down (token
  first, then gold, or the other coin), `play(n)` throws for it (`setRolled` hands the medallion's
  number over; the other numbers are `LW.rand10()`), and logs the throw. `gameWhy(forBet)` says why a
  bet or throw cannot be made; `gameBroke` that he can stake no more. Choices shut while a bet is
  down, and open by `broke` / `done` / `quit`.
  Gifts come before the Meal so food found in the passage can be eaten. It resets `s.rolled` and saves.
- `lost`: he is dead, or at a `death` or `failed` ending (the page then offers the way back).
- `combatPending`: the section has combat not yet won. `wonCombat()` marks it won.
- `choices()`: the choices with `enabled` and `why` filled in. Returns none while dead, at an
  ending, or while combat is pending. Applies `need.disc` (one, or a list: any, or all with
  `every`), `need.circle`, `need.rank`, `need.item` (with `not`), `need.gold` (`orAll`; `instead`: payable in items, which with `short` turns
  the choice into one paid in items when he is short of gold, and otherwise adds a second choice, `pay: 'items'`,
  beside it; `choose` then queues the pick, `give: true`, ahead of any the section asks), `need.coin`,
  `need.came`, and shuts them all while a chosen loss or a stake is pending (a game's, as above); the `rnt: 'auto'`
  gate, and hides `evade` choices in sections that have combat. For authored combat with `to`,
  returns a single "Continue". `choose` pays `need.spend` items or gold. Only the choices with a
  range wait for the draw: in a bow shot the others are for not shooting, elsewhere the way taken
  instead of drawing ("If you have Sixth Sense, ...; otherwise pick a number").
- `setRolled(n)` (also applies the matching `sec.rolls` entry, once). In a `bowShot` section it
  returns why he cannot shoot, or spends an Arrow and sets `s.rolled` to the total with
  `LW.bowShot`'s bonus (`s.drawn` the number, `s.shot` the parts); `shot()` says which. The text's
  own bonuses (`sec.rntMod`, through `bonuses()`: those whose condition he meets, a per-discipline
  one counted; `vsCS` takes his COMBAT SKILL off) are added the same way, after the bow's, and
  `sec.draws` more numbers drawn; `sec.zeroTen` counts a 0 as 10; `sec.against` takes a second number
  drawn, or the section's stake, off the total (`drawWhy()`: not before that stake is set). A matching `rolls` entry's loss (`ep`, or `'drawn'`) is made smaller
  by `sec.lessen`; `dead` ends him; `mark` sets one.
  `resolveRandom(choice, roll)`
  (authored `choice.random`), `choose(choice, to)`.
- Inventory: `loot()` (gifts and finds, `i` = `'give0'` or `0`, with `taken` and `closed` for an
  `or` group already used), `takeLoot(i)`, `addItem(id)`, `removeItem(id)`, `adjust('ep'|'gold', by)`,
  `usePotion(id)` (anything with `heal`; a dose of one with `doses`; it cures a mark it is `until`), `dropWeapon(id)`. Loot
  `{coin, n}` is coins; `{item, cost, coin}` a price in them; a ware with `cost` stays on sale, but closes once
  bought in an `or` group, or after `max` (`loot()` gives `left`); `for` takes something of his in exchange
  (his choice through `s.picks` when he has several). Loot `{arrows: n}` needs a Quiver;
  `adjust('arrows', by)` sets them by hand. `takeLoot` and `addItem` return an error
  string when a limit is hit. Special Items with an `ep` value raise and lower `epMax` as they are
  added and removed.
- `rewind(n)`, `save()`, `load()`, `clear()`.
- `history` holds one snapshot of `s` per step, taken as a choice is made (so it is that section
  with its fight won, loot taken and by-hand changes). `keep` caps how many are kept (Infinity by
  default; the player sets 3, which also stops saves growing with every section). `trim()` applies it.
- `back(k)`: back k steps; that section as it stood when its choice was made, with `rolled` and
  `events` cleared so the Random Number can be drawn again. Going back uses up those steps: only
  moving on again earns them back. `backs()` lists `{k, id}` for each step reachable.

## rules-series.js

Adds the ten Magnakai and twelve Grand Master disciplines to `LW.DISCIPLINES` and tags every discipline with `series`.
Adds `bow` and `quiver` to `LW.ITEMS`.

| What | Where |
|---|---|
| Series table | `LW.SERIES.kai` / `.magnakai` / `.grandmaster`: `list`, `first` (disciplines for a new character), `field` (hero property), `ranks` |
| Lore-circles | `LW.CIRCLES`; `LW.circlesOf(hero)`; `settleCircles(hero)` adds circle Endurance once |
| Discipline tests | `LW.has(hero, id)` checks the three lists; in a Grand Master book every Kai and Magnakai Discipline counts as held (the text's gates, ADR 0011). `LW.chose(hero, id)`: a Magnakai Discipline in `hero.magnakai`, in a Magnakai or Grand Master book (`LW.pastKai`), whose numbers apply. `LW.owned(hero, series)`, `LW.rankOf`, `LW.rankCount` |
| Series-dependent effects | `LW.heals`, `LW.hunts` (in a Magnakai book, Healing and Hunting too for one who completed Books 1-5: `LW.completedAll(hero, 1, 5)`, ADR 0011; `LW.huntNote` then reminds that Hunting fails in desert and wasteland), `LW.shielded`, `LW.mindPower` (0 none, 1 Mindblast, 2 Psi-surge or Kai-surge), `LW.psi(hero)` (the surge's `name`, `surge`, `cost`, `floor`, Mindblast's `blast`: a Grand Master's Kai-surge +8, 1, 6, +4, `kai`; an Archmaster's Psi-surge +6, 1, 4, +3; else +4, 2, 6, +2) |
| Improved disciplines | `LW.mkRank(hero)`: the number of Magnakai Disciplines. Weaponmastery +4 at Scion-kai (8); unarmed with Weaponmastery −2 at Tutelary (5), −1 at Scion-kai; Psi-surge as above; `LW.cureOf(hero)` (`{name, at}`: Deliverance at 8, else an Archmaster's Curing at 6) and `LW.canCure(hero, book)`: its 20 back, once a book |
| Bow | `bow` is `ranged`: never the weapon in hand unless the fight names it (`ctx.with`). `LW.bowShot(hero)`: `{why}` with no Bow or Arrow, else `{bow, parts, plus}`: Weaponmastery with the Bow +3, and from Mentora (7) +2 more, both only with the Bow mastered, a book bow's own `shot` (these parts are `LW.weaponBonus(hero, bow)`, which gives any other weapon's COMBAT SKILL parts too, for the inventory) |
| Starting kits | `LW.KITS[number]`: `give`, `choose`, `from`, `store`, `storeGold`, `newOnly`, `wear` (rules-books.md, "Book addenda") |
| Combat Skill | `LW.heroCS(hero, ctx)` returns `{total, parts: [{label, n}]}`. `ctx`: `mindblast`, `psiSurge`, `psiTimes`, `enemy`, `csMod`, `csNote`, `with`, `noShield`, `noUnarmed`, `weaponCs`, `plain`, `only`, `barred`, `lend`, `more` (parts added as given). Every carried Special Item with `fightCs` (the Shield, the Silver Helm, +2 each) counts; a mark's `noShield` or `ctx.noShield` bars the Shield; marks' `cs` count |
| Weapon in hand | `LW.armedWith(hero, ctx)`: of his weapons and the Special Items that are weapons (`item.weapon`: the kinds it counts as), the one that adds most: its own `item.cs` (the Sommerswerd's 8) plus Weaponskill or Weaponmastery in any of its kinds. `ctx.with`: `'none'` (bare-handed, -4) or the one item that can harm this foe. Null: unarmed, -4 |
| Carried character | `LW.Character.load()`, `.save(hero, book)`, `.clear()`, `.carries(kept, bookId)` (not into a book he has completed), all on the storage key in `LW.Character.key` (the player points it at the open adventure's) |
| Setting out | `LW.HeroSetup(book, carry)`: the scores, disciplines and Weaponmastery weapons chosen (`roll`, `toggle`, `toggleWeapon`, `auto`, `ready`), `build()` makes the hero (a new one at the series' `base` scores + the rolls); `.kit` is the book's kit or null. `LW.KitSetup(book, kit, hero)`: the kit's choices (`rollGold`, `choose`, `flip`, `problems`, `auto`, `ready`), `finish()` applies them. `LW.readyHero(hero)` settles Lore-circles and the Grand Master Disciplines past four, and fills Endurance. `carry` null = roll a new one. The player draws them on its pages (interface.md, Setting out) |

Setting-out rules: a new character picks `first` disciplines of the book's series; a
carried one picks one more (or `first` if it has none in this series yet). The series' `arms` names
the discipline that masters weapons and how many at first: choosing Weaponmastery asks for three
weapons (`hero.mastery`), Grand Weaponmastery for two (`hero.grandMastery`, a list of its own, so a
weapon mastered by Weaponmastery may be chosen again); a character that already has it picks one
more. A new character's scores are the series' `base` + the Random Numbers: 10 and 20, or 25 and 30
in the Grand Master series. A carried one keeps his, with no re-roll (ADR 0011). A new Magnakai or
Grand Master character is given all ten Kai disciplines (a Grand Master one holds the Magnakai ones
for the gates, `LW.has`, with none in `hero.magnakai`). A new character at Book 2 or later starts with nothing but the
book's kit. Then, where the book has a kit (`LW.KITS`; not for a carried character in Book 11),
a second step (`KitSetup`): the gold (the kit's `gold`, 10 if absent, + a Random Number added, at most 50; from Book 6 the rest
goes to `storedGold`, which can be drawn on), the given items (one he has is skipped), the
"choose N" list ("Choose for me" fills it), his weapons (any may be left behind), and where the
book allows, Special Items left at or taken from the Monastery. Begin waits until the limits hold
(2 Weapons, 8 Backpack, or 10 counting the Backpack Items he brings into a Grand Master book, 12 Special from Book 8). A Quiver from the kit comes with 6 Arrows.
On confirm it sets `hero.series`, settles Lore-circles, adds +1 COMBAT SKILL and +2 ENDURANCE for
each Grand Master Discipline past four (`settleGrand`, counted in `hero.grandEarned`, so once each),
and restores Endurance to maximum.

In a Magnakai book `heals`, `hunts`, `shielded`, `mindPower` and the weapon bonus look only at
Magnakai disciplines, except that one who completed Books 1-5 also heals and hunts by his Kai
Disciplines (spec 4.2, ADR 0011). `hero.completed` is set when setting out; a hero saved before
2026-10-11 has none and counts as no veteran until his next book.

In a Grand Master book (G1 of plan.md, 2026-10-16) the same functions look at the Magnakai Disciplines
he chose (`LW.chose`; a new Grand Master character has none) at his Magnakai rank (`LW.mkRank`):
Curing's +1, Huntmastery's Meals and ambushes, Weaponmastery (and its Bow shot, Mentora's +2),
Psi-surge, Archmaster Curing; the Kai Disciplines give no numbers. `shielded` is Kai-screen or a chosen
Psi-screen. Lore-circles no longer count (`circlesOf` is empty) and their ENDURANCE stays in his scores
(`settleCircles` does nothing). Setting out (the scores, the disciplines past four, Grand Weaponmastery's weapons) is above (G2,
2026-10-16). Carried into a Grand Master book (G3, 2026-10-16), he keeps his Backpack Items (Meals
not, ADR 0011). Entering the series from an earlier one (`enterGrand`, in `build()`), the Lore-circles'
COMBAT SKILL goes into `hero.cs`, and of his Special Items, carried or at the Monastery, only
`LW.SERIES.grandmaster.keeps` stay (ADR 0011; `dropItem`, so an item's ENDURANCE goes with it; no
Quiver, no Arrows). `HeroSetup.carried()` gives the scores he will set out with, for the page.

The Grand Master Disciplines' own numbers (G5, 2026-10-17; `LW.grand(hero, d)`: his, in a Grand
Master book) each replace their Magnakai counterpart's, never add to it (ADR 0011): Grand
Weaponmastery +5 with a weapon in `hero.grandMastery` (`weaponParts`; a weapon only in
`hero.mastery` keeps a chosen Weaponmastery's +3 / +4), +5 to a Bow shot in place of Weaponmastery's
3 and Mentora's 2 (`weaponBonus`), and counts for the text's `mastery` / `skilled` conditions
(`LW.skilledWith`); Kai-surge in `LW.psi` in place of Psi-surge; Deliverance in `LW.cureOf` in place
of Archmaster Curing (once a book, ADR 0011; Curing's +1 a section stays); Grand Huntmastery in
`LW.hunts` (Meals only: Huntmastery's ambush rule stays with a chosen Huntmastery, as Book 13 gives
Grand Huntmastery none).

## Combat procedure

`LW.Fight` in `shared/fight.js`: `new LW.Fight(game, bookId)` sets up the fight of the section the
game is at; `main.js` draws it and animates between its steps. Tested in `tests/js/fight.test.js`.

Set-up: the fight's `csMod` applies unless the hero carries every item in `combat.unless`, or
`combat.unarmed` is set and he has no weapon (the engine's -4 covers it), or it is an `ambush`'s
penalty and he is a Magnakai hero with Huntmastery, or the importer's `csIf` is not met, or its
`csUnless` is (`LW.meets`). `combat.with` fixes the weapon (`weapon`, `LW.armedWith`). Each foe is a
copy of the book's (`bring`), so the book's numbers stay as printed; `max` is its starting Endurance.
The log opens with what applies: a foe's `mindforce` (or the shield that stops it), the `csMod` or
why it is spared, a fixed weapon, a weapon with its own bonus.

`cs()` is `LW.heroCS` with the mind attack in play and the foe; `ratio()` is `cs()` minus the foe's,
**at most +10** (`LW.RATIO_CAP`): the owner's house rule against the Sommerswerd (ruling R1), so the
table's "+11 or more" column is never used. No floor.

A round: `roll(n)` looks up `LW.combatRound(ratio(), n)` and counts the round; then either
`flee(o)` (evading: only his loss; `over` is `'evade'`, or `'dead'`) or `strike(o)` (the foe's loss,
doubled when `combat.double`, or when the foe is `undead` and the weapon in hand has `undead`, as the
Sommerswerd does) and `suffer(o)` (his loss; then the foe's `drain` unless he is shielded, every
round, the last too; then Psi-surge's cost if it is active, dropping to Mindblast at its floor:
`LW.psi`). Losses never take either side below 0. His death ends the fight first; a fallen foe sets
`o.down`, and `advance()` brings the next or sets `over = 'win'`. `round(n, how)` does all of it at
once (the tests use it).

Between rounds, at no cost: `focus()` cycles the mind attack (rest, Mindblast, Psi-surge; not
Psi-surge at or below its floor; nothing against a foe it cannot touch: `deaf()`); `drink()` (the house
rule that Laumspur can be drunk mid-fight, +4); `cure()` (an Archmaster's Curing or Deliverance, 20 back, once a
book: `LW.canCure`, named by `LW.cureOf`). A foe `immune: true` ignores every mind attack; `immune: 'mindblast'` only
Mindblast (Psi-surge, and so the +4, still tells); `immune: 'psi'` Mindblast and Psi-surge (only a
Grand Master's Kai-surge tells: `Fight.allDeaf(foe, hero)` looks at `LW.psi(hero).kai`; his Mindblast,
+4, does not). `evadeOpen`: `evade.after` rounds
fought and, with `evade.within`, fewer than that (`evadeLate` once past it).

What holds for some rounds only, or under a condition, is `combat.rounds` (book-format.md): `phases(r)`
are the entries in force in round `r` (conditions tested with the weapon in hand; `ambush` spared by
Huntmastery; `mind` only while a mind attack is used); `parts(r)` / `cs(r)` add their `csMod`, fight
bare-handed under `unarmed`, multiply the mind's bonus by `psi`. `strike` multiplies each side's loss
by `heroLoss` / `foeLoss` (rounding down; a killing blow ignored is no blow), adds `heroPlus` to a wound
and `foeEach` every round; `suffer` takes `heroEach` every round, draws again after a round the table would have wounded him in where a
`fatal` entry holds (one of its numbers kills him), and lowers his maximum by what he lost where an `offMax`
entry holds (`behind: r` keeps an entry for when he had lost more than the foes by round `r`, from `tally`). `changes(r)` logs each one as it begins
and ends. `combat.mind` is a fight of the mind (its own score, no weapon or mind attack). Before the
first round `boost(id)` swallows a draught (`item.boost`; not with `noBoost`). `combat.keep` keeps the
foes' wounds in `s.kept` for a later fight with the same foes. `combat.points` fights on target points
in place of his Endurance. `combat.noMind` leaves him no attack of the mind (`power` 0).

The fight ends by `end(how, to)`: `win`, `evade`, `dead`, or `stop` (a `combat.stop` rule: after N rounds,
at his first wound, the foe down to N but not dead, a number drawn, with `by` for who lost more; or
`stopHere()` by hand where `combat.byHand` says the text ends it so), or `broken` (stopped by hand
anywhere else: `game.breakOff()`, the fight unwon and no choice open; ADR 0027). It applies `restore` and `healLost`, draws for an addictive draught, and
records `hero.lastLoss` and `hero.lastWeapon`. `way()` is where it leads: `wounded` once he has lost
Endurance, `won` by the rounds a win took, `combat.to`, `evade.to`, a stop's `to`. `finish()`: a win
or a stop marks the fight won (`game.wonCombat`, so the choices open) and goes to `way()` if there is
one; an evasion goes there; a death only saves. Evasion also needs `evade.if`, waits for the foe to fall to `evade.foeAt` or for the foe `evade.fromFoe` of the list, costs nothing with
`evade.free` (the number drawn with `evade.lose: 'drawn'`), and is shut by `noEvade`. `combat.noStrike`, a Condition, shuts Strike (`round()` refuses it). `combat.breath` (Book 4's underwater fights): the number drawn in
the section (0 as 10, its `rntMod` added; drawn by the fight if not yet) is the rounds he lasts, and every
round after costs `breath.each` more, as a `rounds` entry added when the fight begins. The page draws each round's number out of sight (ruling R3).

Prototypes A and B have their own combat in `shared/battle.js`, and C in its `main.js`; those do
not know about Magnakai.

## The walk (step 6)

`node tools/walk_book.mjs <code> [--json]` (ADR 0036; the dashboard's "Walk the book") plays an imported
book with these three files in Node, its item table laid over it, for two stand-in characters: a
master (every discipline of the series and the series before, every weapon mastered, a Bow and Quiver
where the kit offers them, 50 Gold Crowns, the earlier books completed and their tables' flags, and
the Special Items of earlier books that this book's table names but does not give) and a novice
(disciplines and kit drawn, as "Choose for me" would). Each section is walked again only when he
arrives with other items or marks than before (only those the book tests), at most six times, or
with the section before where the way he came matters. From a section it tries:

- every choice open; a gate on Endurance at an Endurance that opens it; a gate still shut, with what
  it asks for lent (the item put in, or for "if you have no ...", taken away; gold or coins made up, or for "if you have no Gold Crowns", the purse emptied);
- every Random Number 0-9 where one is drawn, and a range no number reached (his bonuses carry the
  total past it) at its own number;
- each fight from full Endurance, up to three times before it counts as lost; each evasion, as soon
  as it opens; a contest lost (`lose`); then, by hand, every other way the fight leads (wounded or
  not, won in so many rounds or more, a stop's ways) and a win where none came, so the walk goes on;
  a fight with `byHand` past 100 rounds is stopped by hand;
- a game of chance as it stands, and played out; a stake at its least; losses chosen; what is free
  to take, taken (the master buys what a shop has that he lacks).

He sets out from every section at full Endurance. The draws are seeded, so two walks agree. The
report, by section id: crashes (the engine threw), gates that never opened even lent, gates opened
only with an item lent that this book, its kit and the earlier books' Weapons and Special Items never
give (or a range no total can make), sections with no way on, fights past 100 rounds, sections linked
from the start but never reached. Listed apart, as information: the fights no stand-in won (a hard
fight, or one he came to unarmed), the sections no link leads to (puzzle answers, turns by hand) and
those only past them. `look` is the first list's ids; `--json` writes it all to `walk.json` beside
the book. A book whose series is not in `LW.SERIES` is not walked (ADR 0036). First run, 2026-10-15:
Books 1-9, 11 and 12 nothing to look at; Book 10 two gates on items it never gives (246, 285).

## Not implemented

The books' rules the engine does not apply are marked in rules-books.md (Engine column).

Every rule in rules-books.md is applied, or left to the text where only the text can tell (a
discipline's wider uses). Not: Grand Master rules (Books 13 on; listed in rules-books.md, the
work in docs/plan.md), any rule the importer leaves as
text and no item table covers, Book 3's sledge food. Bow shots and ambushes work only where a book's
item table marks them. What the tables still leave as `todo` is counted by `check_items.mjs`.

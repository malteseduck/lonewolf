# Rules engine

Where each rule in `docs/spec.md` section 4 is implemented. Two files: `shared/core.js` (series-
independent rules and the Kai defaults) and `shared/rules-series.js` (loaded by the main page only; adds
Magnakai and overrides some functions).

## The hero object

```js
{
  name, cs, ep, epMax,
  disciplines: [...],        // Kai discipline ids
  magnakai: [...],           // Magnakai discipline ids (absent until the character enters that series)
  series: 'kai'|'magnakai',  // the ruleset of the book being played; set when a book is started
  weaponskill: 'sword'|null, // Kai Weaponskill weapon, drawn from LW.WEAPONSKILL_TABLE (the books' table)
  had: [ids],               // every item he has ever been given (LW.putItem), for "if you have ever been given"
  mastery: [...],            // Magnakai Weaponmastery weapons
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
  cured: 'code',             // the book an Archmaster last used Curing's 20 in
  found,                     // transient flag used for a toast after creation
}
```

Item ids are keys of `LW.ITEMS`, or `pack:Name` / `spec:Name` for items typed in by hand.
`LW.itemName(id)` and `LW.itemKind(id)` handle both. A book's own items join `LW.ITEMS` through
`LW.addItems` (from its item table). `LW.putItem(hero, id)` puts one where it belongs, or returns why
it does not fit (two weapons, eight Backpack slots, no Backpack); `LW.dropItem(hero, id)` takes one
away; both handle Special Items' Endurance. From Book 8 `putItem` also refuses a thirteenth Special
Item (`LW.specialLimit`, which reads `LW.bookNumber`, set by the player in `useBook`). `LW.hasItem(hero, id)` checks any list.

## core.js

| What | Where |
|---|---|
| Random Number | `LW.rand10()` |
| Combat Results Table | `CRT_ROWS` -> `LW.CRT`; `LW.crtColumn(ratio)`; `LW.combatRound(ratio, roll)` returns `{enemy, hero}` losses, `Infinity` for a kill. Checked against the books' table (2026-10-02) |
| Kai disciplines, items, limits | `LW.DISCIPLINES`, `LW.ITEMS` (with the kit items: `shield` has `fightCs: 2`, `leatherWaistcoat` `ep: 2`, each book's map), `LW.WEAPONS`, `LW.MAX_WEAPONS`, `LW.MAX_BACKPACK`, `LW.MAX_ARROWS`, `LW.bookNumber`, `LW.specialLimit(hero)` |
| New Kai character | `LW.makeHero({csRoll, epRoll, disciplines, bonusItem})`. Book 1's kit: Axe, one Meal, the map, gold = Random Number; Book 1's bonus item table. For a later book the dialog empties it and gives that book's kit |
| Default hooks | `LW.has`, `LW.heals`, `LW.hunts`, `LW.rankCount`, `LW.heroCS` (all replaced by `rules-series.js` when it is loaded) |
| Imported conditions | `LW.meets(hero, cond)`, `LW.condName(cond)`: disciplines (any, or all), rank, Lore-circles, Endurance now, items held (any; item tables only) (book-format.md, Conditions). `need.any` is a list of them, any one opening the choice (checked in `choices()`) |
| Book runner | `class Game` |

`Game` methods:

- `start(hero)`, `go(id, via)`: move to a section. `go` applies arrival effects in order:
  `sec.ep`; once per section, `arrive(sec)` (`sec.cs`, the losses in `sec.take` through `lose()`,
  the gifts in `sec.give` through `takeLoot`, `sec.todo` as a "By hand:" event); `sec.lose`; forced
  Meal (hunting exempts, else eat a Meal, else a Backpack item with `meal: true` (healing its
  `heal`), else -3 EP), then +1 EP healing if the section has no combat.
  Gifts come before the Meal so food found in the passage can be eaten. It resets `s.rolled` and saves.
- `combatPending`: the section has combat not yet won. `wonCombat()` marks it won.
- `choices()`: the choices with `enabled` and `why` filled in. Returns none while dead, at an
  ending, or while combat is pending. Applies `need.disc` (one, or a list: any, or all with
  `every`), `need.circle`, `need.rank`, `need.item` (with `not`), `need.gold`, the `rnt: 'auto'`
  gate, and hides `evade` choices in sections that have combat. For authored combat with `to`,
  returns a single "Continue". `choose` pays `need.spend` items or gold. Only the choices with a
  range wait for the draw: in a bow shot the others are for not shooting, elsewhere the way taken
  instead of drawing ("If you have Sixth Sense, ...; otherwise pick a number").
- `setRolled(n)` (also applies the matching `sec.rolls` entry, once). In a `bowShot` section it
  returns why he cannot shoot, or spends an Arrow and sets `s.rolled` to the total with
  `LW.bowShot`'s bonus (`s.drawn` the number, `s.shot` the parts); `shot()` says which. The text's
  own bonuses (`sec.rntMod`, through `bonuses()`: those whose condition he meets, a per-discipline
  one counted) are added the same way, after the bow's.
  `resolveRandom(choice, roll)`
  (authored `choice.random`), `choose(choice, to)`.
- Inventory: `loot()` (gifts and finds, `i` = `'give0'` or `0`, with `taken` and `closed` for an
  `or` group already used), `takeLoot(i)`, `addItem(id)`, `removeItem(id)`, `adjust('ep'|'gold', by)`,
  `usePotion(id)` (anything with `heal`), `dropWeapon(id)`. Loot `{arrows: n}` needs a Quiver;
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

Adds the ten Magnakai disciplines to `LW.DISCIPLINES` and tags every discipline with `series`.
Adds `bow` and `quiver` to `LW.ITEMS`.

| What | Where |
|---|---|
| Series table | `LW.SERIES.kai` / `.magnakai`: `list`, `first` (disciplines for a new character), `field` (hero property), `ranks` |
| Lore-circles | `LW.CIRCLES`; `LW.circlesOf(hero)`; `settleCircles(hero)` adds circle Endurance once |
| Discipline tests | `LW.has(hero, id)` checks both lists. `LW.owned(hero, series)`, `LW.rankOf`, `LW.rankCount` |
| Series-dependent effects | `LW.heals`, `LW.hunts`, `LW.shielded`, `LW.mindPower` (0 none, 1 Mindblast, 2 Psi-surge), `LW.psi(hero)` (Psi-surge's `surge`, `cost`, `floor`, Mindblast's `blast`: an Archmaster's +6, 1, 4, +3, else +4, 2, 6, +2) |
| Improved disciplines | `LW.mkRank(hero)`: the number of Magnakai Disciplines. Weaponmastery +4 at Scion-kai (8); unarmed with Weaponmastery −2 at Tutelary (5), −1 at Scion-kai; Psi-surge as above; `LW.canCure(hero, book)`: an Archmaster's Curing, once a book |
| Bow | `bow` is `ranged`: never the weapon in hand unless the fight names it (`ctx.with`). `LW.bowShot(hero)`: `{why}` with no Bow or Arrow, else `{bow, parts, plus}`: Weaponmastery with the Bow +3, and from Mentora (7) +2 more, both only with the Bow mastered, a book bow's own `shot` |
| Starting kits | `LW.KITS[number]`: `give`, `choose`, `from`, `store`, `storeGold`, `newOnly`, `wear` (rules-books.md, "Book addenda") |
| Combat Skill | `LW.heroCS(hero, ctx)` returns `{total, parts: [{label, n}]}`. `ctx`: `mindblast`, `psiSurge`, `enemy`, `csMod`, `csNote`, `with`, `noShield`. A carried Special Item with `fightCs` (the Shield, +2) counts |
| Weapon in hand | `LW.armedWith(hero, ctx)`: of his weapons and the Special Items that are weapons (`item.weapon`: the kinds it counts as), the one that adds most: its own `item.cs` (the Sommerswerd's 8) plus Weaponskill or Weaponmastery in any of its kinds. `ctx.with`: `'none'` (bare-handed, -4) or the one item that can harm this foe. Null: unarmed, -4 |
| Carried character | `LW.Character.load()`, `.save(hero, book)`, `.clear()`, all on the storage key in `LW.Character.key` (the player points it at the open adventure's) |
| Character dialog | `LW.UI.chooseCharacter(book, carry)` resolves to a hero. `carry` null = roll a new one |

`chooseCharacter` rules: a new character picks `first` disciplines of the book's series; a
carried one picks one more (or `first` if it has none in this series yet). Choosing Weaponmastery
asks for three weapons; a character that already has it picks one more. A new Magnakai character
is given all ten Kai disciplines. A new character at Book 2 or later starts with nothing but the
book's kit. Then, where the book has a kit (`LW.KITS`; not for a carried character in Book 11),
a second page (`kitStep`): the gold (10 + a Random Number added, at most 50; from Book 6 the rest
goes to `storedGold`, which can be drawn on), the given items (one he has is skipped), the
"choose N" list ("Choose for me" fills it), his weapons (any may be left behind), and where the
book allows, Special Items left at or taken from the Monastery. Begin waits until the limits hold
(2 Weapons, 8 Backpack, 12 Special from Book 8). A Quiver from the kit comes with 6 Arrows.
On confirm it sets `hero.series`, settles Lore-circles and restores Endurance to maximum.

In a Magnakai book `heals`, `hunts`, `shielded`, `mindPower` and the weapon bonus look only at
Magnakai disciplines. That is an interpretation flagged in the spec.

## Combat procedure

Implemented in `main.js` (`startBattle`, `battleAct`, `endBattle`), not in the
shared engine. The fight's `csMod` applies unless the hero carries every item in `combat.unless`,
or `combat.unarmed` is set and he has no weapon (the engine's -4 covers it). `combat.with` fixes
the weapon (`B.weapon`, `LW.armedWith`). Per round: spin the dial, `LW.combatRound(B.ratio(), n)`,
apply both losses (the foe's doubled when `combat.double`, or when it is `undead` and the weapon in
hand has `undead`, as the Sommerswerd does), then the foe's `drain` in Endurance unless he is
shielded, then Psi-surge's cost if it was active (dropping to Mindblast at its floor; `LW.psi`).
Evade applies only the hero's loss. The house rule that Laumspur can be drunk mid-fight lives here,
and an Archmaster's Curing (`cure`). Huntmastery drops a `combat.ambush` fight's negative `csMod`.
The importer's `csIf` / `csUnless` give or spare the `csMod` by `LW.meets`. A foe `immune: true`
ignores every mind attack; `immune: 'mindblast'` only Mindblast (Psi-surge, and so the +4, still
tells). `evade.within` closes evasion once that many rounds are fought.

Prototypes A and B have their own combat in `shared/battle.js`, and C in its `main.js`; those do
not know about Magnakai.

## Not implemented

The books' rules the engine does not apply are marked in rules-books.md (Engine column).

Every rule in rules-books.md is applied, or left to the text where only the text can tell (a
discipline's wider uses). Not: Grand Master rules (Books 13 on), any rule the importer leaves as
text and no item table covers, Book 3's sledge food. Potions that help in a fight (Alether) are only
described; their bonus is applied by hand. Bow shots and ambushes work only where a book's item
table marks them (none yet: Books 1-2 have neither).

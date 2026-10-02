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
  weaponskill: 'sword'|null, // Kai Weaponskill weapon
  had: [ids],               // every item he has ever been given (LW.putItem), for "if you have ever been given"
  mastery: [...],            // Magnakai Weaponmastery weapons
  circleEp: 0,               // Endurance already granted by Lore-circles
  weapons: [...],            // max 2
  backpack: [...],           // item ids; Meals are counted separately
  meals: 0,                  // Meals count toward the 8 Backpack slots
  special: [...],
  gold: 0,                   // max 50
  noPack: true,              // the Backpack itself is lost: no Backpack Items or Meals until one is found
  found, simpleKit,          // transient flags used for a toast after creation
}
```

Item ids are keys of `LW.ITEMS`, or `pack:Name` / `spec:Name` for items typed in by hand.
`LW.itemName(id)` and `LW.itemKind(id)` handle both. A book's own items join `LW.ITEMS` through
`LW.addItems` (from its item table). `LW.putItem(hero, id)` puts one where it belongs, or returns why
it does not fit (two weapons, eight Backpack slots, no Backpack); `LW.dropItem(hero, id)` takes one
away; both handle Special Items' Endurance. `LW.hasItem(hero, id)` checks any list.

## core.js

| What | Where |
|---|---|
| Random Number | `LW.rand10()` |
| Combat Results Table | `CRT_ROWS` -> `LW.CRT`; `LW.crtColumn(ratio)`; `LW.combatRound(ratio, roll)` returns `{enemy, hero}` losses, `Infinity` for a kill |
| Kai disciplines, items, limits | `LW.DISCIPLINES`, `LW.ITEMS`, `LW.WEAPONS`, `LW.MAX_WEAPONS`, `LW.MAX_BACKPACK` |
| New Kai character | `LW.makeHero({csRoll, epRoll, disciplines, bonusItem})`. Axe, one Meal, the map, gold = Random Number; Book 1's bonus item table |
| Default hooks | `LW.has`, `LW.heals`, `LW.hunts`, `LW.rankCount`, `LW.heroCS` (all replaced by `rules-series.js` when it is loaded) |
| Book runner | `class Game` |

`Game` methods:

- `start(hero)`, `go(id, via)`: move to a section. `go` applies arrival effects in order:
  `sec.ep`; once per section, `arrive(sec)` (`sec.cs`, the losses in `sec.take` through `lose()`,
  the gifts in `sec.give` through `takeLoot`, `sec.todo` as a "By hand:" event); `sec.lose`; forced
  Meal (hunting exempts, else eat, else -3 EP), then +1 EP healing if the section has no combat.
  Gifts come before the Meal so food found in the passage can be eaten. It resets `s.rolled` and saves.
- `combatPending`: the section has combat not yet won. `wonCombat()` marks it won.
- `choices()`: the choices with `enabled` and `why` filled in. Returns none while dead, at an
  ending, or while combat is pending. Applies `need.disc`, `need.rank`, `need.item` (with `not`),
  `need.gold`, the `rnt: 'auto'` gate, and hides `evade` choices in sections that have combat. For
  authored combat with `to`, returns a single "Continue". `choose` pays `need.spend` items or gold.
- `setRolled(n)` (also applies the matching `sec.rolls` entry, once), `resolveRandom(choice, roll)`
  (authored `choice.random`), `choose(choice, to)`.
- Inventory: `loot()` (gifts and finds, `i` = `'give0'` or `0`, with `taken` and `closed` for an
  `or` group already used), `takeLoot(i)`, `addItem(id)`, `removeItem(id)`, `adjust('ep'|'gold', by)`,
  `usePotion(id)` (anything with `heal`), `dropWeapon(id)`. `takeLoot` and `addItem` return an error
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
| Series-dependent effects | `LW.heals`, `LW.hunts`, `LW.shielded`, `LW.mindPower` (0 none, 1 Mindblast, 2 Psi-surge) |
| Combat Skill | `LW.heroCS(hero, ctx)` returns `{total, parts: [{label, n}]}`. `ctx`: `mindblast`, `psiSurge`, `enemy`, `csMod`, `csNote`, `with` |
| Weapon in hand | `LW.armedWith(hero, ctx)`: of his weapons and the Special Items that are weapons (`item.weapon`: the kinds it counts as), the one that adds most: its own `item.cs` (the Sommerswerd's 8) plus Weaponskill or Weaponmastery in any of its kinds. `ctx.with`: `'none'` (bare-handed, -4) or the one item that can harm this foe. Null: unarmed, -4 |
| Carried character | `LW.Character.load()`, `.save(hero, book)`, `.clear()`, all on the storage key in `LW.Character.key` (the player points it at the open adventure's) |
| Character dialog | `LW.UI.chooseCharacter(book, carry)` resolves to a hero. `carry` null = roll a new one |

`chooseCharacter` rules: a new character picks `first` disciplines of the book's series; a
carried one picks one more (or `first` if it has none in this series yet). Choosing Weaponmastery
asks for three weapons; a character that already has it picks one more. A new Magnakai character
is given all ten Kai disciplines, a Sword, a Meal and 10 + Random Number gold (`simpleKit`).
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
shielded, then 2 EP for Psi-surge if it was active (dropping to Mindblast at 6 EP or less). Evade applies only
the hero's loss. The house rule that Laumspur can be drunk mid-fight lives here.

Prototypes A and B have their own combat in `shared/battle.js`, and C in its `main.js`; those do
not know about Magnakai.

## Not implemented

Bow and Arrow rules, Special Item limits, per-book starting kits (Book 2's Seal of Hammerdal is
given at section 1 by its item table; the rest of its kit is by hand), Grand Master rules, any rule the
importer leaves as text and no item table covers. Potions that help in a fight (Alether) are only
described; their bonus is applied by hand.

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
  mastery: [...],            // Magnakai Weaponmastery weapons
  circleEp: 0,               // Endurance already granted by Lore-circles
  weapons: [...],            // max 2
  backpack: [...],           // item ids; Meals are counted separately
  meals: 0,                  // Meals count toward the 8 Backpack slots
  special: [...],
  gold: 0,                   // max 50
  found, simpleKit,          // transient flags used for a toast after creation
}
```

Item ids are keys of `LW.ITEMS`, or `pack:Name` / `spec:Name` for items typed in by hand.
`LW.itemName(id)` and `LW.itemKind(id)` handle both.

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
  `sec.ep`, `sec.lose`, forced Meal (hunting exempts, else eat, else -3 EP), then +1 EP healing if
  the section has no combat. It resets `s.rolled` and saves.
- `combatPending`: the section has combat not yet won. `wonCombat()` marks it won.
- `choices()`: the choices with `enabled` and `why` filled in. Returns none while dead, at an
  ending, or while combat is pending. Applies `need.disc`, `need.rank`, `need.item`, the
  `rnt: 'auto'` gate, and hides `evade` choices in sections that have combat. For authored combat
  with `to`, returns a single "Continue".
- `setRolled(n)`, `resolveRandom(choice, roll)` (authored `choice.random`), `choose(choice, to)`.
- Inventory: `loot()`, `takeLoot(i)`, `addItem(id)`, `removeItem(id)`, `adjust('ep'|'gold', by)`,
  `usePotion()`, `dropWeapon(id)`. `addItem` returns an error string when a limit is hit.
  Special Items with an `ep` value raise and lower `epMax` as they are added and removed.
- `rewind(n)`, `save()`, `load()`, `clear()`.

## rules-series.js

Adds the ten Magnakai disciplines to `LW.DISCIPLINES` and tags every discipline with `series`.
Adds `bow` and `quiver` to `LW.ITEMS`.

| What | Where |
|---|---|
| Series table | `LW.SERIES.kai` / `.magnakai`: `list`, `first` (disciplines for a new character), `field` (hero property), `ranks` |
| Lore-circles | `LW.CIRCLES`; `LW.circlesOf(hero)`; `settleCircles(hero)` adds circle Endurance once |
| Discipline tests | `LW.has(hero, id)` checks both lists. `LW.owned(hero, series)`, `LW.rankOf`, `LW.rankCount` |
| Series-dependent effects | `LW.heals`, `LW.hunts`, `LW.shielded`, `LW.mindPower` (0 none, 1 Mindblast, 2 Psi-surge) |
| Combat Skill | `LW.heroCS(hero, ctx)` returns `{total, parts: [{label, n}]}`. `ctx`: `mindblast`, `psiSurge`, `enemy`, `csMod`, `csNote` |
| Carried character | `LW.Character.load()`, `.save(hero, book)`, `.clear()` |
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
shared engine. Per round: spin the dial, `LW.combatRound(B.ratio(), n)`, apply both losses, then
2 EP for Psi-surge if it was active (dropping to Mindblast at 6 EP or less). Evade applies only
the hero's loss. The house rule that Laumspur can be drunk mid-fight lives here.

Prototypes A and B have their own combat in `shared/battle.js`, and C in its `main.js`; those do
not know about Magnakai.

## Not implemented

Bow and Arrow rules, Special Item limits, per-book starting kits, Grand Master rules, any rule the
importer leaves as text.

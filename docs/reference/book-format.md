# Book format

The data model `LW.Game` plays. `shared/book-demo.js` is a hand-written example;
`tools/import_projectaon.py` generates the same shape for real books.

## Book

```js
{
  id: '01fftd',            // Project Aon code; absent on the demo
  number: 1,               // place in the saga; used to order the title page and find "the next book"
  series: 'kai',           // 'kai' | 'magnakai'; picks the ruleset. Absent means 'kai'
  title, subtitle,
  start: '1',              // first section id
  sections: { '1': {...}, ... },
  // imported books
  assets: 'data/projectaon/01fftd/',      // prefix for image files
  map: 'map-4k.webp',      // the book's printed map: the 4K upscale if made, else 'map.png'
  bonusItem: true,         // Book 1 only: one extra starting item by Random Number
  intro: ['...'],          // "The Story So Far" as paragraphs, shown before section 1 of a new game. Absent or empty: none
  // authored books
  locations: { key: {x, y, name} },       // 1000x700 map coordinates (prototypes only)
}
```

The player ignores `locations` and `loc`: every choice is made on the page, and the map modal
shows the book's printed map. Only the prototypes travel on a map.

## Section

| Field | Type | Meaning |
|---|---|---|
| `text` | string[] | paragraphs, plain text |
| `choices` | Choice[] | ways on. Empty for an ending |
| `end` | `'death'` \| `'victory'` \| `'failed'` | set on endings. `failed`: the book's own ending short of death (a mission given up); played as a death |
| `combat` | Combat | must be won (or evaded) before choices open |
| `rnt` | `'auto'` \| `'free'` | the section calls for a Random Number. `auto`: the draw opens only the matching choice (a choice with no `range`, the way taken instead of drawing, stays open). `free`: the draw is shown and every choice stays open |
| `rntMod` | `[{plus, ...condition}]` | imported, or from an item table: what the text adds to the number (minus: takes away) when he meets the condition (see Conditions below); `{plus, each: 'magnakai', over}` adds `plus` for every Magnakai Discipline beyond the first `over`. The ranges are for the total |
| `puzzle` | true | imported: the text sets a puzzle whose answer is a section number; the page offers "Turn to section" |
| `meal` | true | a Meal must be eaten on arrival |
| `noHunt` | true | item table: Hunting does not excuse that Meal (Book 2's Wildlands) |
| `bowShot` | true | from an item table's `bowShot: {to: [lo, hi]}`: the Random Number is a bow shot. It needs a Bow and an Arrow, spends the Arrow, and has `LW.bowShot`'s bonus added; the ranges (set on the choices, `rnt` made `auto`) are for the total. A choice with no range stays open without shooting |
| `grandBow` | n | item table: what Grand Weaponmastery with Bow adds to this section's shot, where the text gives its own number in place of the +5 (ruling R10) |
| `img` | `{file, full, at}` | imported: illustration file (its `-2x.webp` once `ill_upscale.py` has made it, ADR 0031), whether it is a full-page plate, and the paragraph index it sits before |
| `loc` | string | authored: key into `locations` |
| `scene` | string | authored: which procedural ink scene to draw (`ruins`, `forest`, `hill`, `river`, `road`, `night`, `bridge`, `city`) |
| `loot` | `[{item}\|{gold}\|{meal}\|{pack}\|{arrows}\|{coin, n}]` | authored, or from an item table: things that can be taken here, one button each. `or`: a group of which only `pick` (default 1) may be taken. `cost`: a shop's price in Gold Crowns (in another coin with `coin`; `orAll`: or all he has if less); bought as often as he likes. `for`: his only in exchange for one of these ids, or `'weapon'` (any weapon of his); with several he chooses |
| `give` | same shape as `loot` | item table: handed over or pocketed with no choice; taken on arrival if it fits, otherwise left as a button |
| `take` | `[{item}\|{gold: n\|'all'}\|{weapons: 'all'\|'one'}\|{backpack: 'items'\|'all'}\|{special: 'all'}]` | item table: lost outright on arrival. `weapons: 'one'` takes the only weapon, or asks the player to choose when there are two. `backpack: 'all'` loses the Backpack itself (`hero.noPack`). `{arrows: n\|'all'}` empties the Quiver by that many |
| `rolls` | `[{range: [lo, hi], ep, gold, take, dead, mark}]` | item table: what the Random Number drawn here does (`gold`: won, or lost when negative; `ep: 'drawn'`: the number drawn is lost, 0 counting as 10; `dead`: the end of him) |
| `cs` | number | item table: COMBAT SKILL changed for good on arrival |
| `todo` | string | item table: a by-hand reminder shown with the arrival events. Only for what the engine cannot do (below) |
| `when` | `[{if, unless, ate, came, ep, epMax, cs, healLost, take, back, mark, unmark, settle}]` | item table: effects on arrival that hold only under a condition: `if` / `unless` are Conditions; `ate: false` holds unless he ate a Meal here or in the section before; `came` only when he came from one of these sections (an effect the text writes on a choice). `ep` is lost or gained once (`'full'` restores it); `epMax` changes his maximum for good. `healLost`, `epMax` may also stand at the top of a section |
| `rnt` | `null` | item table: the section draws no Random Number after all (the importer read one into a description) |
| `take` entries, more | `{pick: list \| [lists], n, else}` | he chooses `n` to lose (the page shows a medallion each, and the way on waits); lists are `backpack` (Meals too), `packItems` (no Meals), `special`, `weapon` (weapon-like Special Items too), `weapons`, `gold` (one Crown each). He has no more than `n`: all go. None: `else` (a `take` list) is lost instead |
| | `{at: [positions], from, last, min, else}` | by place, 1 first, in the list as the Action Chart shows it (`from` as above, default `backpack`, Meals first). `last`: the last one when the list is shorter. `min`: with fewer than that, `else` instead |
| | `{item, dose: true}` | one dose of an item that has several, not the whole of it |
| | `{item: [ids]}`, `{meals \| gold: n \| 'half' \| 'all', round}`, `{coin, n \| 'half' \| 'all'}`, `{weapons: 'used'}`, `{weapons: 'one' \| 'all', special: true}` | the first held of a list; half his Meals or gold (round down, or `round: 'up'`); another coin; the weapon he fought with last, else the one in hand; a weapon-like Special Item counts as a weapon (lost when it is his only one, or with all) |
| | `stash: key` on any entry | what is lost is kept under that name (`hero.stash`), to be given back by `back` |
| `back` | `[key \| {stash, only: [weapon, backpack, special, gold]}]` | what was taken into that stash is given back (or the kinds listed); what does not fit is said so |
| `mark`, `unmark` | id \| [ids] | a lasting condition set or ended (`hero.marks`), defined in the table's `MARKS` (below), or a bare flag a later book can test ("fought an Elix") |
| `note` | string | a note put on the Action Chart (a number to remember), our words |
| `stake` | `{key, min, max, coin, spend}` | the page asks for an amount before the way on opens (again on every visit). `spend`: given now (alms, a fee "as much as you like"). Otherwise kept as a stake under `key` (default the section) |
| `settle` | `{key: by}` | a stake settled here: `by` times it won (2: doubled), or lost when negative (-1) |
| `game` | `{kind, stake, win, near, vs, foes, bets, cap, token, coin, rate, broke, done, quit}` | a game of chance played over several throws, each thrown on the medallion (`rnt: 'free'`). `kind`: `'wheel'` (a number 0-9 bet on: `win` a Crown when it falls, `near` when a neighbour does, 0 between 9 and 1), `'dice'` (two numbers each against `foes` other players; two noughts win outright), `'higher'` (the number against a second drawn plus `vs`). `stake`: fixed (taken at each throw), or `{min, max}` set before it. A win gives the stake back and `win` times it; level, the stake back; a loss keeps it. `bets`: at most so many; `cap`: no more won at this table; `token`: Crowns to play with here only, given on the first visit; `coin`, `rate`: paid in that coin (`rate` to the Crown) when he has a stake's worth. Ways on: `broke` opens only when he can stake no more (the others shut then); `done` only once every bet is made, `quit` only before |
| `sell` | `{id: price}` | what a trader here buys, at that many Gold Crowns |
| `mealCost` | n | where a Meal is due, one may be bought here for that much if he has none |
| `meal` | n | more than one Meal asked for |
| `lessen` | `[{n, if, min}]` | a loss drawn by `rolls` is `n` smaller when he meets `if`, never below `min` (0) |
| `draws` | n | the text asks for that many numbers added: the page draws the others |
| `ranges` | `{to: [lo, hi]}` | as `bowShot`'s, for a draw that is no shot: the ranges of the total for each choice, when `rntMod` changes the number in ways the importer could not read |
| `ep` | number \| `'full'` | authored, or item table: Endurance change on arrival; `'full'` restores it to the maximum |
| `lose` | `{meal: 1}` | authored: something lost on arrival |

`give`, `take`, `cs`, `todo` and gains through `give` happen once per section in a playthrough
(`s.looted[id + ':arrive']`); `ep` and Meals on every arrival.

### Item tables

The importer cannot read reliably what a passage gives or takes away: the item's name is in the
story sentence, the instruction in the next, and many are conditional. So each book's items are
read and written down by hand in `items/items-<code>.js` (Book 1: `items/items-01fftd.js`,
52 sections, 2026-10-01) It exports `ITEMS` (the book's own items: `name`,
`kind` (`weapon` | `backpack` | `special`), optionally `glyph` (an icon in `assets/icons/`), `heal`,
`ep`, `about`, `meal` (eaten when a Meal is due and he has none, healing its `heal`), `shot` (a bow of
the book's own: what it adds to a shot), and for a Special Item that is also a weapon `weapon` (the kinds it counts as for
Weaponskill), `cs` (what it adds in a fight) and `undead` (it doubles undead foes' losses)) and
`SECTIONS` (by section number: any of the fields above, plus `meal` where the
importer's pattern missed one, plus `need: {to: {item | gold, not, spend}}` to gate the choice
leading to `to`, plus `fight` to correct what the importer read of the section's combat:
`csMod`, `mindforce` (set on every enemy; blocked by Mindshield), `unless: [items]` (carrying all of
them spares the `csMod`), `unarmed: true` (the `csMod` is the text's no-weapon penalty, so it is
dropped when he has no weapon and the engine's own -4 applies), `with` (`'none'`: bare-handed;
an item id: the only weapon that can harm this foe), `double` (the foe's losses are doubled),
`undead` and `drain` (set on every enemy: undead; Endurance it costs him each round unless he is
shielded)), `ambush` (the `csMod` is a surprise attack's or ambush's, which Huntmastery spares), `evade`
(`{after, to}`, as the importer writes it: an evasion the text gives outside a choice, Book 3's 108);
plus `bowShot` (above). A `need` of `null` clears a gate the importer set wrongly; a `need` with `any` replaces the importer's gate whole (other needs are merged into it). `main.js` lays the table over the
book (`LW.applyItems` in core.js) when it is first opened. Where the text leaves the choice to the player (which
weapon breaks, which item is stolen), the table gives a `todo`, not a guess. How to write one, and
the tools: `items.md`.

## Choice

| Field | Meaning |
|---|---|
| `text` | the choice as written. The page strips page references for display and shows "Continue" if nothing else is left |
| `to` | target section id |
| `need.disc` | discipline id required; a list: any of them (all with `need.every`) |
| `need.circle` | imported: Lore-circles he must have completed, by name (`'Circle of Fire'`) |
| `need.any` | imported or item table: a list of Conditions (below), any one of which opens the choice: `{any: [{disc: 'animalKinship'}, {rank: 6}]}`. A member may carry `item` |
| `need.rank` | minimum number of disciplines in the book's series |
| `need.item`, `need.spend` | authored or item table: item required (any kind), and whether choosing consumes it. A list: any of them will do (and the first held is spent). `need.not`: open only without it (without any of them). `need.ever`: having once been given it is enough (`hero.had`) |
| `need.ep` | item table: `[lo, hi]`, open only while his ENDURANCE is in that range (checked after the section's own `ep` change) |
| `need.gold`, `need.spend` | item table: Gold Crowns required, and whether choosing pays them. `need.orAll`: the price, or all he has if less (always open) |
| `need.coin`, `need.n` | item table: so many of another coin (`LW.COINS`: `kika`, `lune`), spent with `need.spend` |
| `need.came` | item table: open only when he came from one of these sections (a price that depends on where he came from) |
| `range` | `[lo, hi]`: imported, in `rnt: 'auto'` sections: the Random Numbers that lead here |
| `evade` | true: imported: this choice is the way out of the section's combat. Hidden from the list; used by the Evade control |
| `random` | authored only: `{table: [[upTo, to], ...], mod: [{disc, plus}]}`. The choice itself draws a number and the table picks the target |

The two Random Number mechanisms are different on purpose. Authored books attach the draw to a
choice (`choice.random`). Imported books attach it to the section (`section.rnt`) because that is
how the books are written: draw first, then one choice per range.

## Combat

```js
{
  enemies: [{ name, cs, ep,
              sprite,        // 'kraan' | 'giak' | 'vordak' | 'emblem': which drawn plate to use if there is no art
              art,           // imported: illustration file to use as the plate
              immune,        // true: mind attacks have no effect; 'mindblast': Mindblast has none, Psi-surge works; 'psi': neither, only Kai-surge (Grand Master) works
              drain,         // imported too where the text says so: Endurance lost each round unless shielded (Mindshield, Psi-screen)
              mindforce }],  // authored: CS penalty the enemy inflicts unless the hero is shielded
  evade: { after, to, within }, // evasion allowed once `after` rounds have been fought (and, with within, before that many are); go to `to`
  to,                        // authored: section to continue to after winning. Imported books leave this out and show the section's choices
  csMod, csNote,             // adjustment to the hero's CS for this fight, and its label
  csIf, csUnless,           // imported: a Condition (below). The csMod is given only if he meets csIf, and spared if he meets csUnless
  // from an item table: unless, unarmed, with, double, ambush, and csIf / csUnless as above; enemies may carry undead, drain, mindforce
}
```

Enemies are fought in order, one at a time. An item table's `fight` may also give (all in `LW.Fight`, shared/fight.js):

| Field | Meaning |
|---|---|
| `rounds` | `[{from, upTo, fromFoe, if, unless, came, ambush, mind, csMod, note, unarmed, heroLoss, foeLoss, heroPlus, heroEach, foeEach, psi}]`: what holds in some rounds only (`from`/`upTo`, round numbers, 1 first; `fromFoe`, from that foe of the list on, 0 first), or the whole fight under a condition (`if`/`unless`, Conditions; `came`, only when he came from one of these sections, a surprise the choice before grants; `ambush`, spared by Huntmastery in a Magnakai book; `mind`, only while Mindblast or Psi-surge is used, `mind: 2` only while the full Psi-surge or Kai-surge is). `csMod` (named `note`); `unarmed` (bare-handed); `heroLoss`/`foeLoss` multiply each round's loss (0 ignores it, 2 doubles, 0.5 halves, rounding down); `heroPlus` more for every wound; `heroEach`/`foeEach` lost every round whatever the dice say; `psi` multiplies what Mindblast or Psi-surge adds |
| `stop` | `{after, wound, foeAt, drawn: [n], to, by}` or a list: the text ends the fight after `after` rounds, at his first wound, when the foe is down to `foeAt`, or at once when a number in `drawn` is drawn; it leads to `to` (one of the section's choices), or opens the choices. `by: {hero, foe, even}`: the way on by who lost more |
| `breath` | `{each}`: the number drawn in the section (0 as 10, with its `rntMod`; drawn when the fight begins if not yet) is how many rounds he lasts; each round after costs `each` more Endurance (Book 4's underwater fights) |
| `won` | `{within, to, else}`: a win in `within` rounds or fewer leads to `to`, a longer one to `else` |
| `wounded` | once he has lost any Endurance in it, the fight (won or evaded) leads here |
| `to` | the way on after a win |
| `noEvade`, `evade.if`, `evade.foeAt`, `evade.fromFoe`, `evade.free`, `evade.label` | no evading whatever the choices say; evading only with a Condition; only once the foe is down to that ENDURANCE (Book 13's Giganite); only from that foe of the list on, 0 first (Book 4's 143, once the first guard is dead); evading without the blow. `evade` may be a list: several ways out, each a medallion of its own, a second named by its `label` |
| `rounds` `barred` | in a round entry: weapons (ids or kinds) not to be used in those rounds |
| `stop.if` | a stop rule that holds only under a Condition (a bow that breaks on a 0 only if it is the Jakan) |
| `lose` | a contest, not a fight to the death: brought to 0 he has lost, keeps his Endurance (as it was with `restore`, else 1) and goes here |
| `noShield`, `only`, `barred`, `plain`, `weaponCs`, `lend`, `noUnarmed` | no Shield; the weapon kinds that may (may not) be used (`'special'`: any weapon-like Special Item); weapon-like Special Items without their bonus; `{id: n, '*': n}`, what a weapon adds here in place of its bonus; a weapon he fights with that is not his yet; `true` or a Condition sparing the unarmed penalty |
| `mind` | a fight of the mind: `{cs}` a fixed score, or `{each, over, items: {id: n}}` his base score plus `each` for every discipline of the series past `over` and so much for items carried. No weapon, armour or Shield |
| `keep` | the foes' wounds kept under this name: a later fight with the same `keep` starts from them, without the dead, and only as many foes as fought before |
| `healLost`, `restore` | after the fight (won, evaded or broken off), that share of the Endurance it cost him back; or all of it, as it was (a contest) |
| `byHand` | why, in our words: the text ends this fight some way the engine cannot see, so the player's by-hand stop counts as its end and opens the choices. Without it the stop wins nothing (ADR 0027) |
| `noBoost` | no draught (`boost` items) may be swallowed before it |
| `points` | `{n, lose}`: a contest scored in target points, `n` on his side in place of his Endurance (which is untouched); spent, it leads to `lose` |

## Conditions

The importer writes what a rule depends on as `{disc, every, rank, circle, ep}`, any of them (the item tables also use the rest below):
`disc` a discipline id or a list (any of them, or all with `every: true`), `rank` the number of
disciplines of the book's series, `circle` a list of Lore-circle names (all needed), `ep` `[lo, hi]`
his Endurance at the moment, `item` an item id or a list (any held, via `LW.hasItem`; authored in item tables only). Item tables also use:
`items` (all of these held), `weapon` (a weapon of these kinds held, weapon-like Special Items by their kinds; `true`: any),
`wield` (the weapon he fights with is of these kinds; `true`: he is armed), `mastery` (Weaponskill or Weaponmastery in that
weapon), `skilled` (his skill counts for the weapon in hand), `meals` / `arrows` / `packItems` / `gold` (at least so many),
`mark` (a lasting condition or flag, `hero.marks`, carried from book to book), `any` (a list: one of them), `not` (a
Condition he must not meet). `LW.meets(hero, cond)` tests one, `LW.condName(cond)` names it. Used by `need` on choices
(the item tables' new ones go in `need.any`, a single member being fine), `rntMod` (`{plus, ...cond}`; `{vsCS: true}`
takes his COMBAT SKILL off the total), `when`, `lessen`, and the fight's `csIf` / `csUnless` and `rounds`.

## Marks

A table may export `MARKS`: `{id: {name, about, cs, noShield, ep, until, book}}`, lasting conditions a section sets with
`mark`: `cs` in every fight, `noShield`, `ep` lost in every section he passes, `until` an item whose use ends it (a
Laumspur Potion; a list: any of them), `book` lasting this adventure only. A mark's `ep` is lost from the section after the one that sets it. They are shown in the inventory. A mark with no definition is a
plain flag for a later section or book to test.

Item fields for the rules here: `boost` (COMBAT SKILL for one fight, swallowed before its first round), `boostAgain` and
`addict: {key, upTo, again, epMax}` (Adgana's key is `'adgana'` in every book) (a later dose adds less; after the fight a number drawn at or under `upTo`, `again`
for a later dose, costs `epMax` for good), `doses` (used that many times before it is gone), `free` (a Special Item outside
the limit of 12), `arrow` (rides in the Quiver in an Arrow's place).

## Ids

Section ids are strings. Imported books use the book's section numbers. The demo uses numbers and
a few suffixed ids (`9m`, `11a`).

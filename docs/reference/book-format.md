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
  map: 'map.png',          // the book's printed map
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
| `rntMod` | `[{plus, ...condition}]` | imported: what the text adds to the number (minus: takes away) when he meets the condition (see Conditions below); `{plus, each: 'magnakai', over}` adds `plus` for every Magnakai Discipline beyond the first `over`. The ranges are for the total |
| `puzzle` | true | imported: the text sets a puzzle whose answer is a section number; the page offers "Turn to section" |
| `meal` | true | a Meal must be eaten on arrival |
| `noHunt` | true | item table: Hunting does not excuse that Meal (Book 2's Wildlands) |
| `bowShot` | true | from an item table's `bowShot: {to: [lo, hi]}`: the Random Number is a bow shot. It needs a Bow and an Arrow, spends the Arrow, and has `LW.bowShot`'s bonus added; the ranges (set on the choices, `rnt` made `auto`) are for the total. A choice with no range stays open without shooting |
| `img` | `{file, full, at}` | imported: illustration file, whether it is a full-page plate, and the paragraph index it sits before |
| `loc` | string | authored: key into `locations` |
| `scene` | string | authored: which procedural ink scene to draw (`ruins`, `forest`, `hill`, `river`, `road`, `night`, `bridge`, `city`) |
| `loot` | `[{item}\|{gold}\|{meal}\|{pack}\|{arrows}]` | authored, or from an item table: things that can be taken here, one button each. `or`: a group of which only `pick` (default 1) may be taken. `cost`: a shop's price in Gold Crowns; bought as often as he likes |
| `give` | same shape as `loot` | item table: handed over or pocketed with no choice; taken on arrival if it fits, otherwise left as a button |
| `take` | `[{item}\|{gold: n\|'all'}\|{weapons: 'all'\|'one'}\|{backpack: 'items'\|'all'}\|{special: 'all'}]` | item table: lost outright on arrival. `weapons: 'one'` takes the only weapon, or asks the player to choose when there are two. `backpack: 'all'` loses the Backpack itself (`hero.noPack`). `{arrows: n\|'all'}` empties the Quiver by that many |
| `rolls` | `[{range: [lo, hi], ep, gold, take}]` | item table: what the Random Number drawn here does (`gold`: won, or lost when negative) |
| `cs` | number | item table: COMBAT SKILL changed for good on arrival |
| `todo` | string | item table: a by-hand reminder shown with the arrival events |
| `ep` | number \| `'full'` | authored, or item table: Endurance change on arrival; `'full'` restores it to the maximum |
| `lose` | `{meal: 1}` | authored: something lost on arrival |

`give`, `take`, `cs`, `todo` and gains through `give` happen once per section in a playthrough
(`s.looted[id + ':arrive']`); `ep` and Meals on every arrival.

### Item tables

The importer cannot read reliably what a passage gives or takes away: the item's name is in the
story sentence, the instruction in the next, and many are conditional. So each book's items are
read and written down by hand in `items-<code>.js` at the project root (Book 1: `items-01fftd.js`,
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
shielded)), `ambush` (the `csMod` is a surprise attack's or ambush's, which Huntmastery spares);
plus `bowShot` (above). A `need` of `null` clears a gate the importer set wrongly; a `need` with `any` replaces the importer's gate whole (other needs are merged into it). `main.js` lays the table over the
book (`applyItems`) when it is first opened. Where the text leaves the choice to the player (which
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
| `need.gold`, `need.spend` | item table: Gold Crowns required, and whether choosing pays them |
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
              immune,        // true: mind attacks have no effect; 'mindblast': Mindblast has none, Psi-surge works
              drain,         // imported too where the text says so: Endurance lost each round unless shielded (Mindshield, Psi-screen)
              mindforce }],  // authored: CS penalty the enemy inflicts unless the hero is shielded
  evade: { after, to, within }, // evasion allowed once `after` rounds have been fought (and, with within, before that many are); go to `to`
  to,                        // authored: section to continue to after winning. Imported books leave this out and show the section's choices
  csMod, csNote,             // adjustment to the hero's CS for this fight, and its label
  csIf, csUnless,           // imported: a Condition (below). The csMod is given only if he meets csIf, and spared if he meets csUnless
  // from an item table: unless, unarmed, with, double, ambush; enemies may carry undead, drain, mindforce
}
```

Enemies are fought in order, one at a time.

## Conditions

The importer writes what a rule depends on as `{disc, every, rank, circle, ep}`, any of them (the item tables also use `item`):
`disc` a discipline id or a list (any of them, or all with `every: true`), `rank` the number of
disciplines of the book's series, `circle` a list of Lore-circle names (all needed), `ep` `[lo, hi]`
his Endurance at the moment, `item` an item id or a list (any held, via `LW.hasItem`; authored in item tables only). `LW.meets(hero, cond)` tests one, `LW.condName(cond)` names it. Used
by `need` on choices, `rntMod` and the fight's `csIf` / `csUnless`.

## Ids

Section ids are strings. Imported books use the book's section numbers. The demo uses numbers and
a few suffixed ids (`9m`, `11a`).

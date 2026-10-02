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
  locations: { key: {x, y, name} },       // 1000x700 map coordinates. Presence turns on map travel
}
```

An imported book has no `locations` of its own; `placeBook` (maps.js) adds them, and each
section's `loc`, from a hand-made places file when its map spec has one (Book 1:
`places-01fftd.js`).

`locations` is the switch between the two ways a book plays:
with it, choices that change location are made on the map; without it, every choice is on the page.

## Section

| Field | Type | Meaning |
|---|---|---|
| `text` | string[] | paragraphs, plain text |
| `choices` | Choice[] | ways on. Empty for an ending |
| `end` | `'death'` \| `'victory'` | set on endings |
| `combat` | Combat | must be won (or evaded) before choices open |
| `rnt` | `'auto'` \| `'free'` | the section calls for a Random Number. `auto`: the draw opens only the matching choice. `free`: the draw is shown and every choice stays open |
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
52 sections, 2026-10-01), as its map places are. It exports `ITEMS` (the book's own items: `name`,
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
plus `bowShot` (above). A `need` of `null` clears a gate the importer set wrongly. `main.js` lays the table over the
book (`applyItems`) when it is first opened. Where the text leaves the choice to the player (which
weapon breaks, which item is stolen), the table gives a `todo`, not a guess. How to write one, and
the tools: `items.md`.

## Choice

| Field | Meaning |
|---|---|
| `text` | the choice as written. The page strips page references for display and shows "Continue" if nothing else is left |
| `to` | target section id |
| `need.disc` | discipline id required |
| `need.rank` | minimum number of disciplines in the book's series |
| `need.item`, `need.spend` | authored or item table: item required (any kind), and whether choosing consumes it. A list: any of them will do (and the first held is spent). `need.not`: open only without it (without any of them). `need.ever`: having once been given it is enough (`hero.had`) |
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
              immune,        // true: mind attacks have no effect
              mindforce }],  // authored: CS penalty the enemy inflicts unless the hero is shielded
  evade: { after, to },      // evasion allowed once `after` rounds have been fought; go to `to`
  to,                        // authored: section to continue to after winning. Imported books leave this out and show the section's choices
  csMod, csNote,             // adjustment to the hero's CS for this fight, and its label
  // from an item table: unless, unarmed, with, double, ambush; enemies may carry undead, drain, mindforce
}
```

Enemies are fought in order, one at a time.

## Ids

Section ids are strings. Imported books use the book's section numbers. The demo uses numbers and
a few suffixed ids (`9m`, `11a`).

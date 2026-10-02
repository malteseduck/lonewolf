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
| `img` | `{file, full, at}` | imported: illustration file, whether it is a full-page plate, and the paragraph index it sits before |
| `loc` | string | authored: key into `locations` |
| `scene` | string | authored: which procedural ink scene to draw (`ruins`, `forest`, `hill`, `river`, `road`, `night`, `bridge`, `city`) |
| `loot` | `[{item}\|{gold}\|{meal}\|{pack}]` | authored, or from an item table: things that can be taken here, one button each. `or`: a group of which only one may be taken |
| `give` | same shape as `loot` | item table: handed over or pocketed with no choice; taken on arrival if it fits, otherwise left as a button |
| `take` | `[{item}\|{gold: n\|'all'}\|{weapons: 'all'\|'one'}\|{backpack: 'items'\|'all'}]` | item table: lost outright on arrival. `weapons: 'one'` takes the only weapon, or asks the player to choose when there are two. `backpack: 'all'` loses the Backpack itself (`hero.noPack`) |
| `rolls` | `[{range: [lo, hi], ep, take}]` | item table: what the Random Number drawn here does |
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
`ep`, `about`) and `SECTIONS` (by section number: any of the fields above, plus `meal` where the
importer's pattern missed one, plus `need: {to: {item | gold, not, spend}}` to gate the choice
leading to `to`, plus `fight` to correct what the importer read of the section's combat:
`csMod`, `mindforce` (set on every enemy; blocked by Mindshield), `unless: [items]` (carrying all of
them spares the `csMod`), `unarmed: true` (the `csMod` is the text's no-weapon penalty, so it is
dropped when he has no weapon and the engine's own -4 applies)). `main.js` lays the table over the
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
| `need.item`, `need.spend` | authored or item table: item required (any kind), and whether choosing consumes it. `need.not`: open only without it |
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
}
```

Enemies are fought in order, one at a time.

## Ids

Section ids are strings. Imported books use the book's section numbers. The demo uses numbers and
a few suffixed ids (`9m`, `11a`).

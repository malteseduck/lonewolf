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
| `loot` | `[{item}\|{gold}\|{meal}]` | authored: things that can be taken here |
| `ep` | number | authored: Endurance change on arrival |
| `lose` | `{meal: 1}` | authored: something lost on arrival |

## Choice

| Field | Meaning |
|---|---|
| `text` | the choice as written. The page strips page references for display and shows "Continue" if nothing else is left |
| `to` | target section id |
| `need.disc` | discipline id required |
| `need.rank` | minimum number of disciplines in the book's series |
| `need.item`, `need.spend` | authored: Backpack Item required, and whether choosing consumes it |
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

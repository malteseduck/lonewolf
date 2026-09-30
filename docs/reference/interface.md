# The interface

`index.html`, `main.js`, `plates.js` and `maps.js` at the project root. A flat book after
*Lone Wolf HD Remastered*. Intent is in `docs/spec.md` section 6; this is how it is built.

## Page structure

```
body
  svg#gear            bronze clockwork, fixed, mostly off the right edge; turns a notch per page turn
  .shade, .glow       vignette and the warm light from the left
  nav.top             Prototypes / Sound / New game (bottom-left)
  .stage > .book#book > .spread
      section#pl.page.left        the story page (ornate frame via ::before)
      .edges                      the stacked page edges between the two pages
      .rightwrap
          #rtabs                  three tab medallions, hidden outside story mode
          section#pr.page.right   the panel (torn edge via clip-path)
```

`--bw` is the book's width; `.book { font-size: calc(var(--bw) / 59) }` and everything inside is
in `em`, so the spread scales as one piece. Below 760px wide the spread stacks into one column.

Design tokens (colours, the three font roles) are CSS custom properties on `:root` at the top of
`index.html`. Fonts: Charm (script body), Metamorphous (titles, numerals, labels), Almendra
Display (loaded, currently unused for the title). All from Google Fonts.

Textures are generated at start-up in `main.js` and set as CSS variables: `--parch-l`,
`--parch-r`, `--frame`, `--wood`, `--torn`.

## Modes

| `mode` | Left page | Right page |
|---|---|---|
| `title` | book list: continue / start over / new character | blank |
| `story` | section text, illustration, arrival events, loot, Random Number medallion, choices or an action medallion | the chosen panel |
| `battle` | first paragraph of the section, then the fight's record line by line | the fight |

## Left page in story mode (`leftHTML`, `storyText`, `mountRnt`)

- Section number in a medallion (`.badge`).
- Paragraphs in `.text`, the first with a drop capital. The illustration is placed before the
  paragraph index in `sec.img.at` (imported) or after the first paragraph (demo vignette).
- `.scroll` holds the text and scrolls if the section is long. What follows is pinned below it.
- `#dialslot`: for `rnt` sections the Random Number medallion is mounted here by `mountRnt()`.
- Then one of: death panel, the crossed-swords medallion ("Draw your weapon"), the ending panel,
  or a compass medallion (if map roads are open) plus the list of on-page choices.
- `shown(text)` strips "turn to N" from a choice; if nothing meaningful is left it shows "Continue".

## Right-page panels (`renderRight`)

Header on every panel: a place plaque (location name, or the book's title, or "Combat") and a
bronze plaque with Combat Skill, Endurance and gold.

- **kai** (`kaiHTML`): attribute rows (CS, EP with -/+ steppers, each CS modifier, Meals, rank,
  Lore-circles held), then the discipline medallions around the figure on fixed positions
  (`TREE`), joined to a hub. Shows the disciplines of the book's series. `.caption` explains the
  selected one.
- **pack** (`packHTML`): Special Items row, two weapon slots beside the figure, eight Backpack
  cells, a ledger (gold -/+, "Add an item by hand" select), and the caption with Drink / Drop / Eat.
- **map**: three cases.
  - Book has `locations` (demo): `updateMap()`. Destinations for the current choices are lit rings;
    the same choices are listed under the map. Picking one moves the pawn, then turns the page.
  - Book has a spec in `MAPS` but no locations (Book 1): `updateJourney()`. The pawn sits part-way
    along `spec.route` by `progress()`: 1 minus (shortest number of choices from the current
    section to the victory section) over (the same from the start). A link swaps to the printed map.
  - Neither: the printed map only, sepia-filtered, draggable.

`destLoc(choice)` decides whether a choice is a road: every target of the choice is in one
location, and it is not the current one.

## Maps (`maps.js`)

`MAPS[id]` is a spec on a 1000x700 grid: `sea`, `rivers`, `roads`, `trails` (SVG path strings),
`woods` (ellipses), `hills`, `peaks`, `marks` (landmark glyphs), `clear` (points to keep trees
away from), `labels`, `compass`, and for journey maps `route`, `start`, `goal`.
`mapCanvas(id)` paints it once at 2000x1400 and caches it. `along(route, f)` returns the walked
part of the route. Dynamic parts (route line, rings, pawn, labels of visited places) are DOM and
SVG laid over the canvas in `.mapinner`, which is translated to keep the pawn in view.

`MAPS.demo` is the invented country of the demo. `MAPS['01fftd']` is an original drawing of the
country between the Kai Monastery and Holmgard.

## Combat (`startBattle`, `updateBattle`, `battleAct`, `endBattle`)

`B` holds the fight: `c` (the section's combat), `i`/`foe` (current enemy), `power` and `mind`
(0 rest, 1 Mindblast, 2 Psi-surge), `rounds`, `log`, `over`, `fx`, `img`, `node`, `dial`.

The panel is one `.fight` node: a canvas filling it, the enemy bar over its top, the command
medallions and dial over its foot. `B.fit()` sizes the canvas to the node at device resolution.
A requestAnimationFrame loop calls `drawCreature` each frame; the plate itself is still, only
wound marks, the lunge scale and the death fade change.

`battleAct(id)`: `fight` and `evade` spin the dial and resolve a round; `mind` cycles the mind
attack; `item` drinks Laumspur. When `B.over` is set the left page shows the outcome and a
"Turn the page" button, which calls `endBattle` to move the story on.

## Art pipeline (`plates.js`, `shared/ink.js`)

- `Ink.parchment`, `leather`, `inkScene(name, w, h)`: procedural textures and ink-wash vignettes.
- `inkPlate(img)`: takes a black-on-white illustration, upscales it, maps darkness to alpha in a
  sepia ink colour, and feathers the edges with a blurred irregular mask. Cached per image URL.
  Needs a same-origin image.
- `drawCreature(canvas, kind, scene, t, fx, img)`: draws the plate. With `img` (or an entry from
  `art/manifest.json`) it draws the inked illustration top-aligned, showing about 80% of its
  height. Without, it draws a procedural silhouette (`kraan`, `giak`, `vordak`) or the crossed-
  swords `emblem`.
- `drawFigure`, `drawFrame`, `gearSVG`: the cloaked figure, the page frame, the clockwork.
- Story illustrations are plain `<img>` with `mix-blend-mode: multiply`; full plates also get a
  soft radial mask.

## Page turn (`turn(update)`)

Clones the left page, runs `update()` underneath, then rotates the clone away about its left edge
and removes it. Also plays the page sound and turns the gear. Skipped under reduced motion.

## Sound

`shared/sfx-soft.js`: `LW.sfx(name)` with `select, roll, page, swing, hit, hurt, heal, battle,
win, lose`; `LW.drone()` starts a low drone on first pointer input. `LW.setSound(bool)` persists.

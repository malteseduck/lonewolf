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
- **map**: three cases, plus "The whole map" (the zoomable replica) for any book whose spec is one.
  - Book has `locations` (the demo, and Book 1 through `placeBook`): `updateMap()`. Destinations for the current choices are lit rings;
    the same choices are listed under the map. Picking one walks the figure there, then turns the page.
  - Book has a spec in `MAPS` but no locations (Book 1): `updateJourney()`. Lone Wolf's figure stands
    part-way along `spec.route` by `progress()`: 1 minus (shortest number of choices from the
    current section to the victory section) over (the same from the start). "The whole map" swaps
    to the zoomable replica (below).
  - Neither: the whole printed map, repainted by `printedCanvas`, draggable.

The book's printed map is loaded once per book by `printedMap()`, which returns null until the
image has arrived and redraws the panel when it does. It is shown at 130% of the panel width: the
source is about 1000 px wide, and more zoom only blurs it.

`destLoc(choice)` decides whether a choice is a road: every target of the choice is in one
location, and it is not the current one.

## Maps (`maps.js`)

`MAPS[id]` is a spec on a 1000x700 grid: `sea`, `rivers`, `roads`, `trails` (SVG path strings),
`woods` (ellipses), `hills`, `peaks.box`, `marks` (landmarks), `clear` (points to keep symbols
away from), `labels`, `compass`, and for journey maps `route`, `start`, `goal`.

`mapCanvas(id)` paints it once at 2000x1400 and caches it, in this order: parchment and washes,
sea, rivers, then the land symbols back to front (rows of mountains filling `peaks.box`, small
peaks for `hills`, forest clumps and single trees through each wood), then roads and trails as
white dashes over them, then settlements on a pale halo, labels, compass, border.

The symbols are stamped from `assets/map/widman.png`, a sheet of engravings from a 1680 atlas
(K. M. Alexander's Widman set, CC0) indexed by `widman.json` (`kind: [[x, y, w, h]]`, kinds
`mountain range forest tree city town fort walled bridge`). The sheet is built from the
downloaded pack by `tools/build_map_atlas.py`; one file because the local server takes seconds to
serve hundreds. `loadStamps()` fetches it and tints it to the sepia ink (and a paper-coloured
copy for halos); `mapCanvas` returns null until then and the panel redraws when it lands.
A stamp is drawn at its own pixels times a scale, standing on its foot. `MARK_POOL` says which
kind each landmark uses; minor landmarks (cairn, wagon) get no symbol.

`printedCanvas(img, crop, w, h)` repaints a book's printed map as sepia ink: lightness becomes ink
depth, water is pushed darker, strong red survives faintly, then parchment grain is multiplied
over it. Used for the "printed map" view. `along(route, f)` returns the walked
part of the route. Dynamic parts (route line, rings, figure, labels of visited places) are DOM and
SVG laid over the canvas in `.mapinner`, which is translated to keep the figure in view.

`MAPS.demo` is the invented country of the demo, a drawn spec.

### The Lastlands replica (`replica.js`, `LASTLANDS` and `replicaCanvas` in `maps.js`)

The printed map is about 1000 px wide, so cropping and enlarging it blurs. Instead it is redrawn.
`analyse(img, LASTLANDS)` (replica.js) reads the owner's copy once per session (~0.3 s):

- every pixel is sorted into a terrain class by hue, saturation and value (ink, pale, water,
  plain, forest, hill, mountain, waste, red);
- the sea is flood-filled from `LASTLANDS.sea` through everything that is not land, inside
  `frame` and with `cover` boxes (banners, title, key, compass rose, arms, ships) painted over
  first. Blurring that sea and taking the 0.5 contour (marching squares) gives the coast as smooth
  closed outlines, islands included;
- blurred class densities give grids of mountain, forest, hill and waste, zeroed at sea.

Rivers, roads, settlements and names are not read from the image: auto-detection found only
fragments. They are hand-placed in `LASTLANDS` in the printed map's pixels. `LASTLANDS.detail`
adds the heart of Sommerlund from the inset on sheet 1 of Project Aon's *Maps of Magnamund*
(villages, towers, lakes, lanes), fitted by `fit()` to two towns both maps show, and drawn only when
zoomed in (6+ canvas px per map px).

`replicaCanvas(model, view, W, H)` paints any view at any size: parchment and washes, sea with a
shore wash and ripples, inked coast, lakes, rivers, then land symbols on a jittered screen-space
grid (so zooming in shows more symbols, not bigger ones) chosen by the terrain under each point
and kept off roads, rivers and towns; roads as white dashes; settlements on halos with names;
region names; border.

`MAPS['01fftd']` is `{replica: true, view, trail, route}`: the journey panel shows `view` (a 10:7
box round the Kai Monastery and Holmgard) and the figure walks `trail`. "The whole map" opens
`.mapview.zoomable`: `drawZoom()` repaints the replica for `zoomV` (left, top, width in map
pixels) at the panel's device resolution; dragging slides the canvas and repaints on release;
the wheel and the +/- medallions call `zoomBy`. The figure is placed from the same `trail`.

### Book 1's places (`places-01fftd.js`)

The book names few of the places it passes through, so they are made up to fit what each passage
describes (a watchtower, a fallen tree, a lake with a shack), named in our own words. `PLACES` holds
`[name, symbol, x, y]` in the printed map's pixels; `AT` lists the section numbers that happen at
each. A few were fixed by hand (the Monastery, Holmgard, Fogwood, Raumas, Alema, the Graveyard, the
highway stops); the rest were placed by a one-off force layout that pulls together places the
story moves between, so they are plausible rather than surveyed. `placeBook(book)` (maps.js), called
from `useBook`, turns them into `book.locations` on the 1000x700 grid of `view` and sets each
section's `loc`, which switches the book to travel on the map exactly like the demo. The replica
draws each place's symbol (fort, village, bridge, walled, hill, tree, lake, marsh) whether visited
or not; names appear once visited or offered. When a book has its own places, the Magnamund detail
layer is left out.

### Lone Wolf's figure (`.pawn`)

Lone Wolf standing over a bronze arrowhead that points at his spot, toned sepia and outlined in
white. He slides from place to place; `place()` adds `.walking` for the
second it moves, which bobs and sways it (CSS `walk`). The picture comes from `art/manifest.json`
`hero`: either a file already cut out, or `{src, crop}`, in which case `heroFromArt(img, crop)`
(plates.js) cuts the figure out of its plain, smoky ground at load: a flood fill in from the crop's
edges through mid-toned greyish pixels close to their neighbour; a smooth colour surface fitted
to that ground then keys out anything near it. An optional `outline` (a polygon traced by hand in
crop pixels) overrides both: inside it is figure, outside ground, and only a 10 px band along it is
left to the keying. Without an outline, the largest piece left is kept. Then it
tones it sepia, stands it over `pointer` centred between its feet, and `outlined` rims it in white. The owner's current picture is the full-length Lone Wolf from a
Lone Wolf HD store screenshot (in git-ignored `art/`). Without one, `drawHero()` paints a stand-in.

`replica.js` also has `trace()`, which redraws the printed map itself as vector tones. It was tried
in place of the stamped replica and looked worse (giant lettering and blobs when zoomed in); it is
not used.

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

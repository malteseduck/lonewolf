# The interface

`index.html`, `main.js`, `plates.js` and `maps.js` at the project root. A flat book after
*Lone Wolf HD Remastered*. Intent is in `docs/spec.md` section 6; this is how it is built.

## Page structure

```
body
  svg#gear            bronze clockwork, fixed, mostly off the right edge; turns a notch per page turn
  .shade, .glow       vignette and the warm light from the left
  nav.top             #offline (top-right): how the offline copy stands (docs/reference/offline.md);
                      "Update ready: reload" reloads when touched. The title page is reached by the
                      return medallion; sound keeps its last setting (lw-sound), with no switch
  .stage > .book#book > .spread
      section#pl.page.left        the story page (ornate frame via ::before)
      .edges                      the stacked page edges between the two pages
      .rightwrap
          #rtabs                  three tab medallions (TAB_ART: wolf head, chest, compass rose), then a smaller
                                  return-arrow medallion (data-home) back to the title page; hidden outside story mode
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
| `title` | `titleLeftHTML`: the mark (LONE, wolf's head, WOLF), the portrait as frontispiece (the ruins vignette without it), a motto, and the series as two rows of numeral medallions in scrollwork, lit where the open adventure has a save for that book, dim where not downloaded (`SERIES_TITLES`); a numeral begins or continues that book in the open adventure | `titleRightHTML`, one of two views on the bronze-framed plaques (medallion and a rod off to the clockwork). `adventuresHTML`: "Your adventures", one plaque per adventure (its numeral, the book last open, rank and section, or "Fell at"; an adventure given a name shows the name above, and the book in the line under it); the plaque resumes it (a fallen one opens its books instead), with "books | rename | backup | restore | forget" under it: "rename" (a box, Enter keeps the name, an empty one clears it, Escape leaves it), "backup", "restore" (asks before replacing it; see Storage in architecture.md) and "forget" (asks first); last, "A new adventure", with "restore" under it (a backup file comes back as a new adventure). `shelfHTML` (`shelf` true): that adventure's books, continue (with the saved section) / the story so far / start over / new character, and "all adventures" in the heading, which carries the adventure's name or "Adventure II" |
| `story` | section text, illustration, arrival events (a by-hand reminder begins "By hand:"), "Found here" (`.finds`: each gift or find as a small medallion with its icon, "take it", "yours" once taken, or dimmed when the other of an `or` pair was taken, or the share of a "choose two"; a shop's wares read "buy it: N Gold Crowns" under "For sale"; touching one takes or buys it, or toasts why not), Random Number medallion, choices or an action medallion | the chosen panel |
| `battle` | first paragraph of the section, then the fight's record line by line | the fight |

## Left page in story mode (`leftHTML`, `storyText`, `mountRnt`)

- **Introduction**: a new game of a book with `intro` opens on it (`intro` true), not on section
  1: the wolf's head in the badge, "The story so far" over the paragraphs (drop capital, scrolling),
  and a "Begin" seal (`data-intro`) that turns the page to section 1. Section 1 is already the
  saved place, so reloading or leaving for the title page skips it. Continuing a save shows it
  only from "the story so far" under the book's plaque on the shelf (`data-tssf`, `intro` =
  `'again'`), and then the seal reads "Back to section N".
- Section number in a medallion (`.badge`).
- Paragraphs in `.text`, the first with a drop capital. The illustration is placed before the
  paragraph index in `sec.img.at` (imported) or after the first paragraph (demo vignette).
  Full-page illustrations (`ill*`) are `.vignette.full`, 56% of the column wide. The books' small
  pictures (`small*`) come as 386x150 strips with the drawing often filling half of it or less, so
  `trimSmall()` (after each `renderLeft`) cuts each to its drawing plus a 3% margin (cached as a data
  URL) and `.vignette.small` shows it 7.5em high, never wider than the column. Hidden until cut.
  Checked on every illustrated section of Book 1 (2026-10-01): small ones 195px high, full ones
  about 243x425, in a 1274x914 window.
- `.scroll` holds the text and scrolls if the section is long. What follows is pinned below it.
- `#dialslot`: for `rnt` sections the Random Number medallion is mounted here by `mountRnt()`.
  In a bow shot (`bowShot`) the line under it says what the shot costs, or why he cannot shoot
  (a toast if touched), and afterwards shows the sum: the number drawn, each bonus, the total.
  The same sum is shown for a section whose text adds to the number (`rntMod`: "You drew 5, +2
  Animal Control: 7.").
  `makeDial()` builds it: a 4.6em medallion whose bronze bezel is engraved 0-9 and turns, while
  the black face shuffles digits, then shows the drawn one under the notch at the top, glowing.
  The same medallion sits among the fight's commands.
- Then one of: death panel, the crossed-swords medallion ("Draw your weapon"), the ending panel,
  or a compass medallion (if map roads are open) plus the list of on-page choices.
  The death panel (death in a fight, or a death section) offers to go back: a seal for the section
  before, ink links for the ones before that (`game.backs()`, at most `REWIND` = 3), then "begin
  again". Going back (`goBack(k)`, `data-back`) turns the page to that section as it stood when its
  choice was made, Random Number undrawn. A book's ending short of death (`end: 'failed'`) gets the
  same panel, reading "Your mission has failed".
- A puzzle section (`puzzle`: the answer is a section number) adds, under its choices, "Turn to
  section" with a box for the number and "turn" (Enter works too); a number the book does not have
  is toasted. `turnTo()`.
- `shown(text)` strips "turn to N" from a choice; if nothing meaningful is left it shows "Continue".

## Right-page panels (`renderRight`)

Header on every panel: the place's name on a ribbon (location name, or the book's title, or
"Combat") and `gauges()`: Combat Skill, Endurance and gold, each a dark window in a bronze frame
with a medallion (crossed swords, heart, coins) at its end; Endurance has a red thread for what is
left. `updateBattle` redraws the gauges each round.

- **kai** (`kaiHTML`), after the HD character sheet:
  - `.likeness`: Lone Wolf's portrait (`portraitURL`, made by `portraitFromArt` from
    `art/manifest.json` "portrait": an ink drawing cropped from an HD screenshot, paper keyed out,
    edges faded) with the name and a wolf medallion under it. Without the art, just the name.
  - `.ledgers`: "Attributes" (CS, EP with -/+ steppers, Meals, rank, Lore-circles in Magnakai
    books) beside "Combat Skill" (`heroCS` parts) and "Endurance" (base, plus Special Items' and
    Lore-circles' bonuses). Headings are ruled with a swash (`ruled()`).
  - `.discs`: every discipline of the book's series, five to a row, as `.disc` medallions joined
    by bars, in a box framed by `drawFrame(1000, 470)` (`--grid-frame`). Learned ones are `.lit`.
    Glyphs are game-icons.net SVGs in `assets/icons/` (`DISC_GLYPH`), used as CSS masks so they
    can take the ivory fill and ember glow.
  - `.caption` explains the selected discipline, and says when it is not learned.
- **pack** (`packHTML`), after the HD equipment sheet: in `.kit`, the portrait faint behind the
  slots he wears (helmet above, the two weapons either side of the chainmail; a mastered weapon is
  lit), the other Special Items in a row beneath (at least four slots, empty ones as bare rings);
  then a ruled "Backpack" heading, a knapsack medallion beside eight dark tiles (one per Meal or
  item); a ledger (gold -/+, "Add an item by hand"); and the caption with Drink / Drop / Eat. The
  Quiver's caption counts its Arrows, with -/+ (`adjust('arrows')`); with nothing selected the
  caption lists what is kept at the Kai Monastery (`hero.stored`, `hero.storedGold`). With
  the Backpack lost (`hero.noPack`) its heading says so. The caption gives a book item's `about`;
  anything with `heal` can be drunk (the potion) or eaten (Laumspur herb). Icons: `ITEM_GLYPH` for the
  standard items, else the item's own `glyph` from its book's item table, else a pouch or pendant
  by kind; gold and a found Backpack have their own.
  "Add an item by hand" (`adding`) swaps the worn kit for `pickerHTML()`: rows of small medallions
  (weapons, Backpack Items, Special Items, and "This book": the open book's own items from its item
  table) that add on a touch and stay open, with "+" medallions
  for something else, which ask for a name on an inked line (`naming`; Enter adds, Escape cancels).
  The caption is hidden meanwhile; the picker's own line names whatever is under the pointer.
  Item glyphs are game-icons.net SVGs (`ITEM_GLYPH`); items typed in by hand get a pouch or a
  pendant by their kind.
- **map**: three cases, plus "The whole map" (the zoomable replica) for any book whose spec is one.
  - Book has `locations` (the demo, and Book 1 through `placeBook`): `updateMap()`. Destinations for the current choices are lit rings, named only when `told(k)`: the place is in the book's `KNOWN` list (named on its printed map) or he has been there, so the map gives away no more than the choice does;
    the same choices are listed under the map. Picking one walks the figure there, then turns the page.
    Places passed in the last `REWIND` sections (other than where he stands; `backPlaces()`) are
    `.mk.back`: the dot in a fine ink ring, and touchable. Under the map, `backHTML()` names them
    ("Go back to ..."); touching one there or on the map arms it (`armed`, red dot) and the line asks
    "Go back to X, n sections ago, and choose again?" with "Go back" (`data-back`) and "stay". Any
    other touch disarms it.
    The list under the map is filled before `updateMap()` pans, since it takes height from the map
    and the pan is in pixels. It centres on the middle of the figure's and the roads' spread (not
    their average, which pushed a lone far road off). Any name that would fall off the view, a
    destination's or a place passed, is shifted back in, or put under its ring at the top edge.
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
white dashes over them, then settlements as buildings from `buildings.js` (`MARK_BUILDING`: city
castle, town tower, ruins keep, bridge bridge), labels, compass, border.

The symbols are stamped from `assets/map/widman.png`, a sheet of engravings from a 1680 atlas
(K. M. Alexander's Widman set, CC0) indexed by `widman.json` (`kind: [[x, y, w, h]]`, kinds
`mountain range forest tree city town fort walled bridge`). The sheet is built from the
downloaded pack by `tools/build_map_atlas.py`; one file because the local server takes seconds to
serve hundreds. `loadStamps()` fetches it and tints it to the sepia ink (and a paper-coloured
copy for halos); `mapCanvas` returns null until then and the panel redraws when it lands.
A stamp is drawn at its own pixels times a scale, standing on its foot. Minor landmarks (cairn,
wagon) get no symbol. The Widman `town city village fort walled bridge` stamps are no longer drawn
anywhere: they do not look like the official maps' icons (the `bridge` ones are towns by a river).

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
  `frame` and with `cover` boxes (banners, title, key, compass rose, arms, ships, and Holmgard's
  castle, whose dark ink otherwise floods as a false inlet of the Holmgulf) painted over first. Blurring that sea and taking the 0.5 contour (marching squares) gives the coast as smooth
  closed outlines, islands included;
- blurred class densities give grids of mountain, forest, hill and waste, zeroed at sea.
- where the printed map leaves land plain, and the owner has the reference world map
  (`data/reference`, git-ignored), its terrain fills in: `worldTerrain` reads that map's hills
  (tan and brown marks), mountains (the dark brown of shaded peaks) and forest (dark green marks),
  and `LASTLANDS.world.anchors` (Kai Monastery, Holmgard, Toran, Tyso on both maps) give a
  least-squares affine fit between them, good to a pixel or two. Without the file, nothing changes.

Rivers, roads, settlements and names are not read from the image: auto-detection found only
fragments. They are hand-placed in `LASTLANDS` in the printed map's pixels. `LASTLANDS.detail`
adds the heart of Sommerlund from the inset on sheet 1 of Project Aon's *Maps of Magnamund*
(villages, towers, lakes, lanes), fitted by `fit()` to two towns both maps show, and drawn only when
zoomed in (6+ canvas px per map px).

`replicaCanvas(model, view, W, H)` paints any view at any size: parchment and washes, sea with a
shore wash and ripples, inked coast, lakes, rivers, then land symbols on a jittered screen-space
grid (so zooming in shows more symbols, not bigger ones) chosen by the terrain under each point
and kept off roads, rivers and towns (open country, zoomed in, gets grass tufts and the odd lone
tree so it is not left bare); roads as white dashes; settlements on halos with names;
region names; border.

`MAPS['01fftd']` is `{replica: true, view, trail, route}`: the journey panel shows `view` (a 10:7
box round the Kai Monastery and Holmgard) and the figure walks `trail`. "The whole map" opens
`.mapview.zoomable`: `drawZoom()` repaints the replica for `zoomV` (left, top, width in map
pixels) at the panel's device resolution; dragging slides the canvas and repaints on release;
the wheel and the +/- medallions call `zoomBy`, which only scales the painted canvas in CSS
(the figure hidden) and repaints 160 ms after the last tick: a repaint takes a noticeable moment, and
repainting on every tick queued them up and froze the page. In `replicaCanvas`, symbols and tufts
are kept off roads and rivers by one raster mask of them per repaint, not `isPointInStroke` per
spot (which took seconds). The figure is placed from the same `trail`.

### Book 1's places (`places-01fftd.js`)

The book names few of the places it passes through, so they are made up to fit what each passage
describes (a watchtower, a fallen tree, a lake with a shack), named in our own words. `PLACES` holds
`[name, symbol, x, y]` in the printed map's pixels; `AT` lists the section numbers that happen at
each. A few were fixed by hand (the Monastery, Holmgard, Fogwood, Raumas, Alema, the Graveyard, the
highway stops); the rest were placed by a one-off force layout that pulls together places the
story moves between, so they are plausible rather than surveyed. `placeBook(book)` (maps.js), called
from `useBook`, turns them into `book.locations` on the 1000x700 grid of `view` and sets each
section's `loc`, which switches the book to travel on the map exactly like the demo. The replica
draws each place's symbol (a building: house, tower, keep, temple, obelisk, bridge; or stream,
hill, tree, wood, lake, marsh) whether visited or not. A bridge not on a river, and a stream, get
a winding brook of their own that runs through the spot into the nearest river; a wood is a ring of
forest clumps for places the story calls woods where the printed map shows open country; names appear once visited or offered. When a book has its own places, the Magnamund detail
layer is left out.

### Book 2's places and legs (`places-02fotw.js`)

Made the same way (46 places, all set by hand), but Book 2 crosses most of the map: Holmgard's
harbour, the voyage east, Ragadorn, the coach road, the border forest and the Rymerift, Port Bax, the Tarnalin
and Hammerdal, and home by sea. One view of all that would put its places a few pixels apart, so
the journey is cut into **legs** (`LEGS`: a name, a 10:7 `view`, its places): Holmgard (a town
plan, below), the voyage, the Wildlands, the border of Durenor, Durenor, and the voyage home. Each leg is a map of its own
(`MAPS['02fotw/sea']`, built from `MAPS['02fotw'].legs` in maps.js) and every location carries
the `map` it belongs to (`placeBook`). In `updateMap` the leg of the place he stands at decides the
map shown; only its places are marked and only the trail within it is drawn. A choice that leads
into another leg is a road off the map (`destLoc` returns null), so it stays on the page, and the
map turns to the new leg when he arrives. The Holmgulf appears twice (`holmgulf` and `homebound`),
once in each voyage. Sea places are set in water and
land places on land by the replica's own reading (`replicaModel(img).land`); the Rymerift's
channel is drawn for the bridges to stand on. It is Book 2's own (`MAPS['02fotw'].rivers`, passed to
`replicaCanvas` as `own`): what one book adds to the shared Lastlands stays in that book's entry, so
the other books' maps are untouched (Book 1's was checked pixel for pixel against the version
before Book 2, 2026-10-02). The goal ring is
`MAPS[id].goalAt` (Book 1 the fieldworks before Holmgard, whose city is a plan of its own; Book 2
Hammerdal).

A passed place out of the view keeps its name beside it, off the view; only a place in view has
its name tucked back inside the edge (otherwise the names of a long trail stack at the edge).

Each leg is laid out for 3200x2240 but painted only as large as the panel
shows it: `paintScale()` in main.js measures the right-hand panel (not the map itself, whose height
changes with the roads listed under it; the picture is 1.8 times that, at the screen's pixel
density up to 2) and `mapCanvas(id, img, world, out)` paints that
fraction, in eighths, by scaling the layout onto a smaller canvas (`replicaCanvas`'s `out`; a town
plan is simply painted smaller), so it looks the same with fewer pixels. Each leg keeps one painting, at
the latest size (each is tens of megabytes); a resize that changes the size repaints. `paintAhead()`, after every render in story
mode, paints the legs the section's choices lead into, one at a time when the page is idle, at the
size the map was last shown at (not before a map has been shown). In a hidden pane the browser
holds back image decoding, so no map paints there at all until the pane is shown.

### Town plans (`city.js`, `towns-<book>.js`)

Where a book wanders a town's streets or a crypt's passages, a leg can be a plan of the place instead
of a view of the Lastlands: `city: 'ragadorn'` on the leg, `at:` its spot on the printed map (where
its places stand on "The whole map"), optionally `mark:` a building to stand at that spot on the
Lastlands views (the Graveyard's obelisk; a town the printed map already shows needs none), and its
places in the plan's own 1000x700 grid. Each book's plans are laid out by hand in its own
`towns-<book>.js` (`TOWNS`); `maps.js` gathers them into `CITIES` under the book's code
(`CITIES['02fotw/ragadorn']`), so no two books share a plan even when they visit the same city
(Book 1's Holmgard is the whole city, Book 2's its harbour). Plans so far (2026-10-02): Book 1's
Holmgard and the Graveyard of the Ancients; Book 2's Holmgard harbour, Ragadorn, Gorn Cove and Port
Bax. How to draw one: docs/reference/map-places.md, "Drawing a town plan".

A town's fields, all optional:

| Field | What |
|---|---|
| `water` | closed outlines of the sea and harbours (smoothed); let a sea run past the frame's edge |
| `rivers` | `{w, pts}` each: a river as a broad stroke with inked banks |
| `walls` | `{pts, closed, towers, tower}` each: straight from tower to tower, a tower at every point between the ends (`towers: false` for none, `tower` its height); the first is the town wall |
| `town` | closed outlines where houses may stand (default: inside the first wall); a town in two halves (Ragadorn) gives two |
| `gates` | `[x, y, height]`: drawn as keeps; `bridges` likewise |
| `streets`, `main` | lanes as point lists, the first `main` (default 4) wider |
| `squares`, `clear` | `[x, y, r]`: paved squares, and ground kept clear without paving (a citadel's yard) |
| `quays`, `moles` | dressed stone edges; breakwaters with a tower at the end |
| `citadel` | `{x, y, h, hill}`: the castle, on a ring of engraved hills if `hill` |
| `landmarks`, `boats`, `trees`, `woods` | buildings `[kind, x, y, h]`; moored ships; single trees (an avenue); clumps `[x, y, r]` |
| `houses` | `{gap, skip, size, jitter}`: a village's sparser, looser hovels (Gorn Cove) |
| `fields` | `false` for a city with no country in view |
| `labels`, `compass`, `seed` | lettering, the compass rose, the hand's seed |

`cityCanvas` paints a town: fields and trees outside it, the rivers and the sea as dark water, the
lanes pale between inked edges, then every house as a small roof seen from above (a lit slope with
sparse strokes, a hatched one, a ridge along its lane, a soft shadow), packed on a loose grid inside
the town and off the lanes, the water, the walls, the squares and the places, and out from under
every building that stands up (each one's ground measured once from its drawing, `buildingBox` in
buildings.js), with yards and the odd tree; then the walls, and everything that stands up (the
citadel, landmarks, wall towers, gates, bridges, ships, the places' own symbols) as the engraved
buildings of `buildings.js`, back to front. The look follows the owner's sample (the town clusters
of the Sorcery! maps), kept in sepia ink.

A crypt (`kind: 'crypt'`) has `rooms` (corner points), `passages` (`{w, pts}`), `ground` (closed
outlines of open ground above), `features` (`[kind, x, y, angle, scale]`: `sarcophagus throne
serpent skulls stairs door portal portcullis pillar candle hole`, each drawn in ink), `landmarks`
and `trees` on the ground. `cityCanvas` hatches the rock, cross-hatches it close along every wall,
cuts the rooms and passages as paper with walls broken by hand and flagstones scored, scatters weeds
on the open ground, and draws the features and what stands up.

`cityClashes(id, places)` (`id` as in `CITIES`, after `maps.js` has loaded) lists, in a town, any
landmark, citadel or place symbol whose footing is on a lane, a river or the water, or that overlaps
another (gates, bridges, wall towers and boats stand there by design); in a crypt, any place left in
the rock. Every plan's is clean (2026-10-02).

On the map panel a close view (a replica or a town plan) shows the map at 1.8 times the panel's
height; when the figure and the roads open from where he stands spread wider than that shows,
`updateMap` steps the view back (`.mapinner`'s height, down to 70%) until every ring is in view.

### Buildings (`buildings.js`)

Towns and buildings on the replica are vector drawings modelled on the icons of the official Maps
of Magnamund: `castle` (Holmgard), `monastery` (the Kai Monastery), `tower`, `keep`, `house`,
`temple`, `obelisk`, `bridge` (two arches over the water, for the book's bridges and the demo's). Each is drawn in its own units (ground at y = 0) by `drawBuilding(x, kind, cx,
cy, height, seed)`, so it is crisp at any zoom. It is drawn as an engraving to match the map's
other symbols: sepia ink only, walls the colour of the map's paper with fine vertical strokes,
shaded right-hand faces cross-hatched, roofs hatched, solid ink openings, stone coursing,
battlements, cone roofs, a pennant, and every line cut twice with a slight seeded wobble. They are part
of the map, so unlike the figure they get no rim. `BUILDING` in maps.js maps the LASTLANDS kinds to them (city and walled: castle;
town: tower; fort: the monastery; village: house); Book 1's places name theirs directly. Cutting
the icons out of the map images was tried first and dropped: low resolution and stray colours.

### Map symbols: adding one

Reuse before drawing. In order:

1. **A Widman stamp** (`assets/map/widman.png`, CC0 engravings, tinted to the map's ink by
   `loadStamps`): `mountain range forest tree`. Its settlement kinds (`city town village fort
   walled bridge`) do not match the official maps' icons: use a building instead. Pick one with
   `pick(r, kind)` and draw it with `stamp(x, st, cx, cy, s, 0)`. Halo 0: map symbols get no rim.
2. **A building in `buildings.js`**: `castle monastery tower keep house temple obelisk bridge`, drawn with
   `drawBuilding(x, kind, cx, cy, height, seed)`. A book's places name one as their symbol.
3. **A Hogenburg or Donia symbol** (K. M. Alexander's CC0 packs, as Widman; owner's go-ahead
   2026-10-02). Hogenburg is for town plans: gates, towers, wall runs and corners, castles on
   hills, chapels, fountains, blocks and rows of houses. Donia is for the country maps: star forts
   from above, churches, village and town skylines (heavier ink than Widman: check it at the
   journey zoom). The whole packs are in git-ignored `data/reference/symbol-packs/` (contact sheets
   there) for choosing. To use one:
   - copy only the chosen PNGs into `assets/map/<pack>/`, with a README naming the pack, its
     source URL and its CC0 licence, as `WIDMAN-README.txt` does;
   - tone them to the map's ink as `loadStamps` does Widman's (black to sepia, no rim);
   - in a town plan, give it a footprint like a building's, so `cityCanvas` keeps houses out from
     under it and `cityClashes` keeps it off the lanes and the water;
   - check it beside the engraved art already on the map at the journey zoom and zoomed out, as
     for a new drawing (below). Widman's settlement stamps failed this check: so may these.
   In use (2026-10-02): Hogenburg's fountains, sepulchres and one monument, in
   `assets/map/hogenburg/` (`hogenburg.json` by kind), loaded and toned by `loadHogenburg` in maps.js and
   set on a plan as `symbols` (interface.md, "Town plans"). Stamp images are decoded with
   `createImageBitmap`, which works in a hidden pane where an `<img>` does not.
   No other symbol sets without the owner's word.
4. **A new vector drawing** in `buildings.js`, added to `BUILDINGS` as `{h, draw(T)}`:
   - Model it on the matching icon in the official Maps of Magnamund (sheet 1's inset,
     `data/projectaon/maps/01-detail.jpg`, is the best reference). Look at it; do not slice it.
   - Units: ground at y = 0, up is negative, about 50-110 tall; set `h` to the full height.
   - Use the kit only: `shape(pts, LIT)` for a lit face (it adds the fine vertical strokes),
     `fill` + `hatch(pts, 2.2)` for a shaded face (2.2 or less cross-hatches it), `arch` for an
     opening, `merlons`, `cone`, `flag`, `stones`. Light comes from the upper left, so shade the
     right-hand faces.
   - Keep to `INK` and `LIT`: no other colours. Draw what is behind first, so `LIT` walls hide it.
   - Check it beside the engraved trees and mountains on the map at the journey zoom and zoomed
     right out: it should not stand out as paler, cleaner or darker than they do.

Landscape that is not a building (a lake, a marsh, a wood, a brook) is drawn in place in `replicaCanvas`, in the
same ink and with hatching.

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
attack (Psi-surge's numbers from `LW.psi`: an Archmaster's are +6, 1 a round, not at 4 or less);
`item` drinks Laumspur; `cure` (an Archmaster with Curing, once a book, `LW.canCure`; the
medallion is dim above 6 Endurance) restores 20 without costing a round. A fight marked `ambush`
loses its `csMod` for a Magnakai hero with Huntmastery, and says so in the log; so does one whose
`csUnless` he meets, and a `csIf` bonus he does not meet is not given (the log names the discipline).
A foe `immune: 'mindblast'` takes Psi-surge but not Mindblast (the mind medallion reads "as
Mindblast: no effect"); `deaf(foe)` is a foe no mind attack of his can touch. Evade is shut, "too
late", once `evade.within` rounds are fought. When `B.over` is set the left page shows the outcome and a
"Turn the page" button, which calls `endBattle` to move the story on.

## Art pipeline (`plates.js`, `shared/ink.js`)

- `Ink.parchment`, `leather`, `inkScene(name, w, h)`: procedural textures and ink-wash vignettes.
- `inkPlate(img)`: takes a black-on-white illustration, upscales it, maps darkness to alpha in a
  sepia ink colour. Steps: `img.crop` (fractions) picks part of the picture; an old scan's toned
  paper is lifted to white (the brightest 5% of pixels taken as paper, lift capped at 1.6); a fine
  grey drawing has its greys deepened until the middle of its ink is at 80% strength, to sit
  beside the books' solid pen work; `frameOf` finds a ruled frame round the picture (a thin band,
  ink along at least 40% of the middle of its length, clearly darker than the strip inside it,
  within the outer 12%) and cuts inside it. No fade at the edges: the owner wants each picture
  whole, as drawn, with only its ruled frame removed (2026-10-01). Cached per URL and crop. Needs a
  same-origin image. Scaled to about 1100px wide either way.
- `drawCreature(canvas, kind, scene, t, fx, img, floor)`: draws the plate. With `img` (or an entry
  from `art/manifest.json`) it draws the whole inked illustration, fitted to 94% of the width and to
  the room between the enemy's name and the controls, and centred in that room. `floor` is where the
  controls begin, as a fraction of the canvas height: `B.fit` in main.js measures it (the top of the
  medallions and the dial), so the picture never runs under them. Without, it draws a procedural silhouette (`kraan`,
  `giak`, `vordak`) or the crossed-swords `emblem`: the crossed-swords glyph (handed over by
  `setEmblem` once main.js has fetched it) over a blot of wash, or a plain ring and blades until then.
- Which picture (`nextFoe` in main.js): the enemy's own `art` (its section's illustration, or one
  the importer borrowed from the same book), else the first entry of `assets/plates/plates.json`
  whose `match` is found in its name and whose `book`, if it has one, is the open book (`PLATES`;
  `__lw.plates` in the console), else the drawn
  sprite. Library entries are free engravings in `assets/plates/` (sources in its README.txt),
  pictures the owner supplied in git-ignored `art/` (Winged Serpent), or Project Aon
  illustrations by path under `data/projectaon/`: the same book's, often cropped to one figure
  (Book 2's portrait page), or another book's (plain human enemies only: another book's special
  creature would be seen twice, the very same creature excepted).
- The shaded bands behind the enemy's name and the controls are `::before` layers faded out at
  the sides too, so no straight edge shows over the plate.
- The fight's command medallions use glyphs too: Strike shows the weapon in hand (`itemGlyph`),
  Mindblast/Psi-surge a brain or psychic waves (lit while in use), Laumspur the potion, Curing its
  discipline's glyph, Evade a running man.
- `portraitFromArt`, `drawFrame`, `gearSVG`: Lone Wolf's ink likeness for the Kai and
  inventory panels, the page frame (also the discipline grid's frame), the clockwork.
  `drawFrame` (after the HD book): a border band with a running vine (`vine`: a wavering stem,
  curled tendrils, leaves, berries) between heavy and double rules, square corner tiles with an
  interlaced quatrefoil cut through them and flourishes, lozenges with scrolls mid-side, a diamond
  with swept leaves top and bottom. `{ vine: false }` gives the plain beaded band for small boxes.
- `drawSheet`: laid over the right page's parchment (`--sheet-art`): a faint half-drop damask, a
  darkened edge, and a slimmer vine band inside the torn edge with corner tiles and curls.
- `drawBanner` / `drawCrest`: the place's ribbon with scrolled ends (a border-image, so only its
  middle stretches) and the pointed arch of flourish above it (its own background, unstretched).
- Story illustrations are plain `<img>` with `mix-blend-mode: multiply`; full plates also get a
  soft radial mask.

## Page turn (`turn(update)`)

Clones the left page, runs `update()` underneath, then rotates the clone away about its left edge
and removes it. Also plays the page sound and turns the gear. Skipped under reduced motion.

## Sound

`shared/sfx-soft.js`: `LW.sfx(name)` with `select, roll, page, swing, hit, hurt, heal, battle,
win, lose`; `LW.drone()` starts a low drone on first pointer input. `LW.setSound(bool)` persists.

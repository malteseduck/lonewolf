# Putting a book on the map

How a book gets travel on the map: every section given a place, the places laid out on the
redrawn map with a symbol where the passage calls for one, and the whole checked section by
section. Book 1 was done this way (`places-01fftd.js`). Follow these steps for each new book;
`tools/import_projectaon.py` ends its report with the state of this work for the book it imports.

The places are **made up**. The books name few locations, so most are invented to fit what the
passage describes ("a watchtower where three paths split", "a lake with a shack"). They are named
in our own words. No book text goes into the places file, the code, the docs, commit messages
or chat (CLAUDE.md, hard rules).

## The steps

| | Step | Tool | Certain or judgement |
|---|---|---|---|
| 1 | Import the book, read the report | `tools/import_projectaon.py <book>` | certain |
| 2 | Read the book and group sections into places | `tools/reading_copy.py <book>` | judgement |
| 3 | Write `places-<book>.js`: places, symbols, anchors | by hand | judgement |
| 4 | Lay out the places that are not anchored | `node tools/layout_places.js` | mechanical |
| 5 | Wire the book into `maps.js` | by hand | mechanical |
| 6 | Check: the file, then every section on the map | `tools/check_places.py`, `tools/map_sweep.js` | both |
| 7 | Fix landmarks and symbols the sweep turns up | `maps.js`, `buildings.js` | judgement |

### 1. Import

`python tools/import_projectaon.py <book>`. Besides the usual report (docs/reference/importer.md)
it prints a "map places" block. Before step 3 it says the book has no places file and how many
sections need a place. After that it reports what is wrong with the file.

### 2. Read and group

`python tools/reading_copy.py <book>` writes `data/projectaon/<book>/reading.txt`, which is
git-ignored. It has each section as `#id -> where it leads [fight: enemy]`, then the section's
text. Read it all, and group the sections into places:

- **A place is a spot he stands at while several sections happen.** A fight, its aftermath and
  the next choice there are one place. A new place starts when the text moves him somewhere new.
- **Keep places fairly coarse.** Book 1 has about 55 places for 350 sections: a town counts as
  one place (all of Holmgard is one), and a long ride with nothing distinct along it is one.
- **Use the book's names where it gives them** (a town, a bridge, a ruin, a forest). Otherwise
  name the place by what is there, in a few words of our own.
- **Never name a place by what happens there.** "Ambush", "Wounded soldier", "Merchant caravan"
  give the story away: the name shows in the banner as he arrives, before the passage is read.
  Name what he would see on coming to the spot ("Path to the Durncrag", "Edge of the wood", "On
  the highway"), taking the direction or terrain from the choice that leads there where you can.
- Note for each place whether the passage shows a **landmark worth a symbol** (step 3).
- Every section needs a place. That includes death and ending sections: put them where they happen.

### 3. Write `places-<book>.js`

Copy the shape of `places-01fftd.js`. The checker and the layout tool read it with simple
patterns, so keep it in this form:

```js
export const PLACES = {
  key: ['Name in our words', 'symbol' or null, x, y],   // x, y in the printed map's pixels, or null, null
};
export const KNOWN = ['key', ...];                      // places the book's printed map names
export const AT = {
  key: [section, section, ...],                         // every section in exactly one place
};
```

- **Known names:** `KNOWN` lists the places named on the book's printed map. The map always shows
  their names. It shows any other place's name only once he has been there, so a road offered on
  the map says no more than the choice in the book ("turn left") does. To check a name, look at the
  printed map, or at `LASTLANDS.places` in `maps.js` for the Lastlands.

- **Symbol:** what is drawn at the place from the start, whether or not he has been there. Use
  `null` for a spot with nothing to show (a clearing, a path). The map knows `house`, `tower`,
  `keep`, `temple`, `obelisk`, `bridge`, `castle` and `monastery` (the buildings in
  `buildings.js`), and `stream`, `hill`, `tree`, `wood`, `lake` and `marsh` (drawn by `maps.js`).
  A bridge or stream away from a river gets a brook running into the nearest river by itself.
  If a place needs something none of these show, see step 7.
- **Anchors:** give real positions to the places that are on the printed map (towns, bridges,
  ruins, the start and the goal) and to the stops along a road the book follows. Read them off
  the printed map by eye, in its own pixels. Book 1 anchored about 15 of its 56 places. Leave
  every other place at `null, null`.
- The file is ours (code and our own names), so it is committed. Put a header comment on it saying
  so, as Book 1's has.
- **Legs**, for a journey across much of the map (Book 2): `export const LEGS = { key: { name, view:
  [x, y, w, h], places: [...] } }`, every place in exactly one leg and inside its view. A road
  between legs stays on the page. Keep each route within its leg short against the view's width:
  the panel shows about a third of a view across, and the sweep flags a route that does not fit.
  A place met twice in different legs (Holmgard at both ends) is two places.
- **Town plans:** a run of sections in one city's streets (Book 2's start in Holmgard's harbour)
  gets a town plan as its leg (`city: 'name'`, `at: [x, y]`, view `[0, 0, 1000, 700]`): add the
  plan to the book's own `towns-<book>.js` (interface.md, "Town plans") and give its places positions in the
  plan's own grid. How to draw one: "Drawing a town plan" below.
- **Water and land:** put sea places in water and the rest on land, as the replica reads them. In
  the page: `(await import('/maps.js')).replicaModel(img).land[y * W + x]` (1 land, 0 water) with
  `img` Book 1's printed map; Book 2's were all checked so. A town printed on the coast may read
  as water at its own spot: move the place a few pixels onto land.

### 4. Lay out the rest

`node tools/layout_places.js <book> x0 y0 x1 y1`. The box is the part of the printed map the
journey crosses, in its pixels. The tool keeps the anchors where they are and lets the
routes the story takes pull the other places together, while places that crowd push apart. It
prints the positions. Add `--write` to fill them into the file; only the `null, null` entries
change.

The result is plausible, not right: a route may wander to the wrong side of a road, or a lake may
land in the hills. Move those by hand, and fix a place in position if the next run should keep it.

### 5. Wire the book in

In `maps.js`, import the file and add a `MAPS['<book>']` entry like Book 1's:

- `replica: true` if the journey lies within the Lastlands. Book 1's printed map is read for the
  replica, so books whose travel stays there can share it.
- `view`: the part of the printed map shown, as `[x, y, w, h]` with w:h = 10:7.
- `places`, `at`, `known`: the imports.
- `trail` and `route`: the road shown as his way; `start` and `goal`: their names.

A book whose travel leaves the Lastlands needs a replica of its own printed map: a geography
object in `maps.js` like `LASTLANDS` (`KALTE`, Book 3's, is the second), registered in `GEO`, and
`replica: '<name>'` in the book's `MAPS` entry (`geoOf(id)` finds it). It holds `book` (whose
`map.png` is read), `frame`, `cover`, `places`, `roads`, `rivers`, `labels`, and either `sea`
(points in open water, for a map that colours its land) or `land` (points on land, for one that
leaves its snow white like the sea and draws its coasts as blue lines). `as` re-reads a colour
class for that map's palette (Kalte: its grey-green glacier is not forest, its pale peaks are
mountains). To read the coordinates, open the printed map and check the land mask by drawing
`analyse(img, spec).land` over it in the page. `world` and `detail` (the fan world map's terrain,
the Sommerlund inset) are the Lastlands' only.

`placeBook` in `maps.js` then gives each section its place and the book its `locations`, which
switches it to travel on the map.

### 6. Check

**The file:** `python tools/check_places.py <book>`, which the importer also runs. It reports:

- sections with no place, sections in two places, section numbers not in the book;
- places with no sections, unknown symbols, places still without a position;
- places on top of each other, a missing `KNOWN` list or one naming places that don't exist,
  and whether `maps.js` uses the file yet;
- the longest routes between places. These are not errors, but they are where to look first.

It exits non-zero when something is wrong. It can't judge whether a place fits its passage;
the sweep and your eyes do that.

**Every section, on the map:** open the player on the book, then in the browser console:

```js
const M = await import('/tools/map_sweep.js');
await M.sweep();        // every section: lists what is wrong, then puts the saves back
await M.show('121');    // one section in context, to look at; M.restore() afterwards
```

The sweep sets the game on each section with its trail faked along the shortest route from
the start, opens the map, and reports:

- a section with no place;
- the figure out of view;
- a destination ring out of view, or cut by the edge;
- a destination's name cut off.

It backs up every `lw-*` save first and restores them at the end, but only from when it starts:
a game begun just before (to open the book) stays. Switch storage writes off first
(`Storage.prototype.setItem = () => {}`) and the owner's saves are never touched. Reload the page
before playing on. Book 1 takes under a minute; a sweep run longer than the console tool allows
can be started with `.then()` and its result read later. In a hidden pane animations never end, so
the page stays "busy": finish them with `document.getAnimations()` (skip the endless ones); and
images are not decoded there, so maps do not paint until the pane is shown. The sweep can run on
the owner's own game (it clears the game's rewind history, which would not match its faked trail),
but switch storage writes off first.

Then look, by eye, at a section in each place with `show()`. Check that the symbol is there and
fits what the passage describes, and that the route from the last place looks like a sensible
walk. Book 1's look-through found:

- buildings standing in a false sea, because a printed castle's ink was read as water;
- bridges on dry land;
- streams and woods with no symbol;
- places that belonged on their river.

### 7. Landmarks and symbols

When a place needs something drawn that the map lacks:

1. **Reuse first.** Use a Widman stamp (`mountain`, `range`, `forest`, `tree`), a building from
   `buildings.js`, or a Hogenburg (town plans) or Donia (country maps) symbol, following "Map
   symbols: adding one" in docs/reference/interface.md.
2. **Otherwise draw a new vector building** in `buildings.js`, following "Map symbols: adding one"
   in docs/reference/interface.md: model it on the official map's icon, in ink only, engraved.
   Never cut symbols out of map images.
3. **Terrain the place needs** (water at a ford, a wood at a forest's edge): give the place the
   symbol (`stream`, `wood`, ...), and `maps.js` draws it on the open land around the spot.

Afterwards, run the checker and the sweep again. Commit when both are clean and the look-through
is done. Note in docs/plan.md which places are guesses worth checking in play.

## Drawing a town plan

A town plan (`TOWNS` in the book's `towns-<book>.js`; a crypt is one too) is drawn by hand on the leg's 1000x700 grid. Either it is
redrawn from a reference, or it is made up from the book.

**References.** The owner keeps the Sommerlund City Maps (Mattioli and Dever) in git-ignored
`art/reference/sommerlund-city-maps/`: Holmgard (with a larger detail of the King's Reach),
Anskaven, Toran, Tyso, Moytura, Ruanon, Silvershore and the Kai Monastery's floor plans, plus the
country and the Sommer Isles. Their sources are in `SOURCES.txt` there. They are commercial art for
personal reference, so take only the town's layout from them:

- Take the shape: the wall's outline and where its gates are, the water (coast, harbour, moles,
  rivers and where they enter), the bridges, the main avenues from the gates to the centre, the
  squares, the citadel or keep, and the few landmarks the book's text needs. Read these by eye into
  the 1000x700 grid, cropping to the part the book walks through. Holmgard's harbour is the King's
  Reach, not the whole city.
- Draw it in our own style, not theirs. Their maps are coloured bird's-eye pictures (red roofs,
  houses seen from the side). Ours stay sepia ink only, with roofs seen from above (`cityCanvas`),
  and every landmark is a `buildings.js` drawing. Never trace, cut or embed the images, or load
  them in the player.
- Names in the committed code are the books' own (the inn, the quay, the Green Sceptre), or plain
  descriptions. Do not copy the posters' street and district labels.
- What to borrow from them as practice: how dense the blocks are (houses tight along every street,
  yards inside each block), lanes that radiate from the gates to a central square, towers spaced
  evenly along the wall with round ones at the corners, fields and orchards in strips outside, and
  the roads that leave each gate towards the next town.
- Note in the plan's comment in `towns-<book>.js` which reference it follows, and what is still made up.

**Fan maps.** `art/reference/projectaon-forum-maps/` holds screenshots of fan maps from the Project
Aon forum, drawn from the books' text (sources and contents in its `SOURCES.txt`). Two are towns,
Book 2's Ragadorn and Book 5's Ikaresh, each with a numbered list of the places the book visits.
The others are a fortress, mines and sewers (Ikaya, the Maaken Mines, Barrakeesh Palace and its
sewer, the Tekaro sewers, Kazan-Oud) and Book 1's country. They are thumbnails, good for layout
only. Treat them as the fans' readings of the text: where the text and the map disagree, the text
wins. The same rules apply as for the posters: layout only, our own style, the books' names. For
the places that are not towns, use them to check how a leg's places sit, not to make a town plan.
Jog Brogzin's map of Book 1's Graveyard of the Ancients is in `art/reference/jogbrogzin/`. A later
Mattioli map of Ragadorn was funded by the same campaign: if it turns up, prefer it to the fan map.

**A town of our own** (no reference: Hammerdal, Varetta, Barrakeesh's streets and so on;
Book 2's Port Bax has a stand-in from another game in `art/reference/other-maps/`, used for its
bones only, as a fan map is):

1. **Read the town's sections** and list every spot the text names or implies, and how they relate:
   by the gate, on the quay, across the river, uphill from the market. That list is the plan's
   brief. Anything the text does not need is background.
2. **Site.** Take it from the replica and the printed map: coast, river, hill or pass. The gates go
   where the roads leave towards the neighbouring places on the book's other legs, so the town
   joins the journey.
3. **Character.** Take it from the people who built it. The references show Sommlending towns as a
   curtain wall round a polygon with round towers: Toran and Tyso irregular and radial, Moytura a
   military grid, Ruanon a double wall around a mining town. Elsewhere, follow the book's own
   illustrations of the town and its text (Vassagonia's domes and walls, Ragadorn's squalor), and
   add any building it needs to `buildings.js` first (step 7).
4. **Skeleton before houses:** water, then the wall and its gates, then two to four main streets
   from the gates to a centre (a square, a market, the citadel's precinct), then the lanes. Keep
   the `open` ground for squares and precincts. `cityCanvas` fills everything else with houses, so
   the streets alone decide how the town reads.
5. **Places last.** Put the places on the plan, and the landmarks, each on open ground: never on a
   lane, a bridge's river or the water, and not on top of another building. In the page,
   `(await import('/city.js')).cityClashes('<book>/<plan>', places)` must come back empty (load `maps.js`
   first; the places as `Object.values(MAPS['<book>/<leg>'].places)`); the houses keep
   clear of every building by themselves. Keep the panel's reach in mind (about a third of the view
   across), and run the checker and the sweep as for any leg.
6. **Say what is invented.** Mark the plan "Not surveyed" in its comment, and in docs/plan.md list
   the spots worth checking in play.

## What is automated, and why not more

Only what is certain is automated. The checks, the layout and the faked play-through are mechanical.
Deciding what counts as one place, what to call it, what it shows, and where an un-named place
sits all come from reading the passage, so they stay by hand (spec, principles 2 and 3).

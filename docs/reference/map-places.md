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

A book whose travel leaves the Lastlands (the Magnakai books) needs a replica of its own map
first. That is a bigger job, not covered here; see "Next steps" in docs/plan.md.

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

It backs up every `lw-*` save first and restores them at the end. Reload the page before playing
on. Book 1 takes under a minute.

Then look, by eye, at a section in each place with `show()`. Check that the symbol is there and
fits what the passage describes, and that the route from the last place looks like a sensible
walk. Book 1's look-through found:

- buildings standing in a false sea, because a printed castle's ink was read as water;
- bridges on dry land;
- streams and woods with no symbol;
- places that belonged on their river.

### 7. Landmarks and symbols

When a place needs something drawn that the map lacks:

1. **Reuse first.** Use a Widman stamp (`mountain`, `range`, `forest`, `tree`) or a building from
   `buildings.js`.
2. **Otherwise draw a new vector building** in `buildings.js`, following "Map symbols: adding one"
   in docs/reference/interface.md: model it on the official map's icon, in ink only, engraved.
   Never cut symbols out of map images.
3. **Terrain the place needs** (water at a ford, a wood at a forest's edge): give the place the
   symbol (`stream`, `wood`, ...), and `maps.js` draws it on the open land around the spot.

Afterwards, run the checker and the sweep again. Commit when both are clean and the look-through
is done. Note in docs/plan.md which places are guesses worth checking in play.

## What is automated, and why not more

Only what is certain is automated. The checks, the layout and the faked play-through are mechanical.
Deciding what counts as one place, what to call it, what it shows, and where an un-named place
sits all come from reading the passage, so they stay by hand (spec, principles 2 and 3).

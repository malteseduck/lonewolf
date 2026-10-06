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
| `title` | `titleLeftHTML`: the mark (LONE, wolf's head, WOLF), the portrait as frontispiece (none without it), a motto, and the series as two rows of numeral medallions in scrollwork, lit where the open adventure has a save for that book, dim where not downloaded (`SERIES_TITLES`); a numeral begins or continues that book in the open adventure | `titleRightHTML`, one of two views on the bronze-framed plaques (medallion and a rod off to the clockwork). `adventuresHTML`: "Your adventures", one plaque per adventure (its numeral, the book last open, rank and section, or "Fell at"; an adventure given a name shows the name above, and the book in the line under it); the plaque resumes it (a fallen one opens its books instead), with "books | rename | backup | restore | forget" under it: "rename" (a box, Enter keeps the name, an empty one clears it, Escape leaves it), "backup", "restore" (asks before replacing it; see Storage in architecture.md) and "forget" (asks first); last, "A new adventure", with "restore" under it (a backup file comes back as a new adventure). `shelfHTML` (`shelf` true): that adventure's books, continue (with the saved section) / the story so far / start over / new character, and "all adventures" in the heading, which carries the adventure's name or "Adventure II" |
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
  or the list of choices.
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

Header on every panel: the book's title on a ribbon (or
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
- **pack** (`packHTML`), after the HD equipment sheet: in `.kit`, his full-length figure
  faint behind a paper doll of slots: the helmet between two shoulder slots, the two weapons either
  side of the chainmail (a mastered weapon is lit), two belt slots below; the first four other
  Special Items fill the shoulder and belt slots, the rest a row of five rings (more in fives) under
  a scrolled rule (`flourish`); empty slots are bare rings. The figure is `dollURL` (see "Lone Wolf's figure" below). Then a ruled "Backpack" heading, a knapsack medallion beside eight dark square tiles (one per Meal or
  item) under the HD sheet's ironwork (`packLattice`: a curl in each tile's corners, diamond studs
  where they meet, a double frame, a scroll off each corner); a ledger (gold -/+, "Add an item by hand"); and the caption with Drink / Drop / Eat. The
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
- **map**: the book's printed map, repainted by `printedCanvas`, draggable (`.mapview.scrolly`).
  A book without one (`book.map` unset) says so. Every choice is made on the story page.

The book's printed map is loaded once per book by `printedMap()`, which returns null until the
image has arrived and redraws the panel when it does. It is shown at 130% of the panel width: the
source is about 1000 px wide, and more zoom only blurs it.

## The printed map (`maps.js`)

`printedCanvas(img, crop, w, h)` repaints a book's printed map as sepia ink: lightness becomes ink
depth, water is pushed darker, strong red survives faintly, then parchment grain is multiplied
over it. `scanOf` (main.js) keeps one painting per image.

The player once drew its own maps (replicas of the printed maps stamped with engraved symbols,
made-up places per section, town plans, travel on the map). The owner dropped them on 2026-10-05;
the code is in git history before that date, and the symbols it used are kept in git-ignored
`art/reference/map-symbols/from-game/`.

### Lone Wolf's figure (`dollURL`)

Shown faint behind the inventory's slots. The picture comes from `art/manifest.json` `hero`:
either a file already cut out, or `{src, crop}`, in which case `heroFromArt(img, crop, outline,
bare)` (plates.js) cuts the figure out of its plain, smoky ground at load: a flood fill in from the
crop's edges through mid-toned greyish pixels close to their neighbour; a smooth colour surface
fitted to that ground then keys out anything near it. An optional `outline` (a polygon traced by
hand in crop pixels) overrides both: inside it is figure, outside ground, and only a 10 px band
along it is left to the keying. Without an outline, the largest piece left is kept. Then it tones
it sepia; `bare` leaves off the pointer and cuts above the feet. The owner's current picture is the
full-length Lone Wolf from a Lone Wolf HD store screenshot (in git-ignored `art/`). Without one,
nothing shows: the owner asked for no stand-in drawing (2026-10-03).

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
  paper is lifted to white (the brightest 5% of pixels taken as paper, lift capped at 1.6); tones
  from 75 down to 225 become ink, or the plate entry's own `levels` [black, white] (for a painting,
  whose mid-tones would otherwise all turn solid; such a picture is not deepened); a fine
  grey drawing has its greys deepened until the middle of its ink is at 80% strength, to sit
  beside the books' solid pen work; `frameOf` finds a ruled frame round the picture (a thin band,
  ink along at least 40% of the middle of its length, clearly darker than the strip inside it,
  within the outer 12%) and cuts inside it. No fade at the edges: the owner wants each picture
  whole, as drawn, with only its ruled frame removed (2026-10-01). Cached per URL, crop and levels. Needs a
  same-origin image. Scaled to about 1100px wide either way.
- `drawCreature(canvas, kind, scene, t, fx, img, floor)`: draws the plate. With `img` (or an entry
  from `art/manifest.json`) it draws the whole inked illustration, fitted to 94% of the width and to
  the room between the enemy's name and the controls, and centred in that room. `floor` is where the
  controls begin, as a fraction of the canvas height: `B.fit` in main.js measures it (the top of the
  medallions and the dial), so the picture never runs under them. Without, it draws a procedural silhouette (`kraan`,
  `giak`, `vordak`) or the crossed-swords `emblem`: the crossed-swords glyph (handed over by
  `setEmblem` once main.js has fetched it) over a blot of wash, or a plain ring and blades until then.
- Which picture (`nextFoe` in main.js): a library entry marked `over` (the owner preferred another
  picture to the book's own; Book 1's Vordak), else the enemy's own `art` (its section's
  illustration, or one the importer borrowed from the same book), else the first entry of `assets/plates/plates.json`
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

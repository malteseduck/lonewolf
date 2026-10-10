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
                      return medallion. The player has no sound
  .stage > .book#book > .spread
      .edges.l                    the stacked edges of the pages beneath, at the far left
      section#pl.page.left        the story page (ornate frame via ::before; via ::after, the shade into the
                                  gutter and the fold's 1px line, so a page turn's copies carry the fold)
      .rightwrap
          #rtabs                  three tab medallions (TAB_ART: wolf head, chest, compass rose), then a smaller
                                  return-arrow medallion (data-home) back to the title page; on the page's
                                  outer edge; hidden outside story mode
          section#pr.page.right   the panel: the same parchment and frame, mirrored
      .edges.r                    the left stack mirrored, at the far right
```

The two pages are equal columns (`1em 1fr 1fr 1em`). The right page's padding is a little tighter
than the story's (it sits closer to the frame) because the panels need the room.

`--bw` is the book's width; `.book { font-size: calc(var(--bw) / 59) }` and everything inside is
in `em`, so the spread scales as one piece. Below 760px wide the spread stacks into one column.

Design tokens (colours, the three font roles) are CSS custom properties on `:root` at the top of
`index.html`. Fonts: Charm (script body), Metamorphous (titles, numerals, labels), Almendra
Display (loaded, currently unused for the title). All from Google Fonts.

Textures are generated at start-up in `main.js` and set as CSS variables: `--parch-l`,
`--parch-r` (the same paper, mirrored), `--frame`, `--wood`.

## Modes

| `mode` | Left page | Right page |
|---|---|---|
| `title` | `titleLeftHTML`: the mark (LONE, wolf's head, WOLF), the portrait as frontispiece (none without it), a motto, and the series as two rows of numeral medallions in scrollwork, lit where the open adventure has a save for that book, dim where not downloaded (`SERIES_TITLES`); a numeral begins or continues that book in the open adventure | `titleRightHTML`, one of two views on the bronze-framed plaques (medallion and a rod off to the clockwork). `adventuresHTML`: "Your adventures", one plaque per adventure (its numeral, the book last open, rank and section, or "Fell at"; an adventure given a name shows the name above, and the book in the line under it); the plaque resumes it (a fallen one opens its books instead), with "books | rename | backup | restore | forget" under it: "rename" (a box, Enter keeps the name, an empty one clears it, Escape leaves it), "backup", "restore" (asks before replacing it; see Storage in architecture.md) and "forget" (asks first); last, "A new adventure", with "restore" under it (a backup file comes back as a new adventure). `shelfHTML` (`shelf` true): that adventure's books, continue (with the saved section) / the story so far / start over / new character, and "all adventures" in the heading, which carries the adventure's name or "Adventure II" |
| `setup` (setting out: `SU`, before a new character's book; the save is cleared only on "Begin") | `setupLeftHTML`. Step `hero`: the two scores on Random Number medallions, touched to spin ("10 + 7 = 17" under each; a carried character's show his as bronze medallions), then a framed row of empty rings, one per discipline to choose, filling with the chosen (touch one to let it go), and a second row for Weaponmastery's weapons when asked. Step `kit`: the gold as a bronze medallion like the section number's ("?" until touched, then its face shuffles and settles on the total) (and the Monastery's gold with − / +), "The Kai give you" as `.finds`, the clothing worn, and a row of rings for "Take up to N". Under both: what is still missing, the Begin seal ("On to your equipment" where the book has a kit), "choose for me", "back to the books" | `setupRightHTML`: rows (`.suitem`), each a medallion with its icon, the name and what it does, touched to choose it or let it go; dimmed when the share is full. Step `hero`: the series' disciplines, then Weaponmastery's weapons. Step `kit`: the book's choices (a count on the medallion for several), his weapons (kept or left behind), and Special Items carried or at the Monastery. The rules are `LW.HeroSetup` / `LW.KitSetup` (rules-engine.md) |
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
left. The gauges sit on the page's top frame band, left of the tab medallions, so they cost the
panel no height. `updateBattle` redraws the gauges each round.

Touching a medallion (`data-sel`) sets `sel`, and `placeTip()` opens a box (`.caption.tip`) over
the page beside it: below it, or above when the page runs out, with a lozenge pointing back at it
(`--ax`). It holds what `captionHTML()` says, buttons included. A touch anywhere outside the box,
on the same medallion again, or Escape closes it; touching another medallion moves it.

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
  - The box explains the touched discipline, and says when it is not learned.
- **pack** (`packHTML`), after the HD equipment sheet: in `.kit`, his full-length figure
  faint behind a paper doll of slots: the helmet between two shoulder slots, the two weapons either
  side of the chainmail (a mastered weapon is lit), two belt slots below; the first four other
  Special Items fill the shoulder and belt slots, the rest a row of five rings (more in fives) under
  a scrolled rule (`flourish`); empty slots are bare rings. The figure is `dollURL` (see "Lone Wolf's figure" below). Then a ruled "Backpack" heading, a knapsack medallion beside eight dark square tiles (one per Meal or
  item) under the HD sheet's ironwork (`packLattice`: a curl in each tile's corners, diamond studs
  where they meet, a double frame, a scroll off each corner); a ledger (gold -/+, "Add an item by hand"); and, when anything is kept at the Kai Monastery
  (`hero.stored`, `hero.storedGold`), a line (`.kept`) saying what. A touched item's box has
  Drink / Drop / Eat; the Quiver's counts its Arrows, with -/+ (`adjust('arrows')`). With
  the Backpack lost (`hero.noPack`) its heading says so. The box gives a book item's `about`;
  anything with `heal` can be drunk (the potion) or eaten (Laumspur herb). Icons: `ITEM_GLYPH` for the
  standard items, else the item's own `glyph` from its book's item table, else a pouch or pendant
  by kind; gold and a found Backpack have their own.
  "Add an item by hand" (`adding`) swaps the worn kit for `pickerHTML()`: rows of small medallions
  (weapons, Backpack Items, Special Items, and folded under "View Special Items from Past Books" the
  Special Items of earlier books' item tables) that add on a touch and stay open, with "+" medallions
  for something else, which ask for a name on an inked line (`naming`; Enter adds, Escape cancels).
  A typed name that is a known item's (`knownItem`: "Sommerswerd") adds that item, with its kind and
  powers; any other becomes a plain Backpack or Special Item of that name.
  The picker takes exactly the doll's space and scrolls within it (overriding the fixed height
  `shared/shared.css` gives `.picker`), so the Backpack below does not move; its row labels are one
  width, wrapping when long, top-aligned. The picker's own line names whatever is under the pointer.
  Item glyphs are game-icons.net SVGs (`ITEM_GLYPH`); items typed in by hand get a pouch or a
  pendant by their kind.
- **map**: not a panel. Its tab medallion opens `openMap()`'s modal over the whole window (see "The map modal"
  below); the right page stays as it was. A book without a map (`book.map` unset) gets the same modal
  saying "This book has no map." Every choice is made on the story page.

## The map modal (`openMap` in main.js, `.mapmodal` in index.html)

A dimmed backdrop and a `.mapframe` of the left page's parchment (`--parch-l`) with the vine frame over
it (`drawFrame`, drawn for the frame's own size so its band is never stretched, thinner on a phone:
`--inset` is the band's width). The map is cut into the frame (`.mapview`, dark leather ground, the old
vignette) and the close and +/- controls are the bronze medallions (`.med`). Escape, a click on the
backdrop, or the close medallion close it; `+` and `-` also zoom.

The map is `scanOf`'s canvas (painted once per image, not repainted for the modal), laid out in image
pixels and moved by one CSS transform `translate(tx, ty) scale(s)`. `s0` is the scale at which the whole
map fits the view: it opens there, with the leather ground round it, and it is the least allowed. The
most is 3 x `s0` (`MAP_ZOOM`, owner 2026-10-06: enough for the smallest labels of a 4K map). The pan is
clamped so no edge comes inside the view, and the map is centred on an axis where it is smaller. Drag (pointer events, so mouse, pen and touch), wheel (toward the cursor; a
trackpad pinch arrives as ctrl+wheel), two-finger pinch (toward the midpoint, which also pans), and the
+/- medallions (toward the centre). On window resize the frame is redrawn and `s0` recomputed, keeping
the centre and the zoom over fit. `printedMap()` loads the image once and starts an open modal when
it arrives.

## The printed map (`maps.js`)

`printedCanvas(img, crop, w, h)` repaints a book's printed map as sepia ink: lightness becomes ink
depth, water is pushed darker, strong red survives faintly, then parchment grain is multiplied
over it. `scanOf` (main.js) keeps one painting per image, at twice the image's size for sharp ink
but no wider than 4096 px (`SCAN_MAX`): a 4K map doubled is past the iPad's canvas limit. The image
is `map-4k.webp` once a book's map is upscaled (`docs/reference/map-upscale.md`), else `map.png`;
the sepia repaint applies to both (owner, 2026-10-07).

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
- `inkPlate(img, keep = true)`: (`keep: false` skips its cache, for the picture sheet's live preview) takes a black-on-white illustration, upscales it, maps darkness to alpha in a
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
  pictures the owner supplied or that were found by search and are not free, in git-ignored `art/`
  (Winged Serpent; sources of found ones in `art/plates/SOURCES.txt`), or Project Aon
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
- `drawBanner` / `drawCrest`: the place's ribbon with scrolled ends (a border-image, so only its
  middle stretches) and the pointed arch of flourish above it (its own background, unstretched).
- Story illustrations are plain `<img>` with `mix-blend-mode: multiply`; full plates also get a
  soft radial mask.

## Page turn (`turn(update)`)

A leaf (`.leaf`) is laid over the right page: its front a copy of the old right page, its back a
copy of the new left page (taken after `update()`), and a copy of the old left page lies under it
on the left. The leaf rotates 0 to -180deg about the spine (900ms), a shade deepening on each face
as it stands upright, then all three copies are removed. Copies lose their ids. Also turns the
gear. Stacked (under 760px wide) the story page is only cloned and lifted away about its left edge;
under reduced motion the change is immediate.


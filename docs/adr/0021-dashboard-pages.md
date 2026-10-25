# 0021. The dashboard's pages: the map's burnt parchment, its sheets opened inside it, item and icon sheets that pick icons

- Status: Accepted
- Date: 2026-10-11
- Amended: 2026-10-25

## Context

The import dashboard, the fight-picture sheet and the map editor were dark brown panels. The owner
asked for them to feel more like the burnt parchment the map is shown on. A first pass made each
panel a scorched sheet on the player's leather table; the owner wanted the background itself to be
the parchment with burnt edges.

Each item's icon is a game-icons.net glyph named in its item table (`glyph`) or, for the engine's
own items, in the code. Choosing one meant guessing names for `tools/fetch_icons.py` and editing
the table by hand, without seeing the icons side by side. The owner asked for a sheet like the
picture and illustration sheets (2026-10-17). The same day the owner asked for the player's other
icons (disciplines, tabs, fight medallions and the like) to be reviewed and changed the same way;
they span the books, so they are not a book step.

## Decision

- **The look.** The dashboard and the sheets are one sheet of the player's own parchment
  (`shared/ink.js`) filling the window, its edges charred and ragged all round the window, in ink:
  ink text, blood-red rubrics and selection, buttons inked on the paper. Panels on it are ruled
  boxes, a shade lighter. What floats over it (dialogs, the toast) is a loose sheet with scorched
  edges of its own. The fight cards are not: they are the book's plain tan, the paper the fight panel
  draws the picture on, so the owner sees a picture as it will look in play. The job log stays a dark
  console. The map editor's bars and side panels are parchment too, without the charred rim; its
  canvas and bright label colours stay as they were, so the labels read over any map.
- **Sheets open inside the dashboard.** The picture sheet, the illustration sheet, the item sheet and
  the map editor open only inside the dashboard, on plain parchment (the charred rim is the
  dashboard's). At their own addresses they show only a line pointing to the dashboard; there are no
  links to open them on their own, and agents do not open them there.
- **The dashboard's layout.** The window holds a bar, a rail of books and the work area, and only the
  panes inside scroll. The bar has the whole-project tools as buttons (Check everything, Player icons,
  Picture sources, Lone Wolf, Setup as a popover, Release). The rail lists the downloaded books under
  their series, each with its steps as small seals; the books not downloaded are folded under it. The
  picked book's steps are a row of tabs under the checklist's groups, one step shown at a time ("All
  steps" shows the list). Each sheet opens inside the step it belongs to (the picture sheet in Fights,
  the item sheet in Item table, the illustration sheet in Illustrations, the map editor in Map), the
  step shrunk to a bar over it and the rail to the books' numbers; one that spans the books (the icon
  sheet, picture sources, Lone Wolf's pictures) takes the work area alone. A sheet stays open while
  another step or book is looked at, and the book's head offers the way back to it. The grid of every
  book is "All books"; a cell opens that book at that step. Where the owner is stays in the address,
  and the keys move between books and steps.
- **The item sheet.** "Open item sheet" at step 5 (Item table) opens `tools/admin/items.html`: the
  book's own items, then the ones from elsewhere its sections name (the engine's, another book's),
  each with its icon as the inventory draws it and large, its fields, its `about`, the sections that
  offer, give, take or test it, the other books that have it, and the items sharing its icon. A card
  with its kind's default icon is marked.
- Change icon... picks from the icons in `assets/icons/` or from the whole game-icons.net set (its
  list and previews kept in git-ignored `data/reference/game-icons/`). Picking one from the source is
  the owner's go-ahead for that download: it is saved in `assets/icons/` with its square removed and
  credited under its author in `assets/icons/README.txt`, as `fetch_icons.py` does.
- The change is written where the glyph is named: the item's entry in its book's table, or, for the
  engine's own items, `itemglyphs.js`, which every book shares.
- **The icon sheet.** "Player icons" in the dashboard's bar (not a book step: it is the same
  in every book) opens `tools/admin/icons.html`: every icon the player draws other than a book's own
  items, grouped by where it shows (the disciplines by series, the title and panels, the gauges and
  inventory, the fights, an item's default by kind, the engine's items), each where it is drawn, as a
  medallion and large, with what else uses it. Change icon... is the item sheet's picker, with the
  same go-ahead for a download.
- Those icons are named in one file, `glyphs.js`, one entry for each place an icon is drawn (the
  wolf's head on the title and on the crest are separate entries), so each can be changed alone. The
  sheet changes an entry already there; a new place to draw an icon is added in the code.

## Consequences

- `tools/admin/parchment.js` draws the parchment (its own edges cut off) into `--parch` and adds the
  `#burn` SVG filter; `admin.css` draws the rim (`body::before`, made ragged by `#burn`, and
  `body::after`, the scorch reaching in) over the page without taking clicks, and each loose sheet
  burns its edges in CSS (`--scorch`, reach `--burn`). A new panel takes the panel rule in
  `admin.css`; a new floating sheet the `sheet` class. Colours come from the custom properties at the
  top of `admin.css`, not new hard-coded ones.
- The picker is one module (`iconpicker.js`, `icons.css`) for both sheets.
- Icons fetched and then left unused stay in `assets/icons/` until removed by hand. An engine item's
  icon changes in every book at once; the sheet says so before saving.

## Changes

- 2026-10-11: the page itself is the burnt parchment, charred round the window, instead of the
  leather table with a scorched sheet per panel; the owner asked for the background to be it.
- 2026-10-11: fight cards back to the book's plain tan, to judge a picture as it will look.
- 2026-10-11: the picture sheet and map editor open only inside the dashboard, without a rim of their own.
- 2026-10-17: the item sheet added (was 0042), merged into this record.
- 2026-10-17: the icon sheet added for the player's other icons, named in `glyphs.js`; the owner asked
  for them to be reviewed and changed as the items' are.
- 2026-10-25: the dashboard laid out as a rail of books and one book's steps as tabs, each sheet inside its
  step, instead of the grid with the book and the sheet below it; the owner found too much scrolling
  between books and steps at the width they work at.

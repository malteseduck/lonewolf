# 0021. The tool pages are the map's burnt parchment, charred round the window

- Status: Accepted
- Date: 2026-10-11
- Amended: 2026-10-11

## Context

The import dashboard, the fight-picture sheet and the map editor were dark brown panels. The owner
asked for them to feel more like the burnt parchment the map is shown on. A first pass made each
panel a scorched sheet on the player's leather table; the owner wanted the background itself to be
the parchment with burnt edges.

## Decision

The dashboard and the fight-picture sheet are one sheet of the player's own parchment
(`shared/ink.js`) filling the window, its edges charred and ragged all round the window, in ink:
ink text, blood-red rubrics and selection, buttons inked on the paper. Panels on it are ruled
boxes, a shade lighter. What floats over it (dialogs, the toast) is a loose sheet with scorched
edges of its own. The fight cards are not: they are the book's plain tan, the paper the fight panel
draws the picture on, so the owner sees a picture as it will look in play. The job log stays a dark console. The map editor's bars and side
panels are parchment too, without the charred rim (it sits inside the dashboard); its canvas and
bright label colours stay as they were, so the labels read over any map.

The picture sheet and the map editor open only inside the dashboard, under its grid, on plain
parchment (the charred rim is the dashboard's). At their own addresses they show only a line pointing to
the dashboard; there are no links to open them on their own, and agents do not open them there.

## Consequences

`tools/admin/parchment.js` draws the parchment (its own edges cut off) into `--parch` and adds the
`#burn` SVG filter; `admin.css` draws the rim (`body::before`, made ragged by `#burn`, and
`body::after`, the scorch reaching in) over the page without taking clicks, and each loose sheet
burns its edges in CSS (`--scorch`, reach `--burn`). A new panel takes the panel rule in
`admin.css`; a new floating sheet the `sheet` class. Colours come from the custom properties at the
top of `admin.css`, not new hard-coded ones.

## Changes

- 2026-10-11: the page itself is the burnt parchment, charred round the window, instead of the
  leather table with a scorched sheet per panel; the owner asked for the background to be it.
- 2026-10-11: fight cards back to the book's plain tan, to judge a picture as it will look.
- 2026-10-11: the picture sheet and map editor open only inside the dashboard, without a rim of their own.

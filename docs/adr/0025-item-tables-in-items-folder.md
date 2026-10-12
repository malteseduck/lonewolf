# 0025. The item tables live in `items/`

- Status: Accepted
- Date: 2026-10-11

## Context

The project root held 28 files, twelve of them the books' item tables (`items-<code>.js`). The owner
wanted the root kept clean and organized. Some files cannot leave it: `index.html` is the page,
`sw.js` controls only pages in its own folder and below, and npm, Vitest and pytest look for their
configuration there. The player's own modules (`main.js`, `plates.js`, `maps.js`, `platepick.js`,
`adventures.js`) stay beside `index.html` as the player.

## Decision

- Each book's item table is `items/items-<code>.js`. The file name is unchanged; only the folder is new.
- The root holds the page, the service worker, the player's modules, and the files tools need at the
  root (configuration, the agents' and readers' notes).

## Consequences

- `main.js` imports the tables from `./items/`; `check_items.mjs`, `book_status.py`, `check_all.py`
  and `reimport_all.py` look for them there, and their tests write stand-in tables there.
- A new book's table goes in `items/` (docs/reference/items.md).

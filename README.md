# Lone Wolf player

A personal-use player for the Lone Wolf gamebooks: a flat book after *Lone Wolf HD Remastered*.
Framed story page on the left, a panel on the right (Kai Disciplines, inventory, map, combat).
Combat is on the page with medallion controls. No build step. Serve the folder and open it:

    python tools/serve.py

then go to http://localhost:8765/. It must be served, not opened as a file: `main.js` is an ES module.
`tools/serve.py` is `python -m http.server 8765 --bind 127.0.0.1` plus somewhere to keep backups:
an adventure's "backup" writes `backups/<name>.<date>.json`, and "restore" lists them. Served any
other way, backups are downloaded instead. `--bind 0.0.0.0` serves it to other devices at home.

| | |
|---|---|
| `index.html`, `main.js`, `plates.js`, `maps.js` | The player. Markup and CSS, the game loop and rendering, the ink art, the maps |
| `art/` | Optional enemy illustrations. List them in `art/manifest.json` to replace the drawn ones |
| `shared/` | Rules and widgets, see below |
| `tools/` | Downloader and importer for the Project Aon editions |
| `docs/` | Spec, plan and reference |
| `prototypes/` | Three earlier looks that were not taken further (open book, map journey, 3D). They still run |

In `shared/`:

- `core.js`: rules (Combat Results Table, disciplines, inventory limits, meals, healing) and the book runner with save and rewind
- `rules-series.js`: what differs between the Kai and Magnakai series
- `book-demo.js`: the demo chapter, 20 sections, in the data format the importer targets (prototypes only)
- `ui.js`, `sfx-soft.js`, `shared.css`: Random Number Table, character creation, Action Chart, sound
- `ink.js`: procedural parchment, leather and ink-wash scenes
- `battle.js`, `art.js`, `flow.js`: used by prototypes A and B only

## Playing the real books

Project Aon's editions may be downloaded for personal use but not redistributed, so they are fetched
onto this machine and kept out of version control (`data/projectaon/` is git-ignored).

    python tools/fetch_projectaon.py 01fftd     # section pages, illustrations, map
    python tools/import_projectaon.py 01fftd    # writes data/projectaon/01fftd/book.js

The title page then offers the book. The importer reads choices, discipline gates,
Random Number ranges, combat stat lines, evasion, Mindblast immunity, Combat Skill adjustments, forced
Meals and dead ends. Item pick-ups, gold and other special rules stay as text: apply them with the
by-hand controls on the inventory and Kai panels.

### Series rules and carrying a character on

`shared/rules-series.js` holds what differs between series: the Kai and Magnakai discipline lists,
ranks, Lore-circle bonuses, Weaponmastery, Psi-surge, and which discipline heals or hunts. Each
imported book names its series. Finishing a real book saves the character; the next book you start
begins with that character (scores, disciplines, weapons, pack, gold) plus the new discipline it has
earned. "new character" on the title page rolls a fresh one instead.

Several games can run at once: each adventure on the title page has its own saves and its own
Lone Wolf. Saves live in the browser, so each device and browser keeps its own.

The Magnakai numbers were written from memory. Check them against the books' rules pages.
Bow shots, Arrows and each book's starting kit are still applied by hand.

## About the text

The demo prose is placeholder text written for this project. Project Aon's licence forbids
redistributing their editions, so the real books cannot be checked into this project or hosted.
The way round it is the importer above, run on the owner's own machine, which converts Project
Aon's book files into the `book-demo.js` shape.

## State of the work

See `docs/plan.md` for what is done, what is untested and what comes next.

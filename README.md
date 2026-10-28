# Lone Wolf player

A personal-use player for the Lone Wolf gamebooks (Kai, Magnakai and Grand Master), styled after
*Lone Wolf HD Remastered*: one open book that is the whole interface, the story on the left and the
hero, inventory, map or fight on the right. Plain HTML, CSS and JavaScript, no build step. It is
played mainly on an iPad, offline, and on the PC.

It is a game I have wanted to build since high school, and I really just made it for me. The repository is
public as an example of spec-driven development (`docs/spec.md`, the decisions in `docs/adr/`) and of
the harness that brings each book in; it holds no licensed content.

**See it:** the [showcase](docs/showcase/README.md) walks through the player, the import dashboard
and the map pipeline in screenshots (all from a made-up demo book, no licensed content), and the
[slide deck](https://claude.ai/artifact/DD9UiF2WCQtGyZ7HRHFsCj) tells the same story.

![A story page](docs/showcase/images/05-story.jpg)

## Run it

Every Python run goes through [uv](https://docs.astral.sh/uv/). On a fresh checkout:

    uv run --no-project python tools/setup.py install all

then serve the folder and open http://localhost:8766/:

    uv run --project tools python tools/serve.py

It must be served, not opened as a file (`main.js` is an ES module). `tools/serve.py` also keeps an
adventure's backups in `backups/` and runs the import dashboard, http://localhost:8766/tools/admin/
(this PC only).

To play from the iPad at home, serve it on the network (`... tools/serve.py 8766 --bind 0.0.0.0`)
and open `http://<this PC's address>:8766/`. That plain-HTTP server keeps no offline copy; to play
offline and sync with the PC when in reach, see `docs/reference/offline.md`.

## The real books

Project Aon's editions may be downloaded for personal use but not redistributed, so they are
fetched onto this machine and kept out of git (`data/projectaon/` is git-ignored):

    uv run --project tools python tools/fetch_projectaon.py 01fftd
    uv run --project tools python tools/import_projectaon.py 01fftd

The importer reads choices, discipline and item gates, Random Number ranges, combats and their
rules; what it cannot read with certainty stays as text, with by-hand controls on the page. What
each section gives, takes or needs is read by hand into the book's item table (`items/`). Each
book goes through nine steps, which the dashboard tracks (`docs/book-checklist.md`).

What we make about a book is committed; the book is not (ADR 0042): item tables, map label lists,
fight-picture choices and our own descriptions of its pictures and enemies are in git, its text,
pictures and anything made from them are not.

A made-up demo book, *The Ember Road* (`demo/99ember/`), is committed and plays like an imported
one, on the PC only (ruling R20).

## Where things are

| | |
|---|---|
| `index.html`, `main.js`, `plates.js`, `maps.js`, `platepick.js`, `adventures.js`, `glyphs.js`, `itemglyphs.js`, `sw.js` | The player |
| `shared/` | The rules engine (`core.js`, `rules-series.js`), its widgets and the ink scenes |
| `items/`, `maps/`, `about/` | Our work about each book: item tables, map label lists, descriptions |
| `assets/` | Fonts, icons, the app icon and the fight-picture library, all free to redistribute |
| `art/` | Git-ignored: borrowed pictures for personal use; `art/sources.json` says where each came from |
| `demo/` | The demo book |
| `tools/` | Downloader, importer, checkers, server, dashboard and map pipeline (a uv project) |
| `tests/` | Vitest (`npm test`) and pytest (`uv run --project tools python -m pytest`) |
| `docs/` | The spec, the decisions (`adr/`), the reference, the plan and the showcase |

Start with `docs/spec.md`, `docs/adr/README.md` and `docs/plan.md`. `AGENTS.md` holds the rules for
working on the code, how to run and test it, and how the docs are kept true; `tools/`, `items/`,
`maps/` and `assets/plates/` have their own for work inside them
(`tools/docs_check.py`, the `repo-maintenance` skill in `.claude/skills/`). How all of it fits
together, and why, is in `docs/reference/harness.md`.

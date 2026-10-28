# 0046. What the public sees uses stand-in content: the showcase, and a made-up demo book that plays on the PC

- Status: Accepted
- Date: 2026-10-24
- Amended: 2026-10-27

## Context

The project is shown in public as an example of spec-driven development and of its harness
(ADR 0042), but no Project Aon text, art or maps may be in the repository. A showcase made from the
real books could not be published (2026-10-24). The owner wanted the showcase to use content written
for it, and then for that stand-in book to be real: importable and playable like any book, so the
whole pipeline can be shown on a fresh checkout with no licensed content (2026-10-24). These were two
rulings (R19, R20) on one topic; the owner asked for them as one record (2026-10-27).

## Decision

- **The public showcase shows only stand-in content.** `docs/showcase/` and the public deck use a
  stand-in book written for them, the owner's own art, public-domain engravings and made-up maps, and
  say "representative screens only, to keep licensed content out". The real books' text, art and
  maps appear only in the private deck.
- **A made-up demo book, `99ember` (*The Ember Road*), is committed in `demo/99ember/`** and works
  like any imported book, but only on the PC. Its source is Project Aon's page layout in text of our
  own, public-domain engravings and a made-up map. `tools/demo_book.py` (run by `serve.py`) installs
  it into `data/projectaon/`, so the importer, dashboard and map editor treat it as any book.
- It shows as a "Demo" link on the title page only where its `book.js` exists, and is kept out of
  the release, the offline copy, the iPad, the checklist, `check_all` and `reimport_all`.
- It changes no engine rule: it uses the engine and the item-table fields as they are. Its item table
  lives with it, `demo/99ember/items.js`.

## Consequences

- `docs/showcase/README.md` says the screens are representative; `docs/showcase/gemini-prompts.md`
  records how its pictures and map were made.
- `tools/demo_book.py`, `tools/serve.py`, `tools/book_status.py`, `tools/check_items.mjs`,
  `tools/import_projectaon.py`, `tools/admin/admin.js` and `main.js` know the demo book; its tests are
  `tests/py/test_demo_book.py` and `tests/js/demo-book.test.js`.
- Rulings R19 and R20 point here.

## Changes

- 2026-10-27: rulings R19 (the showcase) and R20 (the demo book) merged into this record (owner).

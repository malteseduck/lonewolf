# Decision records

One file per decision the owner has made, each giving the current answer for its topic, so that no
agent undoes it by accident. `docs/spec.md`
says what the project is for and the rules it follows; these say what was chosen where there was a
choice, and why. Read this index before changing behaviour, art, or a tool's output.

## Rules

- **An accepted ADR is binding.** Do not reverse or work around one without the owner's say-so in
  chat. If a task seems to need it, stop and ask.
- **When the owner decides something, record it in the same piece of work.** Change
  `docs/spec.md` too only when the intent itself changes.
  - **A refinement or extension of an existing decision amends that ADR in place**: rewrite its
    Decision and Consequences to the current answer, add what prompted it to Context, set
    `Amended:` to the date, add a dated line to its Changes list, and update the index row. One
    topic, one file: an agent reading it gets the whole current answer. Git keeps the old wording.
  - **A new topic gets a new ADR**: the next number, `NNNN-short-title.md`, from `template.md`,
    and a row in the table below.
  - **A decision reversed outright gets a new ADR** that says `Supersedes: NNNN`; the old one's
    Status becomes `Superseded by NNNN`, with a one-line reason, and is otherwise left as it was.
- Numbers are never reused. A record that was merged into another is deleted and its number left
  as a gap (0015 and 0017 went into 0006 and 0005 on 2026-10-10).
- Write in our own words. No book text, as everywhere (AGENTS.md).
- ADRs 0002-0014 and 0016 were written on 2026-10-10 from decisions already recorded in `docs/plan.md`,
  `AGENTS.md` and `docs/reference/`; their dates are when the owner made them.

## Index

| # | Decision | Date | Status |
|---|---|---|---|
| [0001](0001-record-decisions-as-adrs.md) | Record the owner's decisions as ADRs | 2026-10-10 | Accepted |
| [0002](0002-the-tome-direction.md) | The Tome (prototype D) is the player; A-C rejected | 2026-09-30 | Accepted |
| [0003](0003-flat-pages-no-3d.md) | Flat pages, no 3D; combat on the book's pages | 2026-09-30 | Accepted |
| [0004](0004-printed-map-only.md) | The map is the book's own printed map | 2026-10-05 | Accepted |
| [0005](0005-map-upscale-gemini-over-set-type.md) | Maps upscaled by a Gemini repaint over names set in type; Finish sets again only what is ticked | 2026-10-06 | Accepted, amended 2026-10-10 |
| [0006](0006-map-lettering-font.md) | Map lettering font: Cabin by default, or the map's own `font.txt` (Book 12: Architects Daughter) | 2026-10-07 | Accepted, amended 2026-10-10 |
| [0007](0007-maps-in-sepia.md) | Maps shown in sepia | 2026-10-07 | Accepted |
| [0008](0008-plates-whole-no-fade.md) | Fight pictures whole, as drawn, no faded edges | 2026-10-01 | Accepted |
| [0009](0009-no-stand-in-hero-figure.md) | No stand-in drawing for Lone Wolf's figure | 2026-10-03 | Accepted |
| [0010](0010-vary-plain-human-enemies.md) | Plain human enemies get varied pictures | 2026-10-09 | Accepted |
| [0011](0011-carry-the-character-on.md) | Carry the character on by default; Backpack left behind, except Backpack Items into the Grand Master series | 2026-10-02 | Accepted, amended 2026-10-10 |
| [0012](0012-page-reference-reads-continue.md) | A lone page-reference choice reads "Continue" | 2026-09-30 | Accepted |
| [0013](0013-decoration-never-costs-page-space.md) | Decoration never takes the pages' space | 2026-09-30 | Accepted |
| [0014](0014-ipad-gets-releases.md) | The iPad is served releases, not the working copy | 2026-10-10 | Accepted |
| [0016](0016-book-2-readings.md) | Book 2's rule readings | 2026-10-01 | Accepted |
| [0018](0018-earlier-disciplines-for-veterans.md) | An earlier series' disciplines keep their numbers only for a character who played them | 2026-10-10 | Accepted |
| [0019](0019-grand-master-readings.md) | Grand Master rule readings: other Special Items dropped, Deliverance once a book, no re-roll | 2026-10-10 | Accepted |
| [0020](0020-approved-fight-pictures-pinned.md) | Approved fight pictures are pinned; a change waits for the owner; the sheet marks only those waiting | 2026-10-11 | Accepted, amended 2026-10-11 |
| [0021](0021-tool-pages-on-burnt-parchment.md) | The tool pages are the map's burnt parchment, charred round the window | 2026-10-11 | Accepted, amended 2026-10-11 |
| [0022](0022-unit-tests.md) | Unit tests for the main functionality (Vitest, pytest), and `check_all.py` that checks everything | 2026-10-11 | Accepted, amended 2026-10-11 |

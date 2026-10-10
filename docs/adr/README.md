# Decision records

One file per decision the owner has made, so that no agent undoes it by accident. `docs/spec.md`
says what the project is for and the rules it follows; these say what was chosen where there was a
choice, and why. Read this index before changing behaviour, art, or a tool's output.

## Rules

- **An accepted ADR is binding.** Do not reverse or work around one without the owner's say-so in
  chat. If a task seems to need it, stop and ask.
- **When the owner decides something, write an ADR in the same piece of work**: the next number,
  `NNNN-short-title.md`, from `template.md`, and a line in the table below. Change `docs/spec.md`
  too only when the intent itself changes.
- **Never edit a decision after the fact.** To change one, write a new ADR that says what it
  supersedes (or amends), and mark the old one `Superseded by NNNN` (or `Amended by NNNN`) in its
  Status line. That is the only edit an accepted ADR gets.
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
| [0005](0005-map-upscale-gemini-over-set-type.md) | Maps upscaled by a Gemini repaint over names set in type | 2026-10-06 | Accepted |
| [0006](0006-map-names-in-cabin.md) | Map names set in Cabin SemiBold by default, no halo | 2026-10-07 | Amended by 0015 |
| [0007](0007-maps-in-sepia.md) | Maps shown in sepia | 2026-10-07 | Accepted |
| [0008](0008-plates-whole-no-fade.md) | Fight pictures whole, as drawn, no faded edges | 2026-10-01 | Accepted |
| [0009](0009-no-stand-in-hero-figure.md) | No stand-in drawing for Lone Wolf's figure | 2026-10-03 | Accepted |
| [0010](0010-vary-plain-human-enemies.md) | Plain human enemies get varied pictures | 2026-10-09 | Accepted |
| [0011](0011-carry-the-character-on.md) | Carry the character on by default; Backpack left behind | 2026-10-02 | Accepted |
| [0012](0012-page-reference-reads-continue.md) | A lone page-reference choice reads "Continue" | 2026-09-30 | Accepted |
| [0013](0013-decoration-never-costs-page-space.md) | Decoration never takes the pages' space | 2026-09-30 | Accepted |
| [0014](0014-ipad-gets-releases.md) | The iPad is served releases, not the working copy | 2026-10-10 | Accepted |
| [0015](0015-map-font-from-font-txt.md) | A map's names are set in the font its `font.txt` names (Book 12: Architects Daughter) | 2026-10-10 | Accepted |
| [0016](0016-book-2-readings.md) | Book 2's rule readings | 2026-10-01 | Accepted |

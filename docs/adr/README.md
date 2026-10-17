# Decision records

One file per decision the owner has made, each giving the current answer for its topic, so that no
agent undoes it by accident. `docs/spec.md`
says what the project is for and the rules it follows; these say what was chosen where there was a
choice, and why. Read this index before changing behaviour, art, or a tool's output.

## Rules

- **An accepted ADR is binding.** Do not reverse or work around one without the owner's say-so in
  chat. If a task seems to need it, stop and ask.
- **When the owner decides something, record it in the same piece of work.** Change
  `docs/spec.md` too only when the intent itself changes, but always search it for the ADR's
  subject and bring any sentence it contradicts into line. The spec keeps to intent; how a thing
  looks or is laid out goes in the ADR.
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
| [0002](0002-the-tome-direction.md) | The Tome (prototype D) is the player; A-C rejected and historical (not read, run or changed) | 2026-09-30 | Accepted, amended 2026-10-12 |
| [0003](0003-flat-pages-no-3d.md) | Flat pages, no 3D; combat on the book's pages | 2026-09-30 | Accepted |
| [0004](0004-printed-map-only.md) | The map is the book's own printed map | 2026-10-05 | Accepted |
| [0005](0005-map-upscale-gemini-over-set-type.md) | Maps upscaled by a Gemini repaint over names set in type; Finish sets again only what is ticked | 2026-10-06 | Accepted, amended 2026-10-10 |
| [0006](0006-map-lettering-font.md) | Map lettering font: Cabin by default, or the map's own `font.txt` (Book 12: Architects Daughter) | 2026-10-07 | Accepted, amended 2026-10-10 |
| [0007](0007-maps-in-sepia.md) | Maps shown in sepia | 2026-10-07 | Accepted |
| [0008](0008-plates-whole-no-fade.md) | Fight pictures whole, as drawn, no faded edges | 2026-10-01 | Accepted |
| [0009](0009-wolf-crest-behind-inventory.md) | A faint wolf's-head crest in the inventory, between the weapons, not Lone Wolf's figure | 2026-10-03 | Accepted, amended 2026-10-12 |
| [0010](0010-vary-plain-human-enemies.md) | Plain human enemies get varied pictures | 2026-10-09 | Accepted |
| [0011](0011-carry-the-character-on.md) | Carry the character on by default; Backpack left behind, except Backpack Items into the Grand Master series | 2026-10-02 | Accepted, amended 2026-10-10 |
| [0012](0012-page-reference-reads-continue.md) | A lone page-reference choice reads "Continue" | 2026-09-30 | Accepted |
| [0013](0013-decoration-never-costs-page-space.md) | Decoration never takes the pages' space | 2026-09-30 | Accepted |
| [0014](0014-ipad-gets-releases.md) | The iPad is served releases, not the working copy | 2026-10-10 | Accepted |
| [0016](0016-book-2-readings.md) | Book 2's rule readings | 2026-10-01 | Accepted |
| [0018](0018-earlier-disciplines-for-veterans.md) | An earlier series' disciplines keep their numbers only for a character who played them | 2026-10-10 | Accepted |
| [0019](0019-grand-master-readings.md) | Grand Master rule readings: other Special Items dropped, Deliverance once a book, no re-roll | 2026-10-10 | Accepted |
| [0020](0020-approved-fight-pictures-pinned.md) | Approved fight pictures are pinned; a change waits for the owner; the sheet marks only those waiting | 2026-10-11 | Accepted, amended 2026-10-13 |
| [0021](0021-tool-pages-on-burnt-parchment.md) | The tool pages are the map's burnt parchment, charred round the window | 2026-10-11 | Accepted, amended 2026-10-11 |
| [0022](0022-unit-tests.md) | Unit tests for the main functionality (Vitest, pytest), written first (TDD), and `check_all.py` that checks everything | 2026-10-11 | Accepted, amended 2026-10-12 |
| [0023](0023-combat-ratio-cap.md) | The Combat Ratio counts for +10 at most (house rule against the Sommerswerd) | 2026-10-04 | Accepted |
| [0024](0024-engine-tested-before-it-changes.md) | The engine is modular and tested before its rules change; the move changes nothing | 2026-10-11 | Accepted |
| [0025](0025-item-tables-in-items-folder.md) | The item tables live in `items/`, out of the project root | 2026-10-11 | Accepted |
| [0026](0026-fights-draw-out-of-sight.md) | A fight draws its Random Numbers out of sight: no medallion in the fight | 2026-10-12 | Accepted |
| [0027](0027-by-hand-stop-wins-nothing.md) | Stopping a fight by hand wins nothing, except where the item table says the text ends it so | 2026-10-12 | Accepted |
| [0028](0028-inventory-is-a-ledger.md) | The inventory is a ledger like the Kai panel (named weapons, a Special Items list, a Backpack sized to the book), not a paper doll | 2026-10-12 | Accepted, amended 2026-10-12 |
| [0029](0029-twelve-special-items-in-every-book.md) | At most 12 Special Items in every book, Kai ones too | 2026-10-12 | Accepted |
| [0030](0030-ipad-not-phones.md) | The iPad is the device to fit; phones are not supported | 2026-10-12 | Accepted |
| [0031](0031-wide-plates-span-the-column.md) | Full-page plates shown large: a double-width one spans the column, a portrait one nearly fills the page's height | 2026-10-12 | Accepted, amended 2026-10-12 |
| [0032](0032-by-hand-turn-behind-a-link.md) | The by-hand turn box is folded behind a faint link | 2026-10-12 | Accepted |
| [0033](0033-illustrations-upscaled-2x-webp.md) | Illustrations upscaled 2x by Real-ESRGAN, as WebP beside the originals (checklist step 9) | 2026-10-13 | Accepted |
| [0034](0034-picture-steps-last-together.md) | Checklist order: test play is step 6; fight pictures (7), map (8) and illustrations (9) come last, together | 2026-10-13 | Accepted |
| [0035](0035-fight-picture-source-order.md) | A fight's picture: its own, then the same creature in this book, then in another book, then a stand-in | 2026-10-14 | Accepted |
| [0036](0036-scripts-first-agent-refines.md) | Every book step has a script the owner runs (a draft where judgement is needed); an agent only refines; a draft leans to a todo over a miss, but flags only sections with a sign of the thing, read from general wording, never one book's (every drafter and scanner); Setup from a fresh checkout | 2026-10-14 | Accepted, amended 2026-10-17 |
| [0037](0037-tools-are-a-uv-project.md) | The Python tools are a uv project (`tools/pyproject.toml`, `uv.lock`, venv `tools/.venv`); run with `uv run --project tools` | 2026-10-14 | Accepted |
| [0038](0038-art-keeps-its-source-links.md) | Pictures added to `art/` keep their source link where there is one (optional, aimed at most), so Setup can fetch them again | 2026-10-14 | Accepted |
| [0039](0039-grand-master-books-get-engine-free-steps.md) | Every book is offered each dashboard step that can work for it; test play and registering its item table wait for the engine to have its series (read from `LW.SERIES`) | 2026-10-14 | Accepted, amended 2026-10-14 |
| [0040](0040-section-bow-bonus-for-grand-weaponmastery.md) | A bow shot whose section gives Grand Weaponmastery with Bow its own bonus uses that number, not +5 | 2026-10-17 | Accepted |

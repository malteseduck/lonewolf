# Decision records

The owner's decisions, each giving the current answer for its topic, so that no agent undoes one by
accident. `docs/spec.md` says what the project is for and the rules it follows; these say what was
chosen where there was a choice, and why. Read this index before changing behaviour, art, or a
tool's output, and the rulings (`rulings.md`) in the area you touch.

## Rules

- **ADRs and rulings are binding.** Do not reverse or work around one without the owner's say-so in
  chat. If a task seems to need it, stop and ask.
- **When the owner decides something, record it in the same piece of work.** Change `docs/spec.md`
  too only when the intent itself changes, but always search it for the decision's subject and bring
  any sentence it contradicts into line. The spec keeps to intent; how a thing looks or is laid out
  goes in the ADR.
- **Which record:**
  - **The topic already has an ADR** (look under its group below): amend that ADR in place, whether
    the decision refines, extends or reverses it. Rewrite its Decision and Consequences to the current
    answer, add what prompted it to Context, set `Amended:` to the date, add a dated line to its
    Changes list, and update the index line if the summary changed. One topic, one file.
  - **A small decision** (no alternatives worth recording, nothing beyond the place it names, a
    reading of one book's text): a row in `rulings.md`, in its group, with the next free id. A ruling
    that grows (amended again, or picks up a reason that matters) moves into an ADR; its row then
    points there.
  - **A new topic** no ADR covers: a new ADR, the next number, `NNNN-short-title.md`, from
    `template.md`, and a line under its group below. Before adding one, check whether it belongs in an
    existing ADR instead.
- **No superseded records.** A reversal rewrites the record in place; git keeps the old wording.
  Records merged into another are deleted and their numbers left as gaps. Numbers and ruling ids are
  never reused.
- **Citing**: "ADR NNNN" or "ruling Rn", in code comments and docs alike.
- Write in our own words. No book text, as everywhere (AGENTS.md).
- Keep each index line to one line: what is decided, not why.

## Index

The numbers are gaps where records were merged (2026-10-10, 2026-10-17); each merged record's
Changes list names what it took in.

### How the work is done

| # | Decision | Amended |
|---|---|---|
| [0001](0001-record-decisions-as-adrs.md) | Decisions: an ADR per topic, small ones as rulings, all updated in place, the index grouped | 2026-10-17 |
| [0022](0022-unit-tests.md) | Tests guard the main functionality, written first, a couple of seconds a suite; `check_all.py` runs the real books; the engine is modular and tested before its rules change | 2026-10-17 |
| [0036](0036-book-steps.md) | The book steps: their order (6 test play, 7-9 pictures), every step offered where it can work, a script for each that drafts leaning to flagging, an agent only refines; test play driven in Node | 2026-10-23 |
| [0037](0037-tools-are-a-uv-project.md) | The Python tools are a uv project with a lock file; every run is `uv run --project tools` | |
| [0044](0044-keeping-the-docs-true.md) | Keeping the docs true: AGENTS.md instructions only, folder rules beside their work, `docs_check.py` at every commit, the maintenance pass offered at release, the harness doc checked | 2026-10-27 |
| [0045](0045-releases.md) | The iPad is served the last release, the owner's call; Release runs the offline check, then releases, then pushes `main` | 2026-10-27 |
| [0041](0041-sessions-in-worktrees-merged-to-main.md) | Sonnet subagents for mechanical work where that saves tokens; a new session for a new topic; it works in its own worktree, commits only when asked, then merges into `main` | 2026-10-18 |

### The player's look and layout

| # | Decision | Amended |
|---|---|---|
| [0002](0002-the-tome-direction.md) | The Tome is the player: a flat book after Lone Wolf HD, no 3D, the pages first; prototypes A-C historical | 2026-10-17 |
| [0028](0028-inventory-is-a-ledger.md) | The inventory is a ledger like the Kai panel, the wolf's-head crest between the weapons | 2026-10-17 |
| [0031](0031-illustrations.md) | Full-page plates shown large by their shape; every illustration upscaled 2x as WebP beside its original | 2026-10-17 |
| [0027](0027-by-hand-fallbacks.md) | By hand: a fight stop wins nothing except where the text ends it so; the turn box folded behind a faint link | 2026-10-17 |

### Pictures and maps

| # | Decision | Amended |
|---|---|---|
| [0004](0004-maps.md) | The book's own printed map only, upscaled by a Gemini repaint over names set in type (the map's `font.txt`), shown in sepia | 2026-10-21 |
| [0008](0008-fight-pictures.md) | A fight's picture: its own, the same creature in this book, then another, then a stand-in; plain humans varied; shown whole; upscaled 2x; pinned once approved; candidates on the proposal sheet | 2026-10-27 |
| [0038](0038-art-keeps-its-source-links.md) | Pictures added to `art/` keep their source link where there is one, so Setup can fetch them again | 2026-10-24 |
| [0042](0042-what-of-a-book-is-committed.md) | The repository is public, with no licensed content; our descriptions (`about/`, never 8 of the book's words in a row) and AI-made fight pictures are committed; `book.js` is not, nor split | 2026-10-27 |
| [0046](0046-stand-in-content-in-public.md) | What the public sees is stand-in content: the showcase, and the made-up demo book `99ember`, played on the PC only | 2026-10-27 |

### The rules engine

| # | Decision | Amended |
|---|---|---|
| [0011](0011-carry-the-character-on.md) | Carrying the character: what carries (Backpack only into Grand Master), which earlier disciplines still count, flags assumed once | 2026-10-21 |

### The dashboard

| # | Decision | Amended |
|---|---|---|
| [0021](0021-dashboard-pages.md) | The dashboard is the map's burnt parchment; a rail of books, a book's steps as tabs, each sheet inside its step; the item and icon sheets pick icons | 2026-10-25 |

### Rulings

[`rulings.md`](rulings.md): game and house rules (R1-R3, R23-R24), book readings (R4-R10, R16-R18), presentation
(R11-R12, R19-R20, R22, R26), workflow (R13-R15, R21, R25, R27-R30). The next free id is R31.

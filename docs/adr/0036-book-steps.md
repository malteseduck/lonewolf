# 0036. The book steps: their order, every step offered where it can work, a script for each that an agent only refines

- Status: Accepted
- Date: 2026-10-13 (order); offered steps 2026-10-14; scripts first 2026-10-14
- Amended: 2026-10-23

## Context

With the illustrations' upscale added as step 9, the picture work was split: fight pictures at step
6, before the test play at 7, and the map and illustrations at 8 and 9. The owner wanted all of it
together (2026-10-13).

The dashboard offered Books 13-20 only their download, because the engine had none of the Grand
Master series' rules. Book 13 was downloaded and imported, and the owner asked why it had no other
buttons; most steps do not depend on the engine's rules. A special case for Grand Master books was
the wrong rule: every book should simply get whatever steps would work for it (2026-10-14).

The owner wants to take a fresh checkout and get through most of a book's steps from the dashboard
alone, without asking an agent what to do, with "good enough" first attempts made by scripts that an
agent can refine when one is available (2026-10-14). Book 13's item table found the draft silent on
24 sections that needed an entry, four of them restorations it had seen and dropped. The owner: a few
more todos are better than misses, since a draft whose silence cannot be trusted means re-checking
everything; but a draft that flags every section is just as pointless (2026-10-17).

## Decision

- **The order.** 1 Downloaded, 2 Imported, 3 Phrasings, 4 Rules, 5 Item table, 6 Test play, 7 Fight
  pictures, 8 Map, 9 Illustrations; grouped "Getting the book" (1-4), "Items" (5), "Play" (6) and
  "Pictures" (7-9).
- **Every book is offered every step whose needs it meets**, whatever its series; a step is held back
  only by what it actually needs, and says what that is. The download needs nothing; the import, the
  book downloaded and known to the importer (otherwise the new-book prompt); test play (6) and
  registering the item table in `main.js` `ITEM_TABLES`, the engine's rules for the book's series.
  Every other step works on any imported book.
- Whether the engine has a series is read from the code (the keys of `LW.SERIES` in
  `shared/rules-series.js`), not from a list of books. Until then, such a book's test play shows as not
  needed yet and its mark is refused, and its item table stops at a warning ("read and checked clean;
  registering it waits for the engine's ... rules"), with a prompt that says not to register it. A book
  not downloaded has only the download to offer: the grid folds every such book, of any series.
- **A script for every step.** Each book step on the dashboard has a button that runs a script. Where
  the step needs judgement, the script makes a draft or a report that is good enough to look at and
  mark: what it can read with certainty is filled in, everything else is left as a `todo` or listed by
  section id (spec principle 2 still holds: a draft never guesses).
- **A draft leans to flagging.** Where a section shows a sign of what the step looks for and the script
  cannot be sure what it means, it writes a `todo` (or lists the id), never nothing: a false alarm costs
  one read, a miss costs trusting the draft at all. It still flags only sections with such a sign, so
  its silence narrows the reading; a draft that flags nearly every section has failed too.
- **Signs are general.** What a script reads, or takes as a sign, is wording any book of the series
  might use (the Action Chart, a capitalised item, a loss or a gain), never a phrase matched to one
  section or one book: a one-off miss is left to the agent's reading. This holds for every drafter,
  scanner and script of the book steps.
- **Copy prompt** stays beside each script, as the refinement: the agent starts from the script's
  draft; the owner pastes the prompt into a session of their choosing.
- A fresh checkout is set up from the dashboard: a Setup panel checks and installs each tool (uv,
  npm), and downloads the tools' own files (Real-ESRGAN, OCR models) behind a gated button.
- The map's Gemini repaint stays the owner's manual hand-off (no paid API).
- **Test play is driven in Node, the browser only spot-checks** (2026-10-23). After the walk, the
  agent checks the book with the engine in Node, as `walk_book.mjs` loads it (no server): each
  section's text beside what the engine reads from it, then scripted checks of the gates, draws,
  bow shots, fights and arrival effects against the text, and a route to the book's last section.
  The page (`http://127.0.0.1:8766/`, storage writes off) is used only for what Node cannot show:
  a control or log the page draws (a fight's way out, loot offered), or where a test was not enough.
  Driving fights and routes through the page costs far more for the same check.

## Consequences

- `STEPS` and `GROUPS` in `tools/book_status.py`, `STAGES` in `tools/admin/admin.js` and the prompts
  (`tools/admin/prompts.js`) follow the order; `docs/book-status.json` holds test play under "6" and
  fight pictures under "7". Anything that names a step by number says 7 for fight pictures.
- `tools/book_status.py` (`engine_series()`, a book's `playable`, the step states and `mark`),
  `tools/admin/admin.js` (the fold, the download dialog's warning), `tools/admin/prompts.js` (step 5);
  `docs/reference/dashboard.md`.
- Each new script gets tests of its main path (ADR 0022) and a line in `docs/reference/dashboard.md`.
  Each agent prompt in `tools/admin/prompts.js` tells the agent to start from the script's output.

## Changes

- 2026-10-13: test play moved to 6, the picture work to 7-9 together; hand marks swapped with them.
- 2026-10-14: generalised from "Grand Master books get the engine-free steps" to every book being
  offered the steps that can work for it, with the engine's series read from `shared/rules-series.js`.
- 2026-10-15: "Send to agent" (a new Claude Desktop session per prompt) tried and dropped as clunky;
  Copy prompt is back.
- 2026-10-17: drafts lean to flagging, on general signs only, for every drafter and scanner (owner).
- 2026-10-17: merged 0034 (the order), 0039 (every step offered where it can work) and 0036 (scripts
  first) into this one record.
- 2026-10-23: test play driven in Node, the browser for spot checks only (owner, after Book 7's
  play-through spent most of its effort clicking through the page).

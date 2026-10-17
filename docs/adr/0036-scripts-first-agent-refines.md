# 0036. Every book step has a script the owner runs; an agent only refines

- Status: Accepted
- Date: 2026-10-14
- Amended: 2026-10-17

## Context

Book 13 was downloaded and imported, and the dashboard offered no next step (the Grand Master books
are download-only until the engine has the series). The owner wants to take a fresh checkout and get
through most of a book's steps from the dashboard alone, without asking an agent what to do, with
"good enough" first attempts made by scripts that an agent can refine when one is available.

Book 13's item table (2026-10-17) found the draft silent on 24 sections that needed an entry, four of
them restorations it had seen and dropped. The owner: a few more todos are better than misses, since a
draft whose silence cannot be trusted means re-checking everything; but a draft that flags every
section is just as pointless.

## Decision

- Each book step on the dashboard has a button that runs a script. Where the step needs judgement,
  the script makes a draft or a report that is good enough to look at and mark: what it can read
  with certainty is filled in, everything else is left as a `todo` or listed by section id (spec
  principle 2, "automate only what is certain", still holds: a draft never guesses).
- **A draft leans to flagging.** Where a section shows a sign of what the step looks for and the script
  cannot be sure what it means, it writes a `todo` (or lists the id), never nothing: a false alarm costs
  one read, a miss costs trusting the draft at all. It still flags only sections with such a sign, so
  its silence narrows the reading; a draft that flags nearly every section has failed too.
- **Signs are general.** What a script reads, or takes as a sign, is wording any book of the series
  might use (the Action Chart, a capitalised item, a loss or a gain), never a phrase matched to one
  section or one book: a one-off miss is left to the agent's reading. This holds for every drafter,
  scanner and script of the book steps, not only the item table's.
- **Copy prompt** stays beside it, as the refinement: the agent starts from the script's draft.
- A fresh checkout is set up from the dashboard: a Setup panel checks and installs each tool (uv,
  npm), and downloads the tools' own files (Real-ESRGAN, OCR models) behind a gated button.
- Order of work (owner, 2026-10-14): Setup, then drafts for the item table (5), fight pictures (7),
  phrasings (3), test play (6), rules addendum (4); tried on books with steps still open. The Grand
  Master engine work follows.
- The map's Gemini repaint stays the owner's manual hand-off (no paid API).

## Consequences

- Each new script gets tests of its main path (ADR 0022) and a line in `docs/reference/dashboard.md`.
- Each agent prompt in `tools/admin/prompts.js` tells the agent to start from the script's output.
- The plan of the work is in `docs/plan.md`, "Dashboard: a script for every step".

## Changes

- 2026-10-17: drafts lean to flagging (owner): a todo over a silent miss, but only where the section
  shows a sign of the thing; first applied to restorations in brackets in `items_draft.mjs`. The same
  day, for `items_draft.mjs`'s signs in general (owner): general wording only, no book-specific
  phrases, and the same rule for the other drafters, scanners and scripts.
- 2026-10-15: "Send to agent", which opened a new Claude Desktop session with the prompt
  (`claude://code/new`), was tried and dropped by the owner as clunky (a new session and a folder
  confirmation every time). Copy prompt is back: the owner pastes into a session of their choosing.

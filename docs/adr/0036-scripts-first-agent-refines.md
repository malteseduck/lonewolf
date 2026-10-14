# 0036. Every book step has a script the owner runs; an agent only refines

- Status: Accepted
- Date: 2026-10-14

## Context

Book 13 was downloaded and imported, and the dashboard offered no next step (the Grand Master books
are download-only until the engine has the series). The owner wants to take a fresh checkout and get
through most of a book's steps from the dashboard alone, without asking an agent what to do, with
"good enough" first attempts made by scripts that an agent can refine when one is available.

## Decision

- Each book step on the dashboard has a button that runs a script. Where the step needs judgement,
  the script makes a draft or a report that is good enough to look at and mark: what it can read
  with certainty is filled in, everything else is left as a `todo` or listed by section id (spec
  principle 2, "automate only what is certain", still holds: a draft never guesses).
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

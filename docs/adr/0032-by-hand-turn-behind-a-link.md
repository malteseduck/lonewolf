# 0032. The by-hand turn box is folded behind a faint link

- Status: Accepted
- Date: 2026-10-12

## Context

Every section with choices showed a small "By hand: turn to" box under them, the way to a section
the importer could not read as a choice. The owner asked why it was always at the bottom of the page.
Showing it only where the text names a section that is not a choice was rejected: a missed case
would leave no way on.

## Decision

- Outside puzzles, the box is not shown at first: a faint link, "By hand: turn to a section…",
  stands in its place under the choices, on every section with choices.
- Touching the link opens the box, ready to type in.
- The link and the opened box are both centred, at the bottom of the story page.
- The opened box's button is a small seal reading "go" (a puzzle's box keeps its "turn" link).
- A puzzle's "Turn to section" box, and the box after a fight stopped by hand, are shown open as before.

## Consequences

`leftHTML()` in `main.js` writes the link (`data-byhand`); the click handler swaps it for
`turnBox()` and focuses it (`docs/reference/interface.md`). Do not drop the link on any section with
choices.

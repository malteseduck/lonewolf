# 0027. The by-hand fallbacks: a stop that wins nothing except where the text ends the fight so, and a turn box behind a faint link

- Status: Accepted
- Date: 2026-10-12
- Amended: 2026-10-17

## Context

Plan item 1 (found playing Book 3) asked for a way out of a fight without Evade's blow, for fights the
text ends or leaves in ways the engine could not apply. Built first as a plain stop that counted as a
win, it let any fight be skipped and opened the choices meant for a win. Since then the engine applies
most such ends itself (stop rules, several evasions, contests, target points). The owner chose to keep
the fallback for what is left, without the free win, and to teach the engine more as each book is
played through.

Every section with choices showed a small "By hand: turn to" box under them, the way to a section
the importer could not read as a choice. The owner asked why it was always at the bottom of the page.
Showing it only where the text names a section that is not a choice was rejected: a missed case
would leave no way on.

## Decision

- **Stopping a fight by hand.** Where a book's item table says the text ends a fight some way the
  engine cannot see (`fight.byHand`: why, in our words), the stop shows that reason and works as the
  text's own end would: the fight is over and the section's choices open. Anywhere else the stop is
  still there ("By hand: stop the fight (it is not won)") but wins nothing: the fight stays unwon, no
  choice opens, and only the by-hand turn box is offered, or the fight after all.
- A case met in play that the engine could apply is added to the engine (and its tests) rather than
  flagged.
- **The by-hand turn box.** Outside puzzles, the box is not shown at first: a faint link, "By hand:
  turn to a section…", stands in its place under the choices, on every section with choices. Touching
  the link opens the box, ready to type in. The link and the opened box are both centred, at the
  bottom of the story page. The opened box's button is a small seal reading "go" (a puzzle's box keeps
  its "turn" link). A puzzle's "Turn to section" box, and the box after a fight stopped by hand, are
  shown open as before.

## Consequences

- `LW.Fight.stopHere()` ends as `stop` with `combat.byHand`, else `broken`; `Game.breakOff()` /
  `brokenOff` (s.broken). `main.js` draws the link under the fight log and the broken-off section.
- book-format.md documents `byHand`; items.md says to use it only where the text, not the engine,
  decides the end.
- `leftHTML()` in `main.js` writes the turn link (`data-byhand`); the click handler swaps it for
  `turnBox()` and focuses it (`docs/reference/interface.md`). Do not drop the link on any section with
  choices.

## Changes

- 2026-10-17: merged in 0032 (the by-hand turn box behind a faint link).

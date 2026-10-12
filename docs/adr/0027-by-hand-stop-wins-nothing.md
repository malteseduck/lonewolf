# 0027. Stopping a fight by hand wins nothing, except where the text ends it so

- Status: Accepted
- Date: 2026-10-12

## Context

Plan item 1 (found playing Book 3) asked for a way out of a fight without Evade's blow, for fights the
text ends or leaves in ways the engine could not apply. Built first as a plain stop that counted as a
win, it let any fight be skipped and opened the choices meant for a win. Since then the engine applies
most such ends itself (stop rules, several evasions, contests, target points). The owner chose to keep
the fallback for what is left, without the free win, and to teach the engine more as each book is
played through.

## Decision

- Where a book's item table says the text ends a fight some way the engine cannot see (`fight.byHand`:
  why, in our words), the stop shows that reason and works as the text's own end would: the fight is
  over and the section's choices open.
- Anywhere else the stop is still there ("By hand: stop the fight (it is not won)") but wins nothing:
  the fight stays unwon, no choice opens, and only the by-hand turn box is offered, or the fight after all.
- A case met in play that the engine could apply is added to the engine (and its tests) rather than
  flagged.

## Consequences

- `LW.Fight.stopHere()` ends as `stop` with `combat.byHand`, else `broken`; `Game.breakOff()` /
  `brokenOff` (s.broken). `main.js` draws the link under the fight log and the broken-off section.
- book-format.md documents `byHand`; items.md says to use it only where the text, not the engine,
  decides the end.

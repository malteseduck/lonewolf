# 0011. Carry the character on by default; Backpack left behind, except into the Grand Master series

- Status: Accepted
- Date: 2026-10-02
- Amended: 2026-10-10

## Context

The books let a reader carry a character from one book to the next or start afresh.

Book 13's rules carry Backpack Items and gold into the Grand Master series, and only ten named
Special Items. The Readers' Handbook calls leaving Meals behind optional (they perish).

## Decision

- Both are supported. Starting a book the saved character has not completed uses that character by
  default; a new character can always be rolled instead.
- Carried over: scores, disciplines, Weapons, Special Items, gold and mastered weapons. Not the
  Backpack's contents or Meals, as the books say.
- **Into a Grand Master book** (Book 13 on): the Backpack Items carry over too, Meals still not;
  only the Special Items on the series' list carry (the rest are dropped: ADR 0019).

## Consequences

Spec 4.7 states the rule; `docs/reference/rules-engine.md` how it is done. The Grand Master part is
not in the engine yet (`docs/plan.md`, "Grand Master series").

## Changes

- 2026-10-10: Backpack Items (not Meals) and the listed Special Items carry into the Grand Master
  series, as Book 13's rules say.

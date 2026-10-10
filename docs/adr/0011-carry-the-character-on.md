# 0011. Carry the character on by default; Backpack left behind

- Status: Accepted
- Date: 2026-10-02

## Context

The books let a reader carry a character from one book to the next or start afresh.

## Decision

- Both are supported. Starting a book the saved character has not completed uses that character by
  default; a new character can always be rolled instead.
- Carried over: scores, disciplines, Weapons, Special Items, gold and mastered weapons. Not the
  Backpack's contents or Meals, as the books say.

## Consequences

Spec 4.7 states the rule; `docs/reference/rules-engine.md` how it is done.

# 0018. An earlier series' disciplines keep their numbers only for a character who played them

- Status: Accepted
- Date: 2026-10-10

## Context

Book 13's rules give the earlier disciplines' bonuses only to a character who completed the earlier
books, and point to Project Aon's Readers' Handbook (downloaded 2026-10-10). The Lone Wolf Club
newsletters it quotes rule that a veteran of Books 1–12 keeps his Magnakai numbers in the Grand
Master books, each replaced by its Grand Master counterpart (LWCN 28), and that a veteran of Books
1–5 keeps Healing's +1 and Hunting's Meals in the Magnakai books (Summer Special 1987, 8, 10). The
engine had read the Magnakai books the other way (only Magnakai Disciplines act). The Handbook leaves
a character who completed only some of the books to the reader.

## Decision

- **Magnakai books**: a character who completed Books 1–5 keeps Healing's +1 a section without a
  fight (not added to Curing's: +1 at most) and Hunting's spared Meals (failing where the text says
  Hunting fails). Others get only the Magnakai Disciplines' effects.
- **Grand Master books**: every character holds all Kai and Magnakai Disciplines for the text's
  gates. A carried character also keeps the numbers of the Magnakai Disciplines **he chose**
  (Huntmastery's Meals, Curing's +1, Weaponmastery, Psi-surge and Mindblast, at his Magnakai rank),
  whether or not he played every book. A Grand Master Discipline replaces its counterpart's number,
  never adds to it (Grand Weaponmastery +5 with a weapon he had mastered, not +8).
- A new Grand Master character gets none of the earlier numbers.

## Consequences

- Needs the engine to know which books a character completed (`LW.Character`'s `completed`) and
  which disciplines he chose, not only those he was given.
- Spec 4.2; the rules and their sources in `docs/reference/rules-books.md`; the work in
  `docs/plan.md` ("Grand Master series").

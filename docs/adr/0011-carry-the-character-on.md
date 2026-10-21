# 0011. Carrying the character between books: what carries, which earlier disciplines still count, flags assumed once

- Status: Accepted
- Date: 2026-10-02
- Amended: 2026-10-17

## Context

The books let a reader carry a character from one book to the next or start afresh.

Book 13's rules carry Backpack Items and gold into the Grand Master series, and only ten named
Special Items. The Readers' Handbook calls leaving Meals behind optional (they perish).

Book 13's rules give the earlier disciplines' bonuses only to a character who completed the earlier
books, and point to Project Aon's Readers' Handbook (downloaded 2026-10-10). The Lone Wolf Club
newsletters it quotes rule that a veteran of Books 1-12 keeps his Magnakai numbers in the Grand
Master books, each replaced by its Grand Master counterpart (LWCN 28), and that a veteran of Books
1-5 keeps Healing's +1 and Hunting's Meals in the Magnakai books (Summer Special 1987, 8, 10). The
engine had read the Magnakai books the other way. The Handbook leaves a character who completed only
some of the books to the reader; the owner settled it, and the Grand Master points the rules leave
open, before any Grand Master engine work (2026-10-10).

Book 4's section 200 opens a way for one who has ever been to Gorn Cove (Book 2), which no book
recorded. The owner (2026-10-17): every player starts at Book 1, and one who does not is shut out;
Book 2 records the visit, and a character carried into Book 3 or 4 is assumed, one time, to have
made it.

## Decision

- **Both are supported.** Starting a book the saved character has not completed uses that character
  by default; a new character can always be rolled instead.
- **Carried over**: scores, disciplines, Weapons, Special Items, gold and mastered weapons. Not the
  Backpack's contents or Meals, as the books say.
- **Into a Grand Master book** (Book 13 on): the Backpack Items carry over too, Meals still not; only
  the Special Items on the series' list of ten carry. The rest are dropped, not left at the Monastery;
  they stay in his record of what he ever had (`hero.had`).
- **A carried character keeps his scores** with every bonus he earned (Lore-circles included). No
  re-roll at 25 / 30 is offered; a player who wants one rolls a new character.
- **Earlier disciplines in the Magnakai books**: a character who completed Books 1-5 keeps Healing's
  +1 a section without a fight (not added to Curing's: +1 at most) and Hunting's spared Meals (failing
  where the text says Hunting fails). Others get only the Magnakai Disciplines' effects.
- **Earlier disciplines in the Grand Master books**: every character holds all Kai and Magnakai
  Disciplines for the text's gates. A carried character also keeps the numbers of the Magnakai
  Disciplines **he chose** (Huntmastery's Meals, Curing's +1, Weaponmastery, Psi-surge and Mindblast,
  at his Magnakai rank), whether or not he played every book. A Grand Master Discipline replaces its
  counterpart's number, never adds to it (Grand Weaponmastery +5 with a weapon he had mastered, not
  +8). A new Grand Master character gets none of the earlier numbers.
- **Flags assumed once.** A flag a later book asks about that was recorded only after characters were
  already being carried is given once to such a character on entering the books that ask: Book 2's
  `visitedGornCove` (its section 168, the only way into Gorn Cove), assumed on entering Book 3 or 4;
  Book 4's `visitedStargazer` (84, inside the hut) and `visitedMaakenTemple` (350, in the temple),
  assumed on entering Book 5 or 6 (from 2026-10-21). He is not asked or checked again. A character
  made since is never given them: only his own earlier books count. A new character rolled for a
  book that asks does not have them, and those ways stay shut for him.

## Consequences

- Spec 4.2 and 4.7 state the rules; `docs/reference/rules-engine.md` how they are done; the rules
  and their sources in `docs/reference/rules-books.md`.
- Needs the engine to know which books a character completed (`LW.Character`'s `completed`) and
  which disciplines he chose, not only those he was given.
- `LW.ASSUME` (core.js) lists the flags assumed once with the book numbers they are assumed on
  entering; `LW.assumeMarks` gives each once and records it in `hero.assumed`. `LW.makeHero` fills
  `hero.assumed` from the start. `LW.HeroSetup.build` runs it for a carried character. A later flag
  of the same kind goes in `LW.ASSUME` only if the owner wants it assumed.
- Book 2's flag is in `items/items-02fotw.js` (`MARKS`, section 168); the gate in
  `items/items-04tcod.js`. Book 4's two (`visitedStargazer` at 84, `visitedMaakenTemple` at 350) are
  in `items/items-04tcod.js`, assumed on entering Book 5 or 6; the gates at Book 6's 127 and 151.

## Changes

- 2026-10-10: Backpack Items (not Meals) and the listed Special Items carry into the Grand Master
  series, as Book 13's rules say.
- 2026-10-16: the Grand Master part in the engine (rules-engine.md).
- 2026-10-17: Book 2 flags the Gorn Cove visit; a character from before it is assumed to have it once.
- 2026-10-17: merged in 0018 (earlier disciplines for veterans), the carrying half of 0019 (Grand
  Master readings; Deliverance went to rulings.md) and 0043 (Gorn Cove).
- 2026-10-21: Book 4 flags the stargazer's hut and the buried temple of Maaken (Book 6 asks); assumed
  once, as Gorn Cove.

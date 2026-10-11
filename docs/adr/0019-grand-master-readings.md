# 0019. Grand Master rule readings

- Status: Accepted
- Date: 2026-10-10

## Context

Book 13's rules and the Readers' Handbook leave some points open (`docs/reference/rules-books.md`,
"Grand Master series"). The owner settled them before any Grand Master engine work.

## Decision

- **Special Items not on the series' list of ten** are dropped when a character enters the series,
  not left at the Monastery. They stay in his record of what he ever had (`hero.had`).
- **Deliverance** ("once every 20 days") is used **once a book**, as Archmaster Curing is.
- **A carried character keeps his scores** with every bonus he earned (Lore-circles included). No
  re-roll at 25 / 30 is offered; a player who wants one rolls a new character.

## Consequences

- What carries over, Backpack included: ADR 0011. Which earlier disciplines still count: ADR 0018.
- The engine work is listed in `docs/plan.md` ("Grand Master series").

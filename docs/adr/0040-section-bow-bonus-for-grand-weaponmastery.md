# 0040. A bow shot whose section gives Grand Weaponmastery with Bow its own bonus uses that number

- Status: Accepted
- Date: 2026-10-17

## Context

Book 13's rules page gives Grand Weaponmastery with Bow +5 to the Random Number of a shot, but three of
its shots (104, 176, 303) say to add 3 for it. The Readers' Handbook gives no ruling, only the advice to
use the section's number. The engine added +5 everywhere, so the item table carried a todo telling the
player which totals still missed. The owner chose the section's number (2026-10-17).

## Decision

Where a section gives Grand Weaponmastery with Bow its own bonus on a shot, that number is added in
place of the +5, never as well as it. Everywhere else the rules page's +5 stands.

## Consequences

- The item table gives the section `grandBow: n` beside its `bowShot` (book-format.md); `LW.bowShot`
  passes it to `LW.weaponBonus`, which shows it as Grand Weaponmastery with Bow's part of the shot.
- No todo for such a shot. Later Grand Master books mark theirs the same way when their tables are read
  (rules-books.md, Grand Master series, "Carrying").

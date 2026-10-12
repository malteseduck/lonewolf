# 0023. The Combat Ratio counts for +10 at most (house rule)

- Status: Accepted
- Date: 2026-10-04

## Context

The Sommerswerd's +8 (with Weaponskill or Weaponmastery on top) makes most fights in the early books
a formality at the table's "+11 or more" column. On 2026-10-04 the owner capped the ratio at +10,
following fixes the community suggests, in the commit "Added balance for sommerswerd". The same
commit also made the Sommerswerd two-handed (no Shield beside it); that half was later dropped,
since Book 2's rules have it one-handed (rules-books.md). The cap stayed, unrecorded, until the
fight was moved out of `main.js` on 2026-10-11, when the owner confirmed it is wanted.

## Decision

- The Combat Ratio a round is looked up at is the hero's COMBAT SKILL minus the enemy's, counted as
  **+10 at most**. The "+11 or more" column of the Combat Results Table is never used.
- There is no floor: a ratio below -11 still uses the table's first column.
- It applies to every fight in every book, whatever the weapon.

## Consequences

- `LW.RATIO_CAP` (10) in `shared/fight.js`, used by `LW.Fight#ratio`; tested in
  `tests/js/fight.test.js`.
- The fight's stats line shows the capped ratio.
- rules-books.md's Combat Ratio row and rules-engine.md ("Combat procedure") name it as a house rule.

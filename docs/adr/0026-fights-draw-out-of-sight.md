# 0026. A fight draws its Random Numbers out of sight

- Status: Accepted
- Date: 2026-10-12

## Context

A fight's controls had the Random Number medallion in their middle: Strike or Evade spun it, and
the round waited for the spin. With the by-hand Stop added beside Evade, the row grew too wide for
the panel. The owner said a fight does not need the medallion: draw the number in the background.

## Decision

- In a fight, Strike and Evade draw the Random Number at once (`LW.rand10()`), with no medallion
  shown and no spin to wait for. The log still says the number drawn each round.
- Outside fights the medallion stays: a section's own Random Number is still spun on the page.

## Consequences

- `main.js` `battleAct` draws with `LW.rand10()`; the fight's controls are the command medallions
  only (`updateBattle`). The fight's rules (`LW.Fight.roll(n)`) are unchanged and take the number.

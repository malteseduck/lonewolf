# 0004. The map is the book's own printed map

- Status: Accepted
- Date: 2026-10-05

## Context

The player once drew its own maps: replicas of the printed maps stamped with engraved symbols,
made-up places per section, town plans, and travel on the map. The owner dropped all of it.

## Decision

- A book's map is the one printed in it, restyled at runtime (`maps.js`), and nothing else.
- No replicas, made-up places, town plans or travel on the map. Every choice is made on the story
  page.

## Consequences

- The old code is in git history before 2026-10-05; its symbols are kept in git-ignored
  `art/reference/map-symbols/from-game/`. Do not bring them back.
- Improving a map means upscaling the printed one (0005), not redrawing it.

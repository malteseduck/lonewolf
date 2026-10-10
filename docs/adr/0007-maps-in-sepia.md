# 0007. Maps shown in sepia

- Status: Accepted
- Date: 2026-10-07

## Context

The 4K repaints are in full colour; the player's pages are aged parchment and ink.

## Decision

The map is shown in sepia like the old scan and the rest of the book, whether it is the 4K upscale
or the printed scan.

## Consequences

The sepia restyle is applied at runtime in `maps.js` (`docs/reference/interface.md`); the files on
disk keep their colour.

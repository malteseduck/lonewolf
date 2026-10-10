# 0008. Fight pictures whole, as drawn, no faded edges

- Status: Accepted
- Date: 2026-10-01

## Context

Fight pictures are inked onto the parchment at runtime. Fading their edges or cropping them was
tried; the owner wants each picture whole.

## Decision

- A fight picture is shown whole, as drawn, a little smaller than the panel.
- Only a ruled frame line round it is cut away. The edges are not faded.

## Consequences

`inkify` and `frameOf` in `plates.js` do this (`docs/reference/interface.md`). Do not add a fade or
vignette.

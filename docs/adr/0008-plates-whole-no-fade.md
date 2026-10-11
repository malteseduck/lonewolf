# 0008. Fight pictures whole, as drawn, no faded edges

- Status: Accepted
- Date: 2026-10-01

## Context

Fight pictures are inked onto the parchment at runtime. Fading their edges or cropping them was
tried; the owner wants each picture whole.

## Decision

- A fight picture is shown whole, as drawn, a little smaller than the panel.
- Nothing is cut away automatically. A ruled frame, caption or anything else unwanted is left out
  by hand with the picture's crop (Adjust in the fight pictures page). The edges are not faded.

## Consequences

`inkPlate` in `plates.js` does this (`docs/reference/interface.md`). Do not add a fade or
vignette, or a detector that crops on its own.

## Changes

- 2026-10-11: the ruled-frame detector is dropped. It cut at any frame line near the edge, so art
  drawn past the frame (Book 4's Vassagonian Warhound's snout, pillars, jars) was lost, and the fight
  did not match the crop set in Adjust. Frames are now cropped by hand.

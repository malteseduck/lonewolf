# 0038. Pictures added to art/ keep their source link where there is one

- Status: Accepted
- Date: 2026-10-14
- Amended: 2026-10-24

## Context

`art/` (the owner's fight pictures and borrowed art) is git-ignored, so a fresh checkout has none of
it and the Setup panel (ADR 0036) can only say "copy it from the old checkout". The owner asked that
a picture added from the web keep its link, so that it can be downloaded again.

On 2026-10-24 the owner marked every picture then in `art/`: a link where one was known, none for
screenshots and drawings, and "Made with AI" for the fight pictures made from a text prompt, which
leave `art/` for the committed library (ADR 0042).

## Decision

- A committed list records each picture's source link: the file under `art/`, the URL, the date
  fetched. Links are **optional**, but the aim is a link for most pictures: adding a picture asks
  for one, and a picture with no link (a screenshot, the owner's own drawing) is marked as such.
- The picture sheet can take a picture by URL: the server fetches it and records the link.
- Setup's "Your pictures" part counts what is present, what can be fetched again, and what has no
  link; its gated Download fetches the missing pictures from their links (a download: the owner's
  go-ahead).
- `art/reference/` (map-making material, not loaded by the player) is left out.

## Consequences

- Crops, flips and levels stay in `plates.json`, so a picture fetched again from its link and
  converted as before shows the same.
- Links break; recovery is likely, not certain.
- The dashboard's Picture sources sheet lists every picture in `art/` with its link, none, or a
  Made with AI button (ADR 0042), those not yet said first.
- The work is D9 in `docs/plan.md`.

## Changes

- 2026-10-24: every picture in `art/` marked; the Picture sources sheet; AI-made fight pictures move
  out of `art/` into the committed library (ADR 0042).

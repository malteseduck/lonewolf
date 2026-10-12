# 0009. A faint wolf's-head crest in the inventory, between the weapons, not Lone Wolf's figure

- Status: Accepted
- Date: 2026-10-03
- Amended: 2026-10-12 (twice)

## Context

The inventory showed Lone Wolf's figure faint behind its slots, cut from a picture the owner supplies
(in git-ignored `art/`), and the owner asked for no drawn stand-in when there was no picture.

On 2026-10-12 the owner found the faint figure silly, like a ragdoll, and chose a crest instead.
Later the same day the paper doll of slots went too (ADR 0028), and the crest moved between the two
weapons, where nothing cuts across it.

## Decision

Between the inventory's two weapons is the Kai wolf's head (the `wolf-head` glyph of the title and
the Kai tab), faint in the page's ink, as a seal. No figure of Lone Wolf is shown there, from the
owner's art or drawn.

## Consequences

- `.crestmark` in `packHTML` (main.js), styled in index.html. The cut-out code (`heroFromArt`) and
  the `hero` entry of `art/manifest.json` are gone.
- Do not bring back a figure in the inventory without the owner's say-so.

## Changes

- 2026-10-12: the cut-out figure replaced by the wolf's-head crest; renamed from
  `0009-no-stand-in-hero-figure.md`.
- 2026-10-12: the crest moved between the two weapons when the paper doll gave way to a ledger
  (ADR 0028).

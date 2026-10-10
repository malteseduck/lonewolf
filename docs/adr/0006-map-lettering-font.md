# 0006. Map names set in Cabin SemiBold, no halo

- Status: Amended by 0015 (a map's font.txt overrides it)
- Date: 2026-10-07

## Context

The place names set before the repaint (0005) need one clean type Gemini can copy and the player
can read at 4K. IM Fell English with a light halo was tried first; the owner wanted it bigger and
bolder, and no halo.

## Decision

- Place names are set in Cabin SemiBold (a free Gill Sans relative), with no halo.
- Small names are set 30% larger than the scan's ink measures.

## Consequences

- `tools/serve.py` passes Cabin to `map_letter.py` unless a book's `maps/<code>/font.txt` names
  another font (0015).
- Do not switch fonts across all maps without a new ADR.

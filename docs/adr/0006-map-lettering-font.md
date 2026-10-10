# 0006. Map lettering font: Cabin by default, or the map's own font.txt

- Status: Accepted
- Date: 2026-10-07
- Amended: 2026-10-10

## Context

The place names set before the repaint (0005) need one clean type Gemini can copy and the player
can read at 4K. IM Fell English with a light halo was tried first; the owner wanted it bigger and
bolder, and no halo. Cabin SemiBold, a free Gill Sans relative, suits maps lettered in a plain sans.

Book 12's printed map is lettered by hand in thin marker, and Cabin looked like set type on it.
Five free hand fonts were lettered onto it side by side with the scan: Patrick Hand (round, heavy),
Kalam Light and Regular (slanted, ornate), Neucha (dark), Comic Neue (too regular) and Architects
Daughter. The owner chose Architects Daughter, and asked that the choice of font be a general
mechanism rather than a Book 12 exception.

## Decision

- Place names are set with no halo, small names 30% larger than the scan's ink measures.
- `maps/<code>/font.txt` sets a map's font. Line 1 names a font file in `tools/fonts/`, used for
  capitals and mixed case alike; whatever it names is honoured by every step that sets or previews
  the names. An optional line 2 describes the lettering to Gemini in the prompt, in place of "clean
  sans-serif type".
- A map with no `font.txt` gets Cabin SemiBold.
- A book's `font.txt` is the owner's choice for that map: an agent does not change it, remove it,
  or override it on the command line without the owner's say-so.
- Book 12: `ArchitectsDaughter-Regular.ttf`, described as "hand-lettered in a thin, even pen, like a
  draughtsman's hand".

## Consequences

- `tools/serve.py` (`_fonts`) passes the font to `map_letter.py` for the Letter and Finish steps;
  the map editor's preview draws in it; `map_labels.py prompt` reads line 2. Any new tool that sets
  map names reads it too.
- A font named there must be free to redistribute, with its licence and source in
  `tools/fonts/README.txt`. Adding one needs the owner's go-ahead (AGENTS.md).
- Choosing a font for another map: letter a side-by-side trial against the scan, let the owner
  pick, write `font.txt`.
- Keep names in their printed case in the label list, so a hand font's lower case is used.
- Do not switch fonts across all maps without the owner.

## Changes

- 2026-10-10: a map's `font.txt` overrides Cabin, with an optional line 2 for the prompt; Book 12
  set in Architects Daughter.

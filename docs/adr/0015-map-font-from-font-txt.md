# 0015. A map's names are set in the font its font.txt names

- Status: Accepted
- Date: 2026-10-10
- Amends: 0006

## Context

Cabin (0006) suits maps lettered in a plain sans. Book 12's printed map is lettered by hand in thin
marker, and Cabin looked like set type on it. Five free hand fonts were lettered onto it side by
side with the scan: Patrick Hand (round, heavy), Kalam Light and Regular (slanted, ornate), Neucha
(dark), Comic Neue (too regular) and Architects Daughter. The owner chose Architects Daughter, and
asked that the choice of font be a general mechanism rather than a Book 12 exception.

## Decision

- `maps/<code>/font.txt`, one line naming a font file in `tools/fonts/`, sets the font a map's
  place names are set in, capitals and mixed case alike. Whatever it names is honoured by every
  step that sets or previews the names.
- A map with no `font.txt` gets Cabin SemiBold (0006).
- The font in a book's `font.txt` is the owner's choice for that map: an agent does not change it,
  remove it, or override it on the command line without the owner's say-so.
- Book 12: `ArchitectsDaughter-Regular.ttf`.

## Consequences

- `tools/serve.py` (`_fonts`) passes the named font to `map_letter.py` for the Letter and Finish
  steps; the map editor's preview draws in it. Any new tool that sets map names reads it too.
- A font named there must be free to redistribute, with its licence and source in
  `tools/fonts/README.txt`. Adding one needs the owner's go-ahead (AGENTS.md).
- Choosing a font for another map: letter a side-by-side trial against the scan, let the owner
  pick, write `font.txt`, and record it here by a new ADR only if the rule itself changes.
- Keep names in their printed case in the label list, so a hand font's lower case is used.

# 0005. Maps upscaled by a Gemini repaint over names set in type

- Status: Accepted
- Date: 2026-10-06 (chain chosen on Book 4); names set before the repaint from Book 1's round 8, 2026-10-07
- Amended: 2026-10-10

## Context

Tried on Book 4: Real-ESRGAN alone is exact but flat and keeps smeared lettering; re-opening letter
holes by script broke other letters; local Stable Diffusion with ControlNet reinvented symbols and
lettering. A Gemini (Nano Banana) repaint gave the look the owner wants but garbled names. On Book 1,
copying the scan's spellings gave a near copy the owner found boring, edit prompts broke labels that
were right, and pasting the scan's lettering onto the paint smudged. Erasing every place name and
setting it in type before the repaint worked. History in `docs/reference/map-upscale.md`.

Finish used to set every place name again whenever no label was ticked reset, a habit from Book 1,
where Gemini garbled many small names. Once names were set in type before the repaint, Gemini
mostly copied them right. On Book 12's round 3 the owner ticked nothing, expecting the round as it
was, and got all 30 names set again; where Gemini had moved a name, the new one landed beside the
remains of Gemini's (a doubled "Vorndarol").

## Decision

- Each map: upscale the scan, draft and check the label list, erase the place names, set them
  again in type (the map's font: 0006), have Gemini repaint (the owner runs it), check, re-set any
  name Gemini garbled at 4K, enlarge to 4K WebP.
- Gemini paints a rich repaint in the map's own style; colour and style changes are fine if the map
  stays close enough. Nothing added: no fruit, foliage, ornaments, new trees, ships or buildings.
- A new round starts from a new prompt in a new chat. No edit prompts.
- The owner corrects the label list in the editor after the OCR draft.
- **Finish sets again exactly what is ticked**: the labels ticked reset (and fix), or, with none
  ticked reset, only the fix labels. With nothing ticked it is an upscale only and Gemini's names
  stand. A checkbox on the Finish step, "Set every place name again", unchecked by default and on
  every load, gives the old behaviour; it is greyed out while any label is ticked reset. The step
  says what Finish will do before it runs.

## Consequences

- The chain and its tools are in `docs/reference/map-upscale.md`; each map's prompt opens with
  `maps/<code>/style.txt`.
- Everything made from a map stays in `data/projectaon/<code>/` (spec 3).
- `map_letter.py` takes `--all` for setting every name again; `serve.py` passes it for `?all=1`.
  Do not make that the default again without the owner.

## Changes

- 2026-10-10: Finish sets again only what is ticked; "Set every place name again" is opt-in (Book
  12, round 3).

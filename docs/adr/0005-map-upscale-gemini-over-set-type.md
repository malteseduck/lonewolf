# 0005. Maps upscaled by a Gemini repaint over names set in type

- Status: Accepted
- Date: 2026-10-06 (chain chosen on Book 4); names set before the repaint from Book 1's round 8, 2026-10-07

## Context

Tried on Book 4: Real-ESRGAN alone is exact but flat and keeps smeared lettering; re-opening letter
holes by script broke other letters; local Stable Diffusion with ControlNet reinvented symbols and
lettering. A Gemini (Nano Banana) repaint gave the look the owner wants but garbled names. On Book 1,
copying the scan's spellings gave a near copy the owner found boring, edit prompts broke labels that
were right, and pasting the scan's lettering onto the paint smudged. Erasing every place name and
setting it in type before the repaint worked. History in `docs/reference/map-upscale.md`.

## Decision

- Each map: upscale the scan, draft and check the label list, erase the place names, set them
  again in type, have Gemini repaint (the owner runs it), check, re-set any name Gemini garbled at
  4K, enlarge to 4K WebP.
- Gemini paints a rich repaint in the map's own style; colour and style changes are fine if the map
  stays close enough. Nothing added: no fruit, foliage, ornaments, new trees, ships or buildings.
- A new round starts from a new prompt in a new chat. No edit prompts.
- The owner corrects the label list in the editor after the OCR draft.

## Consequences

- The chain and its tools are in `docs/reference/map-upscale.md`; each map's prompt opens with
  `maps/<code>/style.txt`.
- Everything made from a map stays in `data/projectaon/<code>/` (spec 3).

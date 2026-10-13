# 0034. Checklist order: test play is step 6; the picture work comes last, together

- Status: Accepted
- Date: 2026-10-13

## Context

With the illustrations' upscale added as step 9 (ADR 0033), the picture work was split: fight
pictures at step 6, before the test play at 7, and the map and illustrations at 8 and 9. The owner
wanted all of it together.

## Decision

- The checklist's steps are: 1 Downloaded, 2 Imported, 3 Phrasings, 4 Rules, 5 Item table,
  6 Test play, 7 Fight pictures, 8 Map, 9 Illustrations.
- The groups are "Getting the book" (1-4), "Items" (5), "Play" (6) and "Pictures" (7-9).
- Hand marks keep their meaning: each book's marks for the two steps were swapped with them.

## Consequences

`STEPS` and `GROUPS` in `tools/book_status.py`, `STAGES` in `tools/admin/admin.js` and the prompts
(`tools/admin/prompts.js`) follow this order; `docs/book-status.json` holds test play under "6" and
fight pictures under "7". Anything that names a step by number (docs, ADR 0020, the approved
pictures' notes written by `tools/plates_pin.mjs`) says 7 for fight pictures.

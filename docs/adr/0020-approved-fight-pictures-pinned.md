# 0020. Approved fight pictures are pinned; a change waits for the owner

- Status: Accepted
- Date: 2026-10-11

## Context

A re-import after the Book 13 importer change reported other picture counts for Books 4–8, whose
fight pictures the owner had already reviewed and marked done. That came from `plates.json` entries
added the day before (the player picks library pictures at play time), not from the re-import, but
it showed that a `plates.json` edit or an importer change could alter a reviewed book's pictures
unseen.

## Decision

- When a book's step 6 (fight pictures) is marked done, the picture each fight shows is pinned. The
  player shows the pinned picture whatever `plates.json` or a re-import would now pick.
- A fight that would now show another picture is listed on the dashboard (step 6 becomes a warning,
  naming the sections) and waits for the owner's **Approve picture changes**, a gated button.
  Agents never press it nor run `plates_pin.mjs --approve` on their own.
- The owner's own change to an enemy on the picture sheet is his approval for that enemy.
- Unmarking step 6 lets the pins go.

## Consequences

- Pins in `assets/plates/approved/<code>.json` (committed; section/enemy keys, file paths and a
  hash of the enemy's name, no book text), written by `tools/plates_pin.mjs`; the rule in
  `platepick.js`, used by the player, the picture sheet and the tool.
- Books 1–8, already marked done, were pinned on 2026-10-11 to what the player showed then.
- `docs/reference/dashboard.md`, `interface.md` (Art pipeline), `items.md` (Fight pictures).

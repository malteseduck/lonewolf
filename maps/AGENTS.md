# Map labels and styles

Rules for work on a book's map, `<code>/` here. The root `AGENTS.md` applies as well.
`docs/reference/map-upscale.md` is the chain, step by step, and what each `tools/map_*.py` does.

- **Only our own files are committed here** (ADR 0042): `labels.json`, `style.txt`, `font.txt`,
  `labels-checked.txt`. The scan, its upscales and every working picture stay in `data/projectaon/`.
- **The agent gives the labels a first pass, on a budget; the owner finishes them** in
  `tools/map-editor.html` and presses Labels checked (ADR 0004). A map at a time, in a fresh
  conversation of its own, on the main model:
  1. `map_review.py prepare <book>` (the dashboard's "Prepare first pass", whose prompt starts the rest).
  2. Read `map-review-fonts.jpg` and write `font.txt` for the hand nearest the printed one, with its
     line 2 for Gemini; most later maps are not Cabin. Name it in ADR 0004. Choose before placing
     names by hand: a hand-set size is for its font.
  3. Read the label list, `map-review-overview.jpg` and the sheets. Correct wordings, boxes and
     placements in one pass, then measure, erase and letter again.
  4. `map_review.py sheet <book> --flagged`, and read that one sheet. Fix only what is plain.
  5. Write `style.txt` from what you have seen (no `# DRAFT` line left).
  Do not cut the map into tiles or zoom round after round: what is still fiddly goes on a short list
  of label indexes for the owner. On a Gemini round's check, read `labels.png` only; the owner judges
  the painting.
- **Tools print counts and label indexes, never wordings**; do the same in reports.
- The editor and the dashboard's jobs share one lock: one step runs at a time.
- A map's font is named in its `font.txt` (ADR 0004); the fonts and their credits are in `tools/fonts/`.

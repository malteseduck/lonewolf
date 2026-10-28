# Map labels and styles

Rules for work on a book's map, `<code>/` here. The root `AGENTS.md` applies as well.
`docs/reference/map-upscale.md` is the chain, step by step, and what each `tools/map_*.py` does.

- **Only our own files are committed here** (ADR 0042): `labels.json`, `style.txt`, `font.txt`,
  `labels-checked.txt`. The scan, its upscales and every working picture stay in `data/projectaon/`.
- **The owner corrects the OCR draft** of the labels by hand in `tools/map-editor.html`. After the
  draft, say it is ready for them and move on: do not open the map, overlays or zooms to review it
  unless asked. Help with the particular names they ask about.
- **Tools print counts and label indexes, never wordings**; do the same in reports.
- The editor and the dashboard's jobs share one lock: one step runs at a time.
- A map's font is named in its `font.txt` (ADR 0004); the fonts and their credits are in `tools/fonts/`.

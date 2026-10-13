# Book import checklist

Every step a book goes through, in order, and where each book stands. The procedures are in the
files named under each step; what is left inside a step (counts, sections) is shown by the import
dashboard (`tools/admin/`). Work outside the steps is in `docs/plan.md`.

**The table is generated: do not edit it.** `tools/book_status.py` works each step out from the
files on disk (steps 1, 2, 5, 8, 9, and the file halves of 4 and 7) or from `docs/book-status.json`
(steps 3, 4, 6, 7, which no file can show), and rewrites the table whenever a step is marked.
When a step is finished, run `python tools/book_status.py done <book> <step>` (or use Mark done in
the dashboard, `http://localhost:8766/tools/admin/`); for a step read from the files it checks the
files instead and says what is missing. `undo` takes a hand mark back. See
`docs/reference/dashboard.md`.

✅ done · ⬜ not yet · ⚠️ the files and the status disagree, or out of date · ❌ fails a check · ➖ not needed for this book

<!-- status table: written by tools/book_status.py from the files and docs/book-status.json; do not edit by hand -->
| Step | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Getting the book** | | | | | | | | | | | | | | | | | | | | |
| 1. Downloaded | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2. Imported; report clean (no broken links, no section without a way on) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| 3. Importer reads the book's own phrasings (gates, Random Number, combat) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| 4. Rules addendum written, Engine column true | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| **Items** | | | | | | | | | | | | | | | | | | | | |
| 5. Item table (`items-<code>.js`): read, `check_items.mjs` clean, registered | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| **Play** | | | | | | | | | | | | | | | | | | | | |
| 6. Played through with test characters; misreadings and item gaps fixed | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| **Pictures** | | | | | | | | | | | | | | | | | | | | |
| 7. Every enemy has a fight picture (importer: "0 with none"), shown to the owner on one sheet, changes made | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| 8. Printed map repainted, labels checked, `map-4k.webp` made and shown in the player | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| 9. Illustrations upscaled 2x (`<name>-2x.webp` beside each) and shown in the player | ⬜ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
<!-- end of status table -->

Books: 1 Flight from the Dark · 2 Fire on the Water · 3 The Caverns of Kalte · 4 The Chasm of Doom ·
5 Shadow on the Sand · 6 The Kingdoms of Terror · 7 Castle Death · 8 The Jungle of Horrors ·
9 The Cauldron of Fear · 10 The Dungeons of Torgar · 11 The Prisoners of Time · 12 The Masters of
Darkness.

## Where each step is done

Each step's buttons and prompt are in the dashboard, `http://localhost:8766/tools/admin/`.

1. `tools/fetch_projectaon.py <code>`. Needs the owner's go-ahead for each book. Read from the files.
2. `tools/import_projectaon.py <code>`, then read its report. Needs the owner's go-ahead too.
   Read from the files; out of date (a warning) once the importer or a source page is newer than `book.js`.
3. `docs/reference/importer.md`. After any importer change, `python tools/check_all.py`: no book's
   report may get worse. A hand mark.
4. `docs/reference/rules-books.md`, "Book addenda", from the book's own rules pages. Its heading is read
   from the file; that it is checked is a hand mark.
5. `docs/reference/items.md`. Where the text leaves a choice to the player, a `todo`, never a guess.
   In the Magnakai books, mark ambushes and bow shots. Read from the files: registered in `main.js`,
   `node tools/check_items.mjs <code> --json` clean.
6. Play in the browser on a test address (`http://127.0.0.1:8766/`), never over the owner's saves.
   A hand mark (the agent's).
7. `docs/reference/items.md`, "Fight pictures": every enemy has a plate of its own or a `plates.json`
   match (read from the files), then the owner looks at the picture sheet,
   inline in the dashboard (step 7, "Open picture sheet"), picks changes, and may supply drawings (kept in git-ignored
   `art/plates/`). The mark is the owner's, and takes only once every enemy has a picture.
8. `docs/reference/map-upscale.md`. Never overwrite `map.png`: it is the original.
    Read from the files: done once `map-4k.webp` exists and `book.js` names it (a re-import).
9. `tools/ill_upscale.py <code>` (the dashboard's Upscale illustrations), then a re-import. Never
   overwrite an original: each `<name>-2x.webp` sits beside its `.png` (ADR 0033). Read from the files:
   done once every illustration has its WebP and `book.js` names them.

## Notes

- Per-book things no step asks for (weapon bonuses left as text, files to delete) are under "Book
  notes outside the steps" in `docs/plan.md`.

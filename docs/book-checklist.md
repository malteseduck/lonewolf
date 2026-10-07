# Book import checklist

Every step a book goes through, in order, and where each book stands. Tick a step only when it is
finished and checked; untick it if later work undoes it. The procedures are in the files named
under each step; what is left inside a step (counts, sections) is in `docs/plan.md`.

✅ done · ⬜ not yet · ➖ not needed for this book

| Step | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Getting the book** | | | | | | | | | | | | |
| 1. Downloaded | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2. Imported; report clean (no broken links, no section without a way on) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 3. Importer reads the book's own phrasings (gates, Random Number, combat) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4. Rules addendum written, Engine column true | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Items and fights** | | | | | | | | | | | | |
| 5. Item table (`items-<code>.js`): read, `check_items.mjs` clean, registered | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6. Every enemy has a fight picture (importer: "0 with none") | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 7. Fight pictures shown to the owner on one sheet, changes made | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| **Playing it** | | | | | | | | | | | | |
| 8. Played through with test characters; misreadings and item gaps fixed | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 9. The owner has played it and is happy | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| **Pictures** | | | | | | | | | | | | |
| 10. Printed map repainted, labels checked, `map-4k.webp` made and shown in the player | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

Books: 1 Flight from the Dark · 2 Fire on the Water · 3 The Caverns of Kalte · 4 The Chasm of Doom ·
5 Shadow on the Sand · 6 The Kingdoms of Terror · 7 Castle Death · 8 The Jungle of Horrors ·
9 The Cauldron of Fear · 10 The Dungeons of Torgar · 11 The Prisoners of Time · 12 The Masters of
Darkness.

## Where each step is done

1. `tools/fetch_projectaon.py <code>`. Needs the owner's go-ahead for each book.
2. `tools/import_projectaon.py <code>`, then read its report. Needs the owner's go-ahead too.
3. `docs/reference/importer.md`. Re-import Books 1 and 2 after any importer change and check their
   reports did not get worse.
4. `docs/reference/rules-books.md`, "Book addenda", from the book's own rules pages.
5. `docs/reference/items.md`. Where the text leaves a choice to the player, a `todo`, never a guess.
   In the Magnakai books, mark ambushes and bow shots.
6. `docs/reference/items.md`, "Fight pictures". The importer's report counts the enemies with none.
7. A sheet of every enemy's picture in the browser (as done for Books 1 and 2); the owner picks
   changes, and may supply drawings (kept in git-ignored `art/plates/`).
8-9. Play in the browser on a test address (`http://127.0.0.1:8765/`), never over the owner's saves.
10. `docs/reference/map-upscale.md`. Never overwrite `map.png`: it is the original.
    Tick only once the player shows `map-4k.webp`, which needs that step's code change first.

## Notes

- Books 3-12: what each import report left (Random Number draws for the item table, puzzles,
  weapon bonuses left as text) is under steps 2.1-2.10 of `docs/plan.md`.

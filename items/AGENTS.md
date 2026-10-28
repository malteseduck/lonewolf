# Item tables

Rules for work on a book's item table, `items-<code>.js` (ruling R14). The root `AGENTS.md` applies as
well. `docs/reference/items.md` is the method, step by step; `docs/reference/book-format.md` ("Item
tables") the fields; `docs/reference/rules-books.md` the books' rules.

- **Start from the draft**: `node tools/items_draft.mjs <book>`, on the sections
  `tools/item_sections.py <book>` lists. Then read every listed section, and search the whole book for
  each of its item names: items are lost in sections with no item wording.
- **A choice the text leaves to the player is a `todo`, never a guess.** Automate only what is
  certain; the rest stays text with the by-hand controls.
- **The table holds only the book's short item names**; every note is in our own words.
- **Check**: `node tools/check_items.mjs <book>` must report no errors, and every section it lists as
  left out must be one that was read and judged to need nothing. Then `tools/check_all.py`.
- **Try it** in the page through the console hook, storage off; a new table is registered in
  `ITEM_TABLES` in `main.js`.
- Mark the step with `tools/book_status.py done <book> <step>` and report what it prints.

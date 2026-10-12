/* The "copy prompt" texts: one per stage that needs an agent's judgement. Each is self-contained, so
   it can be pasted into a fresh Claude Code session. They name sections by id and give counts only,
   never the book's words. `b` is a book's status from admin.js. */

const HEAD = (b) => `Lone Wolf player, C:\\Projects\\lone-wolf. Read AGENTS.md first and keep its hard rules: no Project Aon text in anything you write or say (section ids and counts only), no downloads I have not approved, automate only what is certain. Book ${b.n}, ${b.title} (${b.code}, ${b.series}).`;
const TAIL = 'Hand menial runs (importer, checkers, node --check) to a Sonnet subagent, as AGENTS.md says. Keep the matching reference doc current. The dashboard shows each book step, so add to docs/plan.md only what no step records (engine gaps, decisions, things for later). Do not commit; tell me what changed.';
// every book step ends by marking itself; for a step read from the files, done checks them and says what is missing
const DONE = (b, step) => `When the step is finished, run \`python tools/book_status.py done ${b.code} ${step}\` and include what it prints in your report (it rewrites the checklist table; if it says NOT done, finish what it names).`;

export const PROMPTS = {
  phrasings: (b) => `${HEAD(b)}

Task: docs/book-checklist.md step 3, "the importer reads the book's own phrasings (gates, Random Number, combat)".
- Last import, as the dashboard read book.js: ${b.imp ? `${b.imp.sections} sections, ${b.imp.fights} fights, ${b.imp.rnt} Random Number sections, ${b.imp.broken} broken links, ${b.imp.noway} with no way on` : 'not imported yet'}.
- Compare what tools/import_projectaon.py made of each section (data/projectaon/${b.code}/book.js) with the section pages for choice gates, Random Number ranges and combat lines it left as text but could read with certainty. Procedure and past results: docs/reference/importer.md.
- After any importer change, run \`python tools/check_all.py\` (it re-imports every imported book, compares each report with the last, and runs the unit tests; re-importing to check an importer change is part of this task). No book may get worse.
- Update docs/reference/importer.md (Results).
Report: the phrasings added, by section id, and the before and after report figures.
${DONE(b, 3)}
${TAIL}`,

  rules: (b) => `${HEAD(b)}

Task: docs/book-checklist.md step 4, the book's rules addendum.
- Read this book's own rules pages in data/projectaon/${b.code}/ (gamerulz.htm, discplnz.htm, equipmnt.htm, cmbtrulz.htm and those of levels.htm, lorecrcl.htm, imprvdsc.htm, kaiwisdm.htm present).
- ${b.rulesHeading ? `docs/reference/rules-books.md already has a "Book ${b.n}" addendum: check it against those pages and correct it.` : `Write "Book ${b.n}, ${b.title}" under "Book addenda" in docs/reference/rules-books.md.`} In our words, numbers as printed; list this book's specifics in full, never "as Book N".
- Keep its Engine column true: what the engine applies, what is left to the player. The starting kit belongs in LW.KITS (shared/rules-series.js); change engine code only if I agree.
${DONE(b, 4)}
${TAIL}`,

  items: (b) => `${HEAD(b)}

Task: docs/book-checklist.md step 5, the item table, by docs/reference/items.md (read all of it).
- ${b.items.exists ? `items-${b.code}.js exists (${b.items.todos} todo entries${b.items.registered ? ', registered in main.js' : ', NOT yet registered in main.js ITEM_TABLES'}). Re-read it against the reading list and finish what is missing.` : `There is no items-${b.code}.js yet. Write it.`}
- The reading list is data/projectaon/${b.code}/items-reading.txt (the dashboard's "Reading copy" step makes it: tools/reading_copy.py then tools/item_sections.py).
- Where the text leaves a choice to the player, write a todo, never a guess.${b.series === 'magnakai' ? ' This is a Magnakai book: mark ambushes and bow shots.' : ''} One id per object across books.
- Icons from game-icons.net via tools/fetch_icons.py are part of this step: fetch the ones the new items need and credit them in assets/icons/README.txt.
- node tools/check_items.mjs ${b.code} --json must be clean; register the table in main.js ITEM_TABLES.
Report: sections with entries, book items, todos, sections left out.
${DONE(b, 5)}
${TAIL}`,

  itemsFix: (b) => `${HEAD(b)}

Task: node tools/check_items.mjs ${b.code} reports errors. Run it with --json, fix each error in items-${b.code}.js by reading the sections it names (docs/reference/items.md), and run it again until clean. Change nothing the checker did not flag. Report the errors fixed by section id.
${DONE(b, 5)}
${TAIL}`,

  pictures: (b) => `${HEAD(b)}

Task: docs/book-checklist.md step 6, a fight picture for every enemy.
- The dashboard counts ${b.imp ? `${b.imp.bare} of ${b.imp.kinds} kinds of enemy with no picture` : 'an unknown number of enemies with no picture'} (book.js plates plus assets/plates/plates.json, as the importer's report does).
- Follow docs/reference/items.md, "Fight pictures": the owner's pictures in art/plates/ first, then this book's own illustrations, then another book's only for plain humans, then a free engraving (ask me before downloading any).
- plates.json is read at play time, so no re-import is needed; the dashboard's sheet, http://localhost:8766/tools/admin/fights.html?book=${b.code}, shows every enemy as the player would. Marking step 6 done is mine, after I have looked at that sheet: do not mark it.
When every enemy has a picture, run \`python tools/book_status.py show ${b.code}\` and include its step 6 line in your report (it should say all have a picture, waiting for my look).
${TAIL}`,

  testplay: (b) => `${HEAD(b)}

Task: docs/book-checklist.md step 7, play the book through with test characters.
- Use http://127.0.0.1:8766/ (not localhost: a different origin, so my saves are not touched) and switch storage writes off first. The console hook is in AGENTS.md (__lw.game, __lw.render).
- Step every section; try every gate, fight and Random Number draw against the text; reach section 350 at least once.${b.items.todos != null ? ` The item table leaves ${b.items.todos} todos to the player: check each still reads right on the page.` : ''}
- Fix misreadings in the importer (then \`python tools/check_all.py\`; no book may get worse) or in items-${b.code}.js; list what stays left to the player, by section id.
- Add what stays left to the player, if the engine could take it over, to docs/plan.md's engine work list.
${DONE(b, 7)}
${TAIL}`,

  mapStyle: (b) => `${HEAD(b)}

Task: write maps/${b.code}/style.txt, the opening of this book's Gemini repaint prompt (docs/reference/map-upscale.md, step 5). Look at data/projectaon/${b.code}/map.png and its key once, and read what the book says of its lands: each region's ground, its trees as drawn, and what must not appear. Our own words, a few short lines like the other books' style.txt. Then tell me: the map editor's Gemini step picks it up.
${TAIL}`,

  mapRetype: (b) => `${HEAD(b)}

Map editor, step 3, book ${b.code}: in maps/${b.code}/labels.json, untick "retype" on every label that is not a place name (the title, banner, panel captions, key and scale wording, which Gemini copies as drawn), and check that the labels already unticked are not place names. Judge from the wording and the boxes only: do not open the map image. If a label could be either, leave it as it is and ask me. Change only the retype ticks: no wording, boxes or other fields. Write the file back in its current format, then list what you changed by index. I mark the labels checked in the editor myself.`,

  newBook: (b) => `${HEAD(b)}

Task: Book ${b.n} is downloaded but the importer does not know it yet (tools/import_projectaon.py, BOOKS). It is a ${b.series} book${b.series === 'grand master' ? ', and the engine has no Grand Master rules: read its rules pages and tell me what the series would need (docs/reference/rules-books.md, rules-engine.md) before any code' : ''}. Propose the importer change; do not import until I say so (the dashboard's Import button asks me).
${TAIL}`,
};

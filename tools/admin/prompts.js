/* The "copy prompt" texts: one per stage that needs an agent's judgement, pasted into a fresh Claude Code
   session in the project, which loads AGENTS.md (through CLAUDE.md) by itself: so they do not repeat its
   rules, only what is particular to the step. They name sections by id and give counts only, never the
   book's words. `b` is a book's status from admin.js. */

const HEAD = (b) => `Book ${b.n}, ${b.title} (${b.code}, ${b.series}).`;
const TAIL = 'Do not commit; tell me what changed.';
// every book step ends by marking itself; for a step read from the files, done checks them and says what is missing
// a step's script is a head start, never the whole job (ADR 0036): the agent judges its output and catches
// what it cannot know; what is new is taught to the importer or written in the table, never added to the script
const START = 'The script covers only the cases it was written for; it is not the whole job. Judge what it gives, then make your own pass for what it cannot know (wording or cases nobody anticipated). Do not extend the script to catch one book\'s case: fix the thing itself (the importer, the table), and tell me if a kind of miss keeps coming back.';
const DONE = (b, step) => `When the step is finished, run \`python tools/book_status.py done ${b.code} ${step}\` and include what it prints in your report (it rewrites the checklist table; if it says NOT done, finish what it names).`;

export const PROMPTS = {
  phrasings: (b) => `${HEAD(b)}

Task: docs/book-checklist.md step 3, "the importer reads the book's own phrasings (gates, Random Number, combat)".
- Last import, as the dashboard read book.js: ${b.imp ? `${b.imp.sections} sections, ${b.imp.fights} fights, ${b.imp.rnt} Random Number sections, ${b.imp.broken} broken links, ${b.imp.noway} with no way on` : 'not imported yet'}.
- The job: find the choice gates, Random Number ranges and combat rules that tools/import_projectaon.py left as text in data/projectaon/${b.code}/book.js but could read with certainty, and teach it them. Procedure and past results: docs/reference/importer.md.
- First, the scan: python tools/phrasings_scan.py ${b.code} --json (the dashboard's "Scan phrasings")${b.phrasings && !b.phrasings.stale ? `, which last listed ${b.phrasings.look.length} sections to look at${b.phrasings.look.length ? ` (${b.phrasings.look.join(', ')})` : ''}` : ''}. It runs the importer's own readers over book.js and lists, by kind, what has the known shapes of a gate, a draw or a combat rule left as text: judge each "look" section against its page (teach the importer the phrasing when it can be read with certainty, else say why it is rightly left); the "design" kinds are the item table's or the player's, not this step's.
- Then your own pass, for wording the scan does not know: search data/projectaon/${b.code}/reading.txt (one "#N" block per section) for the rules' words (the series' discipline and rank names, Lore-circle, Random Number, COMBAT SKILL, ENDURANCE, evade, immune, round) and skim the hits in sections where book.js read nothing of that kind (no need on a choice, no rnt, no combat field). A few searches and short excerpts, not a read of every section.
- ${START}
- After any importer change, run \`python tools/check_all.py\` (it re-imports every imported book, compares each report with the last, and runs the unit tests; re-importing to check an importer change is part of this task). No book may get worse.
- Update docs/reference/importer.md (Results).
Report: the phrasings added, by section id; each "look" section the scan still lists and why it is rightly left; what your own pass found that the scan did not, by section id and kind; the before and after report figures. Run the scan again with --json at the end, so the dashboard shows what is left.
${DONE(b, 3)}
${TAIL}`,

  rules: (b) => `${HEAD(b)}

Task: docs/book-checklist.md step 4, the book's rules addendum.
- First, the diff: python tools/rules_diff.py ${b.code} --json (the dashboard's "Diff rules")${b.rulesDiff && !b.rulesDiff.stale ? `, which last listed ${b.rulesDiff.look} paragraphs to read against ${b.rulesDiff.against || 'nothing'}` : ''}. It compares each rules page with the previous book's, paragraph by paragraph, and writes beside the book rules-diff.txt (the changed and new paragraphs, old and new) and rules-draft.md (a skeleton addendum: the gold, the kit's choice and list, the footnotes' sections, the rest todo). Read every paragraph rules-diff.txt lists, and the footnotes and the kit's first paragraph, which it does not compare; the skeleton is a head start, not the addendum.
- Then the book's own rules pages in data/projectaon/${b.code}/ where the diff leaves you unsure (gamerulz.htm, discplnz.htm, equipmnt.htm, cmbtrulz.htm and those of levels.htm, lorecrcl.htm, imprvdsc.htm, kaiwisdm.htm present), and the previous book's addendum in rules-books.md for what carried over unchanged.
- ${b.rulesHeading ? `docs/reference/rules-books.md already has a "Book ${b.n}" addendum: check it against those pages and correct it.` : `Write "Book ${b.n}, ${b.title}" under "Book addenda" in docs/reference/rules-books.md.`} In our words, numbers as printed; list this book's specifics in full, never "as Book N".
- Keep its Engine column true: what the engine applies, what is left to the player. The starting kit belongs in LW.KITS (shared/rules-series.js); change engine code only if I agree.
${DONE(b, 4)}
${TAIL}`,

  items: (b) => `${HEAD(b)}

Task: docs/book-checklist.md step 5, the item table, by docs/reference/items.md (read all of it).
- ${b.items.draft ? `items-${b.code}.js is the script's draft (tools/items_draft.mjs, the dashboard's "Draft table"; ${b.items.todos} todo entries). Start from it: its readings are the plain ones (Gold Crowns, Meals and known items found or lost, Endurance on arrival, gates on a known item or a fee); check them, and replace every todo it wrote ("...: as the text says") by reading that section. Then read the rest of the reading list, which the draft does not cover (the book's own items, fights, rolls, bow shots, marks). Take out the file's first line (// DRAFT ...) when done. ${START}`
    : b.items.exists ? `items-${b.code}.js exists (${b.items.todos} todo entries${b.items.registered ? ', registered in main.js' : ', NOT yet registered in main.js ITEM_TABLES'}). Re-read it against the reading list and finish what is missing.`
    : `There is no items-${b.code}.js yet. Make the draft first: node tools/items_draft.mjs ${b.code} (the dashboard's "Draft table"), then refine it as below.`}
- The reading list is data/projectaon/${b.code}/items-reading.txt (the dashboard's "Reading copy" step makes it: tools/reading_copy.py then tools/item_sections.py).
- Where the text leaves a choice to the player, write a todo, never a guess.${b.series === 'magnakai' || b.series === 'grand master' ? ` This is a ${b.series === 'magnakai' ? 'Magnakai' : 'Grand Master'} book: mark ambushes and bow shots.` : ''} One id per object across books.
- Icons from game-icons.net via tools/fetch_icons.py are part of this step: fetch the ones the new items need and credit them in assets/icons/README.txt.
${b.playable === false
    ? `- node tools/check_items.mjs ${b.code} --json must be clean. Do NOT register the table in main.js ITEM_TABLES: the engine has no ${b.series} rules yet (docs/plan.md, ADR 0036), so the step stays short of done until then. Write nothing that needs those rules; leave it as a todo.
Report: sections with entries, book items, todos, sections left out, what you found that the draft did not, and what waits for the engine's ${b.series} rules.`
    : `- node tools/check_items.mjs ${b.code} --json must be clean; register the table in main.js ITEM_TABLES.
Report: sections with entries, book items, todos, sections left out, what you found that the draft did not.
${DONE(b, 5)}`}
${TAIL}`,

  itemsFix: (b) => `${HEAD(b)}

Task: node tools/check_items.mjs ${b.code} reports errors. Run it with --json, fix each error in items-${b.code}.js by reading the sections it names (docs/reference/items.md), and run it again until clean. Change nothing the checker did not flag. Report the errors fixed by section id.
${DONE(b, 5)}
${TAIL}`,

  pictures: (b) => `${HEAD(b)}

Task: docs/book-checklist.md step 7, a fight picture for every enemy.
- The dashboard counts ${b.imp ? `${b.imp.bare} of ${b.imp.kinds} kinds of enemy with no picture` : 'an unknown number of enemies with no picture'} (book.js plates plus assets/plates/plates.json, as the importer's report does).
- Start from the script's draft: python tools/plates_draft.py ${b.code} (the dashboard's "Draft pictures", run after python tools/ill_index.py) gives each enemy with no picture one by that order and enters it in plates.json with "draft" saying where from, and lists those it found none for. Check its picks (a picture "1 link before the fight" is a guess; a match by name can be the wrong creature) and replace any that are wrong; leave the draft field on those you keep, as the sheet's Adjust is mine. Then find the ones it left. ${START}
- Follow docs/reference/items.md, "Fight pictures": the fight's own picture; else the same creature in this book (any illustration, fight pictures too); else the same creature in another book; else a stand-in: my pictures in art/plates/, the library, or one found by searching (ask me before downloading any). Plain humans may take another book's humans or a stand-in alike (ADR 0008). Find the creature in data/projectaon/ill-index.json (python tools/ill_index.py) by name.
- Every picture and every enemy should say what it is (ADR 0008), in our own words: each of the book's illustrations (small ones too) and each picture its fights use an "about" in data/projectaon/ill-about.json (who or what, at which moment, as the book has it: read its section and those around it; else the wiki; a stand-in says what it stands for), and each kind of enemy an entry in data/projectaon/foe-about.json under the book's code (what it is by the book, whatever its picture, where it is met and fought), which the picture sheet shows. Re-run python tools/ill_index.py; --missing lists the pictures without.
- plates.json is read at play time, so no re-import is needed; the picture sheet shows every enemy as the player would. Open it inside the dashboard, http://localhost:8766/tools/admin/: Book ${b.n}'s row, step 7, "Open picture sheet" (fights.html at its own address shows nothing). Marking step 7 done is mine, after I have looked at that sheet: do not mark it.
When every enemy has a picture, run \`python tools/book_status.py show ${b.code}\` and include its step 7 line in your report (it should say all have a picture, waiting for my look).
${TAIL}`,

  testplay: (b) => `${HEAD(b)}

Task: docs/book-checklist.md step 6, play the book through with test characters.
- First, the walk: node tools/walk_book.mjs ${b.code} --json (the dashboard's "Walk the book")${b.walk && !b.walk.stale ? `, which last listed ${b.walk.look.length} sections to look at${b.walk.look.length ? ` (${b.walk.look.join(', ')})` : ''}, ${b.walk.reached} of ${b.walk.sections} reached` : ''}. It plays every section with the engine in Node, for two stand-in characters, and lists by id: crashes, gates that never open (or open only with an item found nowhere), sections with no way on, endless fights, sections never reached; the fights no stand-in won are listed apart. Judge each against the section pages and fix what is wrong; what the walk cannot see (whether a gate, a draw or a fight reads right) is the play-through's.
- Use http://127.0.0.1:8766/ (not localhost: a different origin, so my saves are not touched) and switch storage writes off first. Reach a state with the console hook (__lw.game, __lw.render).
- Step every section; try every gate, fight and Random Number draw against the text; reach section 350 at least once.${b.items.todos != null ? ` The item table leaves ${b.items.todos} todos to the player: check each still reads right on the page.` : ''}
- Fix misreadings in the importer (then \`python tools/check_all.py\`; no book may get worse) or in items-${b.code}.js; list what stays left to the player, by section id. Run the walk again with --json at the end, so the dashboard shows what is left.
- Add what stays left to the player, if the engine could take it over, to docs/plan.md's engine work list.
${DONE(b, 6)}
${TAIL}`,

  mapStyle: (b) => `${HEAD(b)}

Task: write maps/${b.code}/style.txt, the opening of this book's Gemini repaint prompt (docs/reference/map-upscale.md, step 5). Start from the script's draft: uv run --project tools python tools/map_labels.py style maps/${b.code}/labels.json (the dashboard's "Draft style"; it writes style.txt only where there is none or only its draft) reads the map's title and its key's kinds of ground from the label list into stock sentences, and names in its first line any key entry it had no sentence for. Keep what is right, and delete that first line when done. Look at data/projectaon/${b.code}/map.png and its key once, and read what the book says of its lands: each region's ground, its trees as drawn, and what must not appear. Our own words, a few short lines like the other books' style.txt. Then tell me: the map editor's Gemini step picks it up.
${TAIL}`,

  mapRetype: (b) => `${HEAD(b)}

Map editor, step 3, book ${b.code}: in maps/${b.code}/labels.json, untick "retype" on every label that is not a place name (the title, banner, panel captions, key and scale wording, which Gemini copies as drawn), and check that the labels already unticked are not place names. Start from the script: uv run --project tools python tools/map_labels.py retype maps/${b.code}/labels.json (the editor's Untick captions) unticks what is surely not a place name and lists it by index; judge what it missed. Judge from the wording and the boxes only: do not open the map image. If a label could be either, leave it as it is and ask me. Change only the retype ticks: no wording, boxes or other fields. Write the file back in its current format, then list what you changed by index. I mark the labels checked in the editor myself.`,

  newBook: (b) => `${HEAD(b)}

Task: Book ${b.n} is downloaded but the importer does not know it yet (tools/import_projectaon.py, BOOKS). First, the script: python tools/add_book.py ${b.code} (the dashboard's "Add to importer") writes its BOOKS entry from the catalogue (number, series, title). Then check what the entry cannot: read the book's rules pages for discipline, rank or Lore-circle names the importer's DISC, RANKS and CIRCLES lack, and anything else the importer would misread${b.series === 'grand master' ? '; the Grand Master engine work still to do is in docs/plan.md (G1-G7): say if this book adds to it' : ''}. Propose any importer change beyond the entry; do not import until I say so (the dashboard's Import button asks me).
${TAIL}`,
};

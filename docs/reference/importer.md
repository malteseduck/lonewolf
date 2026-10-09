# Downloader and importer

Two Python scripts, standard library only. Run from the project root, one book at a time.

```sh
python tools/fetch_projectaon.py 01fftd
python tools/import_projectaon.py 01fftd
```

Output goes to `data/projectaon/`, which is git-ignored and must stay on the owner's machine.
Fetching a book is a download: get the owner's go-ahead first (see `CLAUDE.md`).

## fetch_projectaon.py

Source: `https://www.projectaon.org/en/xhtml/lw/<code>/`.

Fetches `license.htm`, `tssf.htm`, `map.htm`, the rules pages (`RULES`: game rules, disciplines,
equipment, combat, levels, Lore-circles, improved disciplines, Kai wisdom, the combat summary, the
two tables, errata, footnotes; a Kai book has no Lore-circle or improved-discipline page), then
`sect1.htm`, `sect2.htm`, ... until a section is missing, then every image referenced inside those
pages' `<article>`, plus `map.png`. The importer writes `map: 'map-4k.webp'` when that file
exists (made by hand, `docs/reference/map-upscale.md`), else `map.png`. `--rules` fetches only the rules pages, for a book already
downloaded (all twelve were, 2026-10-02, for docs/reference/rules-books.md).
Skips files already on disk, waits 0.15 s between requests, retries three times.
Prints section count, image count and total size.

Book codes: `01fftd 02fotw 03tcok 04tcod 05sots` (Kai),
`06tkot 07cd 08tjoh 09tcof 10tdot 11tpot 12tmod` (Magnakai). All twelve are fetched and imported
(Books 3-12 imported 2026-10-03).

## import_projectaon.py

Reads every `sect*.htm` in the book's folder and writes:

- `data/projectaon/<code>/book.js`: `LW.BOOKS[code] = {...}` in the shape in `book-format.md`
- `data/projectaon/index.js`: one `document.write('<script ...>')` per imported book. `index.html`
  loads this single file.

It works on the contents of `<div class="maintext">`, in document order:

| Markup | Becomes |
|---|---|
| `<p>` | a paragraph of `text` (tags and Project Aon's footnote marks stripped, entities decoded; a `<br>` starts a new paragraph) |
| `<li>` | a paragraph of its own, starting with a dash (lists of wares and finds) |
| `<div class="signpost">` | a paragraph (a sign the story shows) |
| `<blockquote>` with no `<p>` inside | verse: a paragraph per line (Book 4) |
| `<p class="deadend">` | a paragraph, and `end: 'death'` |
| `<p class="choice">` with `<a href="sectN.htm">` | a choice to N with the paragraph as its text |
| `<p class="choice">` with no section link | a paragraph; if the section has no other way on, `end: 'failed'` (Book 3's 61, a mission given up) |
| `<p class="puzzle">` | a paragraph, and `puzzle: true`: the answer is a section number (Books 5, 7-9) |
| `<p class="combat">` "Name: COMBAT SKILL n ENDURANCE m" | an enemy; also "ENDURANCE (RESISTANCE points) m", a door fought as one (Book 6 156, Book 7 214). Not "(TARGET points)": Book 6's archery contest leaves his Endurance alone |
| `<img src>` | `img`, `full` when the file name starts with `ill` |
| a link to `random.htm` anywhere | the section needs a Random Number |

Heuristics layered on top, all by regular expression:

- **Conditions** (`condition()`): the "If you ..." of a rule, read only when it is wholly made of
  disciplines ("of X", "of either X or Y" = any, "of X and Y" = all), a rank ("reached the Kai rank
  of Guardian or higher", mapped to a discipline count), Lore-circles ("completed the (Magnakai) Lore-circle
  of Fire", "possess the Lore-circle of ...") and, for Random Number bonuses, his Endurance ("your current ENDURANCE point total is
  less than 10"), joined by "and have ...". Anything else in it (an item, a weapon in hand, "or have
  reached") and the rule is not read. Written as in book-format.md, Conditions.
- **Gates** (`gate()`): the choice's condition, up to its first comma or "turn to". Negative
  phrasings ("if you do not have", "have yet to", "neither") are left open. "X, or have reached the rank of Y" (parts joined by "or (if you) have/possess/reached/attained") is split and each part read as a condition; if all parse, `need: {any: [...]}`, else the choice is left open. A
  looser reading still gates "If you wish to use the Kai Discipline of X ...".
- **Random Number ranges** (`span()`): "0–4", "−2–+3" (the books' minus sign), "5 or more" / "or
  higher", "4 or less", "below 7", "above 6", or a single number. Not in a choice about ENDURANCE
  or COMBAT SKILL.
- **Random Number bonuses** (`number_rules()`): each sentence that adds to or takes from the number
  must be "If <condition>, add / deduct N (to the number)", "add another / a further N", or "add 1
  for every Magnakai Discipline you possess (above the first three)". A parenthesis "if you have
  both, add only N" is taken as read; "(for example ...)" is skipped. Anything else (an item, a
  bow's "missile bonuses", a weapon, "0 = 10") leaves the section `free`.
- **auto or free**: `auto` when the bonuses were all read, every total they can make is covered by
  exactly one choice's range, and every choice without a range is an "If you have / possess ..."
  taken instead of drawing. Otherwise `free`, and the ranges are dropped.
- **Evasion**: a choice containing "evade" (or a door's "cease 'combat'") becomes the fight's evade exit (not "if you lose any ENDURANCE, even when attempting to evade, turn to
  ...", which stays a choice shown after the fight: Book 3's 138, 263, Book 4's 133); "after N rounds",
  "after the first round" and "until the beginning of the third round" set the wait; "in the first
  round of combat only" sets `within: 1`.
- **Mind immunity**: "immune to Mindblast / Psi-surge" in the section; "immune to Mindblast (but
  not Psi-surge)" makes it `'mindblast'`.
- **Mind drain**: "Unless you possess the Discipline of Mindshield (Psi-screen in a Magnakai
  book), deduct N ENDURANCE points every round" sets each enemy's `drain`.
- **Combat Skill adjustment** (`cs_rule()`): one sentence that adds to, deducts from or reduces
  "your COMBAT SKILL" for the fight, taken as `csMod`, with "If you have X," (or "If you have X you may ...", no comma) as `csIf` and
  "unless you have X" as `csUnless` (disciplines, a rank, Lore-circles). "add an additional / a
  further / an extra N" counts. Sentences are not split after "i.e." or "e.g.". Left as text: a change for some rounds only, one
  "instead of" the engine's own bonus, one from a weapon's or item's power (its own bonus may count
  it), one with any other condition, and a section with two.
- **Forced Meal**: "must (also) (now) eat a Meal", "Unless you eat a Meal now".
- **Victory**: the highest-numbered section.
- **Enemy plates**: an enemy uses the full-page illustration of its own section if there is one;
  otherwise one from a section where the same kind of enemy is both fought and pictured; otherwise
  an entry in `PLATE_FIXES` (checked by eye, Book 1 only so far); otherwise none, and the player
  looks the name up in `assets/plates/plates.json` at play time (see interface.md, Art pipeline).

It also reads `tssf.htm` ("The Story So Far") into `intro`: every `<p>` in
`<div class="frontmatter">` except the ones holding a link (the last only points on to the game
rules). Checked on all twelve downloaded books (2026-10-01): 4 to 10 paragraphs each, no markup
beyond inline `<i>` and `<cite>`.

The report it prints is the check that a book imported sanely: section count, combats, auto (and
how many with bonuses) and free Random Number sections, discipline, rank and Lore-circle gates,
illustrations, dead ends, failed endings, puzzles, forced Meals, paragraphs of introduction (0
means `tssf.htm` is missing); then the fights: how many with a COMBAT SKILL change (and on a
discipline), with a foe immune to the mind (to Mindblast only), with a mind drain, with evasion;
then kinds of enemy (with a plate from the book, from the plate library (entries for any book or
for this one), and with none, named: add those to `plates.json`), broken links, and sections with
no way on and no ending (a puzzle counts as a way on). The last two should be empty.

The same figures go to `data/projectaon/<book>/import-report.json` (counts, and the ids of broken
links and sections with no way on; no names or text), since 2026-10-08. After changing the importer,
`python tools/reimport_all.py` re-imports every imported book and compares each one's figures with
the import before: more broken links, sections with no way on or enemies with no picture, or fewer
sections, is "worse" (exit 1); anything else that moved is listed to look at. The dashboard
(`docs/reference/dashboard.md`) shows a book's import as out of date once the importer or a source
page is newer than its `book.js`.

## What it does not read

Item and gold pick-ups, losses, Endurance changes stated in prose, shops, conditional combat
rules beyond the ones above (first-round penalties, unarmed rounds, doubled psychic bonuses), bow
shots and their "missile bonuses", item or weapon conditions on a Random Number, gold or Endurance
counted from the number, starting equipment. These stay as text;
the player applies them with the by-hand controls, or a book's item table does.

## Results (for comparison when changing the importer)

As of 2026-10-03. Random: auto (with bonuses) / free. Gates: discipline / rank / Lore-circle.
Fights: with a COMBAT SKILL change / with a foe immune (to Mindblast only) / with a drain / with
evasion. Every book: no broken links, none without a way on.

| Book | Sections | Combat | Random | Gates | Illustrated | Dead / failed | Puzzles | Meals | Fights | Enemies: book / library / none |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 350 | 29 | 17 (0) / 4 | 31 / 0 / 0 | 59 | 16 / 0 | 0 | 5 | 7 / 4 (0) / 0 / 7 | 15 / 9 / 0 |
| 2 | 350 | 31 | 22 (1) / 5 | 32 / 0 / 0 | 52 | 18 / 0 | 0 | 7 | 2 / 9 (0) / 0 / 11 | 4 / 31 / 0 |
| 3 | 350 | 30 | 27 (11) / 6 | 38 / 2 / 0 | 54 | 19 / 1 | 0 | 2 | 0 / 10 (0) / 2 / 3 | 3 / 0 / 14 |
| 4 | 350 | 45 | 30 (12) / 4 | 21 / 7 / 0 | 57 | 14 / 0 | 0 | 13 | 1 / 5 (0) / 0 / 10 | 5 / 22 / 5 |
| 5 | 400 | 39 | 29 (21) / 5 | 45 / 2 / 0 | 40 | 12 / 0 | 2 | 2 | 7 / 5 (0) / 0 / 4 | 13 / 7 / 8 |
| 6 | 350 | 26 | 10 (7) / 14 | 28 / 0 / 2 | 43 | 19 / 0 | 0 | 3 | 3 / 3 (1) / 0 / 12 | 7 / 4 / 10 |
| 7 | 350 | 38 | 14 (10) / 8 | 42 / 4 / 2 | 34 | 19 / 0 | 2 | 1 | 2 / 10 (8) / 0 / 8 | 8 / 1 / 14 |
| 8 | 350 | 37 | 13 (11) / 3 | 40 / 13 / 0 | 33 | 18 / 0 | 4 | 8 | 9 / 16 (13) / 0 / 6 | 9 / 0 / 12 |
| 9 | 350 | 38 | 13 (9) / 7 | 32 / 11 / 1 | 40 | 10 / 0 | 3 | 5 | 10 / 12 (7) / 0 / 8 | 10 / 11 / 7 |
| 10 | 350 | 43 | 19 (16) / 8 | 32 / 15 / 2 | 44 | 15 / 0 | 0 | 9 | 4 / 10 (10) / 0 / 5 | 14 / 1 / 15 |
| 11 | 350 | 40 | 19 (12) / 10 | 52 / 21 / 1 | 34 | 12 / 0 | 0 | 8 | 2 / 22 (21) / 0 / 4 | 4 / 3 / 18 |
| 12 | 350 | 65 | 30 (24) / 10 | 40 / 25 / 2 | 42 | 20 / 0 | 0 | 8 | 0 / 21 (15) / 2 / 9 | 10 / 9 / 20 |

Introductions: 7, 7, 9, 4, 10, 7, 10, 10, 8, 9, 8, 8 paragraphs. The free Random Number sections
left are those where the number counts gold or Endurance, plays a game, or is changed by a bow, a
weapon in hand, an item or a wound: work for each book's item table.

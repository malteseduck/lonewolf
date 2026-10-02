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

Fetches `license.htm`, `tssf.htm`, `map.htm`, then `sect1.htm`, `sect2.htm`, ... until a section
is missing, then every image referenced inside those pages' `<article>`, plus `map.png`.
Skips files already on disk, waits 0.15 s between requests, retries three times.
Prints section count, image count and total size.

Book codes: `01fftd 02fotw 03tcok 04tcod 05sots` (Kai),
`06tkot 07cd 08tjoh 09tcof 10tdot 11tpot 12tmod` (Magnakai). Only `01fftd` has been fetched.

## import_projectaon.py

Reads every `sect*.htm` in the book's folder and writes:

- `data/projectaon/<code>/book.js`: `LW.BOOKS[code] = {...}` in the shape in `book-format.md`
- `data/projectaon/index.js`: one `document.write('<script ...>')` per imported book. `index.html`
  loads this single file.

It works on the contents of `<div class="maintext">`, in document order:

| Markup | Becomes |
|---|---|
| `<p>` | a paragraph of `text` (tags stripped, entities decoded) |
| `<li>` | a paragraph of its own, starting with a dash (lists of wares and finds) |
| `<div class="signpost">` | a paragraph (a sign the story shows) |
| `<p class="deadend">` | a paragraph, and `end: 'death'` |
| `<p class="choice">` with `<a href="sectN.htm">` | a choice to N with the paragraph as its text |
| `<p class="combat">` "Name: COMBAT SKILL n ENDURANCE m" | an enemy |
| `<img src>` | `img`, `full` when the file name starts with `ill` |
| a link to `random.htm` anywhere | the section needs a Random Number |

Heuristics layered on top, all by regular expression:

- **Discipline gate**: choice text "If you have / possess / wish to use ... Kai|Magnakai Discipline
  of X". Negative phrasings ("if you do not have") are left open.
- **Rank gate**: "reached / attained the rank of X", mapped to a discipline count.
- **Random Number ranges**: "0-4" or a single digit in the choice text. The section is `auto` only
  if every choice has a range, the ranges cover 0-9, and the text has no "add / deduct ... number".
  Otherwise `free`.
- **Evasion**: a choice containing "evade" becomes the fight's evade exit; "after N rounds" sets
  the wait.
- **Mind immunity**: "immune to Mindblast / Psi-surge" in the section.
- **Combat Skill adjustment**: "Deduct N points from your COMBAT SKILL" / "Add N points to...".
- **Forced Meal**: "must eat a Meal".
- **Victory**: the highest-numbered section.
- **Enemy plates**: an enemy uses the full-page illustration of its own section if there is one;
  otherwise one from a section where the same kind of enemy is both fought and pictured; otherwise
  an entry in `PLATE_FIXES` (checked by eye, Book 1 only so far); otherwise none, and the player
  looks the name up in `assets/plates/plates.json` at play time (see interface.md, Art pipeline).

It also reads `tssf.htm` ("The Story So Far") into `intro`: every `<p>` in
`<div class="frontmatter">` except the ones holding a link (the last only points on to the game
rules). Checked on all twelve downloaded books (2026-10-01): 4 to 10 paragraphs each, no markup
beyond inline `<i>` and `<cite>`.

The report it prints is the check that a book imported sanely: section count, combats, auto and
free Random Number sections, gates, illustrations, dead ends, forced Meals, paragraphs of
introduction (0 means `tssf.htm` is missing), kinds of enemy (with
a plate from the book, from the plate library, and with none, named: add those to
`plates.json`), broken links, and sections with no way on and no ending. The last two should be
empty.

It ends with the book's map places, from `tools/check_places.py`: either that the book has no
`places-<code>.js` yet (it reads without travel on the map; docs/reference/map-places.md says how
to give it some), or what is wrong with the file and the longest routes between its places.

## What it does not read

Item and gold pick-ups, losses, Endurance changes stated in prose, shops, conditional combat
rules beyond the ones above, bow shots, starting equipment, section locations for the map.
These stay as text; the player applies them with the by-hand controls.

## Book 1 result (for comparison when changing the importer)

350 sections, 29 with combat, 17 auto and 4 free Random Number sections, 30 with discipline gates,
0 rank gates, 59 illustrated, 16 dead ends, 5 forced Meals, 7 paragraphs of introduction, 24 kinds of enemy (15 with a plate from
the book, 9 from the plate library, 0 with none), no broken links.

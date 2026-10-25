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
| `<li>` | a paragraph of its own, starting with a dash (lists of wares and finds); in `<ul class="unbulleted">` (Book 13), no dash. A list line |
| `<div class="signpost">` | a paragraph per line (`<br>`): a sign or price board the story shows (Book 6's 98). List lines |
| `<table>`, alone or in a signpost | a paragraph per row, its cells joined by " — " (Book 16's 226, Book 18's 339). List lines |
| `<blockquote>` with no `<p>` inside | verse: a paragraph per line (Book 4) |
| `<p class="deadend">` | a paragraph, and `end: 'death'` |
| `<p class="choice">` with `<a href="sectN.htm">` | a choice to N with the paragraph as its text |
| `<p class="choice">` with no section link | a paragraph; if the section has no other way on, `end: 'failed'` (Book 3's 61, a mission given up) |
| `<p class="puzzle">` | a paragraph, and `puzzle: true`: the answer is a section number (Books 5, 7-9) |
| `<p class="combat">` "Name: COMBAT SKILL n ENDURANCE m" | an enemy; also "ENDURANCE (RESISTANCE points) m", a door fought as one (Book 6 156, Book 7 214), the combat's `kind: 'obstacle'`. Not "(TARGET points)": Book 6's archery contest leaves his Endurance alone |
| `<img src>` | `img`, `full` when the file name starts with `ill` |
| a link to `random.htm` anywhere | the section needs a Random Number |

Heuristics layered on top, all by regular expression:

- **Conditions** (`condition()`): the "If you ..." of a rule, read only when it is wholly made of
  disciplines ("of X", "of either X or Y" = any, "of X and Y" = all), a rank ("reached the Kai rank
  of Guardian or higher", mapped to a discipline count), Lore-circles ("completed the (Magnakai) Lore-circle
  of Fire", "possess the Lore-circle of ...") and, for Random Number bonuses, his Endurance ("your current ENDURANCE point total is
  less than 10", "your ENDURANCE score is 20 or higher", "your ENDURANCE is less than 10", "your present ENDURANCE points score is ..."),
  his rank as "your present Kai rank is Grand Guardian or higher" (the rank's "Kai" may be left off), joined by "and have ...". Anything else in it (an item, a weapon in hand, "or have
  reached") and the rule is not read. Written as in book-format.md, Conditions.
  In a Grand Master book (Book 13 on) a discipline is also read as "the Grand Master Discipline of
  X", "(the) Grand Mastery of X", "Mastery of X" (or "mastery of X"), "the Discipline of X", "the skill of X" or bare ("If you possess
  Kai-screen"); a name that is not a discipline still leaves the rule unread. "Grand Mastery of
  Nexus" is Grand Nexus. "Grand Weaponmastery (with Bow)" is not read: it needs the Bow mastered.
  The twelve Grand Master ranks are known. "The rank of Y in the Discipline of X" (Book 14's 107) is the discipline
  and the rank: his rank is his own, the same in every discipline.
- **Gates** (`gate()`): the choice's condition, up to its first comma or "turn to" (a comma inside a
  list of disciplines, "of A, B, or C", does not end it, nor does one before "or if you ...", as in Book 11's 215,
  "Pathsmanship and the rank of Scion-kai, or if you possess Animal Control"; "and you have reached ..." joins a rank to it). Negative
  phrasings ("if you do not have", "have yet to", "neither") are left open. "X, or have reached the rank of Y" (parts joined by "or (if you) have/possess/reached/attained") is split and each part read as a condition; if all parse, `need: {any: [...]}`, else the choice is left open. A
  looser reading still gates "If you wish to use the Kai Discipline of X ..." (also "... of X in order to ...").
- **Random Number ranges** (`span()`): "0–4", "−2–+3" (the books' minus sign), "5 or more" / "or
  higher", "4 or less", "below 7", "above 6", or a single number. Not in a choice about ENDURANCE
  or COMBAT SKILL.
- **Random Number bonuses** (`number_rules()`): each sentence that adds to or takes from the number
  must be "If <condition>, add / deduct N (to the number)" (the comma may be missing), "add another / a further N",
  "add 1 for every Magnakai Discipline you possess (above the first three)", "For every level of (Kai) rank you have attained
  above (that of) Y, add N" (a Discipline of the series more for each rank above Y's count; Book 15's 102; also "every Grand Master rank",
  "level of Kai Mastery", "Kai level" or "level", "above the rank of Y", "add N for every Kai level you are above ..." and the same after
  "If you possess X," as that discipline's bonus, Book 16), rules joined by semicolons ("add 3; and if you ...") read one by one,
  "If have" (the "you" missing, Book 16's 2), the same after a condition ("If you
  have Huntmastery, add 1 ... for every Magnakai Discipline ... after the first three", Book 11's 189), or "(Pick a number ... and) add N
  to the number you have chosen" with no condition, which always applies. Rules listed after a lead-in
  ending in a colon are read one by one. A parenthesis "if you have both, add only N" is taken as read;
  "add 3 (if you possess both of these ..., add 7)" after an either-of is read as that rule plus an
  all-of rule for the 4 more; "(for example ...)" is skipped. "These bonuses are not cumulative" after rank-only bonuses rising with the rank
  (Book 15's 59: Kai Grand Guardian 1, Sun Knight 2) gives each higher rank the difference, so the highest held counts alone. Anything else (an item, a
  bow's "missile bonuses", a weapon, "0 = 10") leaves the section `free`.
- **auto or free**: `auto` when the bonuses were all read, every total they can make is covered by
  exactly one choice's range, and every choice without a range is an "If you have / possess ..."
  taken instead of drawing. Otherwise `free`, and the ranges are dropped.
- **Evasion**: a choice containing "evade" (or a door's "cease 'combat'") becomes the fight's evade exit (not "if you lose any ENDURANCE, even when attempting to evade, turn to
  ...", which stays a choice shown after the fight: Book 3's 138, 263, Book 4's 133); "after N rounds" (N in figures
  or a word up to ten: Book 16's "after six rounds" was read as 0 until 2026-10-25),
  "after the first round" and "until the beginning of the third round" set the wait; "in the first
  round of combat only" sets `within: 1`.
- **Mind immunity**: "immune to Mindblast / Psi-surge / all (forms of) psychic attack(s)" in the section; "immune to Mindblast (but
  not Psi-surge)" makes it `'mindblast'`; "immune to Mindblast and Psi-surge (but not Kai-surge)", "..., but he is vulnerable to Kai-surge" (Book 16's Cadak),
  "...; only (the Grand Mastery of) Kai-surge" or "..., and suffers only half-damage ... Kai-surge" or "... . If you (choose to) use Kai-surge, add only N" makes it `'psi'`;
  "immune to the effects of ..." is read the same
  (the halving is the item table's).
- **Mind drain**: "Unless you possess the Discipline of Mindshield (Psi-screen in a Magnakai
  book, Kai-screen in a Grand Master one), deduct N ENDURANCE points every round" sets each enemy's `drain`.
- **Combat Skill adjustment** (`cs_rule()`): one sentence that adds to, deducts from or reduces
  "your COMBAT SKILL (score)" for the fight, taken as `csMod`, with "If you have X," (or "If you have X you may ...", no comma) as `csIf` and
  "unless you have X" as `csUnless` (disciplines, a rank, Lore-circles). "add an additional / a
  further / an extra N" counts. Sentences are not split after "i.e." or "e.g.". Left as text: a change for some rounds only, one
  "instead of" the engine's own bonus, one from a weapon's or item's power (its own bonus may count
  it; the enemies' weapons given as the reason do not count), one with any other condition, and a section with two.
- **Forced Meal**: "must (also) (now) eat a Meal" (or "1 Meal", "one Meal"), "Unless you eat a Meal now", "Meal" in either case (Book 13 writes "a meal");
  "must eat 2 (two) meals" sets `meal: 2` (Book 16's 112).
- **Victory**: the highest-numbered section.
- **Enemy plates**: an enemy uses the full-page illustration of its own section if there is one;
  otherwise one from a section where the same kind of enemy is both fought and pictured; otherwise
  an entry in `PLATE_FIXES` (checked by eye, Book 1 only so far); otherwise none, and the player
  looks the name up in `assets/plates/plates.json` at play time (see interface.md, Art pipeline).
- **Upscaled illustrations**: a section's `img.file` names `<name>-2x.webp` when `tools/ill_upscale.py`
  has made it beside the original (ADR 0031); an enemy's plate keeps the original `.png`.

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
page is newer than its last import (`import-report.json`, rewritten every run). `book.js` and
`index.js` are written only when their content changes, so a re-import that changes nothing leaves
the reading copy and the item check (judged against `book.js`) up to date; where it does change,
`reimport_all.py` makes them again.

## What it does not read

Item and gold pick-ups, losses, Endurance changes stated in prose, shops, conditional combat
rules beyond the ones above (first-round penalties, unarmed rounds, doubled psychic bonuses), bow
shots and their "missile bonuses", item or weapon conditions on a Random Number, gold or Endurance
counted from the number, starting equipment. These stay as text;
the player applies them with the by-hand controls, or a book's item table does.

## The leftover scan (step 3)

`python tools/phrasings_scan.py <code> [--json]` (ADR 0036; the dashboard's "Scan phrasings") runs the
importer's own readers (`gate`, `span`, `number_rules`, `cs_rule`, `condition`, loaded from the
importer's source without running the import) over the text in `book.js`, and lists by id each section
whose text still looks like something it reads, with why it was left. Two lists:

- **look**, for step 3's judgement: a gate naming a discipline, rank or Lore-circle left open
  (`gate`); a draw that speaks of the Random Number Table without a link (`rn-unlinked`), whose ranges
  miss or overlap a total (`rn-ranges`), with a choice neither a range nor taken before drawing
  (`rn-choice`), or with a bonus on a discipline, rank, Lore-circle or his Endurance not read (`rn-bonus`); a stat line
  not read as an enemy (`combat-line`); a fight's COMBAT SKILL change on a discipline not read (`cs`),
  evasion offered but not read (`evade`: "you may/can evade", "evade combat", not "you cannot" or
  "too late"), immunity or a mind drain said but not set (`immune`, `drain`).
- **design**, left on purpose (below, "What it does not read"): negative gates, gates on an item or
  gold (a discipline tied to a weapon carried counts as one), draws changed by an item, weapon,
  wound or "0 = 10", draws with no ranges, COMBAT SKILL changes for some rounds, from a weapon, or
  two in a section. And any fight whose text shows a rule the importer does not read, by general
  signs (ADR 0036; an evasion's and a drain's sentences are their own kinds, so not signs here): some
  rounds ("the first two rounds", "each round", "rounds of combat": `fight-rounds`), a fight that
  stops or turns on an ENDURANCE falling, reduced or ignored (`fight-end`), an enemy called undead
  (`fight-undead`), something doubled or twice (`fight-double`), and a COMBAT SKILL change read beside
  a weapon, a mind defence, "unless", "instead" or "if you have" (`cs-read`). These are for step 5,
  where the item table gives the fight's correction.

Its silence on a fight should mean the item table has nothing to correct there. On 2026-10-17,
against Books 1-13's tables (the sections whose entry corrects a fight or gives a draw's effects),
the fight signs cut those it listed under no kind from 134 to 24 (per book: 1, 2, 2, 2, 1, 2, 1, 1,
1, 1, 1, 7, 2), for 42 more sections listed that have no table entry (302 to 344). The "look" list,
and so step 3's count on the dashboard, is unchanged. Those left are COMBAT SKILL corrections and
evasions the wording gives no general sign of: the item table's reading finds them.

Each "look" is judged against the section page: a phrasing the importer can learn for certain, or
one rightly left (say which). None left, or each judged: the owner marks step 3. `--json` writes
`phrasings.json` beside the book (ids and kinds, no text), which the dashboard reads. First run
(2026-10-14): Books 1-12, 0 to 5 sections each to look at (19 in all); Book 13, 10.

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
| 13 | 350 | 51 | 30 (24) / 5 | 52 / 0 / 0 | 42 | 9 / 0 | 3 | 10 | 6 / 14 (1) / 0 / 4 | 11 / 12 / 7 |

Book 13 as of 2026-10-17, after its step 3 (before it: Random 21 (15) / 14, gates 51, fights 5 / 9 (1) / 0 / 4).
Step 3 taught: "mastery of Magi-magic" (72, 172, 190); "Discipline of Divination in order to" (206); "ENDURANCE
score is" (91, 116, 174, 220, 226, 241, 245, 307); rules after a colon (116); "(if you possess both ..., add 7)" (245);
an unconditional "add 3 to the number" (124); "immune to all psychic attacks" (47, 56, 202, 291, 339); the foes'
weapons as a penalty's reason (86). Books 1-12 unchanged by it. Left free: 52 (no ranges), 81 (a weapon in hand),
104, 176, 303 (Grand Weaponmastery with Bow).

Book 14 as of 2026-10-17, after its step 3: 350 sections, 41 fights, Random 33 (28) / 15, gates 45 / 10 / 0,
illustrated 38, dead 13, puzzles 4, Meals 6, fights 1 / 3 (0) / 2 / 1, enemies 8 / 6 / 11 (before it: Random
30 (25) / 18, gates 44 / 9, fights 1 / 1 (0) / 0 / 1). Step 3 taught: "the rank of Kai Grand Guardian in the
Discipline of Grand Huntmastery" (107); "the skill of X" (99); "your ENDURANCE is ..." (136, 274); "immune to all
forms of psychic attack" (14, 126); Kai-screen as the shield against a drain (169, 211); "immune to Mindblast and
Psi-surge, and suffers only half-damage ... Kai-surge" as `'psi'` (229, which had been read as immune to all).
Books 1-13 unchanged by it. Left free: 177, 232 (odd or even: a range cannot say it), 74 ("0 = 10"), the rest
counting or changed by an item (the item table's).

Book 15 as of 2026-10-24, after its step 3: 350 sections, 34 fights, Random 30 (21) / 6, gates 38 / 15 / 0,
illustrated 44, dead 6, puzzles 2, Meals 10, fights 2 / 3 (0) / 0 / 0, enemies 7 / 16 / 0 (before it: Random 26 (17) / 10,
fights 1 / 1 (0) / 0 / 0). Step 3 taught: "your present ENDURANCE points score is" (86); "your present Kai rank is Grand
Guardian or higher" (224); "For every level of Kai rank you have attained above ..." (102); "These bonuses are not
cumulative" (59); "immune to the effects of Mindblast and Psi-surge. If you choose to use Kai-surge, add only 1" as `'psi'`
(121, 297; the smaller Kai-surge bonus is the item table's); "increase your COMBAT SKILL score by 3" (6). Books 1-14 and 16
unchanged by it; Book 20 gained 208 and 247 (its rank wording). Left: 105 (odd or even), 147 and 323 (the number counts),
193, 238, 270 (an item, weapon or wound: the item table's); 121 and 297's Kai-alchemy boost, which raises his ENDURANCE too
and costs it after the fight (the item table's).

Book 16 as of 2026-10-24, after its step 3: 350 sections, 36 fights, Random 24 (15) / 13, gates 49 / 19 / 0,
illustrated 44, dead 7, puzzles 3, Meals 6, fights 12 / 5 (0) / 0 / 10, enemies 5 / 12 / 0 (before it: Random 14 (5) / 23).
Step 3 taught: rank levels as "every Grand Master rank ... above that of" (15), "level of Kai rank ... above the rank of" (269),
"level of Kai Mastery" (171), after a discipline "If you possess X, for every level ... add 1" (23) and "add 1 for every Kai
level you are above ..." (341); rules joined by semicolons (74, 331, 162, 263, with his ENDURANCE either side of 18 in the last
two); "If have the ... Discipline of" (2). Books 1-15 and 20 unchanged by it. Left: 285 (odd or even), 143 and 150 (a Runic
Disc and the Sommerswerd among the bonuses: the item table's), and the counting and item draws as before.

Introductions: 7, 7, 9, 4, 10, 7, 10, 10, 8, 9, 8, 8 paragraphs. The free Random Number sections
left are those where the number counts gold or Endurance, plays a game, or is changed by a bow, a
weapon in hand, an item or a wound: work for each book's item table.

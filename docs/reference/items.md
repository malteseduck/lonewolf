# Putting a book's items and fight pictures in

Two jobs done by hand for each imported book, after importing it and writing its reading copy
(`tools/reading_copy.py`): the **item table**, so the engine gives, offers, takes and gates what the
text says (spec 4.5a), and the **fight pictures**, so every fight has a plate (spec 6.5). Book 1
has both (2026-10-01); Book 2 has both (table 2026-10-01, pictures 2026-10-02). Books 3-13 have
their tables (Book 3 2026-10-03, 4-12 2026-10-05, 13 2026-10-17). The field reference is in `book-format.md` ("Section", "Item tables").

Never put the book's text anywhere but `data/projectaon/`: tools print section numbers and
counts, the table holds only the book's short item names, and everything else is in our words.

## The item table

| Step | What | Tool | Kind of work |
|---|---|---|---|
| 1 | Import, and write the reading copy | `tools/import_projectaon.py`, `tools/reading_copy.py` | certain |
| 2 | List the sections to read | `tools/item_sections.py <book>` | certain |
| 2b | Draft the table from the plain readings | `node tools/items_draft.mjs <book>` | certain |
| 3 | Read them and finish `items-<book>.js` from the draft | by hand | judgement |
| 4 | Icons for the book's new items | `tools/fetch_icons.py` | choice |
| 5 | Check the table | `node tools/check_items.mjs <book> --json` | certain |
| 6 | Try it in the page | the console hook, storage off | certain |
| 7 | Register the table | `ITEM_TABLES` in `main.js` | certain |

### 2. The reading list

Lists in a section (what a shop sells, what a body carries) come through as lines starting with a
dash. Book 2's first import dropped them; check a new book's shops show their wares.

`python tools/item_sections.py <book>` scans every section for item, gold, Meal, Endurance and
Combat Skill wording and writes those sections, from the reading copy, to
`data/projectaon/<book>/items-reading.txt`, each with its choice lines under it (`  > `). It casts
wide (Book 1: 168 of 350, of which 65 needed an entry). Read all of it: the item's name is often
in one sentence and the instruction in the next. Choice lines like "If you have a Golden Key" or
"If you wish to pay 10 Gold Crowns" are the gates (`need`).

### 2b. The draft

`node tools/items_draft.mjs <book>` (the dashboard's **Draft table** at step 5; ADR 0036) reads the
imported sections a sentence at a time and writes `items/items-<book>.js` with only what a sentence says
outright, in no condition: Gold Crowns and Meals found (`give` when pocketed or handed over, `loot` when
offered; Meals found are `loot`), known items found, offered or erased, `{arrows: n}` where the text says
to deduct them, `{weapons: 'all'}` and the like, Endurance lost or restored on arrival (a wound in
brackets counts; a restoration in brackets, which may be a potion's "restores 3" or a night's rest, is a
`todo`: on 2026-10-17 all 29 in Books 1-13 were sections the tables have an entry for), and the gates on a choice: a known item
(`{item}`, `not` for "if you do not have"; one of a list, `item: [...]`), a weapon by its kind
(`{any: [{weapon: ['sword']}]}`, so a weapon-like item such as the Sommerswerd or the Silver Bow counts),
or a fee (`{gold, spend: true}`). Endurance written on a choice goes where the tables put it: a Random
Number's range is a `rolls` entry, a lone way on is taken here, otherwise on the section it leads to (on
arrival when nothing else leads there, else `when: [{came}]`).

A known item is one id with that name in `LW.ITEMS` or another book's table. Left out: a name two ids
share, an id with a book's number (`skeletonKey7`: another book's key is another key), a name inside a
longer one ("Magic Spear", "Jar of Laumspur"), and a place a thing is kept ("in your Quiver"). What a
sentence says under a condition (if, unless, a Discipline named in the paragraph, a Random Number, what
someone says), a shop or a list of wares, an Arrow shot (it may have been spent a section earlier), or an
item no table knows yet, becomes a `todo` naming it ("Gold Crowns and Endurance: as the text says"). When a
sentence shows a sign of an item, a loss or a gain that it cannot read for certain, it writes a todo rather
than nothing (ADR 0036). The
file's first line (`// DRAFT by tools/items_draft.mjs`) marks it unread: step 5 is not done while it is
there, and the items-tables test leaves such a file out. The draft writes no book items, fights,
`bowShot`, marks or stakes: those, and the reading list's other sections, are step 3's.

With a table already there the draft never touches it: it goes to `data/projectaon/<book>/items-draft.js`
and is compared with the table, reading by reading. On Books 1-12 (2026-10-14) the tables agree with 457
of its 473 readings (Endurance 220 of 226, gates 194 of 202, finds 38 of 40, losses 5 of 5); most of the
rest are gates the tables leave open. Its todos name a section the table also has an entry for in 630 of
794 cases. It leaves 372 of the tables' 1,292 sections untouched, chiefly fights, bow shots and the
books' own items.

### 3. What each section gets

Decide each section by what the text says, outright:

- **give**: he is handed it, or pockets it, with no choice in the text ("you find 3 Gold Crowns and
  pocket them", "he hands you the pendant", "you slip the Gem into your Backpack"). Taken on
  arrival; what does not fit stays on the page with a note.
- **loot**: his to take or leave ("you may take", "if you wish to keep"). A button each. "Either
  the Dagger or a Spear" is two entries with the same `or`.
- **take**: lost outright ("they take your Backpack and Weapons", "erase the Gem"). When the text
  lets him choose what is lost (which weapon breaks), use `weapons: 'one'` (it decides only when
  he has one) or a `todo`.
- **ep**, **cs**: stated changes ("lose 2 ENDURANCE points"; "your COMBAT SKILL is reduced by 1
  for the rest of your life"); `ep: 'full'` for "restore all lost ENDURANCE". Not the Meal rule's
  "or lose 3" (that is `meal`), and not a loss tied to a Random Number (that is `rolls`).
- **rolls**: what a number drawn in the section does, where the text says so in the section itself
  rather than in choices ("if 0-6, the Kraan has ripped away your Backpack").
- **meal**: a forced Meal the importer missed (it reads "must (also) (now) eat a Meal" and "Unless you eat a Meal now", "meal" in either case).
- **need**: gates on the choice to a section: `{item}`, `{item, not: true}` ("if you do not
  possess"), `{gold, spend: true}` (paying), `{any: [cond, ...]}` (any one condition, which may be
  `{disc}`, `{rank}` or `{item}`: "Nexus or a Platinum Amulet").
- **fight**: where the importer misread a fight's Combat Skill adjustment: `mindforce` for an
  enemy's mind attack that Mindshield blocks (Book 1's Vordaks), `unless: [items]` for a penalty
  an item spares (the Burrowcrawler's darkness and a Torch with Tinderbox), `unarmed: true` when the
  penalty is the text's "you are unarmed" (the engine already gives -4 with no weapon), `ambush:
  true` when the `csMod` is what a surprise attack or ambush costs (Huntmastery spares it; mark
  these in every Magnakai and Grand Master book). Since 2026-10-03 the importer reads a whole-fight change given or
  spared by a discipline itself (`csIf`, `csUnless`) and leaves as text any for some rounds only,
  "instead of" a normal bonus, or from a weapon's or item's power: check those sections, and give
  the `csMod` here where it is certain, with `csIf` / `csUnless` when a discipline decides it (Book 3's
  137: a foe only partly immune, so Mindblast adds 1, is `{csMod: 1, csIf: {disc: ['mindblast']}}`).
  `evade: {after, to}` where the text allows evasion in its prose rather than in a choice (Book 3's 108).
- **bowShot** (Magnakai and Grand Master books): a Random Number that is a bow shot, `{to: [lo, hi]}` for each
  choice it decides, with the ranges of the total as the text gives them (use 99 for "or
  higher"). Leave out the choice for having no Bow. The engine adds Weaponmastery and spends the
  Arrow. Arrows found or bought are `{arrows: n}` in `loot`; lost ones `{arrows: n | 'all'}` in `take`.
  A discipline's bonus the text gives on the shot, which the importer does not read there, is an
  `rntMod` (Book 6's 170: `[{disc: 'huntmastery', plus: 1}]`). Where a Grand Master shot gives Grand Weaponmastery with Bow its own
  number, that is `grandBow: n`, used in place of the +5 (ADR 0040; Book 13's 104, 176, 303: 3).
- **food as a Meal**: an item the text says can be eaten as a Meal gets `meal: true` (Book 1's
  Laumspur).
- **the engine's rules first**: before a `todo`, use what the engine applies (book-format.md):
  `when` for a change under a condition, `take` with `pick` / `at` / `stash` for losses he chooses or
  counts by place, `back`, `mark`, `stake` / `settle` / `sell`, coins, and the fight's `rounds`, `stop`,
  `won`, `wounded`, `mind`, `keep` and the rest. Conditions reach items, weapons in hand, counts and marks.
- **todo**: what is left to the player, in our words, shown as "By hand: ...". Never guess.
  Name only controls the page has: every section has a "By hand: turn to" box under its choices
  (the puzzle box, smaller), and a fight has "By hand: stop the fight" under its log. That stop wins
  nothing unless the fight has `byHand` (why, in our words): give it only where the text ends the fight
  a way the engine cannot apply, and prefer teaching the engine the case (ADR 0027).
- **shops** (Book 2 on): each ware is a `loot` entry with `cost`; "choose any two" is a group with
  `or` and `pick: 2`. Gold won or lost by a number is `rolls` with `gold`.
- **book weapons**: a Special Item that fights (the Sommerswerd, the Magic Spear) gets `weapon`,
  and `cs` / `undead` where the text gives them. A fight only one weapon can win is `with`; a
  bare-handed one is `with: 'none'` with the importer's -4 cleared (`csMod: 0`).
- **effects written on a choice** ("restore 2 and turn to 312") go on the section turned to, but
  only when nothing else leads there (check who links to it); otherwise a `todo`.
- **starting equipment** is not in the item table: each book's kit is `LW.KITS` in
  `shared/rules-series.js`, from rules-books.md's addendum. A kit item the engine lacks goes in
  `LW.ITEMS` (core.js) or, if only that book has it, the book's `ITEMS`.

Item ids are one list for every book (an item carried from one book is the same item in the
next). An object met in several books (the Dagger of Vashna, the Silver Bow of Duadon, the Oede
Herb) is defined once, in the first book that has it, and later tables use its id. A new item whose
natural id is taken by a different object, or a generic one (a key, a blanket), gets the book
number as a suffix (`silverKey3`, `blanket9`).

Kinds: the text says "Special Item" or "Backpack Item" for most. Where it does not, keys, papers
and things worn are `special`, other goods `backpack`; say so in the plan when unsure. Give a
book item a `name` (the book's label), `kind`, `glyph`, and where useful `heal`, `ep`, `about`
(our words: what it is for). Standard items (weapons, Laumspur Potion, Helmet...) are in
`LW.ITEMS` already, with the kit items (Shield, Padded Leather Waistcoat, Lantern, Fireseed, Rope,
Tinderbox, Alether, Badge of Rank, each book's map). A potion with a fight effect (Alether) is
described, not applied.

Gold found is a `give` when it is pocketed in the text, a `loot` when it is offered.

### 4. Icons

Each book item gets a glyph from game-icons.net (CC BY 3.0), the set the rest of the page uses.
Find a name on https://game-icons.net, then `python tools/fetch_icons.py author/name ...`; it
saves to `assets/icons/` with the background square removed, and says "not found" for a wrong
guess. Add each to `assets/icons/README.txt` under its author. Book 1's: cut-diamond (Vordak
Gem), gems, key, skeleton-key, scroll-unfurled, scroll-quill, gem-necklace (Crystal Star
Pendant), standing-potion (Alether), soap, torch, flint-spark (Tinderbox), backpack.

### 5. Check

`node tools/check_items.mjs <book>`: errors (sections, choices, items or icons that do not exist,
unknown fields), the counts, and the flagged sections the table leaves out. Every left-out
section should be one that was read and judged to need nothing. Book 1: no errors; 12 items, 65
sections; 103 left out (four found on a re-read, 2026-10-09). Book 2: no errors; 13 items, 117 sections; 98 left out (three it first
listed were real misses, so read the list; a full re-read on 2026-10-09 found nothing more). Book 3: no errors; 17 items, 118 sections; 106 left out (a full re-read on 2026-10-09 turned one
todo, 137's partial Mindblast, into a fight change). Book 12: no errors; 16 items, 121 sections; 127
left out (a full re-read on 2026-10-10 found seven misses, among them a Special Item lost in a section
with no item wording, so also search the whole book for each of its item names, and two evasions
the importer read as "at any time"). Book 13 (from the script's draft, 2026-10-17): no errors; 14 items, 105
sections; 153 left out. The draft had 104 sections, 83 with a todo; 18 of the other 21 needed nothing
more. Another 24 sections it did not touch needed an entry: fights, bow shots, Arrows loosed, a Copper
Key found, the disguise given or gated, and four Endurance restorations in brackets (now its todos). Two forced Meals (83, 133)
written "a meal" the importer missed then; it reads them now (Book 10's 186 too, which its table already had). It knows every book's items, as the page does.
`--json` also writes `data/projectaon/<book>/check-items.json`, which `tools/book_status.py` reads
for checklist step 5 (the dashboard's "Check items" runs it so).

### 6. Try it

In a background tab (not the owner's), switch storage writes off first so no save changes:
`Storage.prototype.setItem = () => {}`. Then give `__lw.game` a test hero, `go()` to each kind of
section and read `game.hero`, `game.s.events`, `game.loot()` and `game.choices()`. Book 1 was
checked for gifts, finds and one-of-a-pair, losses and the lost Backpack, gates and paying, a
roll's effect and the permanent Combat Skill loss, and the icons in the inventory.

### 7. Register

Import the table in `main.js` and add it to `ITEM_TABLES`. Its items are then known from the
start, so a Lone Wolf carried from one book to the next keeps showing what he took.

A section's effects apply when he arrives there, once per playthrough. A game already past a
section does not get them retroactively; add the item to that save by hand if the owner asks
(Adventure II's Crystal Star Pendant, 2026-10-01, was added to both its Book 1 save and its
carried character).

## Fight pictures

Once the owner marks step 7 done, each fight's picture is pinned (ADR 0020): an entry added to
`plates.json` later, or a re-import, changes nothing in the player until the owner approves it on the
dashboard. `node tools/plates_pin.mjs <code>` lists what would change. Do not run `--approve` yourself.

The importer gives a fight its section's full-page illustration, or one from another section of
the same book where that enemy is fought and pictured (`PLATE_FIXES`). Its report then counts
the enemies "with none". For each, add an entry to `assets/plates/plates.json` (first match on
the enemy's name wins, so narrower ones first). Give an entry `"book": "<code>"` when it is right
for that book only (its own characters, a generic name such as "Priest" or "guard" given a
stand-in that suits that book), and put book entries first. The sheet labels a book entry whose
`match` is exactly the enemy's anchored name (`^name$`) as the owner's own picture, so an entry you
add is written some other way (`ice barbarian$`, `kalkoth`).

**The owner's own picture** stands whatever the order below (ADR 0035). The owner puts it in on the picture sheet
   (inline in the dashboard at step 7, "Open picture sheet"): drop a picture file on
   the enemy's card, paste it, or Choose; the page shrinks it to 2000 px on its long side as WebP and
   `POST /api/admin/plate` saves it as git-ignored `art/plates/<code>/<name>.webp` and writes the entry
   (`tools/plates_file.py`): `match` the enemy's exact name, escaped and anchored, `book` set, at the top
   of the list so it wins; `over: true` where the book has its own picture, or a broader `over` entry would
   win. A second picture for the same enemy replaces the entry and the file. **Adjust** on any card opens
   the same editor on the picture it has (a book's own, a library entry's): a crop box on the original and
   the fight panel as it will look, through `inkPlate`, with a levels control for paintings and a left-to-right flip; saving a re-crop
   writes the owner's entry pointing at that same file. Once step 7's **Upscale 2x** has run, a
   card shows its picture's 2x copy ("upscaled 2x"); one still shown from its original is badged
   **Not upscaled** (step 7 cannot be marked done while any is), and in Adjust **Show original** swaps it for the
   picture it was made from, in the editor and the preview, to compare (only to look: Save keeps the
   entry as it is). **Remove** drops the entry (and its file under `art/plates/<code>/`, and its link). A picture dragged from another site, an
   address pasted, or **By address...** is fetched by the server (`POST /api/admin/picture-url`; a page's address is followed to
   the picture it names, its `og:image`) and taken as a dropped file is. A new picture asks where it came from (ADR 0038): the
   address it was fetched by is filled in; a file dropped or pasted wants its link typed, or **No link** ticked (a screenshot, the
   owner's drawing). The link goes into the committed `art/sources.json` (`tools/art_sources.py`), from which Setup fetches the
   picture again on a fresh checkout. **Link...** on a card whose picture is in `art/` gives or changes the link afterwards. **Stand-in...** on a card opens a picker of every picture already on disk
   (`GET /api/admin/standins`: `assets/plates/`, `art/` including `art/plates/`, `data/reference/`, and every
   imported book's `ill*.png`, each labelled with the enemies it is fought with and, once the index below
   has been built, what it shows); filter by name, enemy, a nearby fight's enemy or a word of the note,
   click one, crop it in the same editor, Save. The entry points `src` at that file (no copy), so a creature
   met in several books needs one picture found once. Older owner pictures sit in `art/` and `art/plates/` (Book 1's Winged Serpent).

**The draft** (ADR 0036): `python tools/plates_draft.py <code>`, the dashboard's **Draft pictures** at step 7
(shown while any enemy has none; it re-runs `ill_index.py` first), gives each enemy with no picture one in the
order below and adds its entry to `plates.json`, written as the owner's would be (the exact name, anchored,
`book` set, at the top) plus `"draft"`, where it came from ("this book", "Book 3", "stand-in", "this book, a
picture 1 link before the fight"). The sheet labels such a card "the script's pick"; Adjust there makes it
the owner's (the entry is rewritten without `draft`), Remove drops it. It matches by name only: numbers,
notes in brackets and group words ("pack", "patrol") dropped, plurals made singular, then one name held in
the other ("Vazhag" in "Fat Vazhag", "Drakkarim" as "Drakkar"); the same kind in this book (an enemy with a
picture now, as shown, crop and all, or an illustration whose note names it), then in another imported book
(nearest first) or a fetched book's index; then a picture of this book with no fight of its own one or two
links before the fight (a guess); then a library or `art/plates/` picture with a word of the name in its file
name (the one this book uses least). A plain human (a person's word last, "guard", "swordsman", with no
creature named before it: "Giak Officer" is a Giak) takes this book's same kind, else a stand-in, else
another book's only by the very same name (ADR 0010). It never takes another draft as a source. What it
cannot match is listed, for the agent's prompt or the sheet's Stand-in.... `--compare` on Books 2-12 (their
own entries left out) (106 enemies, 2026-10-14) gives the owner's very picture for a third of them and some picture
for two thirds; the rest of the owner's choices were by eye (variety, a better figure), which is what the
sheet is for.

Where a fight's picture comes from, first that applies (ADR 0035):

1. **The fight's own picture**, which the importer gives it from its section (above).
2. **The same creature in the same book**: any of its illustrations, fight pictures included (another
   fight's: Book 9's lone Doomwolf is the front wolf cropped from its Doomwolves and Giak riders), a
   page of portraits, or a creature pictured where it is met but not fought. A `crop` cuts one figure
   out (Book 2's council of travellers, cut from its portrait page). The small ones (`small*.png`) are
   too low to make a plate.

   **The illustration index** saves looking through every book again. `python tools/ill_index.py`
   writes git-ignored `data/projectaon/ill-index.json`: for each `ill*.png` of every downloaded book
   (imported or not), its section, the fight there, the fights an imported book gives it in other
   sections (`fought_at`, read from `book.js`: the importer's `PLATE_FIXES` and name match, such as Book 1's
   Gourgaz, pictured one section from its fight), the sections it links to and from, the fights
   within two links either way (`near`, with `steps`, negative for fights that lead to it), the
   `plates.json` entries already borrowing it, and `shows`, a few words of our own on what it shows.
   The notes are kept by hand in git-ignored `data/projectaon/ill-notes.json` and merged in, so a
   re-run keeps them; `--missing` lists pictures with none. All 405 pictures of Books 1-20 have a
   note (2026-10-11); when a new book is downloaded, look at its pictures once and add theirs. Search
   the index for a creature's name (in `fight`, `fought_at` and `shows`) or a word ("hound", "robed",
   "dwarf"), then look at the few hits. The Stand-in picker searches the same notes and nearby fights.
3. **The same creature in another downloaded book**, by path under `data/projectaon/`, found the same
   way in the index: Book 1's Crypt Spawn uses Book 5's, Book 2's Giaks and Szalls (a breed of Giak)
   Book 1's Giak cropped to the one on foot, Book 9's Gourgaz Book 1's. Never another book's
   different creature or set-piece fight. Plain human enemies (soldiers, guards, robbers, bodyguards)
   may take another book's plain humans; for them these and the stand-ins in 4 rank alike, chosen
   for variety (ADR 0010).

**Vary the plain humans.** The broad library entries (`soldier|...|guard`, `robber|...|bandit`) are a
last resort: a book full of guards would show the same picture in every fight (the owner asked for
variety, 2026-10-09). Give each guard, soldier or bandit kind its own book entry: a different
illustration, or a different figure cropped from one, using the book's non-fight pictures and other
books' plain humans (in-fight or not). Book 4 does this for its 19 guards and soldiers, drawing on its
own pictures and Books 5, 6, 8 and 9 (Book 5 is set in Vassagonia, so its guards suit Book 4's).
Book 5 gives its seven guards and sentries crops of its own non-fight pictures, Book 9's palace guards
and the owner's `art/plates/` guards. Its creatures met in other books use those books' pictures of the
same creature: Elix and Itikar from Book 4 (the Itikar is Barraka's mount, not fought there), Drakkarim
from Books 1 and 2 beside its own Drakkar; the Yas, a constrictor, takes the library's snake engraving.
Book 6 pictures most of its unpictured enemies from its own non-fight illustrations, found by following
the section links from each picture to the nearest fight: Roark from the tavern scene before his fight,
the Acolytes of Vashna from the procession that leads to them, the Dakomyd from its death scene, Chanda
from his workshop, the City Watch, Town Sergeant and Mercenaries from its guard and soldier pictures
(two figures cropped from one), the Deldenian pirate from its own pirate. Its thieves, backstabbers and
river pirates take the owner's `art/plates/` rogues and sailor, also used by Book 2. The Yawshath and
the Sewer Door take engravings saved already cropped (the Beast of Gévaudan, a Piranesi prison doorway):
fetch Commons' 1920 px copy rather than the original, and cut it to the part used before saving, so
the offline copy stays small (the owner's request, 2026-10-09).
Book 7 does the same: its Vampire Bats, Hactaraton Brood, Giant Hactaraton and Lekhor take the
non-fight pictures in the sections that lead to their fights; its Beastmen (the Zahda Beastmen, the
Throne-hall Guard and the two numbered gaolers) share the book's only two Beastman pictures, as
whole pictures and as close crops of the heads (Gaoler No. 1 shows the same whole picture as the
Beastman Gaoler, whose fight it illustrates). Its foes the book never pictures were first given
Commons engravings, then the near misses were replaced from a broad image search (Bing; Google
answers a script with a CAPTCHA): Lord Zahda (both fights) an ink evil sorcerer, gaunt and
white-haired as the fandom wiki describes him; the Flame-man an ink fire elemental; the Oudagorg an ink
giant worm with a ringed, toothed mouth (all three in `art/plates/07cd/`); the Tunnel Door
Viollet-le-Duc's portcullis in the Carcassonne gate passage (free, not Book 6's prison door again).
Engravings kept: the Invisible Whipmaster Doré's whipping demons (*Inferno* XVIII), the Trap-webs a 1547
woodcut of a spider on its web, the Black Lakeweed a crop of Haeckel's seaweeds (the search found only
cartoon plants).
Book 8 pictures Rahgu, Anapheg, the Silver Swamp Python and the Taan-spider from the non-fight
pictures one or two links before their fights; the Monks of the Sword and the mounted monks from its
hooded monks at the abbey (whole, and one monk cropped); Boran from the innkeeper his father, the one
dwarf the book pictures, at the same inn (a near miss, flagged to the owner). The Gnaag Helghast, a
Helghast disguised as a monk, takes Book 2's robed Helghast in human form (not the skull-faced one
Books 2 and 3 use); Bourn the Bowyer, Book 6's archer Altan. Foes it never pictures: Kezoor a pen
necromancer, gaunt as the wiki describes him, and the Korkuna an ink alien egg standing in liquid
(both in `art/plates/08tjoh/`); the Hunting Dogs a Wellcome engraving of hounds pouncing on a stag.
An already-downloaded free engraving can serve a second creature by a different crop (Book 4's Tunnel
Fiends are other demons from the Schongauer print that gives Book 3 its Mutant).
Book 9 pictures Zakhan Kimah (all three fights) from its non-fight picture of him walking through the
West Gate, two links before his fights; the Ghoul Pack takes the book's Zaaryx ghoul whole, and the
Psi-ghoul, a less human kind, a close crop of its head (a near miss). The Doomwolf is the front wolf
cropped from the book's Doomwolves and Giak riders, one link before its fight (the owner's choice
over the bestiary page); the Gourgaz Book 1's Gourgaz, the very same creature, leading Giaks with a two-handed
axe as here (Book 1 fights it one section from that picture). Its nine guard and mercenary kinds,
which all fell to the broad `soldier|...` entry, each have a picture of their own: the Senate Guards
the book's courtiers and soldiers on the steps, the Anarian Rangers Book 8's pointing horseman (the
refugees cropped off), the Strongroom Guard Book 8's soldier in a crested surcoat, the Deldenian
Mercenaries Book 2's helmeted soldier, Tower Guards 1 and 2 Book 1's two helmeted soldiers, the
Sergeant and Guard the armoured soldier cropped from Book 10's map table, and the rest the owner's
`art/plates/` guards and rogues.
Book 12 pictures its Darklords from its own non-fight pictures: Gnaag (the fly-headed figure where he
summons the Mind Reaper), Kraagenskûl in all four of his fights (cropped from the throne scene), and the
Xargath from the serpent at the ship's rail. Its Drakkarim Sailors are cropped from the burning-ship
picture one link before their fights, the Gunners from its ironclads (whole, and the near gun deck), and
the Ironclad Bo'sun is the book's whip-carrying Slavemaster (a near miss). The other Drakkarim kinds take
other books' Drakkarim, the same race: the Escorts Book 10's Drakkarim soldiers with captives (not
a fight there), the surprise-attack Drakkar Book 5's Drakkar plunging from above (not a fight there),
the Assault Squad Book 9's Drakkarim Assault-troopers (that book's fight picture, the same kind of troop)
and the Marine Officer its plumed leader cropped from it, the Marine Sergeant Book 2's; the Imperial
Sector Guards, a crop of Book 15's ranks of helmeted spearmen. The Liganim (the Ligan and the Minions
of Taktaal) take Book 14's Ligan with his Ziranakag, whole and cropped: it is that book's fight picture
for the same creature, so the owner will meet it again there. Vladoka, a Nadziran temple guard, takes
Book 14's furry creature in a section about the Nadziranim (a near miss). The Mind Reaper, a parasite
that forms out of a haze, is an ink sketch of a spirit rising from smoke (`art/plates/12tmod/`, with
`levels` to darken the pencil-grey lines); Darklord Taktaal is left to the owner, who is searching for
him. Check a borrowed picture's `fight` in the index first: Book 15's armoured warriors at a wall look
like Drakkarim but are its Tukodak Guardians.
4. **A stand-in**: one of the owner's `art/plates/` pictures or the library's in `assets/plates/`
   (the Stand-in picker shows them all), or else a picture found by searching, anywhere: Wikimedia Commons, a general image search, fan art,
   game art, modern fantasy illustration. Read the enemy's page on the Lone Wolf fandom wiki first
   (see AGENTS.md, Lore) for what it looks like: the book's text at its fight often says little
   (Book 7's Lord Zahda is gaunt and white-haired). The player is for personal use, so a picture need
   not be free (the owner widened the search beyond Commons, 2026-10-10); where it is saved depends
   on its licence:
   - **Free** (public domain, CC0, CC BY): save it to `assets/plates/` (committed, so a fresh clone
     has it) and credit it in `assets/plates/README.txt`. Commons is a good first stop for these:
     search with `filetype:bitmap` (its API answers the browser with `origin=*`).
   - **Anything else**: save it to git-ignored `art/plates/<code>/` and record its link with
     `python tools/art_sources.py link art/plates/<code>/<file> <url>` (the picture's own address, or its page), so
     Setup can fetch it again; say what was done to it by hand (greyscale, trimmed) as the entry's `note` in
     `art/sources.json`. A fresh clone shows the drawn emblem for that enemy until then.

   Lay the candidates out in the page to compare, and prefer menacing over quaint (the owner
   turned down a cute bear). Prefer line work: tonal prints (aquatints, such as Goya's) come out as a
   dark blot, and paintings need `levels` and may still turn to mud, so judge each on the sheet.
   Pass over small copies and anything watermarked. Fetch a copy about 2000 px on its long side
   (Commons' 1920 px copy rather than a huge original), cut it to the part used and shrink anything
   over about 1 MB before saving, so the offline copy stays small; a `crop` drops captions and plate
   numbers. **Ask the owner before each download**, naming the picture, its source and its size.

Show the owner each new picture as it will look before calling it done: the dashboard's sheet,
opened from step 7 of `http://localhost:8766/tools/admin/`, shows every enemy of the book inked as in a
fight (the owner's half of checklist step 7). The importer's report counts the library entries the book can use;
after adding them, run it again and expect 0 "with none". Plates are drawn whole, cut only by the crop set
by hand (Adjust; use it to leave out a ruled frame), and the edges are not faded (owner's request).

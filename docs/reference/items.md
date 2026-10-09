# Putting a book's items and fight pictures in

Two jobs done by hand for each imported book, after importing it and writing its reading copy
(`tools/reading_copy.py`): the **item table**, so the engine gives, offers, takes and gates what the
text says (spec 4.5a), and the **fight pictures**, so every fight has a plate (spec 6.5). Book 1
has both (2026-10-01); Book 2 has both (table 2026-10-01, pictures 2026-10-02). Books 3-12 have
their tables (Book 3 2026-10-03, 4-12 2026-10-05). The field reference is in `book-format.md` ("Section", "Item tables").

Never put the book's text anywhere but `data/projectaon/`: tools print section numbers and
counts, the table holds only the book's short item names, and everything else is in our words.

## The item table

| Step | What | Tool | Kind of work |
|---|---|---|---|
| 1 | Import, and write the reading copy | `tools/import_projectaon.py`, `tools/reading_copy.py` | certain |
| 2 | List the sections to read | `tools/item_sections.py <book>` | certain |
| 3 | Read them and write `items-<book>.js` | by hand | judgement |
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
- **meal**: a forced Meal the importer missed (it reads "must (also) (now) eat a Meal" and "Unless you eat a Meal now").
- **need**: gates on the choice to a section: `{item}`, `{item, not: true}` ("if you do not
  possess"), `{gold, spend: true}` (paying), `{any: [cond, ...]}` (any one condition, which may be
  `{disc}`, `{rank}` or `{item}`: "Nexus or a Platinum Amulet").
- **fight**: where the importer misread a fight's Combat Skill adjustment: `mindforce` for an
  enemy's mind attack that Mindshield blocks (Book 1's Vordaks), `unless: [items]` for a penalty
  an item spares (the Burrowcrawler's darkness and a Torch with Tinderbox), `unarmed: true` when the
  penalty is the text's "you are unarmed" (the engine already gives -4 with no weapon), `ambush:
  true` when the `csMod` is what a surprise attack or ambush costs (Huntmastery spares it; mark
  these in every Magnakai book). Since 2026-10-03 the importer reads a whole-fight change given or
  spared by a discipline itself (`csIf`, `csUnless`) and leaves as text any for some rounds only,
  "instead of" a normal bonus, or from a weapon's or item's power: check those sections, and give
  the `csMod` here where it is certain.
- **bowShot** (Magnakai books): a Random Number that is a bow shot, `{to: [lo, hi]}` for each
  choice it decides, with the ranges of the total as the text gives them (use 99 for "or
  higher"). Leave out the choice for having no Bow. The engine adds Weaponmastery and spends the
  Arrow. Arrows found or bought are `{arrows: n}` in `loot`; lost ones `{arrows: n | 'all'}` in `take`.
- **food as a Meal**: an item the text says can be eaten as a Meal gets `meal: true` (Book 1's
  Laumspur).
- **todo**: anything the player must decide, in our words, shown as "By hand: ...". Never guess.
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
sections; 103 left out (four found on a re-read, 2026-10-09). Book 2: no errors; 13 items, 109 sections; 106 left out (three it first
listed were real misses, so read the list). It knows every book's items, as the page does.
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

The importer gives a fight its section's full-page illustration, or one from another section of
the same book where that enemy is fought and pictured (`PLATE_FIXES`). Its report then counts
the enemies "with none". For each, add an entry to `assets/plates/plates.json` (first match on
the enemy's name wins, so narrower ones first). Give an entry `"book": "<code>"` when it is right
for that book only (its own characters, a generic name such as "Priest" or "guard" given a
stand-in that suits that book), and put book entries first. Where to look, in order:

1. **The owner's own picture**, if they give one. The owner puts it in on the picture sheet
   (`tools/admin/fights.html?book=<code>`, also inline in the dashboard at step 7): drop a picture file on
   the enemy's card, paste it, or Choose; the page shrinks it to 2000 px on its long side as WebP and
   `POST /api/admin/plate` saves it as git-ignored `art/plates/<code>/<name>.webp` and writes the entry
   (`tools/plates_file.py`): `match` the enemy's exact name, escaped and anchored, `book` set, at the top
   of the list so it wins; `over: true` where the book has its own picture, or a broader `over` entry would
   win. A second picture for the same enemy replaces the entry and the file. **Adjust** on any card opens
   the same editor on the picture it has (a book's own, a library entry's): a crop box on the original and
   the fight panel as it will look, through `inkPlate`, with a levels control for paintings; saving a re-crop
   writes the owner's entry pointing at that same file. **Remove** drops the entry (and its file under
   `art/plates/<code>/`). A picture dragged from another site arrives as an address and is refused: save it
   first, or copy and paste it. Older owner pictures sit in `art/` and `art/plates/` (Book 1's Winged Serpent).
2. **The same book's own illustrations**, also those outside fights: a page of portraits, or a
   creature pictured where it is met but not fought. A `crop` cuts one figure out (Book 2's
   council of travellers, cut from its portrait page). First look at every `ill*.png` of the book;
   the small ones (`small*.png`) are too low to make a plate.
3. **Another downloaded book's illustration**, only for plain human enemies (soldiers, guards,
   robbers, bodyguards), by path under `data/projectaon/`. Never another book's special creature
   or set-piece fight: the owner would meet the same picture twice. The exception is the very same
   creature (Book 1's Crypt Spawn uses Book 5's; the owner accepted it, 2026-10-01). To see which illustrations sit
   in which fights, list each book's sections that have both an `ill*.png` and a combat line
   (section numbers, picture names and enemy names only). Book 2's Giaks and Szalls (a breed of
   Giak) use Book 1's Giak, cropped to the one on foot.
4. **A free old engraving** from Wikimedia Commons, public domain or CC BY: search with
   `filetype:bitmap` (the Commons API answers the browser with `origin=*`), lay the thumbnails out
   in the page to compare, and prefer menacing over quaint (the owner turned down a cute bear).
   Save it to `assets/plates/`, shrink anything over about 1 MB, and credit it in
   `assets/plates/README.txt`. A `crop` drops captions and plate numbers. Tonal prints (aquatints,
   such as Goya's) come out as a dark blot: look for line work.

Show the owner each new picture as it will look before calling it done: the dashboard's sheet,
`http://localhost:8765/tools/admin/fights.html?book=<book>`, shows every enemy of the book inked as in a
fight (checklist step 7). The importer's report counts the library entries the book can use;
after adding them, run it again and expect 0 "with none". Plates are drawn whole: only a ruled frame line round the picture is
cut away, and the edges are not faded (owner's request).

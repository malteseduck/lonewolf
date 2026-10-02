# Putting a book's items and fight pictures in

Two jobs done by hand for each imported book, after `docs/reference/map-places.md`'s steps 1-2
(import, reading copy): the **item table**, so the engine gives, offers, takes and gates what the
text says (spec 4.5a), and the **fight pictures**, so every fight has a plate (spec 6.5). Book 1
has both (2026-10-01). The field reference is in `book-format.md` ("Section", "Item tables").

Never put the book's text anywhere but `data/projectaon/`: tools print section numbers and
counts, the table holds only the book's short item names, and everything else is in our words.

## The item table

| Step | What | Tool | Kind of work |
|---|---|---|---|
| 1 | Import, and write the reading copy | `tools/import_projectaon.py`, `tools/reading_copy.py` | certain |
| 2 | List the sections to read | `tools/item_sections.py <book>` | certain |
| 3 | Read them and write `items-<book>.js` | by hand | judgement |
| 4 | Icons for the book's new items | `tools/fetch_icons.py` | choice |
| 5 | Check the table | `node tools/check_items.mjs <book>` | certain |
| 6 | Try it in the page | the console hook, storage off | certain |
| 7 | Register the table | `ITEM_TABLES` in `main.js` | certain |

### 2. The reading list

`python tools/item_sections.py <book>` scans every section for item, gold, Meal, Endurance and
Combat Skill wording and writes those sections, from the reading copy, to
`data/projectaon/<book>/items-reading.txt`, each with its choice lines under it (`  > `). It casts
wide (Book 1: 168 of 350, of which 61 needed an entry). Read all of it: the item's name is often
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
- **meal**: a forced Meal the importer missed (it reads only "must (now) eat a Meal").
- **need**: gates on the choice to a section: `{item}`, `{item, not: true}` ("if you do not
  possess"), `{gold, spend: true}` (paying).
- **fight**: where the importer misread a fight's Combat Skill adjustment: `mindforce` for an
  enemy's mind attack that Mindshield blocks (Book 1's Vordaks), `unless: [items]` for a penalty
  an item spares (the Burrowcrawler's darkness and a Torch with Tinderbox), `unarmed: true` when the
  penalty is the text's "you are unarmed" (the engine already gives -4 with no weapon).
- **todo**: anything the player must decide, in our words, shown as "By hand: ...". Never guess.

Kinds: the text says "Special Item" or "Backpack Item" for most. Where it does not, keys, papers
and things worn are `special`, other goods `backpack`; say so in the plan when unsure. Give a
book item a `name` (the book's label), `kind`, `glyph`, and where useful `heal`, `ep`, `about`
(our words: what it is for). Standard items (weapons, Laumspur Potion, Helmet...) are in
`LW.ITEMS` already. A potion with a fight effect (Alether) is described, not applied.

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
section should be one that was read and judged to need nothing. Book 1: no errors; 12 items, 61
sections; 107 left out.

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
the enemy's name wins, so narrower ones first). Where to look, in order:

1. **The owner's own picture**, if they give one: copy it to git-ignored `art/` and point the
   entry there (Book 1's Winged Serpent).
2. **Another downloaded book's illustration**, only for plain human enemies (soldiers, guards,
   robbers, bodyguards), by path under `data/projectaon/`. Never another book's special creature
   or set-piece fight: the owner would meet the same picture twice. The exception is the very same
   creature (Book 1's Crypt Spawn uses Book 5's; the owner accepted it, 2026-10-01). To see which illustrations sit
   in which fights, list each book's sections that have both an `ill*.png` and a combat line
   (section numbers, picture names and enemy names only).
3. **A free old engraving** from Wikimedia Commons, public domain or CC BY: search with
   `filetype:bitmap` (the Commons API answers the browser with `origin=*`), lay the thumbnails out
   in the page to compare, and prefer menacing over quaint (the owner turned down a cute bear).
   Save it to `assets/plates/`, shrink anything over about 1 MB, and credit it in
   `assets/plates/README.txt`. A `crop` drops captions and plate numbers.

Show the owner each new picture as it will look (render it with `drawCreature` in a background
tab) before calling it done. Plates are drawn whole: only a ruled frame line round the picture is
cut away, and the edges are not faded (owner's request).

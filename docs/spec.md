# Lone Wolf player: specification

This document states intent: what the project is for and the rules it must follow. It describes
the design as it should be now, not how it got here, and not the code. For how things are built,
see `docs/reference/`; for the state of the work, `docs/plan.md`. When this file and the reference
disagree, this file says what should be true and the reference says what is true.

## 1. Purpose

A personal-use player for Joe Dever's Lone Wolf gamebooks, starting with the Kai series (books 1-5)
and the Magnakai series (books 6-12), with room for the later series. It replaces reading the
Project Aon web edition beside a separate action chart. It should feel like the 2013 game
*Joe Dever's Lone Wolf HD Remastered*: a dark, aged book that is itself the interface.

The owner is the only user. Nothing here is published or released. The player runs in a browser,
served from the owner's PC; it is played on the PC, on other devices on the home network, and on
the owner's iPad, with or without a connection (section 7).

## 2. Principles

1. **The book is the interface.** Story, choices, character, inventory, map and combat all happen
   on the pages of one book. No separate screens, dialogs or HUD except for character creation.
2. **Faithful rules.** Play follows the books' own rules. Where the player could not tell the
   difference from playing with the paper book, automate. Where a rule is ambiguous or cannot be
   read reliably from the text, leave it to the player and give them the controls to apply it.
3. **Never trap the player.** Every automated value (Endurance, gold, items) can be corrected by
   hand. A misread rule must never make a book unfinishable.
4. **Flat, not 3D.** Pages are 2D. Motion is limited to page turns, the Random Number medallion,
   and small feedback in combat. Illustrations are still images.
5. **Quality of image over motion.** A good still illustration beats an animated crude one.
6. **No build step.** Plain HTML, CSS and JavaScript that run from a static file server. No
   bundler, no framework, nothing to install for the player itself.
7. **Content stays local.** See section 3.
8. **Deterministic tooling.** Whatever can be decided by a script (what a book contains, what the
   offline copy holds, whether a table is consistent) is decided by a script and checked by one,
   not by review.

## 3. Content and licensing

- The books' text and illustrations come from Project Aon, whose licence allows download for
  personal use and forbids redistribution.
- Book content is fetched onto the owner's machine by a tool and kept in a folder that is excluded
  from version control. It must never be committed, published, uploaded or pasted into documents,
  commit messages, chat logs or code comments.
- Anything made from that content (reading copies, restyled or upscaled pictures, repaints and
  their prompts) stays beside it, uncommitted.
- Our own work about a book is committed: its item table, and its map's label list and repaint
  style. These record readings and decisions, not the book's text.
- The repository itself contains only original work and assets free to redistribute (CC0 or
  similar, each with its source noted): the engine, the interface, drawn art, icons, fonts, and a
  short demo chapter written for this project.
- Pictures the owner supplies for personal use (screenshots of Lone Wolf HD, drawings, scans) are
  kept in an uncommitted folder. The player uses them when present and falls back to its own
  drawing when not.
- Style may follow Lone Wolf HD closely. Its actual asset files are not used.

## 4. Game rules

These are the rules the engine must implement, read from the books' rules pages.
`docs/reference/rules-books.md` has them all, book by book, with what the engine does and does not
apply.

### 4.1 Character

- **Combat Skill** = 10 + Random Number. **Endurance** = 20 + Random Number. Endurance never rises
  above its starting maximum except through items or bonuses that raise the maximum.
- The character dies when Endurance reaches 0.
- **Gold Crowns**: at most 50.
- **Weapons**: at most 2.
- **Backpack**: at most 8 items. Meals are Backpack Items.
- **Special Items**: no limit until Book 8, then at most 12. Some raise maximum Endurance while carried
  (Helmet +2, Chainmail Waistcoat +4); dropping the item removes the bonus.

### 4.2 Disciplines

- **Kai series**: ten Kai Disciplines. A new character chooses five, at whichever book he starts.
  A character carried on adds one for each book completed (six in Book 2, seven in Book 3, ...).
- **Magnakai series**: ten Magnakai Disciplines. A character entering the series (new, or carried
  from Book 5) holds all ten Kai Disciplines and chooses three. Each completed Magnakai book adds
  one.
- Rank is a name for the number of disciplines held in the current series.
- A discipline can gate a choice ("if you have the Kai Discipline of..."). The gate opens only if
  the character has it. A rank, a Lore-circle, or any or all of several disciplines can gate a
  choice the same way.
- Effects that the engine applies:
  | Effect | Kai | Magnakai |
  |---|---|---|
  | +1 Endurance on entering a section with no combat | Healing | Curing |
  | No Meal needed when the text demands one | Hunting | Huntmastery |
  | Immune to enemy mind attacks | Mindshield | Psi-screen |
  | Mind attack in combat | Mindblast: +2 CS | Psi-surge: +4 CS for 2 EP a round, or Mindblast +2 free |
  | Weapon bonus | Weaponskill: +2 CS with one weapon | Weaponmastery: +3 CS with mastered weapons; three chosen at first, one more per later book |
- **Lore-circles** (Magnakai): holding every discipline of a circle grants a permanent bonus:
  | Circle | Disciplines | CS | EP |
  |---|---|---|---|
  | Fire | Weaponmastery, Huntmastery | +1 | +2 |
  | Light | Animal Control, Curing | 0 | +3 |
  | Solaris | Invisibility, Huntmastery, Pathsmanship | +1 | +3 |
  | Spirit | Psi-surge, Psi-screen, Nexus, Divination | +3 | +3 |
- Psi-surge cannot be used when Endurance is 6 or less.
- In a Magnakai book only Magnakai Disciplines have mechanical effect (Book 6 restates the Kai
  effects as Magnakai ones: Weaponmastery for weapons, Huntmastery for Meals).
- From Book 7, ranks improve some disciplines; the engine applies them as rules-books.md
  ("Improved Disciplines") lists them.

### 4.3 Combat

- Combat is a sequence of rounds. Each round:
  1. Combat ratio = the character's effective Combat Skill minus the enemy's.
  2. Draw one Random Number (0-9).
  3. Look both up on the Combat Results Table to get Endurance lost by each side. A result can be
     an outright kill.
  4. Both losses apply at once. If both reach 0, the character is dead.
- Effective Combat Skill = base, plus discipline and Lore-circle bonuses, minus 4 if carrying no
  weapon, minus any enemy mind attack the character is not shielded from, plus or minus any
  adjustment the section states.
- Several enemies in one section are fought one after another.
- **Evasion**: only where the section allows it, and only after the stated number of rounds. The
  round is drawn as usual but only the character's loss applies; then the story moves to the
  section given for evading.
- An enemy may be immune to mind attacks.
- Combat in a section must be resolved before the section's onward choices open.
- House rule: a Laumspur potion may be drunk during combat without costing a round. The books
  allow it only after a fight.
- The books' other combat rules (a Shield, the Bow and its shots, the improved disciplines'
  numbers, Huntmastery against an ambush) are applied as docs/reference/rules-books.md lists them.

### 4.4 Random Number

- A uniform draw from 0 to 9, shown by spinning a numbered medallion that the player triggers.
- When a section's choices are a complete set of number ranges, with or without bonuses the text
  states, the draw (with its bonuses added) opens exactly the matching choice and cannot be redrawn.
- Otherwise the draw is shown and the player picks the choice themselves.

### 4.5 Meals and healing

- When the text requires eating: a hunting discipline exempts; otherwise one Meal is consumed;
  with no Meal the character loses 3 Endurance.
- A Laumspur potion restores 4 Endurance, never above the maximum.

### 4.5a Items the story gives and takes

Where the text adds or removes an item, gold, a Meal or Endurance, the engine does it. What he is
handed is added on arrival; what he may take is one touch per item, each with its own icon; what
he loses outright is crossed off; choices that need an item or gold open only when he has it, and
paying takes the gold. Shops can be bought from as often as the text allows. These are read from
each book by hand into the book's item table, not guessed by the importer (principle 2). Where the
book leaves the decision to the player (which weapon breaks, which item is stolen), a reminder is
shown and the by-hand controls do it. Each object has one identity across all books.

### 4.6 Section flow

- A new game opens on the book's introduction ("The Story So Far"), then turns to section 1.
- A section shows its text and illustration, then resolves in this order: arrival effects
  (forced Meal, healing), combat if any, Random Number if any, then choices.
- A section with no choices is an ending: death, completion of the book, or an ending short of
  death that the book marks as failure.
- A puzzle whose answer is a section number is answered in a "Turn to section" box on the page.
- **Going back**: the player may go back up to three sections, to where a choice was made, and
  make it again. Everything returns to how it stood then; a Random Number may be drawn again. It
  is offered on death (in a fight or in a death section). Going back uses up the steps; moving on
  earns them back.
- Choices read as the book wrote them, with page references removed. A choice that was only a
  page reference reads "Continue".

### 4.7 Carrying a character between books

- Completing a book saves the character: scores, disciplines of every series, weapons, Special
  Items, gold, mastered weapons. As the books' rules say, the Backpack's contents and Meals do not
  carry over: the next book starts with an empty Backpack.
- Starting a book that the saved character has not completed uses that character **by default**.
  Endurance is restored to maximum and the character chooses the discipline(s) it has earned.
- The player can always choose to roll a new character for any book instead.
- A new character starting in a later series is given that series' starting disciplines and is
  treated as already holding every discipline of the earlier series.
- Each book's own starting equipment is granted as that book specifies: after the disciplines, the
  character dialog shows the book's gold and given items, its choice of equipment, the weapons he
  carries (any may be left), and from Book 5 what he leaves at or takes from the Kai Monastery.

## 5. The book model

- A book is a set of numbered sections. A section has text, optionally an illustration, combat,
  a Random Number draw, arrival effects, and choices that each lead to another section.
- A book declares its series, its number in the saga, its introduction, and optionally a map.
- The same engine must play an authored book (the demo) and an imported one.
- Anything the importer cannot read with confidence stays as text. Wrong automation is worse than
  none.
- What the importer cannot know (items, fight corrections, ambushes, bow shots) comes from the
  book's item table, written by hand. Where the text leaves the choice to the player, the table
  says so (a `todo`) rather than guessing.

## 6. Presentation

### 6.1 Layout

- One open book fills the window on a dark surface with warm light from the left. The whole spread
  scales with the window. Decoration around the book (the bronze clockwork) must not cost the
  pages space.
- **Title page**: the adventures (section 7), then an adventure's books, each with continue,
  start over or new character. Books not yet downloaded wait on the shelf.
- **Left page: the story.** Aged parchment inside an ornate ink frame. Script hand, drop capital,
  the section number in a medallion at the top-left corner. Illustrations sit in the text where
  the book places them.
- **Right page: a panel.** A darker, torn sheet. Round bronze tab medallions choose between the
  character, the inventory and the map. During combat the fight takes the whole panel.
- Controls are round bronze medallions with a pale icon; an active or owned one glows. Actions
  that belong to the story (start a fight, open the map) appear as a centred medallion in the text.

### 6.2 Character panel

Laid out after the Lone Wolf HD character sheet: an ink-wash likeness of Lone Wolf across the top
with his name in script beneath it; two ruled ledgers, "Attributes" (scores, rank, Lore-circles)
and the make-up of Combat Skill and Endurance; then every discipline of the series as a medallion
in a framed grid, linked by bars, the learned ones glowing. Touching a discipline explains it.

### 6.3 Inventory panel

After the HD equipment sheet: weapon and Special Item slots over Lone Wolf's ink likeness, the
Backpack as a grid of eight dark tiles, gold. Items are drawn glyphs, each book item with its own.
Touching an item explains it and offers what can be done with it. Controls to add or remove
anything by hand; the list to add from offers the open book's own items.

### 6.4 Map

- The map is the one printed in the book, and only that. No map is drawn or redrawn for a book: no
  made-up places, town plans or travel on the map. Every choice is made on the story page.
- Each printed map is upscaled to 4K on the owner's machine (personal use; never committed): the
  place names are erased and set again in clean type, the land is repainted around them in the
  map's own style, any name the repaint garbles is set again, and the result is enlarged to 4K.
- It is shown in sepia like the rest of the book, opened in a framed view the player drags and
  zooms. A book with no upscale yet shows its printed scan the same way.

### 6.5 Combat

- Fought on the book's pages, not in a separate 3D scene.
- Every fight has a picture. The enemy is a still plate filling the panel: the book's own
  illustration where one exists, restyled to sit on the parchment. Where the book has none, one is
  borrowed: another book's illustration of a plain human enemy (soldiers, guards, robbers; never
  another book's special creature or set-piece fight, unless it is the very same creature), a free
  old engraving of what is described, or a picture the owner supplies. A borrowed picture can be
  limited to one book. If a picture is missing, a drawn emblem stands in.
- The picture is shown whole, as drawn, a little smaller than the panel; a ruled frame line round
  it is removed, and the edges are not faded. Wounds appear on the plate in red ink.
- Controls are medallions: strike, mind attack, potion, evade. The Random Number medallion spins
  for each round.
- Each round is written on the story page as a line of the fight's record.

### 6.6 Feel

- A page turn when the section changes.
- The player has no sound: no effects, music or audio settings.
- Nothing should read as a children's game: no bright flat colour, no cartoon shapes, no pixel art.
- No plain geometric shapes: drawn art is detailed enough to pass for the engraved art beside it,
  or real image assets are used. Icons and glyphs are detailed drawings.
- All colour comes from one palette. Fonts are kept locally, so nothing is fetched from outside the
  PC.

## 7. Persistence

- Several games can be kept going at once. Each **adventure** is one game: its own save for every
  book and its own carried character. The title page lists them; a new one can be begun and an old
  one forgotten (after asking).
- Progress in each book is saved automatically on every change and resumed on return.
- Within an adventure each book keeps its own save. The carried character is kept separately from
  any one book.
- Starting a book over never touches another book's save, the carried character, or another
  adventure.
- **Backup and restore**: a backup is written to the PC. Restore lists the PC's backups, or takes a
  file when the PC is out of reach.
- The demo chapter is not offered by the player. It stays in the repository for the prototypes.

### 7.1 Offline on the iPad

- The player can be kept on the iPad as a Home Screen app and played with no connection. The PC is
  home base: when in reach, the iPad fetches only what changed, in the background, and sends any
  backups made while away. A new version takes over at the next page load, never under a page that
  is running. An interrupted sync resumes.
- The offline copy holds only what the player needs to run: its code, the books, their pictures
  and each book's one map. Work files, tools, docs and prototypes stay on the PC.
- What is copied is decided by a script that follows what the page loads (its scripts, styles and
  fetches, each book and the pictures that book names), never by hand or by review. A check script
  reports its size and anything missing.
- Work files a tool makes along the way (map repaints, trial upscales, checks) live in a `work/`
  folder beside the book, apart from what the player reads.

## 8. Tools

All run by the owner on their own machine.

- A **downloader** fetches one book's pages, illustrations and map from Project Aon.
- An **importer** converts a downloaded book to the book model and reports what it understood:
  counts of sections, combats, gates, Random Number sections, endings, and any broken links.
- A **checker** validates each book's item table against the book.
- A **map editor** edits a map's label list and runs every step of the map upscale (6.4).
- A **server** on the PC serves the player, keeps backups, lists the offline copy, and drives the
  map editor's steps.
- An **offline check** reports what the offline copy holds: file count, size per book, the largest
  files, and anything named but missing.

## 9. Not goals

- Multiplayer, accounts, publishing, or any server beyond the owner's own PC.
- Free-roaming exploration beyond the books' choices, and maps made for the books.
- Real-time or 3D combat, or 3D anywhere.
- Sound.
- Rewriting or abridging the books' text.
- Developing the rejected prototypes (`prototypes/`); they are kept working only.

## 10. Open questions

None at present.

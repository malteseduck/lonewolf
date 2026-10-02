# Lone Wolf player: specification

This document states intent: what the project is for and the rules it must follow. It does not
describe the code. For how things are built today, see `docs/reference/`. When the two disagree,
this file says what should be true and the reference says what is true.

## 1. Purpose

A personal-use player for Joe Dever's Lone Wolf gamebooks, starting with the Kai series (books 1-5)
and the Magnakai series (books 6-12), with room for the later series. It replaces reading the
Project Aon web edition beside a separate action chart. It should feel like the 2013 game
*Joe Dever's Lone Wolf HD Remastered*: a dark, aged book that is itself the interface.

The owner is the only user. Nothing here is published or released.

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
6. **No build step.** Plain HTML, CSS and JavaScript that run from a static file server.
7. **Content stays local.** See section 3.

## 3. Content and licensing

- The books' text and illustrations come from Project Aon, whose licence allows download for
  personal use and forbids redistribution.
- Book content is fetched onto the owner's machine by a tool and kept in a folder that is excluded
  from version control. It must never be committed, published, uploaded or pasted into documents,
  commit messages, chat logs or code comments.
- The repository itself contains only original work: the engine, the interface, procedural art,
  and a short demo chapter written for this project.
- Derived assets (for example, an illustration re-tinted to match the page) are made on the
  owner's machine from their local copy and stay there.
- Style may follow Lone Wolf HD closely. Its actual asset files are not used.

## 4. Game rules

These are the rules the engine must implement. Numbers marked (verify) were written from memory
and must be checked against the rules pages of the books.

### 4.1 Character

- **Combat Skill** = 10 + Random Number. **Endurance** = 20 + Random Number. Endurance never rises
  above its starting maximum except through items or bonuses that raise the maximum.
- The character dies when Endurance reaches 0.
- **Gold Crowns**: at most 50.
- **Weapons**: at most 2.
- **Backpack**: at most 8 items. Meals are Backpack Items.
- **Special Items**: no limit in the Kai series. Some raise maximum Endurance while carried
  (Helmet +2, Chainmail Waistcoat +4); dropping the item removes the bonus.

### 4.2 Disciplines

- **Kai series**: ten Kai Disciplines. A new character chooses five. Each completed Kai book adds
  one.
- **Magnakai series**: ten Magnakai Disciplines. A character entering the series chooses three.
  Each completed Magnakai book adds one.
- Rank is a name for the number of disciplines held in the current series.
- A discipline can gate a choice ("if you have the Kai Discipline of..."). The gate opens only if
  the character has it. A rank can gate a choice the same way.
- Effects that the engine applies:
  | Effect | Kai | Magnakai |
  |---|---|---|
  | +1 Endurance on entering a section with no combat | Healing | Curing |
  | No Meal needed when the text demands one | Hunting | Huntmastery |
  | Immune to enemy mind attacks | Mindshield | Psi-screen |
  | Mind attack in combat | Mindblast: +2 CS | Psi-surge: +4 CS for 2 EP a round, or Mindblast +2 free (verify) |
  | Weapon bonus | Weaponskill: +2 CS with one weapon | Weaponmastery: +3 CS with mastered weapons; three chosen at first, one more per later book (verify) |
- **Lore-circles** (Magnakai): holding every discipline of a circle grants a permanent bonus
  (verify all four):
  | Circle | Disciplines | CS | EP |
  |---|---|---|---|
  | Fire | Weaponmastery, Huntmastery | +1 | +2 |
  | Light | Animal Control, Curing | 0 | +3 |
  | Solaris | Invisibility, Huntmastery, Pathsmanship | +1 | +3 |
  | Spirit | Psi-surge, Psi-screen, Nexus, Divination | +3 | +3 |
- Psi-surge cannot be used when Endurance is 6 or less (verify).
- In a Magnakai book only Magnakai Disciplines have mechanical effect. (This is an interpretation.
  Verify against the Magnakai rules; if Kai Disciplines keep their effects, change it.)

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
- House rule kept from the prototypes: a Laumspur potion may be drunk during combat without
  costing a round. (The books do not allow this. Revisit.)

### 4.4 Random Number

- A uniform draw from 0 to 9, shown by spinning a numbered medallion that the player triggers.
- When a section's choices are a complete set of number ranges with no modifiers, the draw opens
  exactly the matching choice and cannot be redrawn.
- Otherwise the draw is shown and the player picks the choice themselves.

### 4.5 Meals and healing

- When the text requires eating: a hunting discipline exempts; otherwise one Meal is consumed;
  with no Meal the character loses 3 Endurance.
- A Laumspur potion restores 4 Endurance, never above the maximum.

### 4.5a Items the story gives and takes

Owner's request (2026-10-01): where the text adds or removes an item, gold, a Meal or Endurance,
the engine does it. What he is handed is added on arrival; what he may take is one touch per
item, each with its own icon; what he loses outright is crossed off; choices that need an item or
gold open only when he has it, and paying takes the gold. These are read from each book by hand,
not guessed by the importer (principle 2). Where the book leaves the decision to the player
(which weapon breaks, which item is stolen), a reminder is shown and the by-hand controls do it.

### 4.6 Section flow

- A section shows its text and illustration, then resolves in this order: arrival effects
  (forced Meal, healing), combat if any, Random Number if any, then choices.
- A section with no choices is an ending: death, or completion of the book.
- **Going back** (owner's request, 2026-10-01): the player may go back up to three sections, to
  where a choice was made, and make it again. Everything returns to how it stood then; a Random
  Number may be drawn again. It is offered on death (in a fight or in a death section), and at
  any time on the map, by touching a place passed in those sections. Going back uses up the
  steps; moving on earns them back.
- Choices read as the book wrote them, with page references removed. A choice that was only a
  page reference reads "Continue".

### 4.7 Carrying a character between books

- Completing a book saves the character: scores, disciplines of every series, weapons, pack,
  Special Items, gold, mastered weapons.
- Starting a book that the saved character has not completed uses that character **by default**.
  Endurance is restored to maximum and the character chooses the discipline(s) it has earned.
- The player can always choose to roll a new character for any book instead.
- A new character starting in a later series is given that series' starting disciplines and is
  treated as already holding every discipline of the earlier series.
- Each book's own starting equipment should be granted as that book specifies.

## 5. The book model

- A book is a set of numbered sections. A section has text, optionally an illustration, combat,
  a Random Number draw, arrival effects, and choices that each lead to another section.
- A book declares its series, its number in the saga, and optionally a map.
- The same engine must play an authored book (the demo) and an imported one.
- Anything the importer cannot read with confidence stays as text. Wrong automation is worse than
  none.

## 6. Presentation

### 6.1 Layout

- One open book fills the window on a dark surface with warm light from the left. Decoration
  around the book (the bronze clockwork) must not cost the pages space.
- **Left page: the story.** Aged parchment inside an ornate ink frame. Script hand, drop capital,
  the section number in a medallion at the top-left corner. Illustrations sit in the text where
  the book places them.
- **Right page: a panel.** A darker, torn sheet. Round bronze tab medallions choose between the
  character, the inventory and the map. During combat the fight takes the whole panel.
- Controls are round bronze medallions with a pale icon; an active or owned one glows. Actions
  that belong to the story (start a fight, open the map) appear as a centred medallion in the text.

### 6.2 Character panel

Laid out after the Lone Wolf HD character sheet (owner's request, 2026-10-01): an ink-wash
likeness of Lone Wolf across the top with his name in script beneath it; two ruled ledgers,
"Attributes" (scores, rank, Lore-circles) and the make-up of Combat Skill and Endurance; then every
discipline of the series as a medallion in a framed grid, linked by bars, the learned ones glowing.
Touching a discipline explains it. Drawn art over minimal figures: the glyphs are detailed drawings,
not plain shapes.

### 6.3 Inventory panel

After the HD equipment sheet (owner's request, 2026-10-01): weapon and Special Item slots over Lone
Wolf's ink likeness, the Backpack as a grid of eight dark tiles, gold. Items are drawn glyphs. Touching
an item explains it and offers what can be done with it. Controls to add or remove anything by
hand.

### 6.4 Map

- A sepia ink map in the style of Lone Wolf HD, built from image tiles: engraved mountains,
  forests and settlements stamped onto parchment, with white dashed roads over them. Not plain
  geometric shapes.
- Every symbol on the map reads as one engraving: the same sepia ink, hatching for shade, the
  paper showing through, no colour and no outline lifting it off the map. Buildings are vector
  drawings in that manner, modelled on the official Maps of Magnamund icons, so they scale with
  the zoom. Only things that are not part of the map (Lone Wolf's figure, the lit destination
  rings) stand out from it.
- The book's own printed map can be viewed too, repainted in sepia on the owner's machine
  (personal use; never committed).
- The player's route so far is drawn and a pawn marks the current position.
- **Where a book has a location for each section**, choices that move to another place are made
  on the map: reachable places light up and the player touches one. Choices that stay in place
  remain on the story page. This is the preferred way to travel.
- Where a book has no such data, the map shows progress along the journey and choices stay on
  the page.
- The map is more linear than Lone Wolf HD's: it offers the book's choices, not free roaming.

### 6.5 Combat

- Fought on the book's pages, not in a separate 3D scene.
- Every fight has a picture (owner's request, 2026-10-01). Where the book has none, one is borrowed:
  another book's illustration of a plain human enemy (soldiers, guards, robbers; never another
  book's special creature or set-piece fight), a free old engraving of what is described, or a
  picture the owner supplies. The picture is shown whole, as drawn, a little smaller than the
  panel; a ruled frame line round it is removed, and the edges are not faded.
- The enemy is a still plate filling the panel: the book's own illustration where one exists,
  restyled to sit on the parchment. Wounds appear on the plate in red ink.
- Controls are medallions: strike, mind attack, potion, evade. The Random Number medallion spins
  for each round.
- Each round is written on the story page as a line of the fight's record.

### 6.6 Feel

- A page turn when the section changes.
- Sound is low and physical: paper, a drone, dull impacts. No arcade tones. It can be turned off.
- Nothing should read as a children's game: no bright flat colour, no cartoon shapes, no pixel art.

## 7. Persistence

- Several games can be kept going at once (owner's request, 2026-10-01). Each **adventure** is one
  game: its own save for every book and its own carried character. The title page lists them; a
  new one can be begun and an old one forgotten (after asking).
- Progress in each book is saved automatically on every change and resumed on return.
- Within an adventure each book keeps its own save. The carried character is kept separately from
  any one book.
- Starting a book over never touches another book's save, the carried character, or another
  adventure.
- The demo chapter is not offered by the player (owner's request, 2026-10-01). It stays in the
  repository for the prototypes.

## 8. Tools

- A downloader fetches one book's pages, illustrations and map from Project Aon.
- An importer converts a downloaded book to the book model and reports what it understood:
  counts of sections, combats, gates, Random Number sections, endings, and any broken links.
- Both are run by the owner, per book, on their own machine.

## 9. Not goals

- Multiplayer, accounts, servers, publishing.
- Free-roaming exploration beyond the books' choices.
- Real-time or 3D combat.
- Rewriting or abridging the books' text.

## 10. Open questions

- Verify every number marked (verify) and the Combat Results Table against the books.
- Whether Kai Disciplines keep their effects inside Magnakai books.
- Bow and Arrow rules, and the Special Item limit in later books.
- Per-book starting equipment.
- Location data for imported books, so map travel works in them as it does in the demo.

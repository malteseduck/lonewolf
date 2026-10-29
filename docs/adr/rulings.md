# Rulings

The owner's small decisions: one line each, binding exactly as an ADR is (README.md). A ruling is a
choice with no alternatives worth recording and no consequences beyond the place it names. One that
grows (amended, or picks up a "because" that matters) moves into an ADR, and its row then points
there. Ids are never reused; a row is changed in place, with its date updated.

Cite a ruling by its id: "ruling R1".

## Game and house rules

| Id | Ruling | Where | Date |
|---|---|---|---|
| R1 | The Combat Ratio counts for **+10 at most**: the table's "+11 or more" column is never used. No floor below. Every fight, every book, whatever the weapon. A house rule, after the Sommerswerd made early fights a formality. | `LW.RATIO_CAP` (shared/fight.js); rules-books.md, rules-engine.md name it as a house rule | 2026-10-04 |
| R2 | **At most 12 Special Items in every book**, Kai and Magnakai too (the books set it from Book 8). Items marked `free` still do not count; over 12 may be left at the Monastery where the kit step allows. A character carried in with more (an old save) keeps them but takes no more until under. | `LW.specialLimit()`, `LW.putItem`, `LW.KitSetup` (core.js); rules-books.md marks it as the owner's | 2026-10-12 |
| R3 | **A fight draws its Random Numbers out of sight**: Strike and Evade draw at once (`LW.rand10()`), no medallion, the log still saying the number. A section's own Random Number is still spun on the page. | `battleAct` (main.js) | 2026-10-12 |
| R23 | **An obstacle is fought as a foe with no mind, and leaving it costs no blow.** A door fought as an enemy (combat `kind: 'obstacle'`, Book 6's 156, Book 7's 214) cannot strike him as he goes: the way out the text gives is free, named "Leave it". Mindblast does not touch it, but Psi-surge and Kai-surge do, since the Magnakai books' Psi-surge shakes objects apart: it is fought as immune to Mindblast only (`immune: 'mindblast'`). | `Fight#evades`, the `Fight` constructor (shared/fight.js) | 2026-10-27 |
| R24 | Mindblast and an obstacle: now ruling R23. | ruling R23 | 2026-10-27 |
| R31 | **A won fight with no way on of its own goes straight to the section's one open choice.** "Turn the page" takes it when exactly one choice is open and it needs no draw, and the section has no Random Number, puzzle, trade, stake, game, loss to choose or find left to take; otherwise the choices open as before. Wins only, not a stop or an evasion. | `Game#onlyWay` (shared/core.js), `Fight#finish` (shared/fight.js) | 2026-10-28 |

## Book readings

Where a book's text can be read more than one way. A later book with a similar case gets its own
row, not a decision by analogy.

| Id | Book | Ruling | Date |
|---|---|---|---|
| R4 | 2 | Hunting does not excuse a Meal anywhere in the Wildlands, Ragadorn and its coast road included (32, 37, 127, 148, 346). | 2026-10-01 |
| R5 | 2 | Documents and the Gold Ring are Special Items; the Healing Potion, Potion of Orange Liquid, Fur Blanket and Rope are Backpack Items. | 2026-10-01 |
| R6 | 2 | "Some Laumspur" (36) is the herb or any Laumspur potion, and one is used up. | 2026-10-01 |
| R7 | 2 | "Ever been given" (328) counts a Pendant since lost. | 2026-10-01 |
| R8 | 2 | "No pass" (246) closes when he holds either pass. | 2026-10-01 |
| R9 | 13+ | **Deliverance** ("once every 20 days") is used once a book, as Archmaster Curing is. | 2026-10-10 |
| R10 | 13+ | A bow shot whose section gives Grand Weaponmastery with Bow its own bonus (Book 13: 104, 176, 303) adds that number in place of the rules page's +5, never as well. The item table gives `grandBow: n` beside `bowShot`; later Grand Master books mark theirs the same way. | 2026-10-17 |
| R16 | 6 | The archery final (26) is a contest of bows: neither Psi-surge nor Mindblast counts in it (`noMind`). | 2026-10-21 |
| R17 | 11 | The scarlet warrior's curvy-bladed sword kept at 8 is a Weapon that fights as a Sword, as the text calls it (`curvedSword11`). | 2026-10-22 |
| R18 | 13 | Baylon's Bough Fungi are kept after a chunk is eaten at 277: "some" were kept at Book 11's 146, and no later section asks for them. | 2026-10-22 |

## Presentation

| Id | Ruling | Where | Date |
|---|---|---|---|
| R11 | A section's single choice that was only a page reference reads "Continue". | spec 4.6; the importer | 2026-09-30 |
| R12 | **The iPad (landscape and portrait) and the PC's window** are the layouts to fit and judge. Phones are not a target: no work, checks or tests for them. Narrow-window code already there may stay, but nothing is designed or fixed for it, and it may go when it gets in the way. | spec 1, 9 | 2026-10-12 |
| R26 | **Lone Wolf's likeness is the owner's own drawing** (`assets/hero/lone-wolf.webp`), on the title page (hood to knee, right of the middle, the burning Kai monastery faint behind him, also the owner's) and the Kai panel (head to belt), not Lone Wolf HD art. | `main.js` `HERO`; `assets/hero/README.txt` | 2026-10-21 |
| R19 | The public showcase shows only stand-in content: now ADR 0046. | ADR 0046 | 2026-10-27 |
| R20 | The made-up demo book `99ember`: now ADR 0046. | ADR 0046 | 2026-10-27 |
| R22 | **Adding an item by hand offers every item, and takes no typed name.** Every book's items are in its item table, so the picker lists them all: the weapons, the engine's and the open book's Backpack and Special Items, and earlier books' Special Items folded away with a filter by book. | `main.js` pickerHTML, `LW.pickable` | 2026-10-24 |

## Workflow

| Id | Ruling | Where | Date |
|---|---|---|---|
| R13 | The iPad is served the last release: now ADR 0045. | ADR 0045 | 2026-10-27 |
| R14 | **Each book's item table is `items/items-<code>.js`.** The root holds the page, the service worker, the player's modules, and files tools need at the root (configuration, the agents' and readers' notes). | `main.js` imports from `./items/`; the tools look there | 2026-10-11 |
| R15 | Release runs the offline check first: now ADR 0045. | ADR 0045 | 2026-10-27 |
| R25 | Release also pushes `main`: now ADR 0045. | ADR 0045 | 2026-10-27 |
| R27 | Step 7's candidates on the proposal sheet: now ADR 0008. | ADR 0008 | 2026-10-27 |
| R21 | `AGENTS.md` holds instructions, never state: now ADR 0044. | ADR 0044 | 2026-10-27 |
| R28 | Folder `AGENTS.md` files for work inside them: now ADR 0044. | ADR 0044 | 2026-10-27 |
| R29 | The docs kept in line at commit (the hook) and at release (the pass): now ADR 0044. | ADR 0044 | 2026-10-27 |
| R30 | `docs/reference/harness.md` describes the harness and is checked: now ADR 0044. | ADR 0044 | 2026-10-27 |

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
| R16 | **Lone Wolf's likeness is the owner's own drawing** (`assets/hero/lone-wolf.webp`), on the title page (hood to knee, right of the middle, the burning Kai monastery faint behind him, also the owner's) and the Kai panel (head to belt), not Lone Wolf HD art. | `main.js` `HERO`; `assets/hero/README.txt` | 2026-10-21 |
| R19 | **The public showcase shows only stand-in content.** `docs/showcase/` and the public deck use a stand-in book written for them, the owner's own art, public-domain engravings and made-up maps, and say "representative screens only, to keep licensed content out"; the real books' text, art and maps appear only in the private deck. | `docs/showcase/README.md` | 2026-10-24 |
| R20 | **A made-up demo book, `99ember` (*The Ember Road*), is committed in `demo/99ember/` and works like any imported book, but only on the PC.** Its source is Project Aon's page layout in text of our own, public-domain engravings and a made-up map; `tools/demo_book.py` (run by `serve.py`) installs it into `data/projectaon/`, so the importer, dashboard and map editor treat it as any book. It shows as a "Demo" link on the title page only where its `book.js` exists, and is kept out of the release, the offline copy, the iPad, the checklist, `check_all` and `reimport_all`. It changes no engine rule: it uses the engine and item-table fields as they are. | `demo/99ember/`, `tools/demo_book.py`, `docs/showcase/README.md` | 2026-10-24 |

## Workflow

| Id | Ruling | Where | Date |
|---|---|---|---|
| R13 | **The iPad is served the last release**, not the working copy: `tools/serve.py --release` on port 8765, always running. A change reaches it only after a commit and `tools/release.py`, the owner's call: agents do not run it or press Release unasked. | `docs/reference/offline.md` | 2026-10-10 |
| R14 | **Each book's item table is `items/items-<code>.js`.** The root holds the page, the service worker, the player's modules, and files tools need at the root (configuration, the agents' and readers' notes). | `main.js` imports from `./items/`; the tools look there | 2026-10-11 |
| R15 | **The dashboard's Release runs the offline check first**, and has no button of its own for it. A release whose files are exactly those released already makes nothing and says so; the check has still run. | `tools/serve.py` ADMIN_STAGES, `tools/release.py` | 2026-10-17 |

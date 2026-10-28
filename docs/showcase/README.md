# A Lone Wolf player: showcase

A personal-use player for the Lone Wolf gamebooks (Kai, Magnakai and Grand Master), styled after
*Lone Wolf HD Remastered*, with a harness that brings each book in and a pipeline that repaints its
printed map. Plain HTML, CSS and JavaScript; no build step; plays offline on an iPad.

**Full deck (public): <https://claude.ai/artifact/DD9UiF2WCQtGyZ7HRHFsCj>**
(a slideshow of everything below, with speaker notes; it opens for anyone once shared from its Share menu).

> **Representative screens only, to keep licensed content out.** Nothing on this page comes from a
> Lone Wolf book. The screens are a stand-in book written for this showcase (*The Ember Road*), public-domain
> engravings, the owner's own art and a made-up map, run through the real pipeline. The real player plays the books from Project Aon
> files kept locally and never committed. See [Credits](#credits).

## The player

![The title page](images/01-title.jpg)

**The title page** is built round the owner's own drawing of Lone Wolf and the burning Kai monastery
behind him (ruling R26), with a band of numerals for each series.

![The shelf](images/02-shelf.jpg)

**One shelf for all three series.** Tabs for the Kai, the Magnakai and the Grand Master; every
adventure is its own game with a Lone Wolf of its own and its own saves, and a hero carries on into the next book.

![Setting out](images/03-setting-out.jpg)

**Setting out happens on the book's own two pages**: touch the dial medallions for Combat Skill and
Endurance, pick disciplines (or "choose for me"), then equipment: take up to five things and draw your gold.

![The story so far](images/04-intro.jpg)

![A story page](images/05-story.jpg)

**The story page** is a framed spread like the HD game: an illustration, the choices, and the hero's page
on the right. A choice that needs a discipline or an item is locked until the hero has it; the Random
Number is drawn on a medallion; a death can be rewound.

![The inventory ledger](images/06-inventory.jpg)

**The inventory is a ledger** like the hero's page: weapons either side of a wolf's-head crest, Special
Items counted against the limit of twelve, an eight-tile Backpack and the gold. Adding an item by hand picks
from every item the books know, earlier books' Special Items folded away by book; nothing is typed.

![A fight, as it begins](images/07-fight-start.jpg)

![A fight, mid-round](images/08-fight.jpg)

**Combat** shows the round log on the left page and the foe on the right, with Strike, Mindblast and
Evade as bronze medallions. Every foe has a picture of its own, the same creature from another book, or a
stand-in; the player inks it to sepia live. Not every fight is a foe: a door is fought as an obstacle (no
Mindblast, and "Leave it" costs no blow), a contest or a fight of the mind is worded and drawn as such.

![Magnakai setting out](images/09-magnakai-setting-out.jpg)

**The rules follow the series.** Magnakai heroes draw with their own base scores and disciplines, and the
engine applies ranks, Lore-circles, Weaponmastery, Psi-surge, ambushes and the books' limits; where a rule
cannot be read reliably from the text it stays text, with by-hand controls.

![The map](images/10-map.jpg)

![The map, zoomed](images/11-map-zoom.jpg)

**The map** is the book's own printed map, repainted once and restyled at runtime. It opens fitted, zooms
to 3x by wheel, drag, pinch or the bronze +/- medallions, and keeps small names sharp at 4K. The map shown
here is made up (see [Maps](#maps)).

## The harness

Each book goes through nine steps: download, import, phrasings, rules addendum, item table, play-through,
fight pictures, map and illustrations. The import dashboard (`tools/admin/`, this PC only) shows where each
book stands, runs the script steps, and hands the steps that need judgement to Claude Code as a ready prompt.

![A book, its steps as tabs, the rail of books](images/21-dashboard-book.jpg)

![All books](images/20-dashboard-grid.jpg)

**The dashboard** is a rail of books (each with its ten steps as small seals), the open book's steps as tabs,
and the step's evidence and buttons; a sheet opens inside its step, and Full window gives it the whole
screen. The grid shows every book against every step. Everything is read from the files on disk and the
owner's hand marks, never from a checklist that might be out of date. A cog is a script, a hand is the owner,
a quill is Claude Code. Gated buttons (download, import, re-import all) wait for the owner's go-ahead.

![The fight picture sheet](images/22-sheet-fights.jpg)

**The fight picture sheet** shows every kind of enemy in a book with the picture the player would show,
where it came from and what the enemy is. Pictures can be dropped, pasted or fetched by address (each asks
for its source link, or is marked as made with AI from a text prompt, and then kept in the repository), cropped,
flipped and levelled with the fight panel previewed, and approved with a date.
A picture the owner supplies wins over every other source.

![Select and one prompt for them all](images/27-sheet-fights-select.jpg)

**Asking Claude Code for better pictures** is a button: a card's Prompt copies step 7's agent prompt
narrowed to that enemy, and Select ticks several cards for one "Prompt for N selected", cheaper than one each.

![The proposal sheet](images/28-sheet-proposals.jpg)

**The proposal sheet** is where the answer comes back. For each enemy the agent looked at: the picture shown
now, its candidates inked as in a fight with the agent's pick outlined and why, and beside them the book's own
sections where the enemy is met, with the sentences that describe it highlighted. Use this or Keep as is
settles a row; none fits, and the row's prompt goes to an image generator, whose picture is pasted straight
onto the row as one more candidate. Finish ends the round, and the next round leaves alone what was settled.
(Shown on the demo book's one foe, with public-domain engravings as candidates.)

![The illustration sheet](images/23-sheet-illustrations.jpg)

![Original and 2x upscale](images/24-sheet-upscale-compare.jpg)

**The illustration sheet** lists every illustration with the sections it is in, marks those not yet
upscaled, and compares the original with its 2x copy (made locally by Real-ESRGAN) side by side or at 1:1.
It only looks; nothing on it changes a file.

![The item sheet](images/25-sheet-items.jpg)

![The icon sheet](images/26-sheet-icons.jpg)

**The item and icon sheets** show each item as the inventory draws it, with the sections that give, take or
need it. *Change icon...* picks another from the icons on this PC or from game-icons.net (saved and credited
as it is picked).

![Lone Wolf's pictures](images/29-hero-pictures.jpg)

**Lone Wolf's pictures** bakes the title page's and the Kai panel's Lone Wolf from the owner's drawing, at
the iPad's size, into the two small files the player loads.

Other tools on the dashboard: *Check everything* (re-imports every book against its last report, runs every
item table's check, the approved fight pictures, the offline copy and a check that no description repeats a
book's wording, then both test suites, in about ten seconds), *Picture sources* (where each borrowed picture
came from), *Scan phrasings*, *Diff rules*, *Walk the book* (a play-through in Node), *Draft and compare* an item
table, *Release to the iPad* (the offline check first, then the release, then a push of `main` to GitHub) and *Setup* for a fresh checkout.

## Maps

The printed maps are Project Aon's, so none is shown here. The process is shown on a made-up map, the
Emberlands: the demo book's own map (`demo/99ember/`), the owner's degraded Gemini scan run through every
step of the real pipeline. The pictures below are real captures of it, a corner of the map at each stage:

![The Emberlands](images/45-emberlands-map.jpg)

| 1 Scan | 2 Real-ESRGAN | 3 Erase | 4 Letter | 5 Gemini | 6 Finish |
|---|---|---|---|---|---|
| ![](images/30-stage-1-scan.jpg) | ![](images/31-stage-2-upscale.jpg) | ![](images/32-stage-3-erase.jpg) | ![](images/33-stage-4-letter.jpg) | ![](images/34-stage-5-paint.jpg) | ![](images/35-stage-6-finish.jpg) |

The names are erased from the scan and set again in a font; Gemini repaints the ground; and the finish step
warps the paint onto the scan and re-sets any name it garbled.

![Before](images/36-zoom-before.jpg) ![After](images/37-zoom-after.jpg)

*Before and after, the same spot: the 1024 px scan enlarged, and the 4K repaint.*

Why not Gemini alone? It repaints beautifully but can misspell names and cannot go past its own size
(this round came back with the names right, and the check still looked at every one). The pipeline keeps
the scan's geometry and a 4K frame.

| The scan | Gemini alone | The pipeline |
|---|---|---|
| ![](images/38-compare-scan.jpg) | ![](images/39-compare-gemini-alone.jpg) | ![](images/40-compare-pipeline.jpg) |

Machines find the drift and eyes judge it: SIFT matches the repaint to the scan, a grid flags where colour
moved (red) or outlines appeared or vanished (blue), and a label sheet sets each name beside the repaint's.

![Check flags](images/41-check-flags.jpg) ![Label sheet](images/42-check-labels.jpg)

One page, the map editor, runs every step. Here it is inside the dashboard on the demo map, with its stage rail:

![Editor, labels](images/43-editor-labels.jpg) ![Editor, Gemini step](images/44-editor-gemini.jpg)

![The editor's stage rail](images/46-editor-rail.jpg)

## Making this showcase again

- The player screens (01-09) were taken on the demo book, `demo/99ember/`: start the server
  (`uv run --project tools python tools/serve.py`) and use the title page's "Demo: The Ember Road" link.
  [`make/ember-road-book.js`](make/ember-road-book.js) is the stand-in it grew from, kept for reference.
- The map pictures (30-46) are captures of the demo map (`demo/99ember/map.png`, the owner's degraded
  Gemini scan) run through the map editor's steps. [`make/make_map.py`](make/make_map.py), a procedural
  made-up map, is the earlier stand-in it replaced.
- [`gemini-prompts.md`](gemini-prompts.md): prompts for painting finer versions of the made-up art in Gemini.

## Credits

- The Lone Wolf books and their world: Joe Dever (text) and the illustrators; played from Project Aon's
  Internet Editions (Project Aon License). **None of it is in this showcase or committed to the repository.**
- *Lone Wolf HD Remastered* (Forge Reply): the look follows it; none of its art is used.
- The drawing of Lone Wolf and the burning monastery: the owner's own (the monastery made with Google Gemini
  from the drawing).
- *The Ember Road* and the Emberlands (its map and every stage and screen shown of it): made up for this showcase.
- Engravings (public domain, Wikimedia Commons): Brehm, Knobel, Rosomak, Schongauer, Doré, Piranesi, Haeckel,
  the Beast of Gévaudan print and others; see `assets/plates/README.txt`.
- Icons: game-icons.net by Lorc, Delapouite and Skoll, CC BY 3.0 (`assets/icons/README.txt`). Fonts:
  Metamorphous, EB Garamond, Cabin, Charm, Darkland and Almendra, SIL Open Font License.

## Try it: the demo book

*The Ember Road* is also a real, playable book in this repository (`demo/99ember/`, ruling R20): eight
sections in Project Aon's page layout, three public-domain engravings, an item table and a made-up map.
Start `python tools/serve.py`; it installs the book into `data/projectaon/` and the title page shows a
"Demo: The Ember Road" link. The importer, the dashboard (as Book 99) and the map editor work on it like on
any book. It is never released: not in the offline copy, not on the iPad, not in the checklist.

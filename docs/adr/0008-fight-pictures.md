# 0008. Fight pictures: where each comes from, shown whole, upscaled 2x, pinned once approved

- Status: Accepted
- Date: 2026-10-01 (shown whole); varied humans 2026-10-09; pinned 2026-10-11; source order 2026-10-14
- Amended: 2026-10-30

## Context

Fight pictures are inked onto the parchment at runtime. Fading their edges or cropping them was
tried; the owner wants each picture whole. A ruled-frame detector cut at any frame line near the
edge, so art drawn past the frame (Book 4's Vassagonian Warhound's snout) was lost.

The broad picture-library entries for soldiers, guards and robbers would show the same picture in
every such fight of a book full of them.

A re-import after the Book 13 importer change reported other picture counts for Books 4-8, whose
pictures the owner had reviewed. That came from `plates.json` entries added the day before, but it
showed that a `plates.json` edit or an importer change could alter a reviewed book's pictures unseen.

The procedure once looked at the owner's `art/plates/` pictures first and other books only for plain
humans. Book 9's Doomwolf was given the owner's bestiary drawing although the book pictures its own
Doomwolves one section before that fight, and its Gourgaz the same drawing although Book 1 pictures
the very same creature. The owner set the order.

## Decision

- **Where a fight's picture comes from**, first that applies:
  1. The fight's own picture, if its section has one: drawn for that fight, it wins all but very
     rarely (2026-10-24), and an agent's check leaves it unless it plainly shows something else.
  2. The same creature in the same book: any of the book's illustrations, fight pictures included
     (another fight's, or one where the creature is met but not fought), whole or cropped.
  3. The same creature in another book, likewise.
  4. A stand-in: the owner's `art/plates/` pictures, the library in `assets/plates/`, or a picture
     found by searching, for ordinary things (animals, plain humans, a door). A creature particular to
     Lone Wolf that no book pictures takes none: the owner generates its picture from a prompt.

  **The agent's proposals** (step 7's proposal sheet) take candidates from the books' own pictures
  only: no web search, Wikimedia Commons included, and no library stand-in (2026-10-28). An enemy no
  book's picture shows well is proposed with no candidates, for the owner to generate from the
  prompt. The prompt's reference pictures are the picture the enemy shows now, every candidate, then
  a good pick of the books' pictures of it or its surroundings. The sheet quotes only the sections
  where the enemy is fought or something describes it or its fight; one that only names it ("the
  guard", not "the burly guard") is no context and is left out.

  A picture matches only if it shows that creature or that kind of foe (a Death Knight is not some
  guard). A picture the owner sets on the picture sheet is the owner's choice and stands whatever the order.
- **Plain human enemies** (guards, soldiers, mercenaries, robbers): each kind in a book gets its own
  entry, a different illustration or a different figure cropped from one, from the book's non-fight
  pictures or other books' plain humans; another book's plain human and an `art/plates/` stand-in rank
  alike, chosen for variety. The broad entries are a last resort. Another book's special creature or
  set-piece fight is never borrowed, unless it is the very same creature.
- **Shown whole**, as drawn, a little smaller than the panel. Nothing is cut away automatically: a
  ruled frame, caption or anything else unwanted is left out by hand with the picture's crop (Adjust
  on the picture sheet). The edges are not faded.
- **Upscaled 2x** as the illustrations are (ADR 0031), all of a book's at once by "Upscale 2x" at
  checklist step 7: every picture its fights can show, now or as approved, each copy beside its
  source. Each copy is sized for the iPad: twice its picture, but no wider than makes its widest crop
  (in any book) 1100 px across, the width the fight panel inks it at; a picture already past that is
  only reduced, without Real-ESRGAN, and a copy of another size is made again. The book's list of them, `assets/plates/upscaled/<code>.json`, makes the player and the sheet
  show the copy; `plates.json` and the approved pictures keep naming the originals, so nothing waits
  for approval, and a crop (in fractions) fits both. Adjust's "Show original" swaps in the picture
  before the upscale. Step 7 cannot be marked done while any of those pictures lacks an up-to-date 2x
  copy (one older than its original counts as missing); a book marked done with one missing shows a
  warning; the sheet badges each card shown from its original "Not upscaled".
- **Pinned once approved.** When a book's step 7 is marked done, the picture each fight shows is
  pinned: the player shows it whatever `plates.json` or a re-import would now pick. A fight that would
  now show another picture is listed on the dashboard (step 7 becomes a warning, naming the sections)
  and waits for the owner's **Approve picture changes**, a gated button. Agents never press it nor run
  `plates_pin.mjs --approve` on their own. The owner's own change to an enemy on the picture sheet is
  the owner's approval for that enemy. Unmarking step 7 lets the pins go.
- **Candidates go on the proposal sheet**, never as a contact sheet image or a description in chat.
  The owner decides a fight's picture with its context beside it: the pictures as they would look in
  a fight, what the enemy is (its `foe-about.json` entry) and the book's text where it is met and
  fought. The agent writes the book's `plate-proposals.json` and the owner picks on the dashboard's
  proposal sheet. Each enemy there carries the agent's fuller description as an image-generator
  prompt (references attached by the owner: the picture it shows now and every candidate on disk,
  then the agent's own `refs`), and a picture pasted on its row becomes a "from AI"
  candidate.
- The picture sheet says once, at the top, whether the book is approved; only cards waiting for
  approval are marked (showing the new picture), with a filter to show only those.
- **Every picture and every enemy says what it is.** Each illustration (small ones too) has a short
  description of what it is: who or what, and at which moment, as the book has it, or the wiki where
  the book does not say; a stand-in says what it stands for. The words come only from the book's text
  or the wiki, never from looking at the picture. Each enemy has one of what it is by the book,
  topped up from the wiki (marked "(wiki)") where the book says little, whatever picture stands in
  for it, so the owner knows the creature when looking for another
  picture: the picture sheet shows the enemy's, the illustration sheet the picture's. Both are kept in
  the illustration index, written by hand (no editing on the sheets: the owner wants the book's
  description, not to write one). In our own words, committed in `about/` (ADR 0042). Book 13 first (2026-10-17), as the pattern.

## Consequences

- `inkPlate` in `plates.js` draws the picture (`docs/reference/interface.md`). Do not add a fade or
  vignette, or a detector that crops on its own.
- The illustration index (`tools/ill_index.py`) holds every illustration of every downloaded book,
  fight pictures too, and a picture's fights in other sections (`fought_at`), so steps 2 and 3 of the
  order are a search of it by the creature's name. `tools/plates_draft.py` (ADR 0036) drafts by name.
  Its `about` (from `about/ill-about.json`, committed: ADR 0042) is a picture's description and `foes` (from
  `about/foe-about.json`, by book and enemy name) an enemy's; it also holds the small pictures (marked
  `small`, never a draft's source) and the stand-ins fights use, keyed by path.
- The procedure is `docs/reference/items.md`, "Fight pictures" (Book 4 is the worked example for
  plain humans); the step 7 prompt in `tools/admin/prompts.js` gives the same order.
- `ill_upscale.py --fights`, `upscaledSrc()` in `platepick.js`.
- The proposal sheet is `tools/admin/proposals.html`, its file `tools/plates_proposals.py`, its
  prompt's style `tools/admin/plateprompt.js`; the step 7 prompt tells the agent to use it. Ruling
  R27 points here.
- Pins in `assets/plates/approved/<code>.json` (committed; section/enemy keys, file paths and a hash
  of the enemy's name, no book text), written by `tools/plates_pin.mjs`; the rule in `platepick.js`,
  used by the player, the picture sheet and the tool. Books 1-8 were pinned on 2026-10-11 to what the
  player showed then. `docs/reference/dashboard.md`, `interface.md` (Art pipeline).

## Changes

- 2026-10-11: the ruled-frame detector dropped; frames are cropped by hand.
- 2026-10-11: the sheet marks only the cards waiting for approval, and says the book's state once.
- 2026-10-13: fight pictures became checklist step 7 (ADR 0036); upscaled 2x with the illustrations.
- 2026-10-17: merged 0008 (shown whole), 0010 (varied plain humans), 0020 (pinned once approved),
  0035 (source order) and the fight-picture part of 0033 (upscale) into this one record.
- 2026-10-17: every illustration and fight picture says what it is, in the index and on both sheets.
- 2026-10-18: copies sized for the iPad (no wider than the ink canvas uses), big pictures reduced;
  each card shows its file's size in KB and pixels.
- 2026-10-18: a fight card says what the enemy is by the book, whatever its picture (a picture the
  owner set had lost its card's description).
- 2026-10-18: descriptions come only from the book's text or the wiki, not from the picture; an
  enemy the book says little about is topped up from the wiki.
- 2026-10-24: a picture must show that creature or that kind of foe (a Death Knight is not "some
  guard"): the agent judges every enemy's picture, not only the draft's, searches by what the enemy is
  as well as its name, and shows the owner candidate pictures, not descriptions. The draft also
  redrafts an enemy shown only the library's broad stand-in, and another book's enemy of the very same
  name of more than a person's word ("Death Knight") ranks before a stand-in. A creature particular to
  Lone Wolf that no book pictures takes no stand-in: the agent gives a prompt and the owner generates
  the picture; web stand-ins are for ordinary things (animals, plain humans).
- 2026-10-26: candidates on the proposal sheet, each with an image-generator prompt; a pasted
  picture becomes a "from AI" candidate (was ruling R27).
- 2026-10-27: ruling R27 merged into this record (owner).
- 2026-10-28: the prompt's reference pictures include the picture now and every candidate; the
  agent's proposals take the books' own pictures only, never the web or Wikimedia Commons; the sheet quotes only sections that describe the enemy or
  its fight (owner).
- 2026-10-30: a prompt keeps to what the book and its pictures give; the agent lists any other detail,
  and where it comes from, for the owner to judge. The picture is the enemy alone, with no setting or
  other figure, and a creature that is part man stands on two legs (owner).

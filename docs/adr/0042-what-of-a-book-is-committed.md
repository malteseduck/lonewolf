# 0042. The repository is public: our descriptions are committed; AI-made pictures and anything that rebuilds a book are not

- Status: Accepted
- Date: 2026-10-24
- Amended: 2026-11-06

## Context

The owner wanted as much of the work as possible in git, so a lost drive costs nothing that cannot
be fetched or rebuilt. Three hand-kept files lived git-ignored beside the books: what each enemy is
(`foe-about.json`), what each illustration is and shows (`ill-about.json`, `ill-notes.json`).
Fight pictures the owner made with AI from a text prompt alone (now the proposal sheet's; no book
picture given to the generator) were git-ignored in `art/` with the borrowed art, though they are
ours. The owner also asked whether `book.js` could be split so its fixes and decisions are committed.

Project Aon's licence (section 2.2) forbids redistributing "a significant portion" of the Internet
Editions, which it defines to include derivative works and translations; its preamble says the aim
is to keep readers from poor unofficial versions and from paying for the books. The owner asked
that both its letter and its spirit be honoured. At the time 57 of 1,216 descriptions repeated a
run of 8 or more of their book's words (the longest 13); they were reworded.

On 2026-10-27 the owner settled that the repository is published, public, as an example of
spec-driven development and of its harness, not as a player for others: what keeps it within the
licence is that no licensed content is in it, not that it is private.

## Decision

- **The repository is public.** It holds the code, the docs, our own work about the books and assets
  free to redistribute; no Project Aon text or images, nor anything made from them (spec 3). Everything
  committed is written as if anyone will read it.
- **Descriptions are committed**, in `about/` (`foe-about.json`, `foe-scene.json`, `ill-about.json`, `ill-notes.json`),
  in our own words. None may share a run of 8 words with its book's sections:
  `tools/about_check.py` checks it, and `check_all.py` runs it. A description says what a picture
  or an enemy is and where it is met; it never retells a section.
- **No picture made with AI is committed**, whatever it was made from. Fight pictures made with AI
  live in the book folders of `assets/plates/` (`assets/plates/<code>/`), which git ignores; the
  committed scene prompts in `about/foe-scene.json` are what is kept, and a lost picture is made
  again from its prompt. Which pictures (book art, screenshots, other art) were given to the
  generator is not recorded: that would be the ideal, but is not worth the tokens. "Made with AI"
  (`art_sources.make_ai`) still moves a picture and its -2x copy from `art/plates/` to
  `assets/plates/<code>/`, following its path wherever it is named, and credits it in
  `assets/plates/README.txt`.
- **Every prompt we make our art from is committed**: the fight pictures' scene prompts in
  `about/foe-scene.json`, each map repaint round's prompt in `maps/<code>/rounds/prompt-<n>.txt`, and
  any later kind (proposals, items) where it is kept. A prompt is our own wording around our own
  label list and style, not a significant reproduction of the book, and it is what remakes a lost
  picture.
- **`book.js` stays git-ignored and is not split.** Every fix and decision behind it is already
  committed (the importer, the item tables, plates.json and the pins, the rulings) and it is rebuilt
  from the downloaded books. A committed copy of every section's choices, gates and fights would be
  a skeleton of the whole book: against the licence's spirit, whatever its letter.

## Consequences

- An agent writing descriptions writes them in its own words and runs `tools/about_check.py`
  (the step 7 prompt says so). A failure is fixed by rewording, never by raising the run length.
- The image-generator prompt (the proposal sheet's, `tools/admin/plateprompt.js`) describes the
  style (ink linework, cross-hatching, a 1980s gamebook plate) and names no artist; its test says so.
- Pictures with a link, or none, stay in `art/` (ADR 0038). "Made with AI" still moves a picture
  to `assets/plates/<code>/`, where the player looks for it, but that folder is git-ignored. The
  free engravings at the top of `assets/plates/` stay committed.

## Changes

- 2026-10-27: the repository is public, with no licensed content in it (owner); the image prompt
  describes the style instead of naming the artist.
- 2026-10-31: the owner had not marked reliably which AI pictures used references, so every AI-made
  picture went back to `art/plates/` for the owner to classify again; one made from the prompt alone
  is then committed as before (owner).
- 2026-11-05: no AI-made picture is committed, from a prompt alone or not; the book folders of
  `assets/plates/` are git-ignored and the pictures are made again from the scene prompts (owner).
- 2026-11-06: every prompt that makes our art is committed, the map rounds' too, which had lived in
  the git-ignored `work/` (owner).

# 0042. The repository is public: our descriptions and AI-made fight pictures are committed; nothing that rebuilds a book is

- Status: Accepted
- Date: 2026-10-24
- Amended: 2026-10-31

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
- **Descriptions are committed**, in `about/` (`foe-about.json`, `ill-about.json`, `ill-notes.json`),
  in our own words. None may share a run of 8 words with its book's sections:
  `tools/about_check.py` checks it, and `check_all.py` runs it. A description says what a picture
  or an enemy is and where it is met; it never retells a section.
- **A fight picture made with AI from a text prompt alone is committed**: the picture sheet's new
  picture and its Link... dialog, and the dashboard's Picture sources sheet, offer "Made with AI";
  `art_sources.make_ai` moves it (and its -2x copy) from `art/plates/` to `assets/plates/`, rewrites
  its path wherever it is named (plates.json, the approved pins, the upscaled lists,
  `about/ill-about.json`), drops its link entry and adds it to `assets/plates/README.txt`. A
  picture made from a book picture, a screenshot or other art given to the generator is not ours
  and stays in `art/`. The owner marks which is which: nothing is committed until then, so the sheet
  asks for it and assumes references were attached.
- **`book.js` stays git-ignored and is not split.** Every fix and decision behind it is already
  committed (the importer, the item tables, plates.json and the pins, the rulings) and it is rebuilt
  from the downloaded books. A committed copy of every section's choices, gates and fights would be
  a skeleton of the whole book: against the licence's spirit, whatever its letter.

## Consequences

- An agent writing descriptions writes them in its own words and runs `tools/about_check.py`
  (the step 7 prompt says so). A failure is fixed by rewording, never by raising the run length.
- The image-generator prompt (the proposal sheet's, `tools/admin/plateprompt.js`) describes the
  style (ink linework, cross-hatching, a 1980s gamebook plate) and names no artist; its test says so.
- Pictures with a link, or none, stay in `art/` (ADR 0038); only AI-made ones move.

## Changes

- 2026-10-27: the repository is public, with no licensed content in it (owner); the image prompt
  describes the style instead of naming the artist.
- 2026-10-31: the owner had not marked reliably which AI pictures used references, so every AI-made
  picture went back to `art/plates/` for the owner to classify again; one made from the prompt alone
  is then committed as before (owner).

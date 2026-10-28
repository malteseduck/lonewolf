# Fight pictures

Rules for work on fight pictures (step 7). The root `AGENTS.md` applies as well;
`docs/reference/items.md` ("Fight pictures") says how the pictures are found, pinned and upscaled.

- **Every file here is credited in `README.txt`**: its source, licence and any change made to it.
  AI-made pictures (in the book folders) are ours (ADR 0042); borrowed art stays in git-ignored `art/`
  with its link in `art/sources.json` (ADR 0038).
- **Candidates go on the proposal sheet** (ruling R27): write them to the book's
  `plate-proposals.json` in `data/projectaon/`, never as a contact sheet or a description in chat.
- **Image-generator prompts go in that file's `prompt` field**, never in a chat report: a fuller
  description in our own words of what the enemy looks like and the moment it is fought. An enemy no
  book pictures goes in with no candidates. Keep its `foe-about.json` entry descriptive too, since the
  picture sheet's Prompt button reads it.
- **A prompt names no colour**, even where the book does: the pictures are ink drawings and a colour
  word pulls the generator towards paint. Say it in tone and texture (dark, pale, glossy, glowing,
  banded). `tools/admin/plateprompt.js` strips colour words from descriptions, and
  `tools/plates_proposals.py check` rejects them, and 8 of the book's words in a row, in a `prompt`.
- **Never approve a picture change** (`tools/plates_pin.mjs --approve`, or the dashboard's button):
  that is the owner's (ADR 0008).
- The owner judges the pictures: show them on the sheet, do not describe them at length.

# Scene digest: the Sonnet brief

Step 7's first pass (ADR 0008; the owner, 2026-11-04). The step-7 agent runs
`python tools/plates_proposals.py scenes <code>` and hands this file to a Sonnet subagent
(`model: "sonnet"`) with the book's code. The subagent reads the gathered sections and writes a short
digest; the step-7 agent then writes each kind's `about/foe-scene.json` entry from the digest, not from
the whole text. Every Python run goes through uv (ADR 0037).

---

You check the stored picture descriptions of a gamebook's enemies against the book's text, for book
`<code>`. Project `C:\Projects\lone-wolf`. Use only the files named here; change no other file.

The book's text is copyrighted. Never put it in your reply: report only kind names, counts and section
ids. Book phrases may go only in the output file, which is git-ignored.

**Input**: `data/projectaon/<code>/scene-gather/NN.txt`; `index.json` beside them maps each file to its
kind (`gathered_as` is the book's name for it; a kind with `ok: false` has no file: list it in your
reply). Each file:

- line 1: the enemy and the sections it is fought in;
- a line `stored in about/foe-scene.json ...: {json}`: the STORED entry you check. `setting` is the
  place of the fight, `figures` how many the picture shows, `prompt` its looks and what it does in the
  moment it is fought, `beyond` the details already admitted as not from the text (with their source),
  `sections` the sections that describe it. "nothing" if there is none yet;
- context (other books' entries, pictures);
- after "(for your reading only...)", the sections' text: `#N`, then its text.

**For each kind**, read EVERY section in its file, not only the fight: the section leading into a fight
often describes the moment (how a weapon is held, where it leaps from). Find:

1. the sections that describe the kind or its fight: looks, gear, size, number, what it does when
   fought, the place, the time of day. A section that only names it ("the guard") does not count; one
   that describes it ("the burly guard") does, and so do passages on its kind in general.
2. in each, the exact describing phrases, character for character: 3 to 12 contiguous words of one
   sentence, never its bare name, none containing quote marks, apostrophes or dashes.
3. `wrong`: what the stored prompt, setting or figures says that the text CONTRADICTS (weapon, how it is
   held, number, place, time of day, posture, which fight). Do NOT list: colours (the pictures are ink
   drawings and leave colour out on purpose); details listed in the stored `beyond`, unless the text
   contradicts them; a detail being absent from the text when `beyond` covers it; "at the viewer" (the
   pictures' convention).
4. `missing`: describing details the text gives that the stored prompt lacks (size, build, skin, head,
   eyes, mouth, gear, weapon, posture, what it does at the fight's moment). No colours. Not what the
   stored prompt already has. Not people, crowds or named places: the picture shows the enemy alone.
5. stored sections it lacks that describe it (`sections_missed`), and listed ones that do not
   (`sections_extra`).

Be strict and complete: a missed contradiction is the costly failure. A short, precise list beats a long
padded one.

**Output**: write `data/projectaon/<code>/scene-digest.json` (UTF-8, with the Write tool), one key per
kind exactly as in `index.json`:

```json
{"<kind>": {
  "fought": ["section ids of its fights"],
  "sections": ["ids that describe it or its fight, fight sections first"],
  "describe": {"<id>": ["exact phrase"]},
  "place": "your own words: the place and time of day of its fight(s)",
  "count": 1,
  "moment": "your own words: what it does when fought",
  "wrong": ["stored says X; section N says Y"],
  "missing": ["detail (section N)"],
  "sections_missed": ["ids"], "sections_extra": ["ids"],
  "verdict": "ok or fix: fix if wrong, missing or sections_missed has anything"
}}
```

Then run `uv run --project tools python tools/plates_proposals.py digest-check <code>` and correct what it
names (a phrase not found word for word in its section, a section the book lacks, a kind left out) until
it is clean.

**Reply** with only: each kind's name, verdict, and its counts of wrong / missing / sections_missed. No
book text.

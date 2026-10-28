# 0044. Keeping the docs true: instructions only in AGENTS.md, folder rules beside their work, a check at every commit, a pass at release, the harness described

- Status: Accepted
- Date: 2026-10-24
- Amended: 2026-10-27

## Context

Every session starts cold and reads `AGENTS.md`, the spec and the records, so a stale line in them
misleads every agent after it. `AGENTS.md` had gathered state (what was imported, timings, dates)
beside its instructions, and state goes stale fastest (2026-10-24). It also grew rules that matter
only inside one folder, and some of those lived only in an agent's private memory on this PC
(2026-10-27). Reading the whole repository for drift is costly; the owner wanted the certain part
checked on every commit and the reading done only when a release deserves it (2026-10-27).

With the repository public as an example of its harness (ADR 0042), the owner asked for one page
describing the harness, kept true like the rest (2026-10-27). The four decisions had been made as
separate rulings (R21, R28, R29, R30); the owner asked for them as one record, since they are one
topic.

## Decision

- **`AGENTS.md` holds instructions for agents, never state or intent.** Where each book stands,
  what is imported, timings and dates go in the state docs (`docs/book-checklist.md`,
  `docs/plan.md`, `docs/reference/`); intent in the spec; decisions in the records. `AGENTS.md` may
  point to them. A line is added only if every agent needs it to work safely.
- **A folder may have its own `AGENTS.md`, for work inside it only**: `tools/`, `items/`, `maps/`
  and `assets/plates/`, each with a `CLAUDE.md` that imports it (Claude Code reads a folder's file
  only once a file there is read). The rule above holds for them too. A rule needed before any file
  in the folder is read stays in the root file. A folder's rules once kept in an agent's private
  memory live here instead, so every agent and checkout has them.
- **The docs are kept in line at commit.** Before committing, the agent searches the spec for the
  subject of each record the work adds or amends and each behaviour it changes, and brings any
  contradicting sentence into line. A project hook (`.claude/settings.json`) runs
  `tools/docs_check.py` on every `git commit` and blocks it on a problem.
- **What a script can check, it checks** (spec principle 8): ruling ids, the ADR index's dates,
  citations, the paths the agents' docs and READMEs name, asset credits, `AGENTS.md`'s sections and
  dates, each folder's `AGENTS.md` imported, and the harness doc (below). A drift found by reading
  that a script could have caught becomes a check, with a test.
- **The `repo-maintenance` pass** (`.claude/skills/repo-maintenance/`) does the reading: it fixes
  what is plainly stale and lists for the owner anything that would change a record. It is offered
  when the owner is about to release, never run unasked: a small release does not deserve its cost.
- **`docs/reference/harness.md` describes the whole harness** (the docs, the instructions, the hook,
  the skill, the checks, the book steps, the servers, subagents and sessions) and why each part is
  there. `tools/docs_check.py` fails if it is missing, names a path that does not exist, or leaves
  out a part read from the tree: a hook's script, a server in `.claude/launch.json`, a skill in
  `.claude/skills/`, a folder with its own `AGENTS.md`. The maintenance pass reads it against the
  harness as it is.

## Consequences

- `AGENTS.md` ("Maintaining the repository") says what to do at commit and at release; the four
  folder files hold their own rules.
- `tools/docs_check.py` and its tests (`tests/py/test_docs_check.py`) hold every check; the commit
  hook, `check_all.py` and the maintenance pass run it.
- A new hook, server, skill or folder with its own rules fails the commit until the harness doc
  describes it.
- Rulings R21, R28, R29 and R30 point here.

## Changes

- 2026-10-27: rulings R21 (AGENTS.md holds no state), R28 (folder AGENTS.md files), R29 (the commit
  hook and the pass at release) and R30 (the harness doc) merged into this record (owner).

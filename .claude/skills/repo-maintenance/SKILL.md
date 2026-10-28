---
name: repo-maintenance
description: Periodic pass to find and fix drift between AGENTS.md, docs/spec.md, the ADRs and rulings, docs/plan.md, docs/reference/, every README and the code; keep AGENTS.md to vital instructions; list clean-up for the owner. Use when the owner asks for repo maintenance, a docs pass, a drift check or a clean-up; offer it (never run it unasked) when the owner is about to release (ruling R29).
---

# Repo maintenance

A pass that keeps the docs true to each other and to the code. Follow AGENTS.md throughout: no book
content in output, every Python run through uv, no commit unless the owner asks.

## What may be fixed, and what goes to the owner

Fix without asking: a stale fact (a path, function, command, button or count the code no longer
has), a date or index line out of step, a duplicate ruling id (renumber the later one to the next
free id and update every citation outside `release/`), a contradiction between the spec and an ADR
or ruling (the record wins: bring the spec into line), a sentence in the wrong file (move it).

List for the owner, change nothing: anything that would reverse, narrow or widen what an ADR or
ruling decides; a ruling that seems to have grown into an ADR; a plan item that may be finished but
cannot be proved so from the code; files to delete (stale worktrees, old `release/` snapshots,
unused icons, untracked files). Never touch `backups/`, `data/`, `art/` or `prototypes/`.

## Steps

1. **Script first.** `uv run --project tools python tools/docs_check.py`: duplicate ruling ids, the
   ADR index against each ADR's dates, citations of records that do not exist, paths named in
   AGENTS.md, the spec, the ADRs' decisions and the READMEs, every asset credited in its folder's
   README.txt, AGENTS.md's sections and dates. Fix what it reports.
   A check that would catch what you find by reading in a later step belongs in this script, with a
   test in `tests/py/test_docs_check.py`.
2. **What changed since the last pass.** `git log --since=<the last pass's date> --stat` (the last
   pass is a commit whose message starts "Repo maintenance"; with none, take the last month). The
   files changed point to the ADRs, reference docs and plan items to read closely.
3. **AGENTS.md holds only what every agent needs to work safely** (ruling R21): how to run, how to
   test, the hard rules, conventions, maintaining the repository, and the traps. Move anything else:
   intent to `docs/spec.md`, a decision to its ADR or `rulings.md`, how the code works to
   `docs/reference/`, state (what is imported, dates, timings) to `docs/plan.md` or the checklist.
   A rule only for work inside one folder goes to that folder's `AGENTS.md` (ruling R28: `tools/`,
   `items/`, `maps/`, `assets/plates/`); read those too, against the root file (no rule in both) and
   the reference doc each points to. Keep a one-line pointer only where an agent would otherwise miss it.
4. **Spec against the records.** For each ADR and ruling, search the spec for its subject; any
   sentence that contradicts it is brought into line. The spec states intent, not state: no "partly
   done", no counts of books.
5. **Records against the code.** For each ADR's Decision and Consequences, check the names it gives
   (functions, files, buttons, flags, steps) still exist and do what it says: grep, read the code.
   Hand the grepping to a Sonnet subagent when the list is long (ADR 0041), with the names to look
   for and "report each as found or missing, with file:line", never file dumps.
6. **Plan and reference.** `docs/plan.md`: finished items leave it (their facts go to the reference
   docs). Each reference file touched by step 2's changes is read against its code.
7. **READMEs.** Every tracked README (`git ls-files | grep -i readme`, `prototypes/` left out): the
   root `README.md` and `docs/showcase/README.md` read against the code and the spec (what the
   player, the dashboard and the steps do; commands in their uv form; credits), the asset READMEs
   (`assets/*/`, `tools/fonts/`) against what their folder holds and which files use them (a font a
   map's `font.txt` names, an icon an item table names). The script checks that each file is credited;
   reading checks what is said of it.
8. **Owner's memory.** Where a saved feedback memory and AGENTS.md disagree, the later word wins;
   say which you followed. A memory that is really a rule for one folder's work moves to that
   folder's `AGENTS.md`, and the memory is deleted.
9. **Clean-up to list.** `git worktree list` (and `.claude/worktrees/`) for worktrees whose branch is
   merged; `git status --short` for untracked files; `release/` snapshots beyond the last few.
10. **Check.** `npm test`, `uv run --project tools python -m pytest`, `tools/docs_check.py` again;
   `tools/check_all.py` if a tool or anything the books' data goes through changed.

## Report

Short: what was fixed (file and one line each), what is left for the owner (as questions, each
with the record it touches), the clean-up list, and the suites' results. Commit only if asked, with a
message starting "Repo maintenance".

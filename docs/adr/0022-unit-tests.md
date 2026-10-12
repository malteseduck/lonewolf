# 0022. Unit tests for the main functionality, and one run that checks everything

- Status: Accepted
- Date: 2026-10-11
- Amended: 2026-10-12

## Context

The project had no automated tests: changes were checked by `tools/syntax_check.py` and by playing
in the browser. The owner asked for unit tests for the scripts and functions, with Vitest for the
JavaScript and pytest for the Python. A first pass tested nearly every line and took over a minute;
the owner wanted the main functionality guarded, not every line, with both suites in a couple of
seconds, and no running server or other process in a unit test. Since unit tests use stand-in
data, the owner also wanted one run that puts the real books through every script.

## Decision

- Test first (TDD): a new rule or behaviour starts with a failing test that states it, then the code
  that makes it pass; a bug fix starts with a test that shows the bug (the owner, 2026-10-12).
- Unit tests guard the main functionality so a change cannot quietly break it: the rules engine,
  the item tables, the fight-picture choice, the offline sync, the importer's parsing, the book
  status, backups and jobs, releases, and each main map step. Not every function, not drawing
  details, not prototype-only code. JavaScript with Vitest (jsdom where a DOM is needed), Python
  with pytest. Each suite runs in a couple of seconds.
- Unit tests start no server and spawn no process (the one exception: a test of a function whose
  job is to run a process). The server's functions are called directly, git is faked.
- Each language checks its own files: a parse test in each suite replaces `syntax_check.py`.
- `tools/check_all.py` (the dashboard's "Check everything") runs the real books through every script
  and then both suites: re-import every book against its last report, check every item table,
  compare the approved fight pictures, check the offline copy. Re-importing in this run is allowed
  without asking: it rewrites a `book.js` only where the importer's output changed.
- The player itself still needs nothing installed and has no build step (spec principle 6).

## Consequences

- `package.json` holds the dev dependencies (Vitest, jsdom); `node_modules/` stays git-ignored.
  pytest is installed in `tools/.venv`.
- Tests live in `tests/js/` (`*.test.js`, `npm test`) and `tests/py/` (`test_*.py`,
  `uv run --no-project --python tools/.venv/Scripts/python.exe python -m pytest`). Both pass before a
  commit; `check_all.py` after a change to the importer or the books' data.
- Tests use stand-in data written for them, never Project Aon text or images, and do not need
  `data/projectaon/`, `art/`, `backups/` or the network. A tool that writes files is pointed at a
  temporary directory.
- New core or main functionality gets new tests in the same piece of work, and a change to main
  functionality updates its tests. They test the main paths and higher-level behaviour, not every
  function call or line (AGENTS.md says how).
- Code that cannot be tested as it stands (`main.js` runs the page on import) gains tests as its
  pure parts are moved out into modules; `docs/plan.md` lists what is left.

## Changes

- 2026-10-11: main functionality, not every line; a couple of seconds a suite; no server or process
  in a unit test; a parse test per language replaces `syntax_check.py`; `check_all.py` added, and
  re-importing allowed within it.
- 2026-10-12: tests are written first (TDD), at the owner's request.

# 0022. Tests: the main functionality guarded and written first, one run that checks everything, the engine tested before its rules change

- Status: Accepted
- Date: 2026-10-11
- Amended: 2026-10-17

## Context

The project had no automated tests: changes were checked by `tools/syntax_check.py` and by playing
in the browser. The owner asked for unit tests for the scripts and functions, with Vitest for the
JavaScript and pytest for the Python. A first pass tested nearly every line and took over a minute;
the owner wanted the main functionality guarded, not every line, with both suites in a couple of
seconds, and no running server or other process in a unit test. Since unit tests use stand-in
data, the owner also wanted one run that puts the real books through every script.

The fight's rules lived in `main.js`, mixed with its drawing, so the largest engine changes would
have been made without tests. The owner asked for the engine to be modularized and tested first, and
for it to work exactly as before: it is known to play well from playing it (2026-10-11).

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
- **The engine is modular and tested before its rules change.** Moving code out of `main.js` is a
  pure move: the same rules, the same log lines, the same order of steps. A difference found on the
  way (a rule nowhere recorded) is asked about, not fixed in passing (the Combat Ratio cap, ruling R1,
  came of this). The rules live in `shared/` (`core.js`, `rules-series.js`, `fight.js`), each with its
  tests; storage the page relies on (adventures, backups) in `adventures.js`, with its tests. `main.js`
  draws, animates and takes input, and holds no rules.
- The player itself still needs nothing installed and has no build step (spec principle 6).

## Consequences

- `package.json` holds the dev dependencies (Vitest, jsdom); `node_modules/` stays git-ignored.
  pytest is installed in `tools/.venv`.
- Tests live in `tests/js/` (`*.test.js`, `npm test`) and `tests/py/` (`test_*.py`,
  `uv run --project tools python -m pytest`). Both pass before a commit; `check_all.py` after a change
  to the importer or the books' data.
- Tests use stand-in data written for them, never Project Aon text or images, and do not need
  `data/projectaon/`, `art/`, `backups/` or the network. A tool that writes files is pointed at a
  temporary directory.
- New core or main functionality gets new tests in the same piece of work, and a change to main
  functionality updates its tests. They test the main paths and higher-level behaviour, not every
  function call or line (AGENTS.md says how).
- A move of engine code is checked against the code it replaces: the old and new code run side by
  side on the same input (for the fight, 20,000 random fights with the same dice; for the item
  tables, every book), and the result is the same, besides the unit tests. New engine rules go into
  `shared/` with their tests, not into `main.js`.
- Code that cannot be tested as it stands gains tests as its pure parts are moved out into modules;
  `docs/plan.md` lists what is left.

## Changes

- 2026-10-11: main functionality, not every line; a couple of seconds a suite; no server or process
  in a unit test; a parse test per language replaces `syntax_check.py`; `check_all.py` added, and
  re-importing allowed within it.
- 2026-10-12: tests are written first (TDD), at the owner's request.
- 2026-10-17: merged in 0024 (the engine modular and tested before its rules change).

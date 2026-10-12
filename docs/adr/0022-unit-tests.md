# 0022. Unit tests: Vitest for the JavaScript, pytest for the Python tools

- Status: Accepted
- Date: 2026-10-11

## Context

The project had no automated tests: changes were checked by `tools/syntax_check.py` and by playing
in the browser. The owner asked for unit tests for all the scripts and functions.

## Decision

Every script and function has unit tests: the JavaScript with Vitest (jsdom where a DOM is needed),
the Python tools with pytest. They are tooling only: the player itself still needs nothing
installed and has no build step (spec principle 6).

## Consequences

- `package.json` holds the dev dependencies (Vitest, jsdom); `node_modules/` stays git-ignored.
  pytest is installed in `tools/.venv`.
- Tests live in `tests/js/` (`*.test.js`, `npm test`) and `tests/py/` (`test_*.py`,
  `uv run --no-project --python tools/.venv/Scripts/python.exe python -m pytest`).
- Tests use stand-in data written for them, never Project Aon text or images, and do not need
  `data/projectaon/`, `art/`, `backups/` or the network. A tool that writes files is pointed at a
  temporary directory.
- A change to a script or function updates or adds its tests in the same piece of work, and both
  suites pass before it is committed.
- Code that cannot be tested as it stands (`main.js` runs the page on import) gains tests as its
  pure parts are moved out into modules; `docs/plan.md` lists what is left.

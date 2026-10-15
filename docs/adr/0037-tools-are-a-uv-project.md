# 0037. The Python tools are a uv project with a lock file

- Status: Accepted
- Date: 2026-10-14

## Context

Every Python run already went through uv (AGENTS.md, 2026-10-12), but with `--no-project` and the
venv's interpreter named by hand, and nothing recorded which packages `tools/.venv` needed or at
which versions: a fresh checkout could not rebuild it. The Setup panel (ADR 0036) first listed the
packages in a `requirements.txt` without versions; the owner chose a lock file instead.

## Decision

- `tools/` is a uv project: `tools/pyproject.toml` names the packages the tools import (with
  `package = false`: it is not a library), `tools/uv.lock` pins their exact versions, and the venv is
  `tools/.venv`, where it already was. `tools/.python-version` names the Python.
- Every Python run is `uv run --project tools python tools/<tool>.py` from the project root; uv
  installs what the lock says before it runs. A new package is added with `uv add --project tools`.
- `tools/setup.py` alone runs with `--no-project` (standard library only), so that it can report
  what is missing; its Install runs `uv sync --project tools`.
- The map OCR keeps its own venv, `tools/.venv-paddle` (PaddlePaddle needs Python 3.12).

## Consequences

- AGENTS.md ("Run it"), `serve.py`'s `PY`, `.claude/launch.json`, the tools' usage lines and the docs
  use the new command. The old command still runs (same venv), so a server started with it keeps
  working until it is restarted.
- `uv sync` (Setup's Install) removes packages the lock does not list; `uv run` does not.

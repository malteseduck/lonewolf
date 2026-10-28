# 0045. Releases: the iPad is served the last release; the dashboard's Release checks, releases, then pushes

- Status: Accepted
- Date: 2026-10-10
- Amended: 2026-10-27

## Context

The iPad was served the working copy, so a half-done change on the PC could break a game in play
(2026-10-10). The owner wanted the iPad to see only what had been committed and released on purpose.
A release once went out with a file the page names missing; the owner wanted the offline check to
run before every release, with no separate button to forget (2026-10-17). With the repository public
(ADR 0042), the owner wanted GitHub kept up with what the iPad has, without a second step
(2026-10-26). These were three rulings (R13, R15, R25) on one topic; the owner asked for them as one
record (2026-10-27).

## Decision

- **The iPad is served the last release**, not the working copy: `tools/serve.py --release` on port
  8765, always running. A change reaches it only after a commit and a release.
- **A release is the owner's call.** Agents never run `tools/release.py` or press Release unasked,
  and never push.
- **The dashboard's Release runs the offline check first** (`tools/offline_check.py`), and has no
  button of its own for it: a missing file stops the release. A release whose files are exactly those
  released already makes nothing and says so; the check has still run.
- **Then it pushes `main` to GitHub** (`git push origin main`), once the release has gone well,
  "nothing to release" included; a failed check or release pushes nothing. Pressing Release is the
  owner's go-ahead for the push; `release.py` alone pushes nothing.

## Consequences

- `tools/serve.py` (`ADMIN_STAGES`, the `release` job), `tools/release.py` and the release dialog;
  their tests in `tests/py/test_serve.py`.
- `docs/reference/offline.md` (Releasing) and `docs/reference/dashboard.md` describe the flow.
- `AGENTS.md`'s hard rules and its traps say the iPad is served the release, and that agents do not
  release or push.
- Rulings R13, R15 and R25 point here.

## Changes

- 2026-10-17: the offline check runs first, with no button of its own (was ruling R15).
- 2026-10-26: Release also pushes `main` to GitHub (was ruling R25).
- 2026-10-27: rulings R13, R15 and R25 merged into this record (owner).

# 0014. The iPad is served releases, not the working copy

- Status: Accepted
- Date: 2026-10-10

## Context

The iPad reached the PC's working copy, so half-finished work could land on it mid-change.

## Decision

- The iPad (through Tailscale) is served the last release by `python tools/serve.py --release` on
  port 8765, always running.
- A change reaches it only after a commit and `python tools/release.py`, which is the owner's call.

## Consequences

- Agents do not run `tools/release.py` or press the dashboard's Release button unasked.
- How it works: `docs/reference/offline.md`.

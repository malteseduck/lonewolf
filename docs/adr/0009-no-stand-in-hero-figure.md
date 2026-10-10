# 0009. No stand-in drawing for Lone Wolf's figure

- Status: Accepted
- Date: 2026-10-03

## Context

The inventory shows Lone Wolf's figure faint behind its slots, cut from a picture the owner supplies
(in git-ignored `art/`).

## Decision

Without the owner's picture, nothing is shown there: no drawn stand-in.

## Consequences

`dollURL` / `heroFromArt` (`docs/reference/interface.md`). Do not add a fallback figure.

# 0001. Record the owner's decisions as ADRs

- Status: Accepted
- Date: 2026-10-10
- Amended: 2026-10-10

## Context

Decisions were scattered across `docs/plan.md`, `AGENTS.md` and the reference docs, and nothing
marked them as binding, so an agent could undo one while tidying (for example, setting every map's
names back in one font after one map was given its own). The owner wants the spec to keep the
intent, and decisions tracked so agents cannot undo what has been done.

## Decision

- `docs/spec.md` holds intent only: purpose, principles, rules, presentation as it should be.
- Each decision the owner makes gets an ADR in `docs/adr/`, written in the same piece of work.
- An accepted ADR changes only on the owner's word. A refinement amends it in place, dated in its
  Changes list, so each topic has one file with the current answer; a new topic or a decision
  reversed outright gets a new ADR, the reversed one marked `Superseded by NNNN`. Git keeps the old
  wording. Rules in `docs/adr/README.md`.
- Agents read the spec and the ADR index before changing behaviour (AGENTS.md says so).

## Consequences

- `docs/plan.md` no longer lists decisions; it points here.
- The reference docs may still tell the history of a decision (what was tried), but the ADR is
  what binds.

## Changes

- 2026-10-10: amend in place instead of a new ADR per change; new ADRs only for new topics and
  reversals (the owner, after 0015 and 0017 split the map decisions across files).

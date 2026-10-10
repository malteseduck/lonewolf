# 0001. Record the owner's decisions as ADRs

- Status: Accepted
- Date: 2026-10-10

## Context

Decisions were scattered across `docs/plan.md`, `AGENTS.md` and the reference docs, and nothing
marked them as binding, so an agent could undo one while tidying (for example, setting every map's
names back in one font after one map was given its own). The owner wants the spec to keep the
intent, and decisions tracked so agents cannot undo what has been done.

## Decision

- `docs/spec.md` holds intent only: purpose, principles, rules, presentation as it should be.
- Each decision the owner makes gets an ADR in `docs/adr/`, written in the same piece of work.
- An accepted ADR is changed only by a new ADR that supersedes or amends it, on the owner's word.
- Agents read the spec and the ADR index before changing behaviour (AGENTS.md says so).

## Consequences

- `docs/plan.md` no longer lists decisions; it points here.
- The reference docs may still tell the history of a decision (what was tried), but the ADR is
  what binds.

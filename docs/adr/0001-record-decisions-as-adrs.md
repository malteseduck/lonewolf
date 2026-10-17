# 0001. Record the owner's decisions: an ADR per topic, small ones as rulings, updated in place

- Status: Accepted
- Date: 2026-10-10
- Amended: 2026-10-17

## Context

Decisions were scattered across `docs/plan.md`, `AGENTS.md` and the reference docs, and nothing
marked them as binding, so an agent could undo one while tidying (for example, setting every map's
names back in one font after one map was given its own). The owner wants the spec to keep the
intent, and decisions tracked so agents cannot undo what has been done.

By 2026-10-17 there were 42 records, some a single line, several on one topic (four on maps, four on
fight pictures). Every agent reads the index before changing behaviour, so a long flat index costs
each session and makes the right record harder to find; the book readings alone would grow with every
book. The owner asked for small decisions in a table, related records merged, the index grouped, and
no superseded records, since decisions are updated in place.

## Decision

- `docs/spec.md` holds intent only: purpose, principles, rules, presentation as it should be.
- Each decision the owner makes is recorded in `docs/adr/` in the same piece of work:
  - **an ADR per topic**, holding the current answer for that topic. A refinement, an extension or a
    reversal rewrites the topic's ADR in place, dated in its Changes list. A new topic gets a new ADR
    only when no existing one covers it;
  - **a ruling**, one row in `docs/adr/rulings.md`, for a small decision: no alternatives worth
    recording and no consequences beyond the place it names. Book readings are rulings. A ruling that
    grows moves into an ADR.
- There are no superseded records: git keeps the old wording. Records merged into another are deleted
  and their numbers left as gaps; ruling ids are never reused either.
- The index in `docs/adr/README.md` is grouped by topic, one line per ADR.
- An accepted ADR or ruling changes only on the owner's word. Agents read the spec and the index
  before changing behaviour (AGENTS.md says so), and the rulings in the area they touch.

## Consequences

- `docs/plan.md` no longer lists decisions; it points here.
- The reference docs may still tell the history of a decision (what was tried), but the ADR or
  ruling is what binds.
- Code and docs cite "ADR NNNN" or "ruling Rn".

## Changes

- 2026-10-10: amend in place instead of a new ADR per change; new ADRs only for new topics and
  reversals (the owner, after 0015 and 0017 split the map decisions across files).
- 2026-10-17: rulings for small decisions; related records merged into one per topic (0003, 0005-0007,
  0009, 0010, 0013, 0018-0020, 0024, 0032-0035, 0039, 0042, 0043 merged; 0012, 0014, 0016, 0023,
  0025, 0026, 0029, 0030, 0040 became rulings); reversals rewrite in place, no superseded records; the
  index grouped by topic (owner).

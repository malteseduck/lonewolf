# 0041. Subagents and separate sessions: when to use them, on which model; a session works in its own worktree and merges into main when asked to commit

- Status: Accepted
- Date: 2026-10-17
- Amended: 2026-10-18

## Context

On 2026-10-17 two sessions started from the Book 13 item-table session (the draft script's misses, the
dashboard's checkbox text) worked in the main checkout beside it. Each had to be told which files it
might touch and to commit nothing, and one commit had to be checked by hand for the other's half-done
edits. The owner asked for separate work to be kept apart, then brought back. The same day the sessions
committed of their own accord; the owner: they commit only when asked.

On 2026-10-18 the owner asked that agents use Sonnet subagents where that saves tokens, and start new
sessions (Sonnet or Opus) where the work is a different topic. The point is the token bill: a subagent
or session starts cold, so handing off a small step can cost more than doing it.

## Decision

- **Subagents**: mechanical work (the agent only needs it done, not decided) goes to a subagent on
  Sonnet when that costs fewer tokens than the main model doing it: many tool calls, long output, a
  result reported in a few lines. A step of a call or two, or one needing context the main model
  already holds, stays with the main model. Judgement (what to change, the books' rules, design,
  judging pictures) stays on the main model.
- **New sessions**: started when the owner asks for a different topic from the session's, or when a
  piece of work proves independent of it; quick things stay. Sonnet for mechanical or well-specified
  work, Opus where it needs judgement.
- A new session for a separate piece of work runs in its own git worktree, on its own branch, not in the
  main checkout.
- It commits only when the owner asks. A commit it is asked for includes the merge: the branch is merged
  back into `main` with any conflicts resolved (both sides' changes kept, the test suites run again on
  the merged result).
- Merging is local: nothing is pushed and no release is made (those stay the owner's call).

## Consequences

- AGENTS.md ("Subagents and sessions") tells every agent when to use each. A session that starts another gives it a worktree
  (`use_worktree: true`) and says in the brief to commit nothing until asked, then to merge into `main`.
- The worktree's session does the merge itself. In the desktop app, `sync_with_base_branch` brings
  `main` in first, so conflicts are resolved on the branch before it lands.

## Changes

- 2026-10-17: commit only when the owner asks; a commit asked for includes the merge into `main`.
- 2026-10-18: when to use a Sonnet subagent (only where it saves tokens) and when to start a new
  session, on Sonnet or Opus.

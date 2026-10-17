# 0041. A separate session works in its own worktree; when asked to commit, it merges into main too

- Status: Accepted
- Date: 2026-10-17
- Amended: 2026-10-17

## Context

On 2026-10-17 two sessions started from the Book 13 item-table session (the draft script's misses, the
dashboard's checkbox text) worked in the main checkout beside it. Each had to be told which files it
might touch and to commit nothing, and one commit had to be checked by hand for the other's half-done
edits. The owner asked for separate work to be kept apart, then brought back. The same day the sessions
committed of their own accord; the owner: they commit only when asked.

## Decision

- A new session for a separate piece of work runs in its own git worktree, on its own branch, not in the
  main checkout.
- It commits only when the owner asks. A commit it is asked for includes the merge: the branch is merged
  back into `main` with any conflicts resolved (both sides' changes kept, the test suites run again on
  the merged result).
- Merging is local: nothing is pushed and no release is made (those stay the owner's call).

## Consequences

- AGENTS.md, "Separate sessions work in a worktree", tells every agent. A session that starts another
  gives it a worktree (`use_worktree: true`) and says in the brief to commit nothing until asked, then to
  merge into `main`.
- The worktree's session does the merge itself. In the desktop app, `sync_with_base_branch` brings
  `main` in first, so conflicts are resolved on the branch before it lands.

## Changes

- 2026-10-17: commit only when the owner asks; a commit asked for includes the merge into `main`.

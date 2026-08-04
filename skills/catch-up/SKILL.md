---
name: catch-up
description: >-
  Reconstruct where a project stands after a break, a new session, or a machine switch — what
  shipped, what is in flight, what is blocked, what is next. Use when the user asks "where do we
  stand", "what's next", "did we finish", "where did we leave off", or picks work back up after
  time away.
targets: [claude, cursor, codex]
---

# Catch up

Answer "where are we?" from evidence, not memory. The user is asking because
they genuinely do not know — a wrong confident answer here costs more than a
slow one.

`handoff` writes context out at the end of a session. This reads it back in at
the start of the next one, on any machine.

---

## Step 1 — Gather, in parallel

Run these together; none depends on another.

```bash
git status --short                              # uncommitted work
git branch -vv                                  # local branches + tracking
git log --oneline -15 --date=short --pretty='%ad %s'
git log --oneline origin/main..HEAD 2>/dev/null # unmerged commits on this branch
```

```bash
gh pr list --state open  --json number,title,headRefName,isDraft,mergeable,statusCheckRollup
gh pr list --state merged --limit 10 --json number,title,mergedAt
gh issue list --state open --limit 20 --json number,title,labels
```

```bash
ls -t ~/.claude/plans/*.md 2>/dev/null | head -5   # recent plans
cat .agent/loop.json 2>/dev/null                   # this repo's gate contract
```

Also look for handoff documents the last session may have left: `HANDOFF.md`,
`docs/handoff/`, or the most recent file under `knowledgebase/`.

If `gh` is not authenticated, say so — PR state is usually the most important
part of the answer, and silently omitting it produces a confident, wrong report.

## Step 2 — Establish the gate

Run the repo's own verification rather than assuming anything builds:

```bash
node ~/.claude/loop/loop.mjs fast
```

A red gate changes the answer to "what's next" entirely, so find out before
reporting. If the repo has no contract, note it and suggest `loop-init`.

## Step 3 — Reconcile

The interesting information is in the contradictions:

- A **local branch with unpushed commits** — work that exists only on this
  machine. Call it out first; it is the thing most likely to be lost.
- A **branch already merged** whose local copy still has commits — someone
  committed after the merge, or the merge took a different version.
- An **open PR with failing checks** — blocked, and on whom.
- An **open PR with no reviewer and passing checks** — waiting on the user, not
  on the work.
- A **stale branch** whose PR was merged — safe to delete, say so.
- **Uncommitted changes** in the working tree — decide whether they are
  in-progress work or debris, and say which you think it is.
- A **plan file whose steps are partly done** — map each step to shipped, in
  flight, or not started.

When the evidence genuinely conflicts, say so rather than picking a story.

## Step 4 — Report

Lead with the answer to the question that was actually asked. Then:

**Shipped** — merged since the last obvious checkpoint, one line each.

**In flight** — a table, because this is where the user's attention goes:

| Branch / PR | State | Checks | Blocked on |
|---|---|---|---|
| `feat/x` (#77) | open, mergeable | ✓ | review |
| `fix/y` (#79) | open, conflicts | ✗ | rebase onto main |
| `chore/z` | local only, 3 commits | not pushed | you |

**Next** — a short ordered list, most valuable first, with the reason. If work
is blocked on the user (credentials, a decision, an approval), put that at the
top and be specific about what is needed.

Keep it to something readable in under a minute. The user wants orientation, not
an audit.

## Notes

- Never say "we finished X" unless a merged PR or a green gate shows it. "The
  branch exists and looks complete" is a different claim — make it that way.
- If the repo was recently moved or cloned to a different path or drive, check
  that remotes and hooks still point somewhere valid before trusting local
  state.
- Read-only. This skill inspects and reports; it does not merge, push, or clean
  up. Offer those as next steps — `ship-it` handles them.

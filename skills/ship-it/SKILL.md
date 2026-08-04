---
name: ship-it
description: >-
  Take finished work from working tree to merged — branch, commit, push, open the PR, watch CI,
  merge when green, then rebase whatever was stacked behind it. Use when the user says "commit and
  push", "open a PR", "merge it when green", "rebase all of them", or asks what is blocking the
  open PRs.
targets: [claude, cursor, codex]
---

# Ship it

The path from "the work is done" to "it is on main". Most of the cost here is
not the git commands — it is the stacked-PR bookkeeping, which is where things
actually go wrong.

---

## Before anything

Run the gate. Do not push work that has not passed the repo's own checks:

```bash
node ~/.claude/loop/loop.mjs full
```

Red gate means stop and fix, not "push and let CI find it". CI is slower than
you and its failure costs a context switch.

## Step 1 — Branch

Never commit directly to `main`. If `git branch --show-current` says `main` (or
`master`), create a branch first:

```bash
git checkout -b <type>/<short-description>   # feat/ fix/ chore/ docs/ test/
```

Match whatever prefix convention the repo already uses — read `git log` rather
than assuming.

## Step 2 — Commit

Stage deliberately. `git add -A` after a long session sweeps up scratch files,
`.env` edits and debug output.

```bash
git status --short          # look at every line before staging
git diff --staged           # and read what you staged
```

Write the message the repo's convention expects (Conventional Commits in most of
ours). Say **why**, not what the diff already shows. Small, self-contained
commits over one large one.

Check for secrets before committing — a key in history is a rotation, not a
revert. Grep the staged diff for `password`, `secret`, `token`, `_KEY`, and any
long base64-looking string.

## Step 3 — Push and open the PR

```bash
git push -u origin HEAD
gh pr create --fill --base main
```

Write a real body: what changed, why, how it was verified, and anything the
reviewer should look at closely. If the work came from an issue or plan, link
it. Mark it draft if it is not ready for review.

## Step 4 — Watch CI

```bash
gh pr checks --watch
```

On failure, hand off to `ci-triage` rather than guessing from the summary line.

## Step 5 — Merge

Only when checks are green and review requirements are satisfied:

```bash
gh pr merge <n> --squash --delete-branch
```

Match the repo's merge strategy — check whether it squashes or merges, and
whether it deletes branches, before choosing flags.

**Ask before merging** unless the user has already said to merge it, or said
"merge when green" for that specific PR. Merging is not easily reversible once
others pull.

## Step 6 — Rebase what was stacked behind it

This is the part that gets skipped and then costs an hour.

After a merge, every open PR branched from the merged branch — or touching the
same files — is now stale. For each:

```bash
git checkout <branch>
git fetch origin
git rebase origin/main
# resolve conflicts, then:
node ~/.claude/loop/loop.mjs full     # a clean rebase can still break the build
git push --force-with-lease
```

Use `--force-with-lease`, never plain `--force`: it refuses when someone else
has pushed to the branch since you last fetched.

Rebase in dependency order — the PR closest to main first. Rebasing a stack out
of order replays the same conflicts repeatedly.

If a rebase conflict is non-trivial, use the `resolving-merge-conflicts` skill
rather than improvising.

## Reporting on open PRs

When asked what is blocking things:

```bash
gh pr list --state open --json number,title,mergeable,isDraft,reviewDecision,statusCheckRollup
```

Report one line per PR with the actual blocker — failing check, conflict,
awaiting review, draft, or waiting on the user. "Open" is not a blocker; say
what is stopping it.

## Folding one PR into another

When PR A's changes should become part of PR B ("fold 208's extras into 210"):

```bash
git checkout <B-branch>
git cherry-pick <the commits from A>     # or: git merge --squash <A-branch>
node ~/.claude/loop/loop.mjs full
git push --force-with-lease
gh pr close <A> --comment "Folded into #<B>"
```

Say explicitly which commits moved, so the closed PR's history is traceable.

## Rules

- Never `git push --force` to a shared branch. `--force-with-lease` always.
- Never merge a PR with a red gate because "it is unrelated" — confirm it is
  unrelated first, and say so in the PR.
- Never skip hooks (`--no-verify`). If a hook fails, that is the signal.
- If the user asked to push and something is unsafe, say what and why, then do
  the rest.

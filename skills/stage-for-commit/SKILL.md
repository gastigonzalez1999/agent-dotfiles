---
name: stage-for-commit
description: >-
  Run the checks, stage the files, and hand back a commit message for the user to
  run themselves. Use when the user says "stage the files and give me a commit
  message", "stage everything and I'll commit", "give me a short commit message and
  I'll do it manually", or "prepare this for commit". Stops at the message — it does
  not commit, push, or open a PR unless explicitly asked to.
targets: [claude, cursor, codex]
---

# Stage For Commit

The default is that the user commits their own work. This skill gets the tree ready
and writes the message; running `git commit` is theirs.

**Stop at the message.** Do not run `git commit`, `git push`, `git tag`, or
`gh pr create` on your own initiative — not as a convenience, not because the checks
came back green, not because it seems obviously wanted. Staging is reversible;
committing under someone else's name is not.

If the user *does* explicitly ask you to commit — they sometimes will — that's their
call to make, so do it. Say what you're about to run first, and never extend an
explicit "commit this" into a push or a PR.

`git add` is allowed. That's the point of the skill.

For the other direction — "commit and push", "open the PR", "merge it when green" —
use `ship-it`, which owns the whole path to merged.

## Step 1 — See what's actually there

```bash
git status --porcelain
git diff --stat            # unstaged
git diff --cached --stat   # already staged
```

Read the actual diff before describing it. A message written from the file list
guesses at intent and gets it wrong.

Watch for things that should not be committed:

- Secrets, tokens, `.env` files, private keys, credentials in fixtures
- Large binaries or build output that belongs in `.gitignore`
- Debug leftovers — `console.log`, `debugger`, `.only(` on a test, commented-out code
- Unrelated changes that belong in a separate commit

Surface these **before** staging. Do not quietly stage a `.env` file, and do not
quietly strip a `console.log` either — say what you found and let the user decide.

## Step 2 — Run the checks

Green before staging. If the project has them:

```bash
npx tsc --noEmit
npm test
npm run lint
```

If anything fails, **stop and report**. Do not stage a failing tree and mention the
failure in passing — that produces a commit the user believes was checked.

If the user has already run the checks this session, say which result you're relying
on rather than re-running.

## Step 3 — Stage

Default to staging everything that belongs in this commit:

```bash
git add -A
```

Narrow it when the working tree holds more than one logical change:

```bash
git add <paths for this commit>
```

If the diff spans clearly unrelated concerns, say so and propose a split rather than
staging one large mixed commit. The user may still want it all together — their call.

Confirm what landed:

```bash
git diff --cached --stat
```

## Step 4 — Write the message

Conventional Commits. Subject ≤ 72 chars, imperative mood, no trailing period.

```
<type>(<scope>): <subject>

<body: why, not what. The diff already says what.>

<footer: BREAKING CHANGE: …, Refs #123>
```

Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `chore`.

- Scope is the module or package touched — omit it rather than inventing one.
- Body only if the reason isn't obvious from the subject. Skip it for a one-line fix.
- `BREAKING CHANGE:` footer whenever a consumer must change something.
- **Short means short.** The user usually asks for "a short commit message" — one
  subject line and at most two body lines unless the change genuinely needs more.
- Match the repo's existing convention if `git log` shows a different one.

Check the repo for a commit template or hook that constrains the format:
`.gitmessage`, `commitlint.config.*`, `.husky/commit-msg`.

## Step 5 — Hand it over

Present the message in a copyable block, with the command the user will run:

```
## Staged — N files

<file list, or --stat output>

### Commit message

    <type>(<scope>): <subject>

    <body>

Run it:

    git commit -F- <<'EOF'
    <type>(<scope>): <subject>

    <body>
    EOF
```

Then stop. Do not offer to commit. Do not push. If the checks surfaced anything the
user should know before committing, restate it in one line under the message.

## Related

- `inner-loop` — get the checks green first; this skill assumes they are
- `pr-review` — self-review the diff before it becomes a commit
- `ship-it` — when the user wants the whole path: commit, push, PR, merge

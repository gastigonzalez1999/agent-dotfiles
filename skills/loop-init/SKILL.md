---
name: loop-init
description: Create or repair a project's .agent/loop.json verification contract. Use when a repo has no contract, when its checks are wrong or stale, or before setting up the loop in a new project.
targets: [claude, cursor, codex]
---

# Loop init

Give this repo a machine-readable answer to "how do I know my change works?"

## 1. Generate the starting point

From the repo root:

```bash
node ~/.claude/loop/loop.mjs init      # add --force to regenerate an existing contract
```

It inspects lockfiles, `tsconfig.json`, `go.mod`, `pyproject.toml`, `Cargo.toml` and — most importantly — the scripts already declared in `package.json`.

## 2. Correct it against what the repo actually documents

**Detection is a guess. The repo usually already knows the answer**, in prose:

- `CLAUDE.md` / `AGENTS.md` — most projects here have a "Common commands" section. It is authoritative; the detector has never read it.
- `package.json` scripts — check for `typecheck`, `test:e2e`, `lint:fix`, workspace-scoped variants.
- CI config (`.github/workflows/*.yml`) — whatever CI runs is, by definition, the gate that matters.

Where they disagree, the documented command wins.

## 3. Get the tiers right

This is the part that decides whether the loop gets used or skipped.

| Tier | Budget | Contains |
|---|---|---|
| `fast` | under ~15s | typecheck, or nothing. Runs after every edit. |
| `test` | under ~2min | unit tests, ideally scoped |
| `full` | unbounded | lint, build, e2e, everything |

A `fast` tier that takes 90 seconds is a `test` tier wearing the wrong label, and it will get skipped. If typecheck alone is slow, `fast` may legitimately be empty.

Mark slow or flaky checks `"optional": true` — they run and report but never block.

## 4. Verify every command before committing

Run each `cmd` by hand. A contract full of commands that do not exist is worse than no contract: it burns iterations on phantom failures.

```bash
node ~/.claude/loop/loop.mjs fast
node ~/.claude/loop/loop.mjs test
node ~/.claude/loop/loop.mjs full
```

Expect real failures on an untouched repo — that is information, not a problem with the contract. What you are checking is that each command *runs*.

## 5. Monorepos

One contract at the repo root. Scope checks with `cwd` rather than writing a contract per app:

```json
{ "name": "api:test", "cmd": "npm test -- --passWithNoTests", "cwd": "apps/api" }
```

If a root-level `tsc --noEmit` picks up the wrong config, point the check at the app's tsconfig explicitly.

## 6. Work repositories

A repo shared with other people is not a different tool, just different defaults. Decide with three questions.

**Is the repo shared?** At work, assume yes.
→ `"retro": "off"`. Retro commits unattended, and a `chore(loop-retro):` commit turning up in someone's PR review is not yours to spring on them. Run `loop retro` by hand to see what it *would* say.

**Is the repo green right now?** Run the gates before wiring anything up.
→ Green: `"stopGate": "full"`.
→ Red from pre-existing debt: `"stopGate": "test"`, or `null` until it is clean. A gate that blocks you on day one for failures you did not cause is a gate you will switch off by day two.

**Is `full` slower than about two minutes?**
→ Then `"stopGate": "test"` and let `full` be something you run deliberately.

Reasonable starting point:

```json
"enforce": { "stopGate": "test", "postEditGate": false, "retro": "off" }
```

### Trialling without touching the shared repo

`loop init` writes `.agent/loop.json`, appends to `.gitignore`, adds a loop section to `AGENTS.md` (and `@AGENTS.md` to an existing `CLAUDE.md`). On a repo you do not own yet, use shadow mode instead:

```bash
loop init --shadow
```

It touches no tracked file. New files go into `.git/info/exclude`; if the repo tracks a `CLAUDE.md` or `AGENTS.md`, Claude gets the loop section through an untracked `CLAUDE.local.md` that imports `@AGENTS.md`. `git status` stays empty — check it.

Nobody sees anything. Propose committing the contract later, once it has earned its place — at that point it is a shared asset, and the team should have a say in what the gates are.

### If someone asks what it does

It runs commands the repo already declares and checks exit codes. It makes no network calls (the one `fetch` is `loop doctor` hitting health URLs your own contract declares) and sends no telemetry. Its git writes are: a *local* `core.hooksPath` for the pre-commit hook (`loop git-hook --uninstall` restores the original), and `commit` — only with retro explicitly enabled. Never `push`.

## 7. The pre-commit hook and the guard

`loop init` also installs a git pre-commit hook (`loop git-hook` to reinstall after cloning). It is the one enforcement point every agent hits — Cursor, Codex, Copilot and humans all end in `git commit`. It runs the repo's own pre-commit first (husky, lefthook, `.git/hooks`), then `loop guard --staged`, then `loop fast`. Hooks live in the git directory; nothing is tracked.

New contracts get `"guard": { "suppressions": true }`: added lint/type suppressions fail. The guard judges **only added lines**, so it is safe on a repo full of legacy debt. Grow it from real mistakes (see inner-loop, "The ratchet") — do not pre-load it with rules nobody has needed yet. Where the stack's linter can express a rule, put it there instead; the guard is for what the linter cannot, or for repos whose lint config you cannot change.

In CI on a PR: `loop guard --base origin/<target>`.

## 8. Commit it

`.agent/loop.json` is committed — it is how the loop travels to other machines and other agents. Run artifacts (`.agent/.loop-*`) are gitignored automatically.

## Schema

Full field reference: `~/.claude/loop/schema.json`. Editors with JSON schema support will autocomplete from the `$schema` key.

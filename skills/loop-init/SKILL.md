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

`loop init` writes `.agent/loop.json` and appends to `.gitignore`. On a repo you do not own yet, keep it invisible instead:

```bash
echo ".agent/" >> .git/info/exclude   # per-clone, never committed
git checkout -- .gitignore            # undo the init edit
```

Nobody sees anything. Propose committing the contract later, once it has earned its place — at that point it is a shared asset, and the team should have a say in what the gates are.

### If someone asks what it does

It runs commands the repo already declares and checks exit codes. It makes no network calls (the one `fetch` is `loop doctor` hitting health URLs your own contract declares), sends no telemetry, and the only git command it can run is `commit` — never `push`, and only with retro explicitly enabled.

## 7. Commit it

`.agent/loop.json` is committed — it is how the loop travels to other machines and other agents. Run artifacts (`.agent/.loop-*`) are gitignored automatically.

## Schema

Full field reference: `~/.claude/loop/schema.json`. Editors with JSON schema support will autocomplete from the `$schema` key.

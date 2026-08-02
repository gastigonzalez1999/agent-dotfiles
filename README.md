# agent-dotfiles

Dotfiles and skills setup for AI coding agents. One script per agent — run on any new machine to get a consistent environment.

## The verification loop

Agents that verify their own work need to know *how* to verify it, and that answer is different in every repo. So the machinery is generic and lives here; the answer lives in each project as `.agent/loop.json`.

```bash
loop init      # detect this project's checks, write .agent/loop.json
loop fast      # seconds — after an edit
loop test      # after a unit of work
loop full      # before claiming the work is done
loop doctor    # are the declared services up?
loop report    # what the loop cost, and where it keeps failing
```

Exit codes: **0** green · **1** a check failed · **2** configuration or environment problem.

**On a machine with the dotfiles installed:** `node ~/.claude/loop/loop.mjs <cmd>`
**On any other machine:** `npx -y github:gastigonzalez1999/agent-dotfiles loop init`

### Enforcement

`install-claude.sh` merges two Claude Code hooks into `settings.json`:

| Hook | Effect |
|---|---|
| `Stop` | Blocks the agent from finishing while the gate is red or stale |
| `PostToolUse` | Tracks edits; runs the fast gate only where `enforce.postEditGate` is on |

Projects without `.agent/loop.json` are unaffected — the hooks exit immediately.

Cursor gets the same skills and a `toolkit-loop.mdc` rule, but **no enforcement** — Cursor has no hook system, so there it is advisory.

### Learning

`loop retro` turns run history into rules. It writes only inside a `<!-- loop-retro:begin -->` managed block, needs 5+ occurrences across 2+ days before writing anything, caps itself at 40 lines, commits separately as `chore(loop-retro):`, and every change is revertible by id (`loop retro --log`, `loop retro --revert <id>`).

**Off by default.** Opt in per repo with `"enforce": { "retro": "auto" }`, and install the hook with `loop install-hooks --with-retro` to have it run unattended once a week.

It is opt-in because it commits to the repo without being asked. That is fine on a personal project and rude on a shared one — on a work repo leave it off and run `loop retro` by hand to see what it would say.

### Keeping Cursor in sync

Skills are authored here once and generated into cursor-dotfiles:

```bash
node scripts/sync-to-cursor.mjs ../cursor-dotfiles
```

## If you cloned this on a work machine

Read this before doing anything else. Two rules, one of which is not obvious.

### 1. Never push from the work machine

**This repository is public.** On a work machine, `~/.claude/loop/` accumulates file paths and error-message snippets from whatever you build there — locally, and only locally. Nothing here ever pushes on its own: retro's single git command is `commit`, and there is no `push` anywhere in the runner.

But "I'll just sync my dotfiles" is a normal reflex, and it is the moment a work codebase's internals reach a public repo.

Treat the work clone as **read-only**. Pull to update it; make changes at home.

### 2. `retro: "off"` on every work repository

Which is the default, and means off completely — a repo that has not opted in contributes nothing to `loop retro --global`, not even a count, so its error text cannot surface in a suggestion aimed at these public global rules.

Take the gates, leave the learning at home. The gates encode "how do I know this works here", which is exactly what you do not know in your first month on an unfamiliar codebase. Retro's value compounds over years of your own code, and at work it is all downside.

### Setting up a work repository

Trial it without touching anything the team shares — `.git/info/exclude` is per-clone and never committed:

```bash
node ~/.claude/loop/loop.mjs init
echo ".agent/" >> .git/info/exclude
git checkout -- .gitignore            # undo what init wrote
```

Run each gate by hand once. That tells you both whether the detected commands work and whether the repo is currently green. Then:

```json
"enforce": { "stopGate": "test", "postEditGate": false, "retro": "off" }
```

`test` rather than `full`: work repos tend to have slow builds and pre-existing failures, and a gate that blocks you on day one for breakage you did not cause is a gate you switch off on day two. Raise it as the repo gets green.

Propose committing `.agent/loop.json` only once it has earned its place — at that point the gates are a team decision, not yours.

### If someone asks what it does

It runs commands the repository already declares and checks exit codes. No network calls (the only `fetch` is `loop doctor` hitting health URLs your own contract names, normally localhost), no telemetry, and `commit` is the only git command it can run — never `push`, and only where retro is explicitly enabled.

## Agents

| Agent | Install script | What it sets up |
|-------|---------------|-----------------|
| [Claude Code](https://claude.ai/code) | `install-claude.sh` | Skills, statusline, settings.json |
| [Codex](https://openai.com/codex) | `install-codex.sh` | Skills |

## Quickstart

```bash
# Claude Code
bash install-claude.sh

# Codex
bash install-codex.sh
```

## Skills installed

Both scripts install the same skill set:

**Core / meta**
- `using-superpowers`, `using-git-worktrees`, `systematic-debugging` — obra/superpowers
- `session-handoff` — softaworks/agent-toolkit
- `find-skills` — vercel-labs/skills

**Frontend / Angular**
- `angular-component`, `angular-di`, `angular-directives`, `angular-forms`, `angular-http`, `angular-routing`, `angular-signals`, `angular-ssr`, `angular-testing`, `angular-tooling` — analogjs/angular-skills

**Backend**
- `nestjs-best-practices`, `nodejs-backend-patterns`, `typeorm` — mindrally/skills

**Database**
- `prisma-cli`, `prisma-client-api`, `prisma-database-setup`, `prisma-driver-adapter-implementation`, `prisma-postgres`, `prisma-upgrade-v7` — prisma/skills
- `mongodb` — hoodini/ai-agents-skills
- `supabase-postgres-best-practices` — supabase-community/supabase-skills

**Frontend quality**
- `vercel-react-best-practices` — vercel-labs/skills
- `frontend-design`, `web-design-guidelines` — anthropics/skills

**DevOps**
- `docker-expert` — sickn33/antigravity-awesome-skills
- `kubernetes-specialist` — jeffallan/skills

**Code quality / architecture**
- `architecture-assistant`, `architecture-patterns`, `code-review-excellence`, `performance-analyzer`, `safe-refactor`, `senior-reviewer`, `dependency-updater`, `agent-md-refactor`, `typescript-advanced-types`, `test` — anthropics/skills

**Productivity**
- `gsd` — ctsstc/get-shit-done-skills

**Custom (synced from this repo)**
- `qa`, `domain-model`, `handoff`, scaffolds, `stack-doctor`, `debug-cors`, …
- `auto-improve`, `browser-use`, `thermo-nuclear-code-quality-review`
- the loop skills: `inner-loop`, `loop-init`, `outer-loop`, `loop-autonomous`, `loop-retro`

**Mobile / native (GitHub)**
- `vercel-react-native-skills` — vercel-labs/agent-skills
- `core-bluetooth` — dpearson2699/swift-ios-skills

## Claude Code extras

`install-claude.sh` also installs:
- **statusline** — macOS statusline script (`statusline-command-mac.sh`)
- **settings.json** — Claude Code settings (skipped if one already exists — merge manually from `settings-mac.json`)

## Adding a new agent

1. Create `install-<agent>.sh` following the same pattern
2. Add a row to the table above
3. Commit and push

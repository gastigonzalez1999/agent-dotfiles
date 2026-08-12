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
node scripts/sync-to-cursor.mjs ../cursor-dotfiles --check   # exit 1 if stale
```

Cursor-only assets that have no equivalent in the other harnesses live under
`cursor/` and ship unfiltered — there is no `targets:` decision to make:

| | |
|---|---|
| `cursor/commands/` | slash commands → `~/.cursor/commands` |
| `cursor/agents/` | subagents a parent dispatches via Task → `~/.cursor/agents` |

A subagent is only worth adding if it loads a rubric from a skill that ships to
Cursor. One whose skill lives somewhere else always falls through to its own
fallback text, which is how you end up maintaining a second, worse copy of a
review skill.

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
| [Claude Code](https://claude.ai/code) | `install-claude.sh` / `install-claude.ps1` | Skills, statusline, settings, MCP servers, loop hooks |
| [Codex](https://openai.com/codex) | `install-codex.sh` | Skills, `AGENTS.md`, rules |
| [Cursor](https://cursor.com) | `cursor-dotfiles`, generated from here | Skills, rules, commands |

[gentle-ai](#gentle-ai) layers onto all three and is installed by `install-claude.sh`.

Every skill declares who it ships to:

```yaml
targets: [claude, cursor, codex]   # omit the field and it ships everywhere
```

The installers filter on it, so Claude does not receive the Cursor-only stack
skills it already vendors richer versions of from upstream.

## Quickstart

```bash
# Claude Code
bash install-claude.sh

# Codex
bash install-codex.sh

# Cursor: regenerate the output repo, then install from there
node scripts/sync-to-cursor.mjs ../cursor-dotfiles

# What's on this machine that the repo doesn't know about?
bash sync-up.sh
```

`sync-up.sh` is the reverse direction. The installers push repo → machine; nothing
audited machine → repo, so a skill written straight into `~/.claude/skills`, a
hand-edited setting, or a package installed by the skills.sh CLI stayed invisible
until the next machine came up missing it. It is read-only — every finding is
yours to decide about. Run it before committing.

### Keeping something off a public repo

This repo is public, so anything naming a private repo, an internal hostname, or a
client's project structure does not belong in it. For a machine that needs those
locally, append them to `~/.claude/CLAUDE.md` below a marker comment:

```markdown
<!-- machine-local: not in agent-dotfiles. -->

# Machine-local: <what and why>
```

`sync-up.sh` compares only the part above the marker, so the shared body is still
checked for real drift while everything below is reported as expected. Nothing is
required to be secret for this to be worth using — it is also the right home for
per-machine port numbers and paths that would be noise for everyone else.

On Windows without Git Bash on PATH:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-claude.ps1
```

## Skills

<!-- generated:begin skills -->
<!-- Generated by scripts/build-docs.mjs. Edits here are overwritten. -->

**64 skills authored here.** Each declares its own targets: 42 → claude, 63 → cursor, 42 → codex.

### Everywhere (41)

`adr` · `api-breaking-change-check` · `api-design-basics` · `auto-improve` · `bootstrap-nestjs` · `browser-use` · `build-backend-phases` · `catch-up` · `caveman` · `ci-triage` · `debug-cors` · `deploy-ops` · `domain-model` · `feedback-triage` · `how` · `inner-loop` · `loop-autonomous` · `loop-init` · `loop-retro` · `manual-qa` · `mercadopago` · `nestjs-conventions` · `new-fullstack-project` · `onboard-repo` · `outer-loop` · `pr-review` · `pre-edit-context` · `qa` · `review-migration` · `scaffold-nestjs-module` · `scaffold-next-page` · `setup-prisma-migration` · `ship-it` · `solid-principles` · `stack-doctor` · `stage-for-commit` · `test-gaps` · `thermo-nuclear-code-quality-review` · `to-prd` · `write-a-skill` · `zoom-out`

### Cursor only (22)

Claude receives richer vendored equivalents from upstream (below); Cursor has no
vendoring mechanism, so these are its only coverage.

`apply-ddd` · `clean-architecture` · `code-review-pass` · `dependency-update` · `docker` · `frontend-design` · `golang` · `grill-me` · `gsd-workflow` · `improve-codebase-architecture` · `mongodb` · `nestjs` · `nodejs` · `performance-analysis` · `prisma` · `python` · `safe-refactor` · `session-handoff` · `systematic-debug` · `tdd` · `typescript` · `write-a-prd`

### Other target combinations (1)

`handoff` (claude, codex)

### Vendored from upstream (39, Claude only)

Cloned by `install-claude.sh`. Skip them with `--skip-external`.

- **addyosmani/web-quality-skills** — `accessibility`, `seo`
- **analogjs/angular-skills** — `angular-component`, `angular-di`, `angular-directives`, `angular-forms`, `angular-http`, `angular-routing`, `angular-signals`, `angular-ssr`, `angular-testing`, `angular-tooling`
- **anthropics/skills** — `frontend-design`
- **dpearson2699/swift-ios-skills** — `core-bluetooth`
- **hoodini/ai-agents-skills** — `mongodb`
- **kadajett/agent-nestjs-skills** — `nestjs-best-practices`
- **mindrally/skills** — `typeorm`
- **obra/superpowers** — `systematic-debugging`, `using-git-worktrees`, `using-superpowers`
- **prisma/skills** — `prisma-cli`, `prisma-client-api`, `prisma-database-setup`, `prisma-driver-adapter-implementation`, `prisma-postgres`, `prisma-upgrade-v7`
- **sickn33/antigravity-awesome-skills** — `docker-expert`, `nodejs-backend-patterns`, `nodejs-best-practices`, `tailwind-patterns`, `typescript-advanced-types`
- **softaworks/agent-toolkit** — `session-handoff`
- **vercel-labs/agent-skills** — `vercel-composition-patterns`, `vercel-react-best-practices`, `vercel-react-native-skills`
- **vercel-labs/next-skills** — `next-best-practices`, `next-cache-components`, `next-upgrade`
- **vercel-labs/skills** — `find-skills`
<!-- generated:end skills -->

## Claude Code extras

`install-claude.sh` also installs:
- **statusline** — `statusline-command.sh`. One script for every OS; it needs only bash, node, git and awk, all of which Git Bash provides on Windows.
- **settings.json** — merged from `claude/settings.base.json` (model, effort, theme, statusline, voice, plugins, marketplaces, MCP permissions). Keys the base does not declare are left alone, and a timestamped `.bak` is written. Hooks are owned by `loop install-hooks`, not by the merge.
- **MCP servers** — `mcp/servers.json`; registered with `claude mcp add-json` when both the `claude` CLI and the server binary are present.

## gentle-ai

[gentle-ai](https://github.com/Gentleman-Programming/gentle-ai) is installed alongside
this toolkit. It adapts agents that already exist on the machine — persona, Engram
memory, SDD phases and commands, curated skills, receipt-driven review.

`install-claude.sh` installs the binary if it is missing and then runs `gentle-ai sync`,
which is non-interactive and covers **every** agent it manages, Codex and Cursor
included. That is why `install-codex.sh` does not repeat the step. On a brand-new
machine, run `gentle-ai install` once afterwards to pick a persona and preset — that
choice is yours, not an installer's.

The two projects write into the same directories and must not step on each other:

| Path | Owner |
|---|---|
| `~/.claude/skills/_shared/`, `~/.claude/agents/`, `~/.claude/commands/sdd-*` | gentle-ai |
| `~/.cursor/rules/gentle-ai.mdc` | gentle-ai |
| `~/.codex/AGENTS.md` — persona and every `gentle-ai:` block | gentle-ai |
| `~/.codex/AGENTS.md` — the `agent-dotfiles:global` block only | this repo |
| `# Agent Teams Lite`, `# Native Bounded Review Orchestration` in `~/.claude/CLAUDE.md` | gentle-ai |
| everything else the installers here write | this repo |

Both directions are safe, in either order, because every writer here merges rather
than replaces: `merge-settings.mjs` for `settings.json`, `merge-claude-md.mjs` for
`CLAUDE.md`, and `merge-codex-agents.mjs` for `~/.codex/AGENTS.md`.

That last one was the real bug. `install-codex.sh` used to `cp` straight over
`~/.codex/AGENTS.md`. On a machine with gentle-ai installed that file was 687 lines
and **none of them came from here** — 74 lines of gentle-ai persona followed by its
SDD orchestrator, Engram and agent-routing blocks. The copy replaced all of it with
our 70 lines, on every run, and only the next `gentle-ai sync` put it back.

So this repo no longer owns that file. It owns one fenced region inside it:

```
<!-- agent-dotfiles:global -->   …codex/AGENTS.md…   <!-- /agent-dotfiles:global -->
```

The merge replaces that region and preserves every other byte, appending the fence
at the end on first run rather than reordering what another tool wrote.

Adding a skill under `skills/_shared/` here would break the truce — the installer
removes any skill directory it owns by name, and that name is gentle-ai's.

## Keeping the docs honest

The skill inventory above and the trigger sections in `AGENTS.md` are generated
from the repo — the frontmatter, and the installer's own clone list. They used
to be hand-maintained and had drifted to naming skills the installer does not
install.

```bash
node scripts/build-docs.mjs           # regenerate
node scripts/build-docs.mjs --check   # exit 1 if stale
```

Edit `CLAUDE.md` and the skills' frontmatter; never the generated blocks.

## Adding a new agent

1. Create `install-<agent>.sh` following the same pattern
2. Add the harness to `targets:` on the skills it should receive
3. Add a row to the table above, then run `node scripts/build-docs.mjs`

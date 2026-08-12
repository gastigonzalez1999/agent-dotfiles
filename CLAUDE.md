# Global Rules

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

> This file does double duty: `install-claude.sh` copies it to `~/.claude/CLAUDE.md`
> as the global rules for every project, and it is also this repo's own CLAUDE.md.
> The skill-trigger sections below, and `# Known Gotchas`, are mirrored into
> `AGENTS.md` and `codex/AGENTS.md` by `scripts/build-docs.mjs` — edit them
> here, never there.

## 1. Think Before Coding

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- If you write 200 lines and it could be 50, rewrite it.

## 3. Surgical Changes

- Don't "improve" adjacent code, comments, or formatting.
- Match existing style, even if you'd do it differently.
- Remove imports/variables/functions **your** changes made unused.
- Don't remove pre-existing dead code unless asked.
- Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

- Transform tasks into verifiable goals (tests, repro steps, lint green).
- For multi-step work, state a brief plan with verify checks per step.

---

# loop engineering

The verification loop. Machinery is generic and lives in `loop/`; each project declares its own checks in `.agent/loop.json`.

- **inner-loop** (`skills/inner-loop/SKILL.md`) — verify your own work and iterate to green. Use after any non-trivial edit and before claiming done.
- **loop-init** (`skills/loop-init/SKILL.md`) — create or repair a project's `.agent/loop.json`. Trigger: repo has no contract, or its checks are wrong.
- **outer-loop** (`skills/outer-loop/SKILL.md`) — the macro cycle (understand → plan → implement → verify → review → hand off). Trigger: any work spanning more than a couple of files.
- **loop-autonomous** (`skills/loop-autonomous/SKILL.md`) — grind unattended toward a machine-checkable stop condition. Trigger: "get the tests passing", "make the build green".
- **loop-retro** (`skills/loop-retro/SKILL.md`) — turn run history into rules. Runs automatically; invoke to audit or revert.

`loop full` must exit 0 before work is reported as done. A Stop hook enforces this.

# day-to-day workflow

- **catch-up** (`skills/catch-up/SKILL.md`) — reconstruct where a project stands from git, PRs, CI and plan files. Trigger: "where do we stand", "what's next", "did we finish", "where did we leave off", or resuming after time away.
- **ship-it** (`skills/ship-it/SKILL.md`) — branch → commit → push → PR → watch CI → merge when green → rebase the stack behind it. Trigger: "commit and push", "open a PR", "merge it when green", "rebase all of them", "what's blocking the PRs".
- **ci-triage** (`skills/ci-triage/SKILL.md`) — pull the failed logs, classify flaky vs environmental vs real, fix, re-verify. Trigger: a failing build or workflow, or a pasted CI log.
- **deploy-ops** (`skills/deploy-ops/SKILL.md`) — Railway + Vercel + Supabase: env parity, auto-deploy wiring, migrations on deploy, region latency, leaked-credential response. Trigger: deploy setup or failure, prod differing from local, a secret leak.
- **feedback-triage** (`skills/feedback-triage/SKILL.md`) — turn a stakeholder feedback dump into deduplicated, classified, prioritized items plus a draft reply. Trigger: client or teammate feedback, a reported-bug list, QA notes.

Fetch the evidence before answering — never report project state, PR status, or a CI cause from memory.

# qa

- **qa** (`skills/qa/SKILL.md`) — interactive QA session: user reports bugs, agent files GitHub issues. Trigger: `/qa` or when user mentions "QA session", "report a bug", or "file an issue".

When the user triggers a QA session, invoke the Skill tool with `skill: "qa"` before doing anything else.

# domain-model

- **domain-model** (`skills/domain-model/SKILL.md`) — grilling session to stress-test plans against the domain model, sharpen terminology, and write CONTEXT.md / ADRs inline. Trigger: `/domain-model` or when user says "stress-test", "domain model session", "sharpen the language", or "let's do a domain session".

When the user triggers a domain model session, invoke the Skill tool with `skill: "domain-model"` before doing anything else.

# auto-improve

- **auto-improve** (`skills/auto-improve/SKILL.md`) — review recent work for repeated workflows worth packaging. Trigger: `/auto-improve` or when user asks to mine sessions for skill/automation candidates.

When triggered, invoke the Skill tool with `skill: "auto-improve"` before proposing new assets.

# browser-use

- **browser-use** (`skills/browser-use/SKILL.md`) — Chrome DevTools MCP against the existing Chrome profile. Trigger: live UI verification, login-heavy sites, screenshot regressions.

When browser proof is required, invoke `skill: "browser-use"` and follow it (mcporter + chrome-devtools, not isolated Playwright).

# thermo-nuclear-code-quality-review

- **thermo-nuclear-code-quality-review** (`skills/thermo-nuclear-code-quality-review/SKILL.md`) — harsh maintainability audit (code-judo, 1k-line rule, spaghetti). Trigger: `/thermo-nuclear-code-quality-review` or user asks for thermonuclear / deep code quality review.

When triggered, gather branch diff + changed file contents, then apply the skill rubric.

## Conversation discipline

- When the user corrects you, stop and re-read their message. Quote back what they asked for and confirm before proceeding.
- Re-read the user's last message before responding. Follow through on every instruction completely.
- Double-check your output before presenting it.
- When stuck, summarize what you've tried and ask for guidance instead of retrying the same approach.
- Every few turns, re-read the original request to make sure you haven't drifted from the goal.

## Tech Stack

Primary languages and runtimes: **TypeScript** (main), **Python**, **Go**.

### Full-Stack (TypeScript)

- **Backend**: NestJS + TypeScript + Prisma + PostgreSQL + Redis
- **Frontend**: Next.js + Tailwind CSS + shadcn/ui + Zustand + react-hook-form
- **Monorepo**: Turborepo with `apps/api` (NestJS) and `apps/web` (Next.js)
- **Testing**: Jest (unit + integration), `tsc --noEmit` before declaring TypeScript work done
- **API docs**: Swagger/OpenAPI at `/docs`
- **Auth**: JWT + refresh tokens + MFA + API keys
- **Architecture**: Multi-tenant, RBAC, audit logging

### Python

- Used for scripts, dev tooling (`dev.py`), data work, and automation
- `load_dotenv(override=True)` — always use `override=True` to ensure `.env` values win over shell environment
- Run subprocesses via `subprocess.run` with explicit `env=os.environ` after loading `.env`

### Go

- Used for performance-critical services and CLI tools

## Default Ports

| Service | Port |
|---|---|
| NestJS API | 3000 |
| Next.js frontend | 3002 |
| PostgreSQL | 5432 (local) / 5433 (Docker, avoids conflicts) |
| Redis | 6379 |
| Swagger | http://localhost:3000/docs |

# Known Gotchas (learn once, never debug again)

- **CORS config class default**: NestJS `@nestjs/config` validation classes often have hardcoded defaults (e.g. `http://localhost:3001`) that override `.env`. Always update the default in the class, not just `.env`.
- **Prisma nullable compound unique**: `findUnique` rejects `null` in compound keys. Use `findFirst({ where: { name, tenantId: null } })` instead.
- **NestJS TRANSIENT scope**: don't call `app.get(SomeTransientService)` in `main.ts` — use singleton scope or inject differently.
- **Turbo requires `packageManager`**: root `package.json` must have `"packageManager": "npm@x.x.x"` or turbo will warn/fail.
- **ESLint `@typescript-eslint/no-unused-expressions` v8 bug**: false positives on React patterns — disable rule for web app, not a real error.
- **Port 5432 conflict**: if local Postgres is running, Docker can't bind 5432. Change docker-compose to 5433 and update `DATABASE_URL`.
- **`String.replace(needle, value)` corrupts `$&` and `$1`**: any replacement string containing `$` is interpreted as a capture reference, so content gets mangled. Always use the function form: `.replace(needle, () => value)`.
- **`ConfigModule.validate` timing**: env overrides set inside a test file are often read before the assignment lands. Override the config provider with `overrideProvider` instead of setting `process.env`.
- **NestJS 11 named wildcard routes don't capture slashes** on the Express adapter — `:path*` stops at the first `/`. Use a regex route or split the segments.
- **ts-jest + `nodenext`**: needs an explicit commonjs override in the jest transform config, or every import fails to resolve at test time.
- **`os.homedir()` ignores `$HOME` on Windows** — it reads `USERPROFILE`. A script that mixes the two writes to two different homes, and any test that sets `HOME` to a scratch dir will silently hit the real one. Use `process.env.HOME || homedir()`.
- **Comparing files byte-for-byte on Windows**: a CRLF working copy differs from an LF one even when git reports both clean, because git normalizes before diffing and your code does not. Normalize line endings before comparing or parsing text.
- **`gentle-ai sync` resolves its scope from the working directory**: run it inside a git repo and it installs *workspace* config there — `.openclaw/`, `.windsurf/`, `SOUL.md`, and ~630 lines appended to that repo's `AGENTS.md`. `sync` has no `--scope` flag (only `install` does), so the working directory is the only control. Run it from `$HOME`, in a subshell so the `cd` stays local.
- **A section-keyed merge silently eats vendor fenced blocks**: `<!-- vendor:block -->` regions that trail after the last `# ` heading get read as part of *that* section, so replacing the section deletes them. Lift fenced regions out before splitting and re-append them; don't just make the splitter fence-aware, which attaches the whole tail to the overwritten section and deletes more, not less. Treat a marker as a fence only when its closer exists — a lone `:start` otherwise swallows the rest of the file.
- **Never run a cosmetic pass over a file containing vendor blocks**: a blank-line squeeze or reflow rewrites bytes inside someone else's fenced region. Compare each fenced block byte-for-byte before and after any repair.

# gentle-ai

[gentle-ai](https://github.com/Gentleman-Programming/gentle-ai) is installed on this
machine and is part of the standard toolchain. It adapts the agents you already have
— Claude Code, Cursor, Codex and others — with the persona, Engram memory, the SDD
phase agents and commands, curated skills, and receipt-driven review.

```bash
gentle-ai update    # version check: gentle-ai, engram, gga
gentle-ai sync      # re-apply managed config at the current version (non-interactive)
gentle-ai install   # first run on a machine; picks persona and preset
```

Install the binary with `curl -fsSL https://raw.githubusercontent.com/Gentleman-Programming/gentle-ai/main/scripts/install.sh | bash`,
or `go install github.com/gentleman-programming/gentle-ai/v2/cmd/gentle-ai@latest` on Windows.

**Who owns what.** gentle-ai and this repo write into the same directories without
overlapping. Keep it that way — the failure mode is silent deletion, not a merge conflict.

| Path | Owner |
|---|---|
| `~/.claude/skills/_shared/`, `~/.claude/agents/`, `~/.claude/commands/sdd-*` | gentle-ai |
| `~/.cursor/rules/gentle-ai.mdc` | gentle-ai |
| `~/.codex/AGENTS.md` — persona and every `gentle-ai:` block | gentle-ai |
| `~/.codex/AGENTS.md` — the `agent-dotfiles:global` block only | this repo |
| `# Agent Teams Lite`, `# Native Bounded Review Orchestration` in `~/.claude/CLAUDE.md` | gentle-ai |
| everything else this repo's installers write | this repo |

- Don't hand-edit a `gentle-ai:` fenced block or a gentle-ai-owned section — `gentle-ai sync` overwrites it.
- Don't add a skill under `skills/_shared/` here. That directory is gentle-ai's, and this repo's installer deletes any skill directory it owns by name.
- Both installers are order-independent: each preserves what the other wrote.

**Receipt-driven review is the user's call.**
`gentle-ai review mode enable|disable|status` is a user-owned kill switch, and `status`
is read-only. It is **on** by default: with both sources unset, `status` reports
`on (decided by default)`. Any off wins — a repo may disable it for its own clone, but
can never require it, and no other clone inherits that override. Never flip it either
way on the user's behalf, and never work around it while it is disabled — deliver under
ordinary repository policy instead.

Its orchestration contract ships in `~/.claude/CLAUDE.md` and
`~/.claude/skills/_shared/sdd-orchestrator-workflow.md`, written by gentle-ai itself.
Read those rather than restating them here.

# Global Rules

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

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

## Known Gotchas (learn once, never debug again)

- **CORS config class default**: NestJS `@nestjs/config` validation classes often have hardcoded defaults (e.g. `http://localhost:3001`) that override `.env`. Always update the default in the class, not just `.env`.
- **Prisma nullable compound unique**: `findUnique` rejects `null` in compound keys. Use `findFirst({ where: { name, tenantId: null } })` instead.
- **NestJS TRANSIENT scope**: don't call `app.get(SomeTransientService)` in `main.ts` — use singleton scope or inject differently.
- **Turbo requires `packageManager`**: root `package.json` must have `"packageManager": "npm@x.x.x"` or turbo will warn/fail.
- **ESLint `@typescript-eslint/no-unused-expressions` v8 bug**: false positives on React patterns — disable rule for web app, not a real error.
- **Port 5432 conflict**: if local Postgres is running, Docker can't bind 5432. Change docker-compose to 5433 and update `DATABASE_URL`.

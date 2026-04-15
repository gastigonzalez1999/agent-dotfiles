# Global Rules

## Handling Corrections

When the user corrects you, stop immediately and re-read their message carefully. Quote back what they asked for and confirm your understanding before proceeding.

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

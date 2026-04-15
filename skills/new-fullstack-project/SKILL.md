---
name: new-fullstack-project
description: Scaffold a new NestJS + Next.js Turborepo monorepo from scratch: root configs, docker-compose, shared types, env files, and CI. Use when starting a greenfield full-stack project.
---

# New Fullstack Project

Scaffold a complete NestJS + Next.js Turborepo monorepo. Ask for the project name if not provided.

## Structure to generate

```
<project-name>/
├── package.json                    # Root: turbo, workspaces, packageManager
├── turbo.json                      # Pipeline: build, test, lint, dev
├── tsconfig.base.json              # Shared TS config (strict: true)
├── .env                            # Secrets (gitignored)
├── .env.example                    # Template (committed)
├── .gitignore
├── docker-compose.yml              # postgres + redis
├── Dockerfile.api                  # Multi-stage NestJS build
├── Dockerfile.web                  # Multi-stage Next.js build
├── apps/
│   ├── api/                        # NestJS app
│   │   ├── package.json
│   │   ├── tsconfig.json           # extends ../../tsconfig.base.json
│   │   ├── nest-cli.json
│   │   └── src/
│   │       ├── main.ts             # Helmet, CORS, ValidationPipe, Swagger
│   │       └── app.module.ts       # ConfigModule, PrismaModule, CoreModule
│   └── web/                        # Next.js app
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.js
│       ├── tailwind.config.ts
│       └── src/
│           └── app/
│               └── layout.tsx
└── packages/
    └── types/                      # Shared TypeScript interfaces
        ├── package.json
        └── src/index.ts
```

## Key decisions to clarify first

1. Database: PostgreSQL (default) or other?
2. Auth: JWT only, or also OAuth/MFA/API keys?
3. Multi-tenant: yes/no?
4. Port assignments: API=3000, Web=3002 (defaults)

## Conventions

- `packageManager: "npm@10.x.x"` in root package.json (required by turbo)
- `turbo.json` pipeline: dev depends on nothing; build depends on `^build`
- All env vars validated via `class-validator` in `config/configuration.ts` — **include explicit defaults matching your ports**
- `docker-compose.yml` uses named volumes, healthchecks on postgres
- `main.ts`: `app.enableCors()` before `app.listen()`, Swagger on `/docs`, `ValidationPipe({ transform: true })` globally

## After scaffolding

1. `npm install` from root
2. `docker compose up -d`
3. `cd apps/api && npx prisma migrate dev --name init`
4. `npm run dev` from root via turbo
5. Run `/verify-stack` to confirm everything is healthy

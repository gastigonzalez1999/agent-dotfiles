---
name: onboard-repo
description: Guide a new engineer through a codebase they haven't seen before. Use when the user says "onboard me", "help me understand this repo", "I'm new to this project", "where do I start", or "give me a tour of this codebase". Reads README, CLAUDE.md, package.json, and key entry points, then presents tech stack, architecture, how to run locally, how to run tests, and where to look for common tasks. Tailored to what the user asks about — not a generic dump.
targets: [claude, cursor, codex]
---

# Onboard Repo

Walk a new engineer through this codebase. The goal is getting them productive in under an hour — not exhaustive coverage.

## 1. Discover

In parallel, read:
- `README.md`
- `CLAUDE.md` and any nested ones
- `package.json` (or `pyproject.toml`, `go.mod`, `pom.xml`, `Cargo.toml`)
- `docker-compose.yml` / `Dockerfile` if present
- `.env.example` if present
- Top-level directory listing

Then identify entry points:
- Node / Nest: `src/main.ts` or `apps/*/src/main.ts`
- Next: `apps/web/app/layout.tsx` and `apps/web/app/page.tsx`
- Go: `cmd/*/main.go`
- Python: the script invoked in package config

## 2. Ask what they need

Before dumping info, ask what brought them here:
- Joining the team → full tour.
- Fixing a specific bug → where that feature lives.
- Adding a feature → the scaffold workflow.
- Debugging production → logs, observability, oncall docs.

Tailor the rest of the walkthrough to their answer. Don't present sections they don't need.

## 3. Present (full tour)

### Tech stack
Backend / frontend / database / cache / queue / auth / deploy. One line each. From package.json and docker-compose.

### Repo layout
Top-level directories with a one-line purpose each. Flag the ones they'll live in vs. can ignore initially.

### How to run locally
Exact commands. Include:
- Install deps.
- Start infra (docker-compose up for db/redis).
- Run DB migrations.
- Start the backend. Start the frontend. Ports.
- Log in / seed credentials if available.

If `.env.example` exists, point at it and list the vars they must set.

### How to run tests
Unit, integration, e2e commands.

### How a request flows
Walk one simple endpoint end to end: URL → router → controller → service → repository → DB → response. Pick a real one. Name the files.

### Conventions you'll trip over
From CLAUDE.md + observation — e.g. "repositories are the only place that touches the DB," "DTOs use class-validator decorators," "all routes require auth by default."

### Where common tasks live
- "Add a new endpoint" → `<pattern>` — for a NestJS API, point at `nestjs-conventions` for the house layering and `scaffold-nestjs-module` to generate one.
- "Add a DB table" → migrations dir + modeling pattern.
- "Add a new frontend page" → `app/` router structure.

## 4. Offer next steps

- Pick a `good first issue` or small task to attempt.
- Re-run this skill with a narrower question (`onboard me to the auth module`).

## 5. Don't

- Don't narrate what you read — synthesize it.
- Don't present a section you couldn't verify (if there's no test command, say so — don't invent one).
- Don't be exhaustive. A shorter tour they'll actually read beats a comprehensive one they'll skim.

---
name: bootstrap-nestjs
description: >-
  Bootstrap a production-ready NestJS API service with Swagger, Docker, e2e tests, and best-practice skills.
  Use when starting a new NestJS project from scratch or when the user invokes /bootstrap-nestjs.
  Guides through product discovery, architecture decisions, then scaffolds the full project.
targets: [claude, cursor, codex]
disable-model-invocation: true
argument-hint: '[project-name]'
---

# Bootstrap NestJS API Service

**IMPORTANT: Before doing anything else, enter Plan Mode using EnterPlanMode.** Work through Phase 1 (Product Context Discovery) and Phase 2 (Technical Architecture Decisions) entirely in Plan Mode. Only exit Plan Mode (using ExitPlanMode) when you are ready to begin Phase 3 (Scaffolding & Generation).

You are bootstrapping a new production-ready, AI-ready NestJS API service. Follow these three phases in order. Do NOT skip phases. Use AskUserQuestion for all interactive prompts. Only use the following tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion, EnterPlanMode, ExitPlanMode.

The project name is: `$ARGUMENTS` (if not provided, ask for it in Phase 1).

---

## Phase 1: Product Context Discovery

Gather the full product context before making any technical decisions. Start broad, then derive targeted follow-ups from the user's answers.

### Step 1 — Open context (single question)

Ask ONE open-ended question using AskUserQuestion:

> **Tell me about what you're building.** Describe the service, what it does, who it's for, and the main things it needs to handle. Include as much or as little detail as you'd like — I'll ask follow-up questions for anything I still need.

Use `$ARGUMENTS` as the service name if provided. If not, extract it from the answer or ask in the follow-up.

### Step 2 — Analyze and derive follow-ups

Read the user's answer and identify what's already been covered vs. what's still missing. You need all of the following before moving to Phase 2:

| Required context             | Example                                                |
| ---------------------------- | ------------------------------------------------------ |
| **Service name**             | `zippos-api`                                           |
| **Description**              | One-sentence summary of what this API does             |
| **Domain / bounded context** | payments, user management, inventory, etc.             |
| **Core entities**            | Main data models/resources with brief descriptions     |
| **Key features / endpoints** | Main operations the API supports                       |
| **Entity relationships**     | How entities relate (has-many, belongs-to, etc.)       |
| **Consumers**                | Frontend SPA, mobile app, microservices, third parties |
| **Data sensitivity**         | Public, internal, PII, financial                       |
| **Integrations / ecosystem** | Existing services, shared DBs, auth providers, queues  |

### Step 3 — Targeted follow-ups (only what's missing)

Ask follow-up questions ONLY for context the user didn't already provide. Batch remaining gaps into 1-2 AskUserQuestion calls (3-4 questions max per call). Frame questions using the context you already have — e.g., if the user described an e-commerce API, ask "What are the core entities? (e.g., Product, Order, Customer)" rather than generic options.

If the user provided enough detail in Step 1 to cover everything, skip directly to the entity design step.

### Step 3a — Entity Design (structured domain model)

After gathering all product context, formalize a **structured entity model** for each core entity identified. This model becomes the single source of truth that drives ALL code generation in Phase 3 and persists in the generated CLAUDE.md for ongoing development.

For each entity, build and present a field table and relationship list:

```markdown
### Entity: User

| Field        | Type             | Required | Unique | Sensitive | Notes              |
| ------------ | ---------------- | -------- | ------ | --------- | ------------------ |
| id           | uuid             | yes      | yes    | no        | PK, auto-generated |
| email        | string           | yes      | yes    | no        |                    |
| passwordHash | string           | yes      | no     | yes       | never expose       |
| name         | string           | yes      | no     | no        |                    |
| role         | enum(admin,user) | yes      | no     | no        | default: user      |
| createdAt    | Date             | yes      | no     | no        | auto               |

**Relationships:**

- User has-many Order (cascade: soft-delete)
- User has-one Profile (cascade: delete)

**Custom endpoints (beyond CRUD):**

- `POST /users/:id/deactivate` — soft-deactivate account
- `GET /users/me` — current user profile
```

**How to build this:**

1. Start from the entities and relationships identified in Steps 1-3
2. For each entity, derive fields from the product context — what data does this entity need to fulfill the described features?
3. Mark fields as **sensitive** if they contain passwords, tokens, internal-only IDs, PII that shouldn't appear in API responses, or financial data
4. Infer relationship types (has-one, has-many, many-to-many) and cascade rules from the product description
5. Identify custom endpoints beyond standard CRUD from the key features list
6. Present the complete entity model to the user using AskUserQuestion, asking them to confirm or adjust fields, types, relationships, and custom endpoints

This entity model is referenced as **"the entity model from Phase 1"** throughout Phase 3. Every generated file — entities, DTOs, controllers, services, tests — derives its structure from this model.

### Step 4 — Confirm

Summarize the full product context back to the user for confirmation before proceeding to Phase 2. The summary must include:

- Service name, description, domain, consumers, data sensitivity, integrations
- The complete entity model from Step 3a (all field tables, relationships, and custom endpoints)

---

## Phase 2: Technical Architecture Decisions

Present architecture choices using AskUserQuestion with sensible defaults based on Phase 1 context. Batch into groups of 3-4 questions. Read `references/decision-matrix.md` for detailed comparison tables.

### Batch 1 — Data Layer

1. **Database**: PostgreSQL (Recommended) / MySQL / MongoDB / SQLite (dev only) / None (external service)
2. **ORM**: If SQL → TypeORM (Recommended) or Prisma or MikroORM. If MongoDB → Mongoose (Recommended) or MikroORM.
3. **Caching**: Redis (Recommended if load > 100 rps) / In-memory (cache-manager) / None

### Batch 2 — API & Security

4. **API style**: REST (Recommended) / GraphQL / Hybrid (REST + GraphQL)
5. **Authentication**: JWT with Passport (Recommended) / OAuth2 / API keys / None (handled by API gateway upstream)
6. **Validation**: class-validator with class-transformer DTOs (Recommended) / Zod with nestjs-zod

### Batch 3 — Infrastructure

7. **Message queue**: None (Recommended for simple services) / Bull (Redis-based, for background jobs) / RabbitMQ / Kafka
8. **Container orchestration**: Docker Compose (Recommended) / Docker Compose + K8s manifests / Docker only
9. **CI/CD**: GitHub Actions (Recommended) / None (add later)
10. **Docker push in CI?** (only if GitHub Actions selected): Yes, include Docker build+push stage / No, just lint+test+build

After gathering answers, summarize all technical decisions back to the user for confirmation.

---

## Phase 3: Scaffolding & Generation

Execute the following steps in order. Read the reference templates from this skill's `templates/` directory to guide generation.

### Step 1: NestJS Project Scaffold

```bash
cd <parent-directory>
npx @nestjs/cli new <project-name> --package-manager npm --strict --skip-git
cd <project-name>
```

### Step 2: Install Skills for Ongoing Development

Create all four skills directly in the project. These are NOT used during scaffolding — they activate in future Claude Code sessions when developers work on the generated project. Do NOT use `npx skills add` — it installs to unreliable paths (`.agent/`, `.agents/`) that Claude Code does not read. Only `.claude/skills/` is valid.

**2a. NestJS Best Practices (40 rules, 10 categories)**
Read `templates/nestjs-best-practices-skill.md` from this skill directory. Create `.claude/skills/nestjs-best-practices/SKILL.md` in the generated project with that content.

```bash
mkdir -p .claude/skills/nestjs-best-practices
```

**2b. NestJS Expert (troubleshooting advisor)**
Read `templates/nestjs-expert-skill.md` from this skill directory. Create `.claude/skills/nestjs-expert/SKILL.md` in the generated project with that content.

```bash
mkdir -p .claude/skills/nestjs-expert
```

**2c. Code Review (continuous quality gate)**
Read `templates/code-review-skill.md` from this skill directory. Create `.claude/skills/code-review/SKILL.md` in the generated project with that content.

```bash
mkdir -p .claude/skills/code-review
```

**2d. Implement Feature (ongoing development harness)**
Read `templates/implement-feature-skill.md` from this skill directory. Create `.claude/skills/implement-feature/SKILL.md` in the generated project with that content. This skill activates in future sessions when developers add new entities, features, or modules to the project.

```bash
mkdir -p .claude/skills/implement-feature
```

**2e. Verify skills installation**
After creating all four files, verify they exist. If any check fails, stop and report the issue before proceeding.

```bash
test -f .claude/skills/nestjs-best-practices/SKILL.md && echo "nestjs-best-practices: OK" || echo "ERROR: nestjs-best-practices skill missing"
test -f .claude/skills/nestjs-expert/SKILL.md && echo "nestjs-expert: OK" || echo "ERROR: nestjs-expert skill missing"
test -f .claude/skills/code-review/SKILL.md && echo "code-review: OK" || echo "ERROR: code-review skill missing"
test -f .claude/skills/implement-feature/SKILL.md && echo "implement-feature: OK" || echo "ERROR: implement-feature skill missing"
# Ensure no stale paths exist from previous npx skills add attempts
test -d .agent && echo "WARNING: .agent/ directory found — delete it (not used by Claude Code)" || true
test -d .agents && echo "WARNING: .agents/ directory found — delete it (not used by Claude Code)" || true
```

Print the verification results so the user can confirm. Remove `.agent/` and `.agents/` directories if they exist.

### Step 2f: Read skill guidelines before generating code

Before proceeding to any code generation, read BOTH skill template files and apply their rules throughout all remaining steps:

1. Read `templates/nestjs-best-practices-skill.md` — contains 40 rules across 10 categories. Apply ALL relevant rules when generating modules, services, controllers, entities, tests, and configuration. Key rules to enforce during scaffolding:
   - `arch-feature-modules`: organize by feature, not technical layer
   - `arch-use-repository-pattern`: abstract data access for testability
   - `di-prefer-constructor-injection`: never use property injection
   - `error-throw-http-exceptions`: use NestJS exceptions, not generic errors
   - `error-handle-async-errors`: no fire-and-forget async operations
   - `security-validate-all-input`: every endpoint validates via DTOs
   - `security-sanitize-output`: never return raw entities (use response DTOs)
   - `security-auth-jwt`: short-lived tokens, secrets from config
   - `db-use-migrations`: never `synchronize: true` in production
   - `db-avoid-n-plus-one`: use eager loading or joins for relations
   - `devops-use-config-module`: all config via `@nestjs/config`, never hardcoded
   - `devops-use-logging`: use NestJS Logger, never `console.log`
   - `devops-graceful-shutdown`: enable shutdown hooks
   - `api-use-dto-serialization`: separate DTOs for input and output
   - `api-use-interceptors`: use interceptors for cross-cutting concerns
2. Read `templates/nestjs-expert-skill.md` — contains common NestJS pitfalls and their solutions. Avoid generating code that would trigger these known issues:
   - Circular dependencies between modules
   - Missing `@Injectable()` decorators
   - Exporting modules instead of services
   - Incorrect JWT strategy imports
   - Entity syntax errors that manifest as connection errors

These rules apply to ALL code generated in the remaining scaffolding steps.

### Steps 3–16: Full Scaffolding

Read `references/scaffolding-steps.md` for the complete scaffolding sequence covering dependency installation, CLAUDE.md generation, Swagger setup, Docker, environment config, feature module scaffolding, health checks, e2e tests, GitHub Actions, project configuration, linting setup, git init, and the final summary.

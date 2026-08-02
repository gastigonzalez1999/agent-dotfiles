# CLAUDE.md Template

Generate a `CLAUDE.md` file at the project root with the following structure. Replace all `{{PLACEHOLDER}}` values with actual project context from Phase 1 and Phase 2.

---

```markdown
# {{SERVICE_NAME}}

{{SERVICE_DESCRIPTION}}

## Domain Context

- **Bounded context**: {{DOMAIN}}
- **Core entities**: {{ENTITY_LIST}}
- **Consumers**: {{CONSUMERS}}
- **Data sensitivity**: {{DATA_SENSITIVITY}}
- **Integrations / ecosystem**: {{INTEGRATIONS}}

## Entity Field Reference

<!-- Generate one table per entity from the Phase 1 entity model. This is the persistent domain model reference for ongoing development. -->

### {{ENTITY_1}}

| Field | Type | Required | Unique | Sensitive | Notes              |
| ----- | ---- | -------- | ------ | --------- | ------------------ |
| id    | uuid | yes      | yes    | no        | PK, auto-generated |

<!-- Add all fields from the Phase 1 entity model for this entity -->

### {{ENTITY_2}}

| Field | Type | Required | Unique | Sensitive | Notes              |
| ----- | ---- | -------- | ------ | --------- | ------------------ |
| id    | uuid | yes      | yes    | no        | PK, auto-generated |

<!-- Add all fields from the Phase 1 entity model for this entity -->

<!-- Repeat for ALL entities from Phase 1 -->

## Entity Relationships

<!-- List all relationships from the Phase 1 entity model. Include cascade rules and which modules import which. -->

- {{ENTITY_1}} has-many {{ENTITY_2}} (cascade: {{CASCADE_RULE}}) — `{{entity_1}}.module` imports `{{entity_2}}.module`
<!-- Repeat for ALL relationships from Phase 1 -->

## Key Features Beyond CRUD

<!-- List custom endpoints per entity from the Phase 1 entity model. -->

### {{ENTITY_1}}

- `{{METHOD}} {{ROUTE}}` — {{DESCRIPTION}}

<!-- Repeat for ALL entities that have custom endpoints. Omit this section entirely if no entities have custom endpoints. -->

## Architecture

| Decision       | Choice         |
| -------------- | -------------- |
| Database       | {{DATABASE}}   |
| ORM            | {{ORM}}        |
| Authentication | {{AUTH}}       |
| Caching        | {{CACHING}}    |
| Message Queue  | {{QUEUE}}      |
| API Style      | {{API_STYLE}}  |
| Validation     | {{VALIDATION}} |

## Project Structure
```

src/
├── app.module.ts # Root module — imports AppConfigModule + feature modules
├── main.ts # Entry point — Swagger, validation pipe, helmet
├── config/ # Configuration — domain-split, validated at startup
│ ├── app-config.module.ts # @Global module: wraps ConfigModule.forRoot + validation
│ ├── env.validation.ts # validateConfig() utility
│ ├── app.config.ts # NODE_ENV, PORT, API_PREFIX, CORS_ORIGINS
│ ├── swagger.config.ts # SWAGGER_ENABLED, SWAGGER_PATH
│ └── index.ts # Barrel export
├── health/ # Health check module (GET /health)
│ ├── health.module.ts
│ └── health.controller.ts
├── {{ENTITY_1}}/ # Feature module (repeat for each entity)
│ ├── {{ENTITY_1}}.module.ts
│ ├── {{ENTITY_1}}.controller.ts
│ ├── {{ENTITY_1}}.service.ts
│ ├── {{ENTITY_1}}.controller.spec.ts
│ ├── dto/
│ │ ├── create-{{ENTITY_1}}.dto.ts
│ │ ├── update-{{ENTITY_1}}.dto.ts
│ │ └── {{ENTITY_1}}-response.dto.ts
│ └── entities/
│ └── {{ENTITY_1}}.entity.ts
├── {{ENTITY_2}}/ # (repeat structure for each entity)
│ └── ...
└── common/ # Shared guards, filters, interceptors
├── filters/
├── guards/
└── interceptors/
test/
├── {{ENTITY_1}}.e2e-spec.ts # E2E tests (one per entity)
├── {{ENTITY_2}}.e2e-spec.ts
└── health.e2e-spec.ts

```

## Commands

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start in watch mode |
| `npm run build` | Compile TypeScript |
| `npm run start:prod` | Start production build |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run e2e tests |
| `npm run lint` | Lint with ESLint (auto-fix) |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting without writing |
| `docker compose up` | Start all services with Docker |

## API Documentation

Swagger UI is available at `http://localhost:3000/api` when the server is running.

## Environment Variables

All configuration is managed via `.env` file. See `.env.example` for required variables. Never hardcode secrets.

Configuration is split into **domain-specific classes** in `src/config/`, each validated with `class-validator` at startup:

| Config class | Domain | Env vars |
|---|---|---|
| `AppConfig` | Core app settings | `NODE_ENV`, `PORT`, `API_PREFIX`, `CORS_ORIGINS` |
| `SwaggerConfig` | API docs | `SWAGGER_ENABLED`, `SWAGGER_PATH` |

<!-- Add rows for selected domains: DatabaseConfig, AuthConfig, RedisConfig, QueueConfig, etc. -->

All validation is wired in `AppConfigModule` (`src/config/app-config.module.ts`), which is `@Global()` — feature modules do not need to import `ConfigModule`, just inject `ConfigService`.

If a required env var is missing or invalid, the app **fails fast** before listening — the error message lists exactly what's wrong. To add new env vars:
1. Add the variable to the appropriate config class in `src/config/` with `class-validator` decorators
2. If it's a new domain, create a new config class and add `validateConfig()` call in `AppConfigModule`
3. Add it to `.env.example` with a placeholder
4. Add it to `.env` with a dev default

## Linting & Code Quality

This project uses an enhanced linting setup on top of the NestJS defaults:

- **ESLint 9** (flat config) with `typescript-eslint`, `eslint-plugin-unicorn`, and `eslint-plugin-sonarjs`
- **Prettier** for consistent formatting (`.prettierrc`)
- **husky + lint-staged** — pre-commit hook runs linting only on staged files
- Test files (`*.spec.ts`, `*.e2e-spec.ts`) have relaxed rules for practical test writing

Key lint rules:
- `no-console: warn` — use NestJS `Logger` instead of `console.log`
- `@typescript-eslint/no-floating-promises: error` — all promises must be awaited or returned
- `@typescript-eslint/return-await: always` — preserves async stack traces in exception filters
- `unicorn/*` — modern JS/TS best practices (with NestJS-specific overrides)
- `sonarjs/cognitive-complexity: 15` — keeps functions readable

To customize rules, edit `eslint.config.mjs`. Run `npm run lint` to auto-fix, `npm run format:check` in CI.

## Coding Conventions

This project includes four NestJS skills in `.claude/skills/`:
- **nestjs-best-practices** — 40 rules across 10 categories (source: Kadajett/agent-nestjs-skills)
- **nestjs-expert** — proactive troubleshooting advisor for DI, TypeORM, JWT, and common errors
- **code-review** — continuous quality gate for every code change
- **implement-feature** — guided workflow for adding new entities, modules, and endpoints (reads and updates the domain model in this file)

Key patterns:

### Architecture
- One feature module per bounded context / entity
- Services have single responsibility
- Use the repository pattern for data access
- Avoid circular dependencies — use `forwardRef()` only as last resort

### Dependency Injection
- Always use constructor injection
- Never use the service locator pattern
- Use injection tokens for interfaces
- Understand provider scopes (DEFAULT, REQUEST, TRANSIENT)

### Error Handling
- Always handle async errors (never unhandled promise rejections)
- Throw NestJS HTTP exceptions from controllers, not services
- Use exception filters for consistent error response format

### Serialization & Response DTOs
- **NEVER return entities directly from controllers** — always use response DTOs
- Response DTOs use `@Exclude()` on the class + `@Expose()` on safe fields
- `ClassSerializerInterceptor` is enabled globally in `main.ts` to enforce this
- Each response DTO has a static `fromEntity()` factory method
- Swagger `@ApiResponse()` must reference response DTOs, never entity classes

### Security
- Validate ALL inputs with DTOs + class-validator
- Use guards for access control, not middleware
- Rate limiting is enabled on sensitive endpoints
- Helmet middleware is active for security headers

### API Design
- Every endpoint has Swagger decorators (@ApiTags, @ApiOperation, @ApiResponse)
- Use DTOs for request/response serialization
- Use interceptors for cross-cutting concerns (logging, transformation)
- API versioning via URI prefix when needed

### Testing
- E2E tests use supertest + @nestjs/testing
- Mock external services in tests
- Test the full CRUD lifecycle per entity
- Test validation errors and auth failures

### Database
- Never use synchronize:true in production
- Use migrations for schema changes
- Prevent N+1 queries with eager/join strategies
- Wrap multi-step operations in transactions

## AI Instructions

When working on this codebase:
1. Read this file first — especially the Entity Field Reference and Relationships sections — to understand the domain model
2. Follow the patterns established in existing modules
3. When adding new entities or features, use the `/implement-feature` skill or follow its workflow: design the entity model first, then scaffold entity → DTOs → controller → service → tests
4. Always add Swagger decorators to new endpoints
5. Always add validation to new DTOs
6. Write e2e tests that cover CRUD, validation errors, sensitive field exclusion, and relationship integrity
7. Update this file's Entity Field Reference, Relationships, and Key Features sections when adding new entities
8. Check `.claude/skills/` for NestJS best practices and troubleshooting guides
9. Run `npm run lint` and `npm run test` before committing (pre-commit hook enforces this on staged files)
```

---

## Adaptation Notes

When generating, adapt this template:

- Remove sections for features not selected (e.g., remove caching section if no caching)
- Add sections for features that are selected (e.g., add queue section if Bull/RabbitMQ)
- List ALL actual entities from Phase 1, not just placeholders
- **Entity Field Reference**: Generate one complete field table per entity from the Phase 1 entity model — include every field with its type, required, unique, sensitive, and notes columns
- **Entity Relationships**: List every relationship with cascade rules and module import directions
- **Key Features Beyond CRUD**: List every custom endpoint per entity; omit the section if no custom endpoints exist
- Include actual environment variable names from the generated .env.example
- Fill in the config class table with all generated domain configs (DatabaseConfig, AuthConfig, RedisConfig, etc.) and remove the HTML comment placeholder
- Replace `{{INTEGRATIONS}}` with the actual integrations/ecosystem from Phase 1
- Show ALL entities in the project structure tree, not just one placeholder
- Reference specific file paths that exist in the generated project

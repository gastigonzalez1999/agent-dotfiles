---
name: implement-feature
description: >-
  Add a new entity, feature module, or API endpoint to an existing NestJS project.
  Use when asked to add a payment module, create an order entity, implement notifications,
  or add any new domain feature. Reads the domain model from CLAUDE.md, scaffolds following
  project patterns, and updates CLAUDE.md with the new entity.
---

# Implement Feature — NestJS Feature Module Scaffolding

This skill guides you through adding a new entity, feature module, or API endpoint to an existing NestJS project. It ensures new code follows the same patterns established during bootstrapping and keeps the domain model in CLAUDE.md up to date.

## Step 1: Read CLAUDE.md and Understand the Project

Before writing any code, read `CLAUDE.md` at the project root. Extract:

1. **Entity Field Reference** — existing entities, their fields, types, and sensitivity markers
2. **Entity Relationships** — how entities connect, cascade rules, module import directions
3. **Key Features Beyond CRUD** — custom endpoints on existing entities
4. **Architecture table** — database, ORM, auth, caching, validation choices
5. **Project Structure** — where feature modules live, naming conventions
6. **Coding Conventions** — patterns to follow (response DTOs, serialization, etc.)

Also scan an existing feature module (e.g., the first entity directory in `src/`) to understand the concrete patterns: decorator usage, import structure, error handling style, test layout.

## Step 2: Gather Requirements for the New Feature

Use AskUserQuestion to collect the following for the new entity/feature:

### Entity Model (same format as CLAUDE.md)

Present a field table for the new entity:

```markdown
### Entity: Payment

| Field           | Type                                    | Required | Unique | Sensitive | Notes                |
| --------------- | --------------------------------------- | -------- | ------ | --------- | -------------------- |
| id              | uuid                                    | yes      | yes    | no        | PK, auto-generated   |
| amount          | number                                  | yes      | no     | no        | cents, integer       |
| currency        | enum(usd,eur,gbp)                       | yes      | no     | no        | default: usd         |
| stripePaymentId | string                                  | yes      | yes    | yes       | external payment ref |
| status          | enum(pending,completed,failed,refunded) | yes      | no     | no        | default: pending     |
| createdAt       | Date                                    | yes      | no     | no        | auto                 |

**Relationships:**

- Payment belongs-to Order (cascade: none)
- Payment belongs-to User (cascade: none)

**Custom endpoints (beyond CRUD):**

- `POST /payments/:id/refund` — initiate payment refund
- `GET /payments/by-order/:orderId` — get payments for an order
```

Ask the user to confirm or adjust. If the user's request is vague (e.g., "add payments"), derive the fields from the product context and present for confirmation.

## Step 3: Update the Domain Model in CLAUDE.md

Before generating code, update `CLAUDE.md`:

1. **Entity Field Reference** — add the new entity's field table
2. **Entity Relationships** — add new relationships, noting which existing modules need updates
3. **Key Features Beyond CRUD** — add custom endpoints if any
4. **Core entities list** — add the new entity name to the Domain Context section
5. **Project Structure** — add the new module directory

## Step 4: Scaffold the Feature Module

Generate the following files, using the entity model from Step 2 and matching the patterns from existing modules:

```
src/<entity>/
├── <entity>.module.ts            # NestJS module with imports
├── <entity>.controller.ts        # REST controller with Swagger decorators
├── <entity>.service.ts           # Business logic service
├── <entity>.controller.spec.ts   # Unit test stub
├── dto/
│   ├── create-<entity>.dto.ts    # Create DTO with class-validator decorators
│   ├── update-<entity>.dto.ts    # Update DTO (PartialType of Create)
│   └── <entity>-response.dto.ts  # Response DTO with @Exclude/@Expose
└── entities/
    └── <entity>.entity.ts        # ORM entity with decorators
```

### Entity file

- Generate fields with correct ORM decorators matching the project's ORM (TypeORM, Prisma, or Mongoose)
- Match existing entities' decorator style (check an existing entity file)
- Add `@Exclude()` on fields marked sensitive in the entity model
- Add relationship decorators (`@ManyToOne`, `@OneToMany`, etc.) with cascade rules from the entity model

### Response DTO

- `@Exclude()` on the class
- `@Expose()` only on fields NOT marked sensitive
- `@ApiProperty({ description, example })` with domain-meaningful values
- Static `fromEntity()` factory method

### Create/Update DTOs

- `class-validator` decorators matching field constraints (type, required, unique)
- `@ApiProperty({ description, example })` on every field
- Update DTO extends `PartialType(CreateDto)` from `@nestjs/swagger`

### Controller

- Full CRUD endpoints (GET all, GET by id, POST, PATCH, DELETE)
- Custom endpoints from the entity model
- `@ApiTags()`, `@ApiOperation()`, `@ApiResponse({ type: ResponseDto })`
- Map entity → response DTO via `ResponseDto.fromEntity()`
- Auth guards if authentication is enabled in the project

### Service

- Constructor injection of repository/model
- Repository pattern matching existing services
- Proper error handling (`NotFoundException`, etc.)
- Relationship loading (`relations: [...]`) to prevent N+1 queries
- Business logic for custom endpoints

### Unit test stub

- Mock the repository/service
- Test happy path for each public method
- Match existing test file patterns

## Step 5: Generate E2E Tests

Create `test/<entity>.e2e-spec.ts`:

- **CRUD lifecycle**: create → read → update → delete
- **Validation errors**: missing required fields → 400, unknown properties → 400
- **Not found**: invalid ID → 404
- **Sensitive field exclusion**: assert every sensitive field is absent from responses
- **Relationship integrity**: if entity has relationships, test that related entities load correctly and invalid foreign keys fail
- **Custom endpoints**: test each custom endpoint defined in the entity model
- **Auth** (if enabled): test unauthorized access → 401
- Use real payloads matching the entity model field types, not empty objects
- Include `ClassSerializerInterceptor` setup in `beforeAll()`

## Step 6: Wire Up the Module

1. Add the new module to `app.module.ts` imports
2. If the entity has relationships to existing entities, update those entities with the inverse relationship decorator
3. Update existing modules' imports if cross-module references are needed
4. Add Swagger tag in `main.ts` if not auto-detected from `@ApiTags()`

## Step 7: Verify

Run the following and fix any issues:

```bash
npm run lint && npm run test
```

If e2e tests exist and a test database is configured:

```bash
npm run test:e2e
```

## Step 8: Summary

Report to the user:

- Files created/modified
- New entity's field summary
- New relationships added
- Custom endpoints available
- Remind them that CLAUDE.md has been updated with the new entity

## Quality References

- For the full 40-rule best practices reference, read `.claude/skills/nestjs-best-practices/SKILL.md`
- For common NestJS pitfalls, read `.claude/skills/nestjs-expert/SKILL.md`
- After implementation, the code-review skill (`.claude/skills/code-review/SKILL.md`) validates the change

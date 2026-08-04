---
name: code-review
description: >-
  NestJS code review and quality gate. Use when reviewing, modifying, or creating NestJS source files.
  Triggers on code changes, PR reviews, refactoring tasks, and new feature implementation.
  Enforces response DTOs, Swagger completeness, validation, logging, and test coverage.
---

# NestJS Code Review — Continuous Quality Gate

This skill activates whenever you review, modify, or create NestJS source files. It enforces the project's quality standards on every change.

## Pre-Change Checklist

Before modifying any file, complete these steps:

1. **Read related tests** — Find and read existing test files for the module you're changing (`*.spec.ts`, `*.e2e-spec.ts`)
2. **Understand module boundaries** — Check the module's imports/exports to understand what's available and what other modules depend on it
3. **Check for existing patterns** — Look at sibling files in the same module to match existing conventions (naming, error handling, DTO structure)

## Post-Change Validation Checklist

After every code change, verify ALL of the following. Items marked **(blocking)** must be fixed before declaring the change complete.

### Response DTOs & Serialization

- [ ] **(blocking)** Every controller method returns a **response DTO**, never a raw entity
- [ ] **(blocking)** Response DTOs use `@Exclude()` on the class and `@Expose()` only on safe fields
- [ ] Response DTOs have a static `fromEntity()` factory method
- [ ] `@ApiResponse({ type: ResponseDto })` references the response DTO, not the entity

### Swagger / OpenAPI

- [ ] **(blocking)** Every new/modified endpoint has `@ApiOperation()` and `@ApiResponse()` decorators
- [ ] **(blocking)** Every new/modified endpoint has `@ApiTags()` on its controller
- [ ] DTO properties have `@ApiProperty()` decorators with meaningful descriptions
- [ ] Error responses are documented (`@ApiResponse({ status: 404, description: '...' })`)

### Validation

- [ ] **(blocking)** Every input DTO has `class-validator` decorators on all fields
- [ ] Update DTOs use `PartialType()` from `@nestjs/swagger` (not `@nestjs/mapped-types`) to preserve Swagger metadata
- [ ] Array and nested object fields use `@ValidateNested()` + `@Type()`

### Code Quality

- [ ] **(blocking)** No `console.log` — use NestJS `Logger` instead (`private readonly logger = new Logger(ClassName.name)`)
- [ ] **(blocking)** No `any` types — use proper interfaces or generics
- [ ] **(blocking)** No floating promises — every async call is `await`ed or explicitly handled with `.catch()`
- [ ] **(blocking)** No `eslint-disable` comments or `@ts-ignore` — fix the underlying issue
- [ ] No hardcoded configuration values — use `@nestjs/config` ConfigService
- [ ] Constructor injection only — no property injection with `@Inject()`

### Architecture

- [ ] No circular dependencies introduced — check module imports form a DAG
- [ ] Services export from their module's `exports` array (not the module itself)
- [ ] New providers are decorated with `@Injectable()`
- [ ] Feature code is organized by domain (`src/<feature>/`), not by technical layer
- [ ] Entity relationships use proper ORM decorators with cascade rules matching the domain model in CLAUDE.md
- [ ] Related entities are loaded eagerly or via explicit `relations` option in find queries (no N+1 queries)
- [ ] New entities are documented in CLAUDE.md's Entity Field Reference, Relationships, and Key Features sections
- [ ] Custom endpoints defined in the entity model have corresponding e2e test coverage

### Testing

- [ ] **(blocking)** Tests are updated for any changed public method or endpoint
- [ ] New endpoints have at least a controller spec testing the happy path
- [ ] Mocks use `jest.fn()` or `createMock()` — no real database/network calls in unit tests
- [ ] Test descriptions are specific: `'should return 404 when user not found'` not `'should work'`

### Security

- [ ] Sensitive fields (passwords, tokens, internal IDs) are never exposed in API responses
- [ ] New endpoints that require authentication use `@UseGuards()`
- [ ] User input that reaches database queries is validated and sanitized via DTOs

## Mandatory Verification Step

Before declaring any change complete, run:

```bash
npm run lint && npm run test
```

If either command fails, fix the issues before proceeding. Do not skip this step.

## Quick Reference

For the full 40-rule NestJS best practices reference, read the `nestjs-best-practices` skill in `.claude/skills/nestjs-best-practices/SKILL.md`.

For troubleshooting common NestJS errors (dependency injection, TypeORM connection issues, JWT problems), read the `nestjs-expert` skill in `.claude/skills/nestjs-expert/SKILL.md`.

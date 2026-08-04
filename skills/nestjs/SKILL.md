---
name: nestjs
description: >-
  Build or refactor NestJS modules, controllers, providers, guards, and interceptors. Use when working in a NestJS codebase.
targets: [cursor]
---

# NestJS

## When to use

- Building or refactoring NestJS modules, controllers, providers, guards, or interceptors.
- Aligning with Nest patterns for DI, testing, and configuration.

## Steps

1. Keep **domain logic** in pure services; keep controllers thin (validation + mapping).
2. Use **modules** to enforce boundaries; avoid circular imports—extract shared modules or interfaces.
3. Prefer **`@Injectable()`** with constructor injection; use **tokens** for cross-cutting concerns.
4. Validate inputs with **DTOs + class-validator** or Zod pipes; fail fast with clear errors.
5. Use **guards** for authz, **interceptors** for cross-cutting concerns, **filters** for error mapping.
6. Configure via **ConfigModule** with typed schema; validate env at startup in production.
7. Test with **TestingModule**; mock providers at boundaries; avoid testing the framework itself.
8. For performance, profile before micro-optimizing; use caching and async patterns where appropriate.

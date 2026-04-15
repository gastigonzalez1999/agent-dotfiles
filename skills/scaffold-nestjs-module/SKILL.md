---
name: scaffold-nestjs-module
description: Generate a complete NestJS module with controller, service, repository, DTOs, guards, and Jest spec files. Use when the user asks to create a new NestJS module, feature, or domain entity.
---

# Scaffold NestJS Module

Generate a full NestJS module for a given domain entity. Ask for the entity name if not provided.

## What to generate

For entity `<Entity>` in module `<module-name>`:

```
src/<module-name>/
├── <module-name>.module.ts          # Module with all providers registered
├── <module-name>.controller.ts      # REST controller with CRUD endpoints
├── <module-name>.service.ts         # Business logic service
├── <module-name>.repository.ts      # Prisma repository (wraps prisma.<entity>)
├── dto/
│   ├── create-<module-name>.dto.ts  # class-validator decorated DTO
│   └── update-<module-name>.dto.ts  # PartialType(Create...)
├── entities/
│   └── <module-name>.entity.ts      # Type-only entity (from Prisma types)
└── __tests__/
    ├── <module-name>.service.spec.ts
    └── <module-name>.controller.spec.ts
```

## Conventions to follow

- Use `@Injectable()` on service and repository
- Repository injects `PrismaService` via constructor
- Service injects Repository (not Prisma directly)
- Controller uses `@UseGuards(JwtAuthGuard, RolesGuard)` unless public
- DTOs use `class-validator`: `@IsString()`, `@IsEmail()`, `@IsOptional()`, `@IsUUID()`, etc.
- All DTO properties use `!` initializer (strict mode)
- Service methods return typed Promises, no `any`
- Use `@ApiTags()` and `@ApiOperation()` on controllers for Swagger
- Spec files mock the repository using `jest.fn()`

## Common pitfalls to avoid

- Never use `prisma.client` — inject `PrismaService` directly
- Nullable Prisma compound unique keys: use `findFirst` + `upsert` pattern, not `findUnique` with null fields
- Always add the new module to `app.module.ts` imports
- Register service AND repository in the module's `providers` array

## Steps

1. Read `src/app.module.ts` and `prisma/schema.prisma` for context
2. Generate all files in parallel (Write tool)
3. Add module to `app.module.ts` imports
4. Run `tsc --noEmit` to confirm no type errors

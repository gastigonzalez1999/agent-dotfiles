# Phase 3: Scaffolding Steps 3–16

These steps continue after the NestJS project scaffold (Step 1) and skill installation (Step 2) are complete. Read and apply both `templates/nestjs-best-practices-skill.md` and `templates/nestjs-expert-skill.md` rules throughout ALL code generated below.

---

## Step 3: Install Dependencies

Based on Phase 2 decisions, install the appropriate packages. Common combinations:

**Always install:**

- `@nestjs/swagger` `swagger-ui-express` — Swagger/OpenAPI docs
- `@nestjs/config` — Environment configuration
- `@nestjs/terminus` `@nestjs/axios` — Health checks
- `helmet` — Security headers
- `class-validator` `class-transformer` — DTO validation (if selected)

**Conditional installs (based on Phase 2):**

- PostgreSQL + TypeORM: `@nestjs/typeorm` `typeorm` `pg`
- PostgreSQL + Prisma: `prisma` `@prisma/client` (+ run `npx prisma init`)
- PostgreSQL + MikroORM: `@mikro-orm/core` `@mikro-orm/nestjs` `@mikro-orm/postgresql`
- MongoDB + Mongoose: `@nestjs/mongoose` `mongoose`
- Redis caching: `@nestjs/cache-manager` `cache-manager` `cache-manager-redis-store` `redis`
- JWT auth: `@nestjs/jwt` `@nestjs/passport` `passport` `passport-jwt` `bcrypt` `@types/passport-jwt` `@types/bcrypt`
- OAuth2: `@nestjs/passport` `passport` `passport-oauth2`
- API keys: (custom guard, no extra deps)
- GraphQL: `@nestjs/graphql` `@nestjs/apollo` `@apollo/server` `graphql`
- Bull queue: `@nestjs/bullmq` `bullmq`
- RabbitMQ: `@nestjs/microservices` `amqplib`
- Kafka: `@nestjs/microservices` `kafkajs`
- Zod validation: `zod` `nestjs-zod`

## Step 4: Generate CLAUDE.md

Read `templates/claude-md.md` from this skill directory. Generate a project-specific `CLAUDE.md` at the project root, filling in:

- All product context from Phase 1
- All technical decisions from Phase 2
- Project-specific file structure
- Commands to run, test, and deploy
- Reference to agent-nestjs-skills best practices

## Step 5: Generate Swagger Configuration

Read `templates/swagger-setup.md` from this skill directory. Create/modify `src/main.ts` to include Swagger setup with:

- API title = service name from Phase 1
- API description = service description from Phase 1
- Version = 1.0.0
- Tag per feature module (one per core entity)
- Serve at `/api` path

## Step 6: Generate Dockerfile

Read `templates/dockerfile.md` from this skill directory. Generate a multi-stage `Dockerfile` at project root:

- Stage 1: deps (install dependencies)
- Stage 2: build (compile TypeScript)
- Stage 3: production (minimal image, non-root user, healthcheck)

## Step 7: Generate docker-compose.yml

Read `templates/docker-compose.md` from this skill directory. Generate `docker-compose.yml` with:

- The NestJS app service
- Database service (if selected in Phase 2)
- Redis service (if caching or Bull selected)
- RabbitMQ service (if selected)
- Proper networking, volumes, health checks, and depends_on

## Step 8: Generate .env.example

Read `templates/env-example.md` from this skill directory. Generate `.env.example` with all configuration variables needed based on Phase 2 decisions. Also create a `.env` copy for local development.

## Step 9: Scaffold Feature Modules (Entity-Model-Driven)

Use **the entity model from Phase 1** (field tables, relationships, custom endpoints) as the single source of truth for all generated code. Every file below derives its structure from that model.

For EACH core entity from Phase 1, generate:

```
src/<entity>/
├── <entity>.module.ts            # NestJS module with imports
├── <entity>.controller.ts        # REST controller with Swagger decorators
├── <entity>.service.ts           # Business logic service
├── dto/
│   ├── create-<entity>.dto.ts    # Create DTO with validation decorators
│   ├── update-<entity>.dto.ts    # Update DTO (PartialType of Create)
│   └── <entity>-response.dto.ts  # Response DTO — controls what the API exposes
├── entities/
│   └── <entity>.entity.ts        # TypeORM/Prisma/Mongoose entity/schema (NEVER returned directly)
└── <entity>.controller.spec.ts   # Unit test stub
```

**CRITICAL: Never return entities directly from controllers.** Entities are internal data models that may contain sensitive fields (passwords, internal IDs, soft-delete flags, etc.). Always use response DTOs.

---

### 9a. Entities — Map every field from the entity model

Generate entity files with actual fields, types, and decorators derived from the entity model:

- **Fields**: Every field in the entity model's field table becomes a property with the correct TypeScript type and ORM decorator
- **Nullability**: Fields marked `required: no` in the entity model get `{ nullable: true }` in the ORM decorator and `?` in TypeScript
- **Defaults**: Fields with default values in the entity model Notes column get `{ default: ... }` in the ORM decorator
- **Unique constraints**: Fields marked `unique: yes` get `{ unique: true }`
- **Sensitive fields**: Fields marked `sensitive: yes` get `@Exclude()` from `class-transformer` as a defense-in-depth layer
- **Enums**: Fields with `enum(...)` types become TypeScript enums and use the ORM's enum column type

**Relationships**: Generate relationship decorators from the entity model's relationship list:

- `has-many` → `@OneToMany(() => Related, (r) => r.parent)` on the parent + `@ManyToOne(() => Parent, (p) => p.children)` on the child with a `@JoinColumn()` and foreign key column
- `has-one` → `@OneToOne(() => Related)` with `@JoinColumn()`
- `many-to-many` → `@ManyToMany(() => Related)` with `@JoinTable()` on the owning side
- Cascade rules from the entity model map to TypeORM's `{ cascade: true, onDelete: 'CASCADE' }` or `{ onDelete: 'SET NULL' }` for soft-delete

**Example** — how the entity model maps to a generated entity (User from Phase 1):

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Exclude } from 'class-transformer';

// Enum derived from entity model field: role enum(admin,user)
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

@Entity()
export class UserEntity {
  // Field: id | uuid | required | unique | PK, auto-generated
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Field: email | string | required | unique
  @Column({ unique: true })
  email: string;

  // Field: passwordHash | string | required | SENSITIVE → @Exclude()
  @Exclude()
  @Column()
  passwordHash: string;

  // Field: name | string | required
  @Column()
  name: string;

  // Field: role | enum(admin,user) | required | default: user
  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  // Field: createdAt | Date | required | auto
  @CreateDateColumn()
  createdAt: Date;

  // Relationship: User has-many Order (cascade: soft-delete)
  @OneToMany(() => OrderEntity, (order) => order.user)
  orders: OrderEntity[];

  // Relationship: User has-one Profile (cascade: delete)
  @OneToOne(() => ProfileEntity, (profile) => profile.user, { cascade: true, onDelete: 'CASCADE' })
  profile: ProfileEntity;
}
```

Adapt the above for **Prisma** (schema.prisma model) or **Mongoose** (`@Schema()` / `@Prop()` decorators) based on the ORM selected in Phase 2.

---

### 9b. Response DTOs — Expose only non-sensitive fields

Each **response DTO** (`<entity>-response.dto.ts`) is derived from the entity model by including ONLY fields where `sensitive: no`:

- Use `@Exclude()` on the class (exclude-by-default strategy)
- Use `@Expose()` only on fields NOT marked sensitive in the entity model
- Use `@ApiProperty({ description, example })` with domain-meaningful values (not generic placeholders)
- Use a static `fromEntity(entity)` factory method to map entity → response DTO

**Example** — User entity model → UserResponseDto:

```typescript
import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserEntity, UserRole } from '../entities/user.entity';

@Exclude()
export class UserResponseDto {
  // Field: id — not sensitive → @Expose()
  @Expose()
  @ApiProperty({
    description: 'Unique user identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  // Field: email — not sensitive → @Expose()
  @Expose()
  @ApiProperty({ description: 'User email address', example: 'jane@example.com' })
  email: string;

  // Field: name — not sensitive → @Expose()
  @Expose()
  @ApiProperty({ description: 'Display name', example: 'Jane Doe' })
  name: string;

  // Field: role — not sensitive → @Expose()
  @Expose()
  @ApiProperty({ description: 'User role', enum: UserRole, example: UserRole.USER })
  role: UserRole;

  // Field: createdAt — not sensitive → @Expose()
  @Expose()
  @ApiProperty({ description: 'Account creation date' })
  createdAt: Date;

  // Fields: passwordHash — SENSITIVE → excluded by default (no @Expose())

  static fromEntity(entity: UserEntity): UserResponseDto {
    return Object.assign(new UserResponseDto(), entity);
  }
}
```

---

### 9c. Create/Update DTOs — Validate using entity model constraints

Generate `class-validator` decorators matching the entity model's field constraints:

- **Required fields** (excluding auto-generated: id, createdAt, updatedAt) get `@IsNotEmpty()`
- **String fields** get `@IsString()`; add `@IsEmail()` for email types, `@IsUrl()` for URLs, `@MaxLength()` if noted
- **Enum fields** get `@IsEnum(EnumType)`
- **Number fields** get `@IsNumber()` or `@IsInt()`
- **Boolean fields** get `@IsBoolean()`
- **UUID fields** (foreign keys from relationships) get `@IsUUID()`
- **Optional fields** get `@IsOptional()`
- **Sensitive fields** that are user-provided (e.g., `password` — not `passwordHash`) appear in the Create DTO with `@IsString()` + `@MinLength()`
- Use `@ApiProperty({ description, example })` with meaningful values on every field
- Update DTO extends `PartialType(CreateDto)` from `@nestjs/swagger`

**Example** — Create User DTO:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsEnum, MinLength } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ description: 'User email address', example: 'jane@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'User password (min 8 characters)', example: 'secureP@ss1' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'Display name', example: 'Jane Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    required: false,
    default: UserRole.USER,
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
```

---

### 9d. Controllers — CRUD + custom endpoints from entity model

Each **controller** must have:

- Full CRUD endpoints (GET all, GET by id, POST, PATCH, DELETE)
- **Custom endpoints** from the entity model's "Custom endpoints" section (e.g., `POST /users/:id/deactivate`, `GET /users/me`), each with proper Swagger decorators and dedicated DTOs if needed
- `@ApiTags('<entity>')` decorator
- `@ApiOperation()` on each endpoint with a meaningful summary
- `@ApiResponse({ type: EntityResponseDto })` referencing the **response DTO**, never the entity
- Validation via DTO + `ValidationPipe`
- Map entity → response DTO before returning (use `EntityResponseDto.fromEntity()`)

---

### 9e. Services — Repository pattern with relationship loading

Each **service** must have:

- Constructor injection of repository/model
- Proper error handling (throw `NotFoundException`, etc.)
- Following the repository pattern (abstract data access from business logic)
- Return entities to the controller (the controller handles mapping to response DTOs)
- **Relationship loading**: For entities with relationships defined in the entity model, configure eager loading or explicit `relations` option in find queries to prevent N+1 queries:
  ```typescript
  // Derived from entity model: User has-many Order, User has-one Profile
  findOne(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['orders', 'profile'],
    });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }
  ```
- **Custom endpoint logic**: Implement business logic for custom endpoints defined in the entity model (e.g., `deactivate()` for soft-deactivation)

## Step 10: Generate Health Check Module

Create `src/health/` module with:

- `GET /health` endpoint
- Database health indicator (if DB selected)
- Redis health indicator (if Redis selected)
- Swagger documentation

## Step 11: Generate E2E Tests

Read `templates/e2e-scaffold.md` from this skill directory. For each core entity, generate `test/<entity>.e2e-spec.ts`:

- Test full CRUD lifecycle (create → read → update → delete)
- Test validation errors (missing required fields → 400)
- Test not found errors (invalid ID → 404)
- Test response shape matches DTO/Swagger schema
- If auth is enabled: test unauthorized access (no token → 401)

Also generate `test/health.e2e-spec.ts`:

- Test `GET /health` returns 200 with status "ok"

## Step 12: Generate GitHub Actions (if selected)

Read `templates/github-actions.md` from this skill directory. Generate `.github/workflows/ci.yml` with:

- Trigger on push to main and pull requests
- Jobs: lint, test (unit + e2e), build
- If Docker push selected: build and push Docker image
- Use service containers for DB/Redis if needed in tests

## Step 13: Configure Project

Read `templates/config-setup.md` from this skill directory. Apply all steps:

1. Create domain-specific config classes in `src/config/` — one class per domain (app, database, auth, redis, queue, swagger). Only generate classes for features selected in Phase 2. Each class uses `class-validator` decorators for runtime validation and `class-transformer` for type coercion.
2. Create `src/config/env.validation.ts` with the `validateConfig()` utility function.
3. Create `src/config/app-config.module.ts` — a `@Global()` module that wraps `ConfigModule.forRoot()` with a `validate` function calling `validateConfig()` for each domain config. This makes the app **fail fast** at startup if any env var is missing or invalid.
4. Create `src/config/index.ts` barrel export for all generated config classes and `AppConfigModule`.
5. In `src/app.module.ts`, import only `AppConfigModule` + feature modules + health module. `AppModule` stays clean — all config wiring is encapsulated in `AppConfigModule`.
6. Add `helmet` middleware in `main.ts`
7. Enable `ValidationPipe` globally in `main.ts`
8. Enable `ClassSerializerInterceptor` globally in `main.ts` — this activates `@Exclude()`/`@Expose()` on response DTOs so entities are never accidentally leaked:
   ```typescript
   app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
   ```
9. Update `package.json` scripts if needed

## Step 14: Configure Linting & Code Quality

Read `templates/linting-setup.md` from this skill directory. Apply all steps to set up the comprehensive pre-commit harness including commitlint, lint-staged with multi-step pipeline, forbidden pattern checks, and husky hooks.

After applying, run `npm run lint -- --fix` to auto-fix any lint errors in the scaffolded code before committing.

## Step 15: Initialize Git

```bash
git init
git add -A
git commit -m "Initial scaffold: <service-name> NestJS API

Bootstrapped with /bootstrap-nestjs skill.
Includes: Swagger docs, Dockerfile, e2e tests, health checks, CI/CD.
Integrates NestJS best practices (40 rules) + expert troubleshooting + code review skill."
```

## Step 16: Final Summary

Print a summary to the user:

- Project location
- How to run: `npm run start:dev`
- How to test: `npm run test` and `npm run test:e2e`
- Swagger URL: `http://localhost:3000/api`
- Docker: `docker compose up`
- CLAUDE.md location and purpose
- Installed skills: explain that `.claude/skills/` contains four skills that will automatically activate in future Claude Code sessions:
  - **nestjs-best-practices** — 40 architecture and code quality rules
  - **nestjs-expert** — Proactive troubleshooting for common NestJS issues
  - **code-review** — Continuous quality gate for every code change
  - **implement-feature** — Guided workflow for adding new entities, modules, and endpoints — reads and updates the domain model in CLAUDE.md
- Domain model: explain that CLAUDE.md contains the full entity field reference, relationships, and custom endpoints, which the implement-feature skill reads when adding new features
- Next steps (implement business logic, add more tests, etc.)

---

## Important Guidelines

- **Read templates before generating**: Always read the reference template from `templates/` before generating each artifact. Adapt the template to the specific project context.
- **Apply both skill guidelines to ALL generated code**: The rules from `templates/nestjs-best-practices-skill.md` and `templates/nestjs-expert-skill.md` (read in Step 2f) must be followed in every file generated during scaffolding. These same skills are also installed in the generated project for ongoing development.
- **NEVER return entities directly from controllers**: Entities are internal data models. Always create a response DTO with `@Exclude()`/`@Expose()` that explicitly whitelists fields safe for API consumers. Use `EntityResponseDto.fromEntity()` to map. The `ClassSerializerInterceptor` is enabled globally to enforce this.
- **Swagger completeness**: Every endpoint must have full Swagger documentation. `@ApiResponse()` must reference **response DTOs**, never entity classes. No undocumented endpoints.
- **E2E tests validate requirements**: Tests should verify the product requirements from Phase 1, not just technical correctness. Tests should assert response shape matches the response DTO (not the entity).
- **No secrets in code**: All sensitive values go in .env, never hardcoded. .env is in .gitignore.
- **Production-ready defaults**: Enable CORS, helmet, validation pipe, ClassSerializerInterceptor, and proper error handling out of the box.

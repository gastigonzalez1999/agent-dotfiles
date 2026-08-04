---
name: nestjs-conventions
description: >-
  The house conventions for NestJS services — layered module structure, use-case services, repository
  ports, typed config modules, layered env files, and migration discipline. Use when adding a module
  to a NestJS API, starting a new one, or reviewing whether existing code follows the standard.
targets: [claude, cursor, codex]
---

# NestJS conventions

The shared standard across our NestJS services. Four repos had grown their own
near-identical copy of this; this is the merged version. Where a project
deviates deliberately, its own CLAUDE.md wins — but it should say why.

Module layout, code samples and the migration recipe are in
`references/module-layout.md`. Read it when adding a module.

---

## Layering

Requests flow one way and never skip a layer:

```
controller  →  use case  →  domain        (decides)
                    ↓
              repository port
                    ↓
              infrastructure              (TypeORM / Prisma / HTTP client)
```

- **Controllers receive and respond.** No business logic, no mapping, no
  conditional flow beyond delegating.
- **One use-case class per business operation**, with a single `execute()`.
  `CreateOrderUseCase`, `GetOrderByIdUseCase`. This keeps controllers thin and
  makes each operation testable without booting the app.
- **The domain decides.** Business rules are pure, tested functions — no
  framework imports, no ORM, no HTTP.
- **The domain never depends on infrastructure.** It declares interfaces;
  infrastructure implements them.

## Repository ports

Business code asks an interface to save something. It never touches the ORM.

```ts
// domain/repositories/order.repository.ts — the port
export interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: OrderId): Promise<Order | null>;
}

// module wiring — inject by string token, not by class
providers: [{ provide: 'OrderRepository', useClass: TypeOrmOrderRepository }]
// consume with @Inject('OrderRepository')
```

String tokens are deliberate: they keep the domain free of a concrete class
import, which is the whole point of the port.

Persistence classes are **separate** from domain classes, with mappers between
them. Under TypeORM the `*.orm-entity.ts` suffix is load-bearing — the
DataSource discovers entities by that glob, so renaming the suffix silently
stops the entity from loading.

## External providers

Every third-party SDK sits behind a port and an adapter. Payment providers, maps,
storage, auth, notifications — all of them. A provider SDK type must never appear
in a domain signature.

## Configuration

One typed config module per concern under `src/config/<domain>/`: `app`, `auth`,
`database`, `logger`, and one per integration.

- Inject the config service (`AppConfigService`). **Never read `process.env`
  outside the config layer.**
- Env files are layered: a committed baseline (`.env.development`) plus a local
  `.env` for overrides and secrets. `.env.example` documents every key.
- Validation classes have defaults, and **a default in the class silently beats
  the value in `.env`** if the key is misspelled or unloaded. When a config value
  looks ignored, check the class default first — this is the single most common
  config bug in these codebases.

## Migrations

- `DB_SYNCHRONIZE` and `DB_LOGGING` stay `false` in production. Schema changes go
  through migrations, always.
- The container entrypoint runs migrations before starting the app, so a deploy
  can never serve traffic against an un-migrated schema.
- Generate a migration after every entity change. Never hand-edit a schema that
  `synchronize` created.

## Validation and global behavior

- `main.ts` enables `ValidationPipe({ transform: true, whitelist: true })`.
  DTOs with `class-validator` decorators are therefore the contract, and
  undeclared fields are stripped rather than passed through.
- Validation lives **in the DTO class**, not scattered through services.
- Bind request-id and user-context interceptors as `APP_INTERCEPTOR` so every log
  line carries request context.

## Guards

If a global guard is bound as `APP_GUARD`, it runs on **every** route — which
means endpoints are deny-by-default and each one must declare its permission
explicitly. That is the safe direction, but it surprises people: a new endpoint
that "does nothing wrong" will 403 until it declares access. Say so in the
project's CLAUDE.md when this pattern is in use.

## Money

Every amount is an integer in the smallest currency unit. Never a float. Format
for display only, never in a calculation. This is not negotiable and not
stack-specific — it is the single most expensive class of bug in this domain.

## Project hygiene

- Path aliases (`@modules/*`, `@config/*`, `@common/*`) over long relative
  imports. Keep `tsconfig.json` and the jest e2e config in sync.
- Husky: `lint-staged` on pre-commit, tests on pre-push, `commitlint`
  (conventional commits) on commit-msg.
- Swagger on, so `manual-qa` and any generated client have a spec to work from.

## Verifying

Run the repo's own gate rather than assuming commands:

```bash
node ~/.claude/loop/loop.mjs full
```

If the repo has no `.agent/loop.json`, run the `loop-init` skill to create one.

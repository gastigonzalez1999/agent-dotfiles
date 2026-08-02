---
name: prisma
description: >-
  Schema design, migrations, queries, and Prisma Client usage in TypeScript/Node. Use when changing schema.prisma, writing queries, or debugging a migration.
targets: [cursor]
---

# Prisma

## When to use

- Schema design, migrations, queries, or Prisma Client usage in TypeScript/Node.
- Debugging Prisma errors, relation issues, or connection/transaction behavior.

## Steps

1. Confirm **Prisma version**, `schema.prisma` datasource, and `DATABASE_URL` expectations.
2. Prefer **schema-first** changes: model fields, relations, indexes; then `migrate` or `db push` per team policy.
3. Use **transactions** for multi-step writes; keep batches bounded for timeouts and locks.
4. Write queries with **explicit `select`** when payloads are large; avoid N+1 (use `include`/`select` wisely).
5. Add **indexes** for frequent filters and joins; validate with `explain` / DB tooling where available.
6. Map **errors** to domain outcomes (e.g. unique constraint → conflict) at the service boundary.
7. For upgrades, read release notes; run `generate` after schema changes; run tests against a real DB.
8. Never log connection strings or raw PII from query results.

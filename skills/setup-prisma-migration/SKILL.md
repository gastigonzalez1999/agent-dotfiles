---
name: setup-prisma-migration
description: Create and apply a Prisma migration safely. Handles schema changes, nullable pitfalls, port conflicts, and seed data. Use when adding models, changing fields, or setting up the DB for the first time.
targets: [claude, cursor, codex]
---

# Setup Prisma Migration

Create and apply Prisma migrations correctly, handling common failure modes.

## Process

1. **Check DB is running**:
   ```bash
   docker ps | grep postgres
   ```
   If not running: `docker compose up -d postgres`

2. **Check port** — if local postgres is on 5432, project may need 5433:
   ```bash
   lsof -i :5432
   ```

3. **Verify DATABASE_URL** in `.env` matches the running container's port and credentials:
   ```bash
   grep DATABASE_URL .env
   grep -A5 'postgres:' docker-compose.yml
   ```

4. **Create migration** from project root (not `apps/api`):
   ```bash
   cd apps/api && npx prisma migrate dev --name <description>
   ```
   Use snake_case for migration names: `add_api_keys`, `add_tenant_id_to_users`

5. **Run seed** if needed:
   ```bash
   npx prisma db seed
   ```

## Common failure modes

### Port conflict
Local Postgres running on 5432 blocks Docker container. Fix: change Docker port to 5433 in `docker-compose.yml` and update `DATABASE_URL` in `.env`.

### Nullable compound unique key
```
findUnique({ where: { name_tenantId: { name, tenantId: null } } })
```
Prisma rejects `null` in unique queries. Fix: use `findFirst` with `where: { name, tenantId: null }` + `upsert` by ID.

### Validation class default overrides env var
Some projects have a `config.validation.ts` with hardcoded defaults that win over `.env`. Check and update both.

### Wrong working directory
Always run `prisma migrate dev` from `apps/api/`, not the monorepo root. Prisma looks for `.env` relative to its working directory.

### Seed TypeScript errors
Run `tsc --noEmit` on the seed file before running: `npx ts-node prisma/seed.ts`

## After migration

- Verify schema: `npx prisma studio` (opens browser UI)
- Run tests: `npm test`
- Confirm API starts without errors

---
name: review-migration
description: Review a database migration for safety before merge. Use when the user asks to "review the migration", "check this migration", "is this migration safe to deploy", "will this lock the table", or mentions a migration file explicitly. Checks for additive-first ordering, table-lock risk, concurrent index creation, idempotent backfills, and reversible down migrations. Outputs findings as CRITICAL / HIGH / MEDIUM / NOTES with file:line references.
targets: [claude, cursor, codex]
---

# Review Migration

You are reviewing a database migration that will run against production. Think carefully. A bad migration can lock a table for minutes, corrupt data, or block a deploy. Your job is to catch those risks before merge.

## 1. Find the migrations

- Run `git diff <target>...HEAD --name-only -- '**/migrations/**' '**/prisma/migrations/**' '**/typeorm/migrations/**'` to find changed migration files.
- If none are found, ask the user which files to review. Don't guess.
- Read each migration file end to end before commenting.

## 2. Check table size awareness

Before flagging a risky operation, ask: **how big is this table in production?** An `ALTER TABLE` on 1K rows is instant; on 100M rows it's an outage. If the user hasn't said, ask:

> "Roughly how many rows does `<table>` have in prod?"

Batch this with any other clarifying questions.

## 3. What to look for

### Additive-first ordering (CRITICAL)
- New columns added as `NULL` or with a cheap default, not `NOT NULL` with an expensive default.
- New `NOT NULL` columns only after a backfill migration has run in a prior deploy.
- Enum additions append values — never remove or reorder.
- No column renames without a deprecation period (rename = break all running pods).

### Locking behavior (CRITICAL)
- `CREATE INDEX` uses `CONCURRENTLY` on PostgreSQL, and is **not** inside a transaction block (Prisma/TypeORM often wraps migrations in one by default — this will fail silently or error).
- No `ALTER COLUMN TYPE` that triggers a table rewrite on large tables.
- `ADD CONSTRAINT ... NOT VALID` followed by `VALIDATE CONSTRAINT` is fine, but both in the same migration on a large table still takes a share lock for the full validate — split across deploys.
- No full-table `UPDATE` in a single statement for large tables — must be batched.

### Backfills (HIGH)
- Batched (e.g. `WHERE id BETWEEN x AND y`, chunk size ≤ 10K).
- Idempotent — re-running produces the same result.
- Transactional per batch, not per whole table.
- Progress logged so a stuck backfill is visible.

### Reversibility (HIGH)
- A `down` method / reverse migration exists.
- The down is actually the inverse, not a TODO or a no-op comment.
- Irreversible operations (dropping a column with live data) are flagged with a comment explaining why and confirmed with the user.

### Safety net
- Any data-destructive statement (`DROP COLUMN`, `DROP TABLE`, `TRUNCATE`, `DELETE`) gets a second look — confirm with the user before approving.

## 4. Iterate — don't assume

If a migration looks risky but might be running on a known-small table, or the operation might be deliberately expensive because it's a one-off maintenance migration, **ask before flagging CRITICAL**. Batch questions.

## 5. Output format

### CRITICAL (will cause an outage or data loss)
Table-locking operations on large tables, missing `CONCURRENTLY`, destructive statements without confirmation, non-reversible down migrations.

### HIGH (likely to cause problems)
Non-batched backfills, non-idempotent data changes, missing indexes the new code will need.

### MEDIUM (worth fixing but won't break prod)
Style, naming, unclear column comments, missing `created_at`/`updated_at` on new tables.

### NOTES
Anything informational — e.g. "this migration depends on migration X shipping first."

End with a verdict: `Safe to ship`, `Safe after CRITICAL addressed`, or `Hold — needs rework`.

---
name: api-breaking-change-check
description: Scan the current diff for changes that would break API consumers. Use when the user asks to "check for breaking changes", "any breaking API changes", "will this break the frontend", "is this backwards compatible", or before publishing a new version. Detects removed/renamed routes, removed/renamed response fields, narrowed types (optional→required, widened→narrowed enums), changed status codes, changed auth requirements, and GraphQL schema changes. Outputs a list of breaks with severity and migration path for consumers.
targets: [claude, cursor, codex]
---

# API Breaking-Change Check

You are scanning the diff between the current branch and the target branch for changes that would break any consumer of this API. Consumers include: the team's frontend, other internal services, external partners, SDKs, and integration tests.

## 1. Establish scope

1. Run `git diff <target>...HEAD --name-only` and identify API-surface files:
   - Controllers / route handlers (`*.controller.ts`, `routes/*.ts`, `handlers/*.go`, etc.).
   - Response DTOs / response schemas.
   - OpenAPI / Swagger definitions.
   - GraphQL schema files (`*.graphql`, `schema.ts`).
   - Event / message contracts if the system publishes events.
2. Ignore internal-only files (services, repositories, migrations) — those don't affect consumers directly.

## 2. What counts as breaking

### Route-level (CRITICAL)
- Route removed.
- Route renamed (different path or method).
- Required auth changed (was public → now requires auth, or scope narrowed).
- Required headers / query params added.
- Status code semantics changed (e.g. was `200` on empty → now `404`).

### Payload-level (CRITICAL)
- Response field removed or renamed.
- Response field type narrowed (`string | null` → `string`; enum `[a, b, c]` → `[a, b]`).
- Request field became required (optional → required).
- Request field type narrowed.

### Behavior-level (HIGH)
- Default value changed (consumers relying on the old default will silently break).
- Pagination semantics changed (cursor vs offset, default page size).
- Error shape changed.
- Rate limit tightened.

### GraphQL-specific
- Field removed from a type (CRITICAL).
- Field made non-nullable when clients might have sent null (CRITICAL for input types).
- Enum value removed (CRITICAL).
- Argument added as required (CRITICAL for mutations).

## 3. Verify, don't assume

- A field that looks removed may have been moved to a different response wrapper — search the diff for the field name before flagging.
- A new required field may have a server-side default that makes it safe — check the service layer.
- An SDK or frontend consumer may already be updated in the same branch (monorepo) — check for matching consumer updates.

If unsure, ask one targeted question rather than flagging a false positive.

## 4. Output format

For each break:
```
[SEVERITY] <path>:<line> — <short description>
  Consumer impact: <who breaks, what they see>
  Migration: <what consumers need to do, or what this branch should do to stay compatible>
```

Group by severity: CRITICAL, HIGH, NOTES.

End with either `No breaking changes detected` or a one-line summary: `N critical + M high breaks — coordinate with <consumer> before deploy`.

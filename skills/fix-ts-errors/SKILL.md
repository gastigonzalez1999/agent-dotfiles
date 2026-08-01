---
name: fix-ts-errors
description: "DEPRECATED — use inner-loop instead, which runs this repo's own typecheck command from .agent/loop.json rather than assuming `tsc --noEmit`."
---

> **Deprecated.** Superseded by `inner-loop`. The TypeScript-specific fixes moved
> to `inner-loop/references/nestjs-next-fixes.md`. Kept only for reference;
> safe to delete.

# Fix TypeScript Errors

Systematically fix all TypeScript compilation errors to zero.

## Process

1. **Run tsc** to get the full error list:
   ```bash
   npx tsc --noEmit 2>&1
   ```
   If in a monorepo, run from each app directory (`apps/api`, `apps/web`).

2. **Group errors by type** before fixing:
   - `strictPropertyInitialization` — add `!` to DTO/class properties
   - `Type 'null' is not assignable` — use `?? undefined` or conditional
   - `Property does not exist` — check Prisma types or add to interface
   - `Argument of type X is not assignable` — check function signature
   - `Object is possibly undefined` — add null check or `!` assertion
   - `no-floating-promises` — add `void` or `await`

3. **Fix in parallel** — read all affected files at once, fix all at once.

4. **Re-run tsc** to verify zero errors. If new errors appear, repeat.

## Common NestJS/Prisma patterns

- **Prisma nullable JSON**: cast via `as Prisma.InputJsonValue` or `?? Prisma.JsonNull`
- **Prisma `null` vs `undefined`**: use `findFirst` instead of `findUnique` when compound key has nullable fields
- **NestJS TRANSIENT providers**: don't use `app.get()` for TRANSIENT-scoped providers in `main.ts`
- **DTO strict init**: all `@IsString()` etc. properties need `!` — `name!: string`
- **ESLint `no-floating-promises`**: prefix with `void` for intentional fire-and-forget, or add `await`

## Do not

- Do not use `as any` to suppress errors — fix the actual type
- Do not disable `strict` in tsconfig — find the correct type
- Do not add `// @ts-ignore` — only use `// @ts-expect-error` with a comment explaining why

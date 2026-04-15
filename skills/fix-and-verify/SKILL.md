---
name: fix-and-verify
description: Run tsc + jest + eslint, fix ALL failures, then re-run everything to confirm fully green. Use at the end of a feature build or before creating a PR.
---

# Fix and Verify

Run the full quality suite, fix everything, and confirm green before a PR.

## Step 1 — Run all checks in parallel

```bash
# In monorepo root or per-app:
npx tsc --noEmit 2>&1          # TypeScript
npm test -- --passWithNoTests  # Jest
npm run lint 2>&1              # ESLint
```

Capture all output. Do not fix yet — get the full picture first.

## Step 2 — Fix TypeScript errors

See `/fix-ts-errors` for the systematic approach. Key patterns:
- DTO `strictPropertyInitialization`: add `!`
- Prisma nullable JSON: use `?? Prisma.JsonNull` or `as Prisma.InputJsonValue`
- NestJS TRANSIENT scope: don't `app.get()` transient providers in `main.ts`

## Step 3 — Fix test failures

Common causes:
- Mock not set up for new method → add `jest.fn()` to the mock object
- Service changed signature → update test expectations
- Missing `@Module` provider → add to test module's `providers` array
- Async not awaited → add `await` to the test call

## Step 4 — Fix ESLint

- `no-floating-promises`: prefix with `void` or add `await`
- `@typescript-eslint/no-unused-vars`: prefix with `_` or remove
- `prefer-promise-reject-errors`: wrap with `new Error(...)`
- React async event handlers falsely flagged: disable rule inline with comment

## Step 5 — Re-run everything

```bash
npx tsc --noEmit && npm test && npm run lint && echo "ALL GREEN"
```

Must see "ALL GREEN" before declaring done.

## Step 6 — Build check (optional but recommended before PR)

```bash
cd apps/api && nest build && cd ../web && next build
```

## Report format

| Check | Before | After |
|---|---|---|
| TypeScript | 12 errors | 0 errors |
| Tests | 3 failing | 68/68 passing |
| ESLint | 8 warnings | 0 warnings |
| API build | Failed | Success |
| Web build | Failed | Success |

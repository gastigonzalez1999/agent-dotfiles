---
name: typescript
description: >-
  Typing strategies, refactors, compiler options, and library authoring in TypeScript. Use when wrestling with types or configuring tsconfig.
targets: [cursor]
---

# TypeScript

## When to use

- Typing strategies, refactors, compiler options, or library authoring in TypeScript.
- Reducing `any`, narrowing types, or fixing complex generic errors.

## Steps

1. Align **`strict`** options with the team; enable incrementally if strict mode is new.
2. Prefer **explicit types** at public boundaries; infer locally where obvious.
3. Use **narrowing** (`typeof`, discriminated unions, guards) instead of assertions.
4. Model **nullability** honestly; avoid `!` unless invariant is proven.
5. For generics, **constrain** type parameters; avoid overly complex conditional types unless shared.
6. Keep **module resolution** and `paths` consistent between build, test, and tooling.
7. When upgrading TS, read release notes; fix breaks in small commits; run `tsc` and tests.
8. For shared libs, ship **`.d.ts`** and document required peer dependencies.

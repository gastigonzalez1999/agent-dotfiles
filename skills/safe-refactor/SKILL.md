---
name: safe-refactor
description: >-
  Restructure code without changing behavior — characterize first, then move in small verified steps. Use when refactoring code with weak test coverage.
targets: [cursor]
---

# Safe refactor

## When to use

- Restructuring code without intended behavior change.
- Renaming across modules, extracting functions, or splitting files.

## Steps

1. State the current behavior in one sentence and how you will verify it (tests, key command, manual check).
2. Ensure a baseline: run tests or the smoke command before edits; fix unrelated failures separately.
3. Make the smallest mechanical change that moves structure without changing logic (move, rename, extract).
4. Run the same verification after each logical step; stop if behavior drifts.
5. Prefer compiler/types/tests to catch mistakes before broad edits.
6. Avoid mixing refactors with feature work in the same commit when possible.
7. If you must touch behavior-sensitive code, add or tighten a test around the edge case first.
8. Document public API or config changes only when they are real contract changes, not internal moves.

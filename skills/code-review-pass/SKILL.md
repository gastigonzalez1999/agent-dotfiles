---
name: code-review-pass
description: >-
  Review a PR, diff, or recent commit before merge — correctness, security, tests, and regressions. Use when asked to review changes or to self-review a branch before opening a PR.
targets: [cursor]
---

# Code review pass

## When to use

- Reviewing a PR, diff, or recent commit before merge.
- The user asks for a quick quality or risk check.

## Steps

1. Identify the change’s goal and surface area (files, public APIs, migrations).
2. Check correctness: edge cases, null/empty paths, error handling, concurrency or async pitfalls.
3. Check security: secrets, injection, authz, unsafe deserialization, logging of sensitive data.
4. Check maintainability: naming, duplication, surprising side effects, test coverage for new logic.
5. Check performance only when the path is hot or obviously expensive.
6. Separate must-fix from nice-to-have; order feedback by severity.
7. Suggest concrete fixes or patches when a change is small; avoid vague style debates.
8. Note missing tests when behavior changed or risk is non-obvious.

---
name: pre-edit-context
description: >-
  Build enough repository context to edit safely before changing unfamiliar code.
  Use when the task touches unknown modules, large files, or cross-cutting behavior.
targets: [claude, cursor, codex]
---

# Pre-edit context

## When to use

- You are about to change code you have not read end-to-end
- The request spans multiple packages, layers, or services
- Symptoms point to integration or configuration rather than a single obvious line

## Steps

1. Identify the entry points (routes, jobs, CLI, tests) most relevant to the request.
2. Search for symbols and strings tied to the behavior instead of guessing filenames.
3. Open the defining file and immediate callers; note data flow and side effects.
4. Check existing tests or scripts that encode expected behavior for the same path.
5. Note required env vars, feature flags, or external services touched by this code.
6. Decide the smallest surface to change and what must stay compatible.
7. Proceed with edits only after this map matches what the user asked to achieve.

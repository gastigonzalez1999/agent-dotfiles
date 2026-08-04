---
name: test-gaps
description: >-
  Find untested code paths in a module or file and write the missing tests. Use when the user asks what is not tested, wants to find missing tests, or wants to improve coverage on a specific area.
targets: [claude, cursor, codex]
---

# Skill: test-gaps

Find untested code paths in a module or file and write the missing tests.

## Trigger

`/test-gaps` or when user says "what's not tested", "find missing tests", "improve test coverage".

## Steps

**1. Identify scope**

If the user names a file or module, work on that. Otherwise ask:
"Which file or module should I analyse? (or say 'all' for the whole codebase)"

**2. Read the implementation**

Read the target file(s) fully. Map every code path:
- Each function / method
- Each conditional branch (if/else, ternary, switch arm)
- Each error path (try/catch, null return, thrown exception)
- Each guard clause

**3. Read the existing tests**

Find the matching spec file(s). For each code path from step 2, mark it:
- ✅ Covered — a test exercises this path and makes a meaningful assertion
- ⚠️ Thin — a test reaches this path but only asserts "it didn't throw" or ignores the return value
- ❌ Missing — no test reaches this path at all

**4. Write the missing tests**

For each ❌ or ⚠️ path, write a test in the project's existing test style (Jest/Vitest/RTL/Supertest — match what's already there). Rules:

- One clear `it('...')` per behaviour, not per function
- Use the same fixture/mock patterns already in the file — don't introduce new patterns
- Assert on specifics: the exact return value, the exact thrown message, the exact HTTP status
- Name the test so a failing output tells you exactly what broke

Add the tests to the existing spec file. Do not create new spec files unless none exists.

**5. Report**

List what was added. If coverage was already complete, say so. Flag any paths that are genuinely hard to test (e.g. OS-level errors, third-party failures) and explain why rather than writing a fragile test.

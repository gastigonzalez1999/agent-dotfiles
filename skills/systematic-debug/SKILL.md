---
name: systematic-debug
description: >-
  Debug methodically when a test fails or behavior contradicts expectations — reproduce, isolate, form and test hypotheses. Use instead of guessing at fixes.
targets: [cursor]
---

# Systematic debug

## When to use

- A test fails, production/local behavior is wrong, or output contradicts expectations.
- You have seen one error but not confirmed root cause, or fixes have been guessy.

## Steps

1. Reproduce reliably with the smallest command or path (one test, one script, one URL).
2. Capture the full error: message, stack trace, exit code, and last successful step.
3. Form a hypothesis tied to one subsystem (config, dependency, code path, data).
4. Read only the code and config needed to validate or falsify that hypothesis.
5. Use logging or temporary inspection at the boundary you suspect—not scattered prints.
6. Change one variable at a time (version, flag, input) between attempts.
7. After a fix, rerun the same reproduction; add or adjust a test if regressions are likely.
8. If the issue spans layers, verify contracts (types, schemas, API shapes) before deep debugging.

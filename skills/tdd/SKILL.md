---
name: tdd
description: >-
  Implement or change behavior test-first via red-green-refactor. Use when regressions are costly or the design is still unclear.
targets: [cursor]
---

# Test-driven development

## When to use

- Implementing or changing behavior where regressions are costly.
- The user wants red–green–refactor or tests before implementation.

## Steps

1. Agree on the **smallest behavior slice** to implement next (one function, one rule, one endpoint).
2. Write a **failing test** that expresses desired behavior and fails for the right reason.
3. Run tests; confirm the new test fails and nothing else breaks unexpectedly.
4. Write the **minimal code** to pass the test; avoid extra features in the same step.
5. Run tests; **green** only—if flaky, stabilize before refactoring.
6. **Refactor** with tests green; keep behavior unchanged; run tests after each safe step.
7. Repeat for the next slice; avoid writing large untested chunks.
8. Add integration or contract tests when behavior crosses module boundaries.
9. When tests fight the design, adjust design in small steps rather than disabling tests.

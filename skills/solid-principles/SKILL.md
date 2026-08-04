---
name: solid-principles
description: >-
  Review or refactor object-oriented modules against SOLID for maintainability and safe extension. Use when a class is hard to change or a design review calls for it.
targets: [claude, cursor, codex]
---

# SOLID principles

## When to use

- Reviewing or refactoring object-oriented modules for maintainability and safe extension.
- Teaching or applying design discipline in class-based or interface-heavy codebases.

## Steps

1. **S**ingle responsibility: one reason to change per module; split when responsibilities diverge.
2. **O**pen/closed: extend behavior via new types/strategies; avoid editing stable core logic repeatedly.
3. **L**iskov substitution: subtypes must honor contracts; avoid throwing new surprises to callers.
4. **I**nterface segregation: small, focused interfaces; clients should not depend on unused methods.
5. **D**ependency inversion: depend on abstractions at boundaries; wire concrete implementations in composition roots.
6. Prefer **composition** over deep inheritance hierarchies unless the domain is truly hierarchical.
7. Apply pragmatically—avoid interfaces-for-everything when YAGNI applies; measure pain before abstracting.
8. Pair SOLID with **tests** so refactors stay safe.

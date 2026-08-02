---
name: clean-architecture
description: >-
  Structure an application so business rules stay independent of frameworks, databases, and delivery mechanisms. Use when deciding layer boundaries or untangling framework code from domain logic.
targets: [cursor]
---

# Clean architecture

## When to use

- Structuring apps so business rules stay independent of frameworks and delivery mechanisms.
- Reducing coupling to databases, HTTP frameworks, or UI libraries.

## Steps

1. Place **entities** and **use cases** at the center; depend inward only (interfaces toward outer layers).
2. Define **ports** (interfaces) for persistence, messaging, and external APIs at use-case boundaries.
3. Implement **adapters** in outer layers: HTTP controllers map DTOs ↔ use case inputs/outputs.
4. Keep **framework code** out of domain and use case layers (no ORM models leaking inward without mapping).
5. Pass **plain data** across boundaries (structs/DTOs); avoid passing ORM sessions or request contexts inward.
6. Test **use cases** with in-memory or fake adapters; integration-test adapters separately.
7. When adding features, start from a use case + tests, then wire delivery and persistence.
8. Refactor toward boundaries when layers blur—extract mappers and anti-corruption layers early.

---
name: apply-ddd
description: >-
  Model complex domains with domain-driven design — bounded contexts, aggregates, ubiquitous language, consistency rules. Use when the domain is nontrivial and the terminology keeps slipping.
targets: [cursor]
---

# Apply DDD (domain-driven design)

## When to use

- Modeling complex domains where language, boundaries, and consistency rules matter.
- Splitting monoliths or aligning teams around cohesive subdomains.

## Steps

1. Capture **ubiquitous language** with stakeholders; name concepts consistently in code and docs.
2. Identify **subdomains** (core, supporting, generic) and prioritize investment accordingly.
3. Draw **bounded contexts**; define integration patterns (partnership, ACL, open host) between them.
4. Model **aggregates** with clear invariants; choose roots and transaction boundaries carefully.
5. Prefer **domain events** for cross-aggregate workflows; keep handlers idempotent where possible.
6. Isolate **domain** from infrastructure via ports/adapters; keep frameworks at the edges.
7. Iterate: start with a walking skeleton; evolve the model as understanding improves—avoid upfront over-modeling.
8. Document **context maps** when multiple teams or services interact.

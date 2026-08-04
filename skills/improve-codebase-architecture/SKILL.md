---
name: improve-codebase-architecture
description: >-
  Audit a codebase for structural improvement opportunities before a large refactor. Use when planning a refactor and you need to know where the real problems are.
targets: [cursor]
---

# Improve codebase architecture

## When to use

- Auditing a codebase for structural improvement opportunities before a big refactor.
- Onboarding, tech debt review, or planning a modularization effort.

## Steps

1. Map **entry points** (CLI, HTTP, workers) and **major modules**; note dependency direction.
2. Identify **bounded contexts** or layers; flag cycles, god modules, and leaking infrastructure.
3. List **pain signals**: repeated changes across many files, slow tests, flaky integration, deploy coupling.
4. Separate **problems** from **symptoms**; prioritize by risk, frequency, and cost of change.
5. Propose **incremental** moves (extract boundaries, introduce interfaces, split packages) with ordering.
6. For each proposal, define **success metrics** (build time, test speed, change count) and **rollback**.
7. Avoid big-bang rewrites; tie each step to a deliverable or milestone.
8. Document decisions in ADR-style notes when boundaries or contracts change.

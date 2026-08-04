---
name: dependency-update
description: >-
  Bump packages, frameworks, or runtime versions safely — read changelogs, stage majors separately, verify after each step. Use when updating dependencies or resolving a version conflict.
targets: [cursor]
---

# Dependency update

## When to use

- Bumping packages, frameworks, or runtime versions.
- Fixing CVEs, resolving peer conflicts, or unblocking installs.

## Steps

1. Detect the ecosystem lockfile and package manager (`package-lock.json`, `pnpm-lock.yaml`, `Cargo.lock`, `uv.lock`, etc.).
2. Read release notes or changelogs for **major** jumps; note breaking API renames.
3. Prefer one coherent bump (or a minimal set) over upgrading everything at once unless policy says otherwise.
4. Apply updates; run install with a clean error log; fix resolution or peer issues before app code.
5. Run the project’s standard checks: format, lint, typecheck, unit tests.
6. For apps with a build step, run production build once after major upgrades.
7. If something breaks, bisect: revert last dependency batch, then re-add one package at a time.
8. Commit lockfile changes together with any required code migrations in the same change set.

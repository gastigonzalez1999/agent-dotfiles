---
name: build-backend-phases
description: Execute a multi-phase backend build plan: read the plan file, generate all files in parallel batches, run tsc after each phase, and verify tests pass at the end. Use when building out a large NestJS backend from a plan.
targets: [claude, cursor, codex]
---

# Build Backend Phases

Execute a large NestJS backend build systematically using parallel agents.

## Process

### 1. Read the plan
Look for a plan file: `PLAN.md`, `plan.md`, `.claude/plan.md`, or ask the user where it is.

Extract the phases, what files each phase creates, and their dependencies.

### 2. Execute phases with parallel agents

For each phase (or group of independent phases), spawn parallel agents:

```
Phase 1: monorepo root → Phase 2: shared types → Phase 3+: parallel modules
```

Each agent should:
- Create all files for its phase
- Not move on until tsc passes for its scope
- Report what it created

### 3. After all phases

Run the full verification sequence:
```bash
npx tsc --noEmit                    # in apps/api
npx tsc --noEmit                    # in apps/web  
npm test                            # all suites
npm run lint                        # ESLint
nest build                          # confirm compilable
next build                          # confirm compilable
```

### 4. Fix any errors before declaring done

Use the `inner-loop` skill for any TypeScript failures — it runs this repo's own typecheck from `.agent/loop.json`.

## Parallel agent strategy

Group phases by dependency:
- **Wave 1** (independent): monorepo config, shared types
- **Wave 2** (depends on Wave 1): DB schema, config module, logging
- **Wave 3** (depends on Wave 2): auth, RBAC, tenancy (can be parallel)
- **Wave 4** (depends on Wave 3): feature modules (all parallel)
- **Wave 5**: frontend (can start once API types are done)

## Quality gates per phase

- Each phase: `tsc --noEmit` must pass before next phase begins
- After all phases: full test suite green
- Final: both apps build successfully

## What to report

After completion, report:
- Total files created
- Test results (X/Y passing)
- Build status (api: ✓, web: ✓)
- Any remaining TODOs

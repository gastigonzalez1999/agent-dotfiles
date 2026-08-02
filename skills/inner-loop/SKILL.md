---
name: inner-loop
description: Verify your own work and iterate to green using this repo's .agent/loop.json contract. Use after any non-trivial edit, and always before declaring work done. Stack-agnostic — reads the repo's own commands rather than assuming a stack.
targets: [claude, cursor, codex]
---

# Inner loop

Edit → verify → read the failure → fix the cause → verify again. You run this yourself; nobody prompts you through it.

## Running the loop

```bash
loop fast     # seconds — after an edit
loop test     # ~minutes — after a unit of work
loop full     # everything — before you say the work is done
```

`loop` resolves in this order — use the first that exists:

1. `./node_modules/.bin/loop`
2. `node ~/.claude/loop/loop.mjs`
3. `npx -y github:gastigonzalez1999/agent-dotfiles loop`

Exit codes: **0** green · **1** a check failed · **2** configuration or environment problem.

If there is no `.agent/loop.json`, stop and run the `loop-init` skill first. Do not invent commands — a guessed `npm test` that does not exist here is worse than no gate.

## Which tier, when

| Situation | Tier |
|---|---|
| Just edited a file, mid-task | `fast` |
| Finished a coherent unit of work | `test` |
| About to report the work is done, or open a PR | `full` |
| Something is broken and you don't know why | `loop doctor` first — services may be down |

`fast` stops at the first failure on purpose: the point is the shortest path from edit to signal. `test` and `full` run everything so you get one complete list to fix in one pass — do not fix after the first failure in those tiers, read them all first.

## Reading a failure

1. **Read the first error, not the last.** Compilers cascade: one bad type produces twelve downstream errors. Fix the first and the rest usually vanish.
2. **Full output is in `.agent/.loop-last.json`** when the console excerpt is truncated. Read it rather than re-running the command by hand.
3. **Exit code 2 is not a code problem.** It means the contract is broken or dependencies are not installed. Fix the environment; do not edit source.
4. **A `timed out` check is a hang, not a failure.** Usually a watcher (`vitest` without `run`, `jest --watch`) wired into a gate. Fix the contract.

## Iterating

- Fix the **cause**, not the symptom. Casting to `any`, adding `@ts-expect-error`, or loosening an assertion to make a check pass is not a fix — it moves the failure into production.
- Re-run the **same tier** after fixing. Do not jump to `full` to "check everything" mid-loop; you will wait minutes for information you already have.
- Never edit a test so it matches broken behaviour. If the test is genuinely wrong, say so explicitly and explain why before changing it.

## The budget

`budget.maxIterations` in the contract (default 5) is the number of fix-and-rerun cycles you may burn on one gate.

When you hit it, **stop and escalate**. Report:
- which check is failing and its fingerprint
- what you tried, and what each attempt changed
- your current best hypothesis

Thrashing past the budget wastes time and usually means the problem is a wrong assumption, not a missing fix.

## Before you say "done"

`loop full` must exit 0. Not "tests pass" — the whole gate.

If a check is genuinely irrelevant to this change and you are skipping it deliberately, say so out loud with the reason. Silence reads as green, and a Stop hook may block you anyway.

## Stack-specific fixes

See `references/nestjs-next-fixes.md` for the recurring NestJS + Next + Prisma + TypeORM failures in this stack and their real causes.

---
name: loop-autonomous
description: Grind unattended toward a goal until a machine-checkable stop condition is met. Use when the user states a goal once and does not want to babysit the iterations — "get the tests passing", "make the build green", "fix all the type errors".
targets: [claude, cursor, codex]
---

# Autonomous loop

The user states the goal once. You iterate without being prompted again, and stop on a condition a machine can evaluate — not on your own judgement that things look fine.

## Refuse to start without these three

**1. An explicit goal.** One sentence, from the user, not inferred.

**2. A machine-checkable stop condition.** A command with an exit code:

| Good | Why |
|---|---|
| `loop full` exits 0 | Unambiguous |
| `npm test -- path/to/x.spec.ts` exits 0 | Scoped and checkable |
| `loop fast` exits 0 with zero `TS2304` in history | Checkable |

| Bad | Why |
|---|---|
| "until the code is clean" | You will decide you are done whenever you get tired |
| "until it works" | Works how? Checked by what? |
| "improve performance" | No exit code |

If the goal has no checkable condition, **stop and ask for one**. An autonomous loop with a subjective stop condition does not terminate — it drifts until it runs out of budget, and everything it did after the halfway point is unreviewed.

**3. A budget.** Iterations and wall-clock. Default to `budget.maxIterations` from `.agent/loop.json` (5) unless the user names a bigger number. Say the budget out loud before starting.

## Running it

Do the work in the normal inner loop — edit, `loop fast`, fix, repeat. The autonomous part is that you do not stop to report between iterations.

For genuinely long-running or scheduled work, use Claude Code's `/loop` with an explicit stop instruction:

```
/loop run `loop full`; if it exits 0 stop; otherwise fix the first failure and continue
```

Each iteration must: run the check, read the failure, make **one** targeted change, re-check. Not: make ten speculative changes and hope.

## Stopping

Stop and report on **any** of these — whichever comes first:

- The stop condition is met. Report what you changed and confirm the check passes.
- The budget is spent. Report where you got to, not just that you ran out.
- **The same failure fingerprint appears three times in a row.** You are not converging. `loop report` shows the fingerprint. Stop; the problem is a wrong assumption, and more iterations will not find it.
- A fix would require a decision the user has not delegated — changing an API contract, deleting a test, adding a dependency, touching auth or payments, altering a migration.
- You are about to weaken a check to make it pass. That is never a solution; it is the loop cheating its own stop condition.

## Report when you finish

- Goal, and whether the stop condition was actually met
- Iterations used against the budget
- What changed, as a summary rather than a diff
- **What you did not verify** — this matters most, because nobody watched the middle of the run

## What this is not

This pursues a goal you gave it. It does not decide what to work on, pick up unrelated problems it notices, or expand scope because something nearby looked wrong. Note those and report them; do not fix them.

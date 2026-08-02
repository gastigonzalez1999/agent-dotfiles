---
name: outer-loop
description: The macro cycle for non-trivial work — understand, plan, implement, verify, review, hand off. Use at the start of a feature, refactor, or anything spanning more than a couple of files. Sequences existing skills rather than replacing them.
targets: [claude, cursor, codex]
---

# Outer loop

The inner loop keeps a single change correct. This one keeps the *work* correct.

Every station has an exit condition. Do not advance until it is met, and do not skip stations because the task "feels small" — small tasks exit each station in seconds.

## 1. Understand

Read before writing. Trace the actual code path, not the one you assume exists.

- `codegraph_explore` for how a system hangs together; `codegraph_impact` for what a change would break
- Existing `CLAUDE.md` / `AGENTS.md` / `CONTEXT.md`

**Exit when:** you can name the files that will change and why.

## 2. Sharpen

Only for work that is ambiguous, architectural, or that you are about to spend hours on.

- `grilling` — stress-test the approach before building it
- `domain-modeling` — when the terminology is fuzzy or the model is contested
- `write-a-prd` — when scope is unclear

**Exit when:** you can state the goal as something checkable.

## 3. Plan

State the steps and the verification for each. For anything touching more than two or three files, get sign-off before writing code.

**Exit when:** every step has a check that would tell you it worked.

## 4. Implement

- `tdd` when the behaviour is specifiable up front
- Smallest coherent change per iteration
- Run `loop fast` as you go — that is the inner loop, not a separate phase

**Exit when:** the change is complete and `loop test` is green.

## 5. Verify

`loop full` must exit 0. See the `inner-loop` skill for reading failures and iterating.

For user-visible behaviour, tests are not sufficient — run it. `browser-use` for UI, `loop doctor` when services are involved.

**Exit when:** `loop full` is green *and* you have seen the behaviour work, not just the tests pass.

## 6. Review

Verified is not the same as good. Green tests say nothing about whether the design is sound.

- `code-review` — standards and spec
- `senior-reviewer` — bugs, regressions, security
- `simplify` — when the diff grew larger than the problem
- `thermo-nuclear-code-quality-review` — when maintainability is the actual concern

**Exit when:** review findings are fixed or explicitly accepted with a reason.

## 7. Hand off

- `session-handoff` when work continues in another session
- Say what you did, what you verified, and **what you did not verify**

**Exit when:** someone else could pick this up from your summary alone.

## Where the loop closes

If step 5 or 6 sends you back, you go back to **3 or 4** — not to 1. Re-planning from scratch on every failed check is its own kind of thrashing.

If you go around twice on the same failure, the problem is upstream: you misunderstood something in step 1. Go back there instead of trying harder in step 4.

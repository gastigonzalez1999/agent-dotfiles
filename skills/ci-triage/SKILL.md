---
name: ci-triage
description: >-
  Diagnose a failing CI run and drive it back to green — pull the failed logs, classify the failure
  as flaky, environmental or real, fix it, and re-verify. Use when a build or workflow fails, when
  the user pastes a CI log, or says "ci is failing", "the build failed", "tests failed on the PR".
targets: [claude, cursor, codex]
---

# CI triage

Fetch the logs yourself. A pasted excerpt is almost always the summary line
rather than the cause, and the cause is usually a few hundred lines above it.

---

## Step 1 — Get the actual failure

```bash
gh run list --limit 5                       # find the run
gh run view <run-id>                        # which jobs failed
gh run view <run-id> --log-failed           # only the failed steps
```

For a PR:

```bash
gh pr checks <n>
gh run view --job <job-id> --log-failed
```

`--log-failed` is the important flag. The full log is mostly setup noise.

If `gh` is unavailable and the user pasted a log, work from that — but say which
parts you could not see.

## Step 2 — Find the first real error

Scroll to the **first** error, not the last. Later errors are usually
consequences: one failed compile produces dozens of downstream failures, and
fixing the last one fixes nothing.

Skip past:
- dependency install warnings and deprecation notices,
- the summary block at the end (`3 failed, 12 passed`) — it names what failed,
  not why,
- stack frames inside `node_modules` — find the frame in your own code.

## Step 3 — Classify

The fix depends entirely on which of these it is.

**Real failure** — the code is wrong. The test asserts something the change
broke, or the type genuinely does not check. Most common, and the only one where
the fix is in the source.

**Environmental** — passes locally, fails in CI. Look for:
- a missing secret or env var (CI has no `.env`),
- a service the workflow does not start (database, redis) that local dev does,
- a Node/toolchain version difference — compare the workflow's version with the
  local one and with `package.json` `engines`,
- a case-sensitive path. Linux CI fails on an import that Windows and macOS
  resolve,
- a missing build step — CI builds from clean, so a stale local `dist/` can hide
  a broken build,
- CRLF vs LF on a checked-in script.

**Flaky** — passes on re-run with no change. Timing, ordering, shared fixture
state, a real network call in a test. Re-run once to confirm:

```bash
gh run rerun <run-id> --failed
```

If it goes green, it is flaky. **Do not stop there** — record it. A flaky test
that nobody fixes trains everyone to ignore red CI, and then a real failure gets
ignored too. Open an issue or note it in the PR.

**Infrastructure** — the runner died, a registry timed out, a rate limit.
Nothing to fix; re-run.

## Step 4 — Reproduce locally

Faster than pushing to find out:

```bash
node ~/.claude/loop/loop.mjs full
```

If the gate is green locally but red in CI, it is environmental — go back to
that list. The difference between the two environments *is* the bug.

For a workflow-specific step, run the exact command from the workflow YAML
rather than the local shorthand. `npm test` and the CI invocation often differ
in flags.

## Step 5 — Fix and verify

Fix the cause, not the symptom:

- Do not add a retry to make a flaky test pass. Find the shared state.
- Do not loosen an assertion to make a real failure go away.
- Do not add `continue-on-error` to a workflow step. That deletes the signal.
- Do not pin a dependency to dodge a real break without saying so.

Then re-verify properly: green gate locally, push, and watch the run finish.
"It should pass now" is not verification.

```bash
gh pr checks --watch
```

## Step 6 — Report

State the classification, the cause in one sentence, the fix, and the evidence
it is green. If it was flaky and you re-ran rather than fixed it, say that
plainly — it is a deferred problem, not a resolved one.

## Recurring failures

If the same job fails repeatedly across PRs, stop fixing it per-PR and fix the
workflow. Signals: a step that always needs a re-run, a test that fails only on
the first run of the day (cache), a job that fails only on `main` (missing
secret in a different environment).

Worth checking in the workflow file: does it run on the same Node version as
local, does it use a lockfile install (`npm ci`, `pnpm i --frozen-lockfile`),
does it cache correctly, and does it start every service the tests need.

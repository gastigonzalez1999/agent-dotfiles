---
name: pr-review
description: >-
  Self-review a branch diff before opening a pull request, catching what a reviewer would flag. Use when the user says "review my PR", "review before I push", or "check my diff".
targets: [claude, cursor, codex]
---

# Skill: pr-review

Self-review a branch diff before opening a pull request. Catches issues a reviewer would flag.

## Trigger

`/pr-review` or when user says "review my PR", "review before I push", "check my diff".

## Steps

**1. Get the diff**

```bash
git diff main...HEAD          # all changes vs base branch
git log main..HEAD --oneline  # commits on this branch
```

If the user names a specific file or directory, scope the diff there.

**2. Review across these dimensions (always run all)**

### Correctness
- Does the logic do what it says it does?
- Are edge cases handled (empty inputs, nulls, off-by-one)?
- Are error paths propagated correctly (no silently swallowed errors)?
- Are there any obvious bugs or logic inversions?

### Security
- Are all external inputs validated/sanitized before use?
- Are there SQL injection, XSS, or path traversal risks?
- Are secrets/credentials absent from the diff?
- Does any new code bypass existing auth/authz checks?

### Tests
- Does every new behaviour have a corresponding test?
- Are happy path, error path, and edge cases covered?
- Do tests assert on specifics, not just "it didn't throw"?
- Are there tests that would catch a regression if the implementation changed?

### Maintainability
- Is the code readable without comments?
- Is there duplication that should be extracted?
- Are names accurate — do they match what the code actually does?
- Does the diff stay in scope (no unrelated cleanup mixed in)?

### API / interface contracts
- Are public interfaces backward-compatible (or is a breaking change intentional)?
- Are return types and error shapes consistent with the rest of the codebase?
- Are new env vars / config values documented in `.env.example` and README?

**3. Report findings**

Group by severity:

- **Must fix** — correctness bugs, security gaps, missing tests for changed behaviour
- **Should fix** — naming, duplication, unhandled edges that are likely
- **Consider** — style, cosmetic, low-risk tradeoffs (note, don't press)

One sentence per finding. Include file + line range. No findings = say so explicitly.

**4. Summary line**

End with: `Ready to merge / Needs fixes / Needs discussion` — one phrase, no hedging.

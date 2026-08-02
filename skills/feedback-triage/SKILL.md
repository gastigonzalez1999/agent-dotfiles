---
name: feedback-triage
description: >-
  Turn a raw stakeholder feedback dump — a message, a list, screenshots, a PDF — into deduplicated,
  classified, actionable items, plus a short reply to the sender. Use when someone shares client or
  teammate feedback, a list of reported bugs, or QA notes that need sorting before any work starts.
targets: [claude, cursor, codex]
---

# Feedback triage

Feedback arrives as prose, screenshots and PDFs, often mixing a real bug, a
design preference, a misunderstanding, and a new feature in one paragraph.
Sorting it before implementing is the whole job — half of what looks like a bug
list is not.

---

## Step 1 — Enumerate

Break the dump into **atomic items**, one observable claim each. A single
sentence often holds two.

Keep the sender's original wording verbatim alongside your restatement. When
feedback comes in another language, keep the original and add a translation —
do not replace it. Nuance ("no se ve bien" vs "no funciona") disappears in
translation and it is the difference between a styling tweak and an outage.

Number them. Everything downstream refers to these numbers, including the reply.

For screenshots and PDFs: read them, and describe what each shows next to the
item it supports. An item with no evidence attached is a report, not a
reproduction.

## Step 2 — Deduplicate against what is already known

Before anything is treated as new:

```bash
gh issue list --state all --limit 60 --search "<keywords>"
gh pr list --state all --limit 30 --search "<keywords>"
```

Also check whether it was **already fixed but not deployed** — a stakeholder
testing an old build reports fixed bugs. Compare the report's timestamp against
the last deploy:

```bash
git log --oneline -10 --date=short --pretty='%ad %s'
gh run list --workflow=<deploy> --limit 3
```

This single check resolves a surprising share of any feedback round. Say
explicitly when an item is "already fixed, awaiting deploy" — it needs a deploy,
not development.

## Step 3 — Classify

Each item gets exactly one:

| Class | Meaning | Goes to |
|---|---|---|
| **Bug** | Behavior contradicts intent. Reproducible. | Fix, with a test |
| **Design** | Works, looks or feels wrong | Needs a decision, then a fix |
| **Feature** | New capability, not a defect | Scope and schedule separately |
| **Misunderstanding** | Works as intended, was not understood | Reply, no code |
| **Duplicate** | Already tracked as #N | Link, drop |
| **Already fixed** | Fixed, not yet deployed | Deploy |
| **Needs info** | Cannot reproduce from what was given | Ask, specifically |

Do not silently upgrade a design preference into a bug, or downgrade a bug into
a preference. If a classification is genuinely ambiguous, mark it and ask —
guessing here produces work nobody wanted.

## Step 4 — Reproduce the bugs

An unreproduced bug is a rumour. For each item classified Bug, get to a concrete
repro before it is planned:

- the exact steps, the environment, and the account or role,
- whether it reproduces locally, on staging, and on production — they differ,
- the actual error, from the server log or browser console, not the symptom.

Use `browser-use` for UI reports and `diagnosing-bugs` for anything that does
not reproduce on the first attempt. Downgrade to **Needs info** what you cannot
reproduce, with the specific question that would unblock it — "what browser"
beats "can you give more detail".

## Step 5 — Prioritize

Order by user impact, not by effort or by the order they were written:

1. **Broken for everyone** — the flow does not complete, money is wrong, data is
   lost.
2. **Broken for some** — one role, one browser, one edge case.
3. **Visible and wrong** — works, but wrong or confusing.
4. **Polish** — the rest.

Note which items are cheap. A one-line fix in bucket 3 ships with bucket 1;
saying so lets the user decide.

## Step 6 — Two outputs

### The plan

A table: number, one-line restatement, class, priority, estimate, and where it
will be done (branch, PR, or issue). File the real bugs as issues with the repro
attached — use the `qa` skill, which already does that well.

### The reply

Short, in the sender's language, addressing every numbered item so nothing looks
ignored. For each: acknowledged and when, already fixed and pending deploy,
needs a decision from them, or works as intended and why.

Write it as a draft for the user to send. Do not send anything anywhere.

Say what you will not do and why — an unanswered item reads as agreement, and
that is how a "no" becomes a commitment nobody made. Keep it plain and free of
process language; the recipient wants to know whether their problem is being
handled.

## Rules

- Never commit to a date the user has not agreed to.
- Never quietly drop an item because it seems unreasonable — classify it and
  say so.
- Keep the original wording. When work starts weeks later, the paraphrase will
  have lost the detail that mattered.

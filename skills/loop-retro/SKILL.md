---
name: loop-retro
description: Turn accumulated loop history into rules. Runs unattended once a week per project; invoke manually to inspect what the loop has learned, audit an automated change, or undo one.
---

# Loop retro

Every gate run is recorded. Retro reads that history and writes what it can justify with evidence.

```bash
loop retro              # what it would change — writes nothing
loop retro --apply      # write and commit
loop retro --global     # patterns present in enough repos to belong in global rules
loop retro --log        # every automated change, with its evidence
loop retro --revert ID  # undo one change
```

This runs automatically at session start, throttled to once a week per project. You mostly invoke it by hand to **audit** it.

## What it may write, and where

| Finding | Change |
|---|---|
| A failure fingerprint recurring across days | A line in the managed block of `CLAUDE.md` / `AGENTS.md` |
| A `fast` check that has never failed in 20+ runs | Moved to the `test` tier in `.agent/loop.json` |
| Green regularly taking 5+ attempts | `budget.maxIterations` raised |

## The rules it plays by

- **Managed block only.** Everything it writes lives between `<!-- loop-retro:begin -->` and `<!-- loop-retro:end -->`. It never touches a byte outside those markers. Your hand-written docs are safe by construction, not by good behaviour.
- **Evidence or nothing.** 5+ occurrences across 2+ distinct days. Every entry carries its own evidence comment, so any rule can be traced back to the runs that produced it.
- **Capped at 40 lines.** When full, the weakest evidence is evicted. The block cannot grow until it poisons every future session's context.
- **Global needs 3 repos.** A gotcha seen in one project is a fact about that project, not a law.
- **Its own commits.** `chore(loop-retro): …`, committed with explicit paths so your unrelated work is never swept in. `git log --grep loop-retro` is the audit trail.

## Auditing it

Read the managed block in any project and ask whether each line earns its place. When one does not:

```bash
loop retro --log              # find the id
loop retro --revert a2416def  # undo it
```

If a rule is right but badly worded, **move it out of the block** and rewrite it in your own words. Retro only owns what is inside the markers — promoting a line out of the block is how a machine-generated observation becomes a real rule.

## Turning it off

- One repo: `"enforce": { "retro": "off" }` in `.agent/loop.json`
- Everywhere: `loop install-hooks` without `--with-retro` removes the SessionStart hook

## What it deliberately does not do

It does not read your source, judge your architecture, or write anything it cannot justify from run history. Findings that need judgement rather than counting belong to `auto-improve` — retro handles what is mechanical, and stays out of everything else.

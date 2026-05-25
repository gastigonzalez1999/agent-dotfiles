---
name: auto-improve
description: >-
  Review recent work for repeated manual workflows worth packaging into skills,
  subagents, or automations. Create only high-confidence missing items.
---

# Auto-improve

Look back over recent work from the last 30 days, or all available history if shorter, and identify repeated manual workflows worth packaging.

Use available evidence in this order:

1. Recent Codex sessions and task summaries.
2. Codex Memories and rollout summaries to find patterns repeated across sessions.
3. Chronicle, if enabled, to spot repeated work outside Codex. Use Chronicle for discovery only; confirm important details in the relevant source system when possible.
4. Existing skills, custom agents, and automations, so you reuse or extend what already exists instead of duplicating it.

Look broadly for work that is repeated, time-consuming, error-prone, context-heavy, or benefits from a consistent process. Include workflows across coding, research, writing, planning, communication, operations, analysis, and personal administration.

Only act on a candidate when it:

- occurred at least twice, or is clearly likely to recur and costly to repeat;
- has stable inputs, a repeatable procedure, and a clear output or stopping condition;
- would materially improve speed, quality, consistency, or reliability;
- is not already adequately covered.

Choose the smallest appropriate form:

- **Skill** — a reusable workflow or playbook.
- **Custom subagent** — a bounded specialist role or investigation task suitable for delegation.
- **Automation** — a scheduled or recurring check, report, reminder, or monitor.
- **Skip** — work that is too one-off, ambiguous, sensitive, or poorly evidenced to package.

## Steps

1. Gather evidence from the sources above (read existing skills in the dotfiles repos and project `.cursor/skills/` before proposing duplicates).
2. Produce a compact shortlist with: repeated workflow, supporting evidence and dates, frequency/confidence, recommended form (skill / subagent / automation / extend existing / skip), and why it is or is not worth creating.
3. Create only **high-confidence missing** items. Keep them narrow, practical, source-aware, and easy to validate. Do not create speculative, overlapping, or overly broad assets.
4. Update the appropriate dotfiles repo (`cursor-dotfiles` for Cursor toolkit, `agent-dotfiles` for Claude/Codex custom skills) and note install steps.
5. Finish with: what you created or extended; what you deliberately skipped; what needs more evidence before packaging.

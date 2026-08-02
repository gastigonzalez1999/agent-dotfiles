---
name: adr
description: >-
  Write an Architecture Decision Record capturing a technical decision, its context, the alternatives considered, and the consequences. Use when the user says "write an ADR", "document this decision", or "record this tradeoff".
targets: [claude, cursor, codex]
---

# Skill: adr

Write an Architecture Decision Record for a technical decision.

## Trigger

`/adr` or when user says "write an ADR", "document this decision", "record this tradeoff".

## Steps

**1. Gather context**

Ask (or infer from conversation):
- What is the decision? (one sentence)
- What alternatives were considered?
- What are the key constraints or requirements driving it?
- What are the known tradeoffs or downsides?
- Is this decision reversible? At what cost?

If this was discussed in the conversation, infer the answers — don't ask for things already stated.

**2. Find the next ADR number**

```bash
ls docs/adr/
```

Pick the next available four-digit number (e.g. `0009`).

**3. Write the ADR**

File: `docs/adr/<number>-<kebab-case-title>.md`

```markdown
# <number>. <Title>

**Date:** <today>
**Status:** Accepted

## Context

<2-4 sentences: the problem, the constraints, what would happen if we did nothing.>

## Decision

<1-2 sentences: what we decided and why it fits the constraints.>

## Alternatives considered

| Option | Why rejected |
|--------|-------------|
| <alt> | <reason> |

## Consequences

**Good:**
- <benefit>

**Bad / risks:**
- <tradeoff or downside>

**Reversibility:** <Easy / Hard / Irreversible — and why>
```

Keep it short. ADRs are read under time pressure. If the consequences section runs past 6 bullet points, the decision wasn't clearly scoped.

**4. Confirm**

Show the user the file path and a one-line summary. Ask if anything needs changing before committing.

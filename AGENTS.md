# Global Rules

See `CLAUDE.md` for full behavioral guidelines, tech stack, and skill triggers.

# qa

- **qa** (`skills/qa/SKILL.md`) — interactive QA session. Trigger: `/qa` or "QA session", "report a bug", "file an issue".

When triggered, load and follow the qa skill before doing anything else.

# domain-model

- **domain-model** (`skills/domain-model/SKILL.md`) — stress-test plans against the domain model. Trigger: `/domain-model` or "domain model session", "stress-test".

When triggered, load and follow the domain-model skill before doing anything else.

# auto-improve

- **auto-improve** (`skills/auto-improve/SKILL.md`) — package repeated workflows into skills/subagents. Trigger: `/auto-improve`.

When triggered, load and follow the auto-improve skill.

# browser-use

- **browser-use** (`skills/browser-use/SKILL.md`) — Chrome DevTools MCP (existing profile). Trigger: live UI proof, login-heavy browser checks.

When triggered, load and follow the browser-use skill.

# thermo-nuclear-code-quality-review

- **thermo-nuclear-code-quality-review** (`skills/thermo-nuclear-code-quality-review/SKILL.md`) — harsh maintainability audit. Trigger: `/thermo-nuclear-code-quality-review`.

When triggered, gather diff + changed files, then apply the skill rubric.

## Behavioral Rules

- Think before coding; state assumptions; ask when uncertain.
- Minimum code that solves the problem; no speculative abstractions.
- Surgical edits only; match existing style; remove orphans your changes created.
- Define verifiable success criteria and check them before finishing.
- When corrected, re-read the user's message and confirm before proceeding.
- When stuck, summarize attempts and ask for guidance.

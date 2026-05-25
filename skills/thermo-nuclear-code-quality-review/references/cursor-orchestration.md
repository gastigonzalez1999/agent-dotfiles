# Cursor orchestration (optional)

When the **cursor-team-kit** plugin is available, the parent agent can delegate collection then review:

1. In one message, run parallel shell/explore tasks to gather `git diff <base>...HEAD` and full contents of changed files (default base `main`).
2. Invoke a review pass with the full rubric in `SKILL.md` (or `subagent_type: thermo-nuclear-code-quality-review` when that agent exists).

If the plugin agent is unavailable, read and apply `SKILL.md` directly against the diff and file contents the parent provides.

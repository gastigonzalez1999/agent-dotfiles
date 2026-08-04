# Global Rules

See `CLAUDE.md` for full behavioral guidelines, tech stack, and skill triggers.

# day-to-day workflow

- **catch-up** (`skills/catch-up/SKILL.md`) — where the project stands, from git/PRs/CI. Trigger: "where do we stand", "what's next", "did we finish", resuming after a break.
- **ship-it** (`skills/ship-it/SKILL.md`) — commit → push → PR → CI → merge → rebase the stack. Trigger: "commit and push", "merge it when green", "rebase all of them".
- **ci-triage** (`skills/ci-triage/SKILL.md`) — diagnose a failing run and drive it green. Trigger: failing build, pasted CI log.
- **deploy-ops** (`skills/deploy-ops/SKILL.md`) — Railway/Vercel/Supabase env parity, auto-deploy, migrations, leaked secrets. Trigger: deploy setup or failure, prod ≠ local.
- **feedback-triage** (`skills/feedback-triage/SKILL.md`) — dedupe/classify a stakeholder feedback dump, draft the reply. Trigger: client feedback, reported-bug list.

Fetch the evidence before answering — never report project state, PR status, or a CI cause from memory.

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

## Cursor Cloud specific instructions

This repo is pure Bash install scripts + Markdown skills. There is no package manager, build step, or automated test suite, so the update script is a no-op. Required system tools (`bash`, `git`, `rsync`, `node`, `python3`, `awk`, `shellcheck`) are already present on the VM.

- **Lint**: `shellcheck install-claude.sh install-codex.sh statusline-command-mac.sh`. The only remaining finding is one intentional `SC2016` (info) on the instructional `echo` at the end of `install-claude.sh` — leave it.
- **Run the statusline app**: pipe Claude Code JSON into it, e.g. `echo '{"model":{"display_name":"Claude Opus 4.8"},"session_id":"s1","context_window":{"used_percentage":42},"cost":{"total_cost_usd":0.12}}' | bash statusline-command-mac.sh`. It uses `node` (not `jq`) to parse the JSON.
- **Run the Claude installer**: `bash install-claude.sh` writes to `$HOME/.claude` (statusline, `settings.json`, and skills). To test without touching your real config, set `HOME` to a temp dir first, e.g. `HOME=$(mktemp -d) bash install-claude.sh`.
- **Gotcha — installer needs `~/.claude` to pre-exist**: `install-claude.sh` copies the statusline + `settings.json` before it runs `mkdir -p` for the skills dir. On a brand-new `HOME` with no `~/.claude`, those two `cp` calls fail (skills still install). Real machines already have `~/.claude` from Claude Code; when testing against a temp `HOME`, `mkdir -p "$HOME/.claude"` first.
- **Gotcha — Codex installer needs Codex**: `install-codex.sh` requires `~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py` (created by the Codex CLI). Without Codex installed it exits early with a clear message — expected on this VM.
- **Installers hit GitHub**: most skills clone fine; a few `[fail]` entries (e.g. moved upstream subfolders) are pre-existing and non-fatal. The custom-skills sync at the end is offline (`rsync` from this repo's `skills/`).

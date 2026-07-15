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

## Cursor Cloud specific instructions

This repo is a dotfiles/skills installer, not a compiled app: two Bash installers
(`install-claude.sh`, `install-codex.sh`) plus Markdown skills under `skills/`.
There is no package manager, build step, or automated test suite.

- **Dependencies**: `rsync` is required by both installers (custom-skill sync).
  `shellcheck` is used for linting. The update script installs both; no
  language runtime deps exist.
- **Lint**: `bash -n install-claude.sh install-codex.sh` (syntax) and
  `shellcheck install-claude.sh install-codex.sh`. The only shellcheck output is
  an SC2016 *info* note on the final `echo` in `install-claude.sh` — intentional,
  since that line prints a literal `$HOME` for the user to copy.
- **Run (primary)**: `bash install-claude.sh` installs skills + statusline +
  `settings.json` + `CLAUDE.md` into `~/.claude`. Idempotent; already-installed
  skills are skipped.
- **Run (codex)**: `bash install-codex.sh` requires the Codex CLI to have been
  installed and run at least once (needs `~/.codex/skills/.system/...`). Without
  it, the script exits early with a clear error — expected on a bare VM.
- **First-run gotcha**: `install-claude.sh` copies the statusline and
  `settings.json` into `~/.claude` *before* it `mkdir`s the skills dir, so on a
  truly fresh machine (no `~/.claude` yet) those two copies fail on the first
  run. Re-running the script (or pre-creating `~/.claude`) installs them; skill
  installs and the custom-skill `rsync` sync are unaffected.
- **Expected `[fail]` lines**: a few upstream skill repos have moved/renamed
  their subfolders, so some `install_skill` calls print `[fail] ... subfolder
  not found`. These are upstream drift, not environment problems.

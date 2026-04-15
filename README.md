# agent-dotfiles

Dotfiles and skills setup for AI coding agents. One script per agent — run on any new machine to get a consistent environment.

## Agents

| Agent | Install script | What it sets up |
|-------|---------------|-----------------|
| [Claude Code](https://claude.ai/code) | `install-claude.sh` | Skills, statusline, settings.json |
| [Codex](https://openai.com/codex) | `install-codex.sh` | Skills |

## Quickstart

```bash
# Claude Code
bash install-claude.sh

# Codex
bash install-codex.sh
```

## Skills installed

Both scripts install the same skill set:

**Core / meta**
- `using-superpowers`, `using-git-worktrees`, `systematic-debugging` — obra/superpowers
- `session-handoff` — softaworks/agent-toolkit
- `find-skills` — vercel-labs/skills

**Frontend / Angular**
- `angular-component`, `angular-di`, `angular-directives`, `angular-forms`, `angular-http`, `angular-routing`, `angular-signals`, `angular-ssr`, `angular-testing`, `angular-tooling` — analogjs/angular-skills

**Backend**
- `nestjs-best-practices`, `nodejs-backend-patterns`, `typeorm` — mindrally/skills

**Database**
- `prisma-cli`, `prisma-client-api`, `prisma-database-setup`, `prisma-driver-adapter-implementation`, `prisma-postgres`, `prisma-upgrade-v7` — prisma/skills
- `mongodb` — hoodini/ai-agents-skills
- `supabase-postgres-best-practices` — supabase-community/supabase-skills

**Frontend quality**
- `vercel-react-best-practices` — vercel-labs/skills
- `frontend-design`, `web-design-guidelines` — anthropics/skills

**DevOps**
- `docker-expert` — sickn33/antigravity-awesome-skills
- `kubernetes-specialist` — jeffallan/skills

**Code quality / architecture**
- `architecture-assistant`, `architecture-patterns`, `code-review-excellence`, `performance-analyzer`, `safe-refactor`, `senior-reviewer`, `dependency-updater`, `agent-md-refactor`, `typescript-advanced-types`, `test` — anthropics/skills

**Productivity**
- `gsd` — ctsstc/get-shit-done-skills

## Claude Code extras

`install-claude.sh` also installs:
- **statusline** — macOS statusline script (`statusline-command-mac.sh`)
- **settings.json** — Claude Code settings (skipped if one already exists — merge manually from `settings-mac.json`)

## Adding a new agent

1. Create `install-<agent>.sh` following the same pattern
2. Add a row to the table above
3. Commit and push

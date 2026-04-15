#!/usr/bin/env bash
# Claude Code dotfiles setup script
# Usage: bash install.sh
# Run this on any new machine to replicate your Claude Code setup.

set -e

CLAUDE_DIR="$HOME/.claude"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Setting up Claude Code dotfiles..."

# ---------------------------------------------------------------------------
# 1. Copy statusline script
# ---------------------------------------------------------------------------
echo "Installing statusline script..."
cp "$SCRIPT_DIR/statusline-command-mac.sh" "$CLAUDE_DIR/statusline-command.sh"
chmod +x "$CLAUDE_DIR/statusline-command.sh"

# ---------------------------------------------------------------------------
# 2. Copy settings.json (won't overwrite if it exists — merge manually)
# ---------------------------------------------------------------------------
if [ -f "$CLAUDE_DIR/settings.json" ]; then
    echo "settings.json already exists — skipping. Merge manually from settings-mac.json if needed."
else
    echo "Installing settings.json..."
    cp "$SCRIPT_DIR/settings-mac.json" "$CLAUDE_DIR/settings.json"
fi

# ---------------------------------------------------------------------------
# 3. Install skills
# ---------------------------------------------------------------------------
echo "Installing skills..."
SKILLS_DIR="$CLAUDE_DIR/skills"
mkdir -p "$SKILLS_DIR"

install_skill() {
    local repo="$1"
    local subfolder="$2"
    local skill_name="$3"
    local target="$SKILLS_DIR/${skill_name}@"

    if [ -d "$target" ]; then
        echo "  [skip] $skill_name already installed"
        return
    fi

    echo "  Installing $skill_name from $repo..."
    local tmp=$(mktemp -d)
    git clone --depth=1 --filter=blob:none --sparse "https://github.com/$repo" "$tmp" -q
    cd "$tmp"
    git sparse-checkout set "$subfolder" -q
    git read-tree -mu HEAD 2>/dev/null || true
    if [ -d "$subfolder" ]; then
        cp -r "$subfolder" "$target"
        echo "  [ok] $skill_name"
    else
        echo "  [fail] $skill_name — subfolder '$subfolder' not found"
    fi
    cd - > /dev/null
    rm -rf "$tmp"
}

install_skill_full() {
    local repo="$1"
    local skill_name="$2"
    local target="$SKILLS_DIR/${skill_name}"

    if [ -d "$target" ]; then
        echo "  [skip] $skill_name already installed"
        return
    fi

    echo "  Installing $skill_name from $repo..."
    git clone --depth=1 "https://github.com/$repo" "$target" -q
    echo "  [ok] $skill_name"
}

# --- Core / meta skills ---
install_skill "obra/superpowers" "skills/using-superpowers" "using-superpowers"
install_skill "obra/superpowers" "skills/using-git-worktrees" "using-git-worktrees"
install_skill "obra/superpowers" "skills/systematic-debugging" "systematic-debugging"
install_skill "softaworks/agent-toolkit" "skills/session-handoff" "session-handoff"
install_skill "vercel-labs/skills" "skills/find-skills" "find-skills"

# --- Frontend / React / Angular ---
install_skill "analogjs/angular-skills" "skills/angular-component" "angular-component"
install_skill "analogjs/angular-skills" "skills/angular-di" "angular-di"
install_skill "analogjs/angular-skills" "skills/angular-directives" "angular-directives"
install_skill "analogjs/angular-skills" "skills/angular-forms" "angular-forms"
install_skill "analogjs/angular-skills" "skills/angular-http" "angular-http"
install_skill "analogjs/angular-skills" "skills/angular-routing" "angular-routing"
install_skill "analogjs/angular-skills" "skills/angular-signals" "angular-signals"
install_skill "analogjs/angular-skills" "skills/angular-ssr" "angular-ssr"
install_skill "analogjs/angular-skills" "skills/angular-testing" "angular-testing"
install_skill "analogjs/angular-skills" "skills/angular-tooling" "angular-tooling"

# --- Backend ---
install_skill "mindrally/skills" "skills/nestjs-best-practices" "nestjs-best-practices"
install_skill "mindrally/skills" "skills/nodejs-backend-patterns" "nodejs-backend-patterns"
install_skill "mindrally/skills" "skills/typeorm" "typeorm"

# --- Database ---
install_skill "prisma/skills" "skills/prisma-cli" "prisma-cli"
install_skill "prisma/skills" "skills/prisma-client-api" "prisma-client-api"
install_skill "prisma/skills" "skills/prisma-database-setup" "prisma-database-setup"
install_skill "prisma/skills" "skills/prisma-driver-adapter-implementation" "prisma-driver-adapter-implementation"
install_skill "prisma/skills" "skills/prisma-postgres" "prisma-postgres"
install_skill "prisma/skills" "skills/prisma-upgrade-v7" "prisma-upgrade-v7"
install_skill "hoodini/ai-agents-skills" "skills/mongodb" "mongodb"
install_skill "supabase-community/supabase-skills" "skills/supabase-postgres-best-practices" "supabase-postgres-best-practices"

# --- Frontend quality ---
install_skill "vercel-labs/skills" "skills/vercel-react-best-practices" "vercel-react-best-practices"
install_skill "anthropics/skills" "skills/frontend-design" "frontend-design"
install_skill "anthropics/skills" "skills/web-design-guidelines" "web-design-guidelines"

# --- DevOps ---
install_skill "sickn33/antigravity-awesome-skills" "skills/docker-expert" "docker-expert"
install_skill "jeffallan/skills" "skills/kubernetes-specialist" "kubernetes-specialist"

# --- Code quality / architecture ---
install_skill "anthropics/skills" "skills/architecture-assistant" "architecture-assistant"
install_skill "anthropics/skills" "skills/architecture-patterns" "architecture-patterns"
install_skill "anthropics/skills" "skills/code-review-excellence" "code-review-excellence"
install_skill "anthropics/skills" "skills/performance-analyzer" "performance-analyzer"
install_skill "anthropics/skills" "skills/safe-refactor" "safe-refactor"
install_skill "anthropics/skills" "skills/senior-reviewer" "senior-reviewer"
install_skill "anthropics/skills" "skills/dependency-updater" "dependency-updater"
install_skill "anthropics/skills" "skills/agent-md-refactor" "agent-md-refactor"
install_skill "anthropics/skills" "skills/typescript-advanced-types" "typescript-advanced-types"
install_skill "anthropics/skills" "skills/test" "test"

# --- Productivity ---
install_skill "ctsstc/get-shit-done-skills" "skills/gsd" "gsd"

echo ""
echo "Done! Skills installed to $SKILLS_DIR"
echo "Statusline script: $CLAUDE_DIR/statusline-command.sh"
echo ""
echo "If settings.json was skipped, add this to $CLAUDE_DIR/settings.json:"
echo '  "statusLine": { "type": "command", "command": "bash $HOME/.claude/statusline-command.sh" }'

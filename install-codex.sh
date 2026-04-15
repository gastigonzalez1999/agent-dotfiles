#!/usr/bin/env bash
# Codex skills setup script — mirrors install.sh but targets ~/.codex/skills/
# Usage: bash install-codex.sh
# Run this on any new machine to replicate your Codex skills setup.

set -e

CODEX_SKILLS_DIR="${CODEX_HOME:-$HOME/.codex}/skills"
INSTALLER="$HOME/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py"

if [ ! -f "$INSTALLER" ]; then
    echo "Error: Codex skill installer not found at $INSTALLER"
    echo "Make sure Codex is installed and has been run at least once."
    exit 1
fi

install_skill() {
    local repo="$1"
    local path="$2"
    local name
    name=$(basename "$path")

    if [ -d "$CODEX_SKILLS_DIR/$name" ]; then
        echo "  [skip] $name already installed"
        return
    fi

    echo "  Installing $name from $repo..."
    if python3 "$INSTALLER" --repo "$repo" --path "$path" 2>&1; then
        echo "  [ok] $name"
    else
        echo "  [fail] $name"
    fi
}

echo "Setting up Codex skills..."
echo ""

# --- Core / meta skills ---
echo "Core / meta:"
install_skill "obra/superpowers" "skills/using-superpowers"
install_skill "obra/superpowers" "skills/using-git-worktrees"
install_skill "obra/superpowers" "skills/systematic-debugging"
install_skill "softaworks/agent-toolkit" "skills/session-handoff"
install_skill "vercel-labs/skills" "skills/find-skills"

# --- Frontend / React / Angular ---
echo ""
echo "Frontend / Angular:"
install_skill "analogjs/angular-skills" "skills/angular-component"
install_skill "analogjs/angular-skills" "skills/angular-di"
install_skill "analogjs/angular-skills" "skills/angular-directives"
install_skill "analogjs/angular-skills" "skills/angular-forms"
install_skill "analogjs/angular-skills" "skills/angular-http"
install_skill "analogjs/angular-skills" "skills/angular-routing"
install_skill "analogjs/angular-skills" "skills/angular-signals"
install_skill "analogjs/angular-skills" "skills/angular-ssr"
install_skill "analogjs/angular-skills" "skills/angular-testing"
install_skill "analogjs/angular-skills" "skills/angular-tooling"

# --- Backend ---
echo ""
echo "Backend:"
install_skill "mindrally/skills" "skills/nestjs-best-practices"
install_skill "mindrally/skills" "skills/nodejs-backend-patterns"
install_skill "mindrally/skills" "skills/typeorm"

# --- Database ---
echo ""
echo "Database:"
install_skill "prisma/skills" "skills/prisma-cli"
install_skill "prisma/skills" "skills/prisma-client-api"
install_skill "prisma/skills" "skills/prisma-database-setup"
install_skill "prisma/skills" "skills/prisma-driver-adapter-implementation"
install_skill "prisma/skills" "skills/prisma-postgres"
install_skill "prisma/skills" "skills/prisma-upgrade-v7"
install_skill "hoodini/ai-agents-skills" "skills/mongodb"
install_skill "supabase-community/supabase-skills" "skills/supabase-postgres-best-practices"

# --- Frontend quality ---
echo ""
echo "Frontend quality:"
install_skill "vercel-labs/skills" "skills/vercel-react-best-practices"
install_skill "anthropics/skills" "skills/frontend-design"
install_skill "anthropics/skills" "skills/web-design-guidelines"

# --- DevOps ---
echo ""
echo "DevOps:"
install_skill "sickn33/antigravity-awesome-skills" "skills/docker-expert"
install_skill "jeffallan/skills" "skills/kubernetes-specialist"

# --- Code quality / architecture ---
echo ""
echo "Code quality / architecture:"
install_skill "anthropics/skills" "skills/architecture-assistant"
install_skill "anthropics/skills" "skills/architecture-patterns"
install_skill "anthropics/skills" "skills/code-review-excellence"
install_skill "anthropics/skills" "skills/performance-analyzer"
install_skill "anthropics/skills" "skills/safe-refactor"
install_skill "anthropics/skills" "skills/senior-reviewer"
install_skill "anthropics/skills" "skills/dependency-updater"
install_skill "anthropics/skills" "skills/agent-md-refactor"
install_skill "anthropics/skills" "skills/typescript-advanced-types"
install_skill "anthropics/skills" "skills/test"

# --- Productivity ---
echo ""
echo "Productivity:"
install_skill "ctsstc/get-shit-done-skills" "skills/gsd"

echo ""
echo "Done! Skills installed to $CODEX_SKILLS_DIR"
echo "Restart Codex to pick up new skills."

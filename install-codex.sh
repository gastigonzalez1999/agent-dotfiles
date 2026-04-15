#!/usr/bin/env bash
# Codex skills setup script — mirrors install-claude.sh but targets ~/.codex/skills/
# Usage: bash install-codex.sh
# Run this on any new machine to replicate your Codex skills setup.

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

# --- Core / meta ---
echo "Core / meta:"
install_skill "obra/superpowers" "skills/using-superpowers"
install_skill "obra/superpowers" "skills/using-git-worktrees"
install_skill "obra/superpowers" "skills/systematic-debugging"
install_skill "softaworks/agent-toolkit" "skills/session-handoff"
install_skill "vercel-labs/skills" "skills/find-skills"

# --- Frontend / Angular ---
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
install_skill "mindrally/skills" "nestjs-clean-typescript"
install_skill "mindrally/skills" "nodejs-development"
install_skill "mindrally/skills" "typeorm"

# --- Database ---
echo ""
echo "Database:"
install_skill "prisma/skills" "prisma-cli"
install_skill "prisma/skills" "prisma-client-api"
install_skill "prisma/skills" "prisma-database-setup"
install_skill "prisma/skills" "prisma-driver-adapter-implementation"
install_skill "prisma/skills" "prisma-postgres"
install_skill "prisma/skills" "prisma-upgrade-v7"
install_skill "hoodini/ai-agents-skills" "skills/mongodb"

# --- Frontend quality ---
echo ""
echo "Frontend quality:"
install_skill "anthropics/skills" "skills/frontend-design"

# --- DevOps ---
echo ""
echo "DevOps:"
install_skill "sickn33/antigravity-awesome-skills" "skills/docker-expert"

echo ""
echo "Done! Skills installed to $CODEX_SKILLS_DIR"
echo "Restart Codex to pick up new skills."

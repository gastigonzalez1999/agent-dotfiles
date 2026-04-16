#!/usr/bin/env bash
# Codex skills setup script — mirrors install-claude.sh but targets ~/.codex/skills/
# Usage: bash install-codex.sh
# Run this on any new machine to replicate your Codex skills setup.

CODEX_SKILLS_DIR="${CODEX_HOME:-$HOME/.codex}/skills"
INSTALLER="$HOME/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py"

# Detect Python (handles python3 on Linux/Mac, python on Windows)
if command -v python3 &>/dev/null; then
    PYTHON="python3"
elif command -v python &>/dev/null; then
    PYTHON="python"
elif command -v py &>/dev/null; then
    PYTHON="py"
else
    echo "Error: Python not found. Install Python and try again."
    exit 1
fi

if [ ! -f "$INSTALLER" ]; then
    echo "Error: Codex skill installer not found at $INSTALLER"
    echo "Make sure Codex is installed and has been run at least once."
    exit 1
fi

# Install a skill from a subfolder within a repo
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
    if "$PYTHON" "$INSTALLER" --repo "$repo" --path "$path" 2>&1; then
        echo "  [ok] $name"
    else
        echo "  [fail] $name"
    fi
}

# Install a skill where the entire repo root is the skill (no subfolder)
install_skill_repo_root() {
    local repo="$1"
    local skill_name="$2"
    local target="$CODEX_SKILLS_DIR/$skill_name"

    if [ -d "$target" ]; then
        echo "  [skip] $skill_name already installed"
        return
    fi

    echo "  Installing $skill_name from $repo (repo root)..."
    local tmp; tmp=$(mktemp -d)
    if git clone --depth=1 "https://github.com/$repo" "$tmp/$skill_name" -q 2>&1; then
        cp -r "$tmp/$skill_name" "$target"
        echo "  [ok] $skill_name"
    else
        echo "  [fail] $skill_name — clone failed"
    fi
    rm -rf "$tmp"
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

# --- Frontend quality ---
echo ""
echo "Frontend quality:"
install_skill "anthropics/skills" "skills/frontend-design"
install_skill "addyosmani/web-quality-skills" "skills/accessibility"
install_skill "addyosmani/web-quality-skills" "skills/seo"
install_skill "sickn33/antigravity-awesome-skills" "skills/tailwind-css-patterns"
install_skill "vercel-labs/agent-skills" "skills/react-best-practices"
install_skill "vercel-labs/agent-skills" "skills/composition-patterns"

# --- Next.js ---
echo ""
echo "Next.js:"
install_skill "vercel-labs/next-skills" "skills/next-best-practices"
install_skill "vercel-labs/next-skills" "skills/next-cache-components"
install_skill "vercel-labs/next-skills" "skills/next-upgrade"

# --- Backend ---
echo ""
echo "Backend:"
install_skill_repo_root "kadajett/agent-nestjs-skills" "nestjs-best-practices"
install_skill "sickn33/antigravity-awesome-skills" "skills/nodejs-backend-patterns"
install_skill "sickn33/antigravity-awesome-skills" "skills/typescript-advanced-types"
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

# --- DevOps ---
echo ""
echo "DevOps:"
install_skill "sickn33/antigravity-awesome-skills" "skills/docker-expert"
install_skill "sickn33/antigravity-awesome-skills" "skills/nodejs-best-practices"

echo ""
echo "Done! Skills installed to $CODEX_SKILLS_DIR"
echo "Restart Codex to pick up new skills."

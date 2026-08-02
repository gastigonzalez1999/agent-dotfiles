#!/usr/bin/env bash
# Claude Code dotfiles setup script
# Usage: bash install-claude.sh
# Run this on any new machine to replicate your Claude Code setup.

CLAUDE_DIR="$HOME/.claude"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$CLAUDE_DIR"

echo "Setting up Claude Code dotfiles..."

# Node powers the loop runner and the settings merge. Everything else degrades
# gracefully without it, so warn rather than abort.
command -v node >/dev/null 2>&1 || echo "  [warn] node not found — the loop runner and hook install will be skipped"

# ---------------------------------------------------------------------------
# 1. Copy statusline script
# ---------------------------------------------------------------------------
echo "Installing statusline script..."
STATUSLINE="$SCRIPT_DIR/statusline-command-mac.sh"
# Prefer a platform-specific variant when one exists (statusline-command-<os>.sh).
case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*) [ -f "$SCRIPT_DIR/statusline-command-win.sh" ] && STATUSLINE="$SCRIPT_DIR/statusline-command-win.sh" ;;
    Linux)                [ -f "$SCRIPT_DIR/statusline-command-linux.sh" ] && STATUSLINE="$SCRIPT_DIR/statusline-command-linux.sh" ;;
esac
cp "$STATUSLINE" "$CLAUDE_DIR/statusline-command.sh"
chmod +x "$CLAUDE_DIR/statusline-command.sh"

# ---------------------------------------------------------------------------
# 2. Copy settings.json (won't overwrite if it exists — merge manually)
# ---------------------------------------------------------------------------
if [ -f "$CLAUDE_DIR/settings.json" ]; then
    echo "settings.json already exists — leaving it alone. Hooks are merged in separately below."
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

# Each skill declares who it ships to via `targets:` frontmatter. Claude skips
# the Cursor-only stack docs (nestjs, docker, prisma…) because it already gets
# richer vendored equivalents from upstream repos below. A skill with no
# `targets:` line ships everywhere, so older skills keep working.
targets_include() {
    local skill_md="$1/SKILL.md" harness="$2" line
    [ -f "$skill_md" ] || return 1
    line=$(grep -m1 '^targets:' "$skill_md" 2>/dev/null) || return 0
    case "$line" in *"$harness"*) return 0 ;; *) return 1 ;; esac
}

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
    local tmp
    tmp=$(mktemp -d)
    git clone --depth=1 "https://github.com/$repo" "$tmp" -q 2>/dev/null || { echo "  [fail] $skill_name — clone failed"; rm -rf "$tmp"; return; }
    if [ -d "$tmp/$subfolder" ]; then
        cp -r "$tmp/$subfolder" "$target"
        echo "  [ok] $skill_name"
    else
        echo "  [fail] $skill_name — subfolder '$subfolder' not found"
    fi
    rm -rf "$tmp"
}

# --- Core / meta ---
install_skill "obra/superpowers" "skills/using-superpowers" "using-superpowers"
install_skill "obra/superpowers" "skills/using-git-worktrees" "using-git-worktrees"
install_skill "obra/superpowers" "skills/systematic-debugging" "systematic-debugging"
install_skill "softaworks/agent-toolkit" "skills/session-handoff" "session-handoff"
install_skill "vercel-labs/skills" "skills/find-skills" "find-skills"

# --- Frontend / Angular ---
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

# --- Frontend quality ---
install_skill "anthropics/skills" "skills/frontend-design" "frontend-design"
install_skill "addyosmani/web-quality-skills" "skills/accessibility" "accessibility"
install_skill "addyosmani/web-quality-skills" "skills/seo" "seo"
install_skill "sickn33/antigravity-awesome-skills" "skills/tailwind-css-patterns" "tailwind-css-patterns"
install_skill "vercel-labs/agent-skills" "skills/react-best-practices" "vercel-react-best-practices"
install_skill "vercel-labs/agent-skills" "skills/composition-patterns" "vercel-composition-patterns"

# --- Mobile / native ---
install_skill "vercel-labs/agent-skills" "skills/react-native-skills" "vercel-react-native-skills"
install_skill "dpearson2699/swift-ios-skills" "skills/core-bluetooth" "core-bluetooth"

# --- Next.js ---
install_skill "vercel-labs/next-skills" "skills/next-best-practices" "next-best-practices"
install_skill "vercel-labs/next-skills" "skills/next-cache-components" "next-cache-components"
install_skill "vercel-labs/next-skills" "skills/next-upgrade" "next-upgrade"

# --- Backend ---
install_skill "kadajett/agent-nestjs-skills" "nestjs-best-practices" "nestjs-best-practices"
install_skill "sickn33/antigravity-awesome-skills" "skills/nodejs-backend-patterns" "nodejs-backend-patterns"
install_skill "sickn33/antigravity-awesome-skills" "skills/typescript-advanced-types" "typescript-advanced-types"
install_skill "mindrally/skills" "typeorm" "typeorm"

# --- Database ---
install_skill "prisma/skills" "prisma-cli" "prisma-cli"
install_skill "prisma/skills" "prisma-client-api" "prisma-client-api"
install_skill "prisma/skills" "prisma-database-setup" "prisma-database-setup"
install_skill "prisma/skills" "prisma-driver-adapter-implementation" "prisma-driver-adapter-implementation"
install_skill "prisma/skills" "prisma-postgres" "prisma-postgres"
install_skill "prisma/skills" "prisma-upgrade-v7" "prisma-upgrade-v7"
install_skill "hoodini/ai-agents-skills" "skills/mongodb" "mongodb"

# --- DevOps ---
install_skill "sickn33/antigravity-awesome-skills" "skills/docker-expert" "docker-expert"
install_skill "sickn33/antigravity-awesome-skills" "skills/nodejs-best-practices" "nodejs-best-practices"

# --- Custom skills (from agent-dotfiles; always match this repo) ---
# Installs straight into $SKILLS_DIR. This previously targeted
# "$SKILLS_DIR/.claude/skills", a nested path Claude Code never scans, so these
# skills silently never installed. rsync is gone too — it is absent on Windows.
echo ""
echo "Installing custom skills..."
mkdir -p "$SKILLS_DIR"
for skill_dir in "$SCRIPT_DIR"/skills/*/; do
    [ -d "$skill_dir" ] || continue
    name=$(basename "$skill_dir")
    # Skipped skills are left alone rather than removed: a same-named skill here
    # may be a symlink the user installed from elsewhere.
    targets_include "$skill_dir" claude || { echo "  [skip] $name — not targeted at claude"; continue; }
    rm -rf "$SKILLS_DIR/$name"
    cp -R "$skill_dir" "$SKILLS_DIR/$name"
done
echo "  [ok] synced $SCRIPT_DIR/skills/ -> $SKILLS_DIR/"

# --- Verification loop runner + enforcement hooks ---
echo ""
echo "Installing the loop runner..."
rm -rf "$CLAUDE_DIR/loop"
cp -R "$SCRIPT_DIR/loop" "$CLAUDE_DIR/loop"
echo "  [ok] $CLAUDE_DIR/loop"
# Merges into an existing settings.json rather than skipping it, so hooks land on
# a machine that is already configured. Pass --with-retro for unattended learning.
node "$CLAUDE_DIR/loop/loop.mjs" install-hooks ${LOOP_RETRO:+--with-retro} || \
    echo "  [warn] could not install hooks — run: node $CLAUDE_DIR/loop/loop.mjs install-hooks"

# ---------------------------------------------------------------------------
# 4. Copy CLAUDE.md global rules
# ---------------------------------------------------------------------------
echo "Installing global CLAUDE.md..."
if [ -f "$CLAUDE_DIR/CLAUDE.md" ]; then
    echo "  CLAUDE.md already exists — skipping. Merge manually from CLAUDE.md in repo if needed."
else
    cp "$SCRIPT_DIR/CLAUDE.md" "$CLAUDE_DIR/CLAUDE.md"
    echo "  [ok] CLAUDE.md"
fi

echo ""
echo "Done! Skills installed to $SKILLS_DIR"
echo "Statusline script: $CLAUDE_DIR/statusline-command.sh"
echo ""
echo "If settings.json was skipped, add this to $CLAUDE_DIR/settings.json:"
echo '  "statusLine": { "type": "command", "command": "bash $HOME/.claude/statusline-command.sh" }'

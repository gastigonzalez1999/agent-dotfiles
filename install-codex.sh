#!/usr/bin/env bash
# Codex skills setup script — mirrors install-claude.sh but targets ~/.codex/skills/
# Usage: bash install-codex.sh
# Run this on any new machine to replicate your Codex skills setup.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODEX_SKILLS_DIR="${CODEX_HOME:-$HOME/.codex}/skills"
INSTALLER="$HOME/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py"

# Each skill declares who it ships to via `targets:` frontmatter. A skill with
# no `targets:` line ships everywhere, so older skills keep working.
targets_include() {
    local skill_md="$1/SKILL.md" harness="$2" line
    [ -f "$skill_md" ] || return 1
    line=$(grep -m1 '^targets:' "$skill_md" 2>/dev/null) || return 0
    case "$line" in *"$harness"*) return 0 ;; *) return 1 ;; esac
}

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

echo "Setting up Codex skills..."
echo ""

# One list for every installer and the README: external-skills.txt. Read on fd 3
# so the installer, which may prompt, cannot swallow the rest of the list.
while read -r repo subfolder _name <&3; do
    case "$repo" in ""|"#"*) continue ;; esac
    install_skill "$repo" "$subfolder"
done 3< "$SCRIPT_DIR/external-skills.txt"

# --- Custom skills (from agent-dotfiles; always refresh from this repo) ---
echo ""
echo "Custom skills (synced from $SCRIPT_DIR/skills):"
mkdir -p "$CODEX_SKILLS_DIR"
for src in "$SCRIPT_DIR/skills"/*/; do
    [[ -d "$src" ]] || continue
    name="$(basename "$src")"
    targets_include "$src" codex || { echo "  [skip] $name — not targeted at codex"; continue; }
    # rsync is absent on Windows; cp -R after a clean removal is equivalent here.
    rm -rf "${CODEX_SKILLS_DIR:?}/$name"
    cp -R "$src" "$CODEX_SKILLS_DIR/$name"
    echo "  [ok] $name"
done

# --- Global instructions + rules ---
# Previously unversioned: a new machine got the skills but none of the rules
# that tell Codex when to use them.
CODEX_DIR="${CODEX_HOME:-$HOME/.codex}"
echo ""
echo "Global instructions:"
# Merged rather than copied: other tools may inject their own fenced blocks into
# this same file, and a plain `cp` would delete every one of them. The merge replaces our
# prose and re-appends anything a vendor fenced off. See scripts/merge-codex-agents.mjs.
if command -v node >/dev/null 2>&1; then
    node "$SCRIPT_DIR/scripts/merge-codex-agents.mjs" || \
        echo "  [warn] AGENTS.md merge failed — run: node $SCRIPT_DIR/scripts/merge-codex-agents.mjs"
elif [ -f "$CODEX_DIR/AGENTS.md" ]; then
    echo "  [warn] node not found — leaving the existing AGENTS.md alone"
else
    cp "$SCRIPT_DIR/codex/AGENTS.md" "$CODEX_DIR/AGENTS.md"
    echo "  [ok] AGENTS.md"
fi
# rules/default.rules is deliberately NOT shipped. It is Codex's approval cache,
# not configuration: every entry is a literal command someone approved on one
# machine, so it accumulates local paths, filenames and URLs from real sessions.
# It is machine-local by nature, and copying it here would also clobber the
# approvals the target machine has built up.

echo ""
echo "Done! Skills installed to $CODEX_SKILLS_DIR"
echo "Restart Codex to pick up new skills."

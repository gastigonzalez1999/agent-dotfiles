#!/usr/bin/env bash
# Claude Code dotfiles setup script
# Usage: bash install-claude.sh [--skip-external]
#   --skip-external   custom skills, settings and hooks only; no GitHub clones.
#                     Fast, offline, and what a fresh-machine test wants.
# Run this on any new machine to replicate your Claude Code setup.

SKIP_EXTERNAL=0
for arg in "$@"; do
    case "$arg" in
        --skip-external) SKIP_EXTERNAL=1 ;;
        -h|--help) echo "Usage: bash install-claude.sh [--skip-external]"; exit 0 ;;
        *) echo "Unknown option: $arg"; exit 2 ;;
    esac
done

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
# One script for every OS. It only needs bash, node, git, awk and $HOME, all of
# which Git Bash provides on Windows. This used to probe for
# statusline-command-<os>.sh variants that were never written, so the probe
# always fell through — and the mac copy it fell back to was already portable.
echo "Installing statusline script..."
cp "$SCRIPT_DIR/statusline-command.sh" "$CLAUDE_DIR/statusline-command.sh"
chmod +x "$CLAUDE_DIR/statusline-command.sh"

# ---------------------------------------------------------------------------
# 2. Copy settings.json (won't overwrite if it exists — merge manually)
# ---------------------------------------------------------------------------
# Merged rather than skipped: skipping meant machine settings (model, effort,
# statusline, plugins, MCP permissions) only ever landed on a brand new machine.
# The merge preserves every key the base does not declare, and writes a .bak.
echo "Merging base settings..."
if command -v node >/dev/null 2>&1; then
    node "$SCRIPT_DIR/scripts/merge-settings.mjs" || \
        echo "  [warn] settings merge failed — run: node $SCRIPT_DIR/scripts/merge-settings.mjs"
else
    echo "  [warn] node not found — skipping settings merge"
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
    [ "$SKIP_EXTERNAL" -eq 1 ] && return 0

    local repo="$1"
    local subfolder="$2"
    local skill_name="$3"
    local target="$SKILLS_DIR/${skill_name}@"

    if [ -d "$target" ]; then
        echo "  [skip] $skill_name already installed"
        return
    fi

    # Something else already provides this skill under its plain name — usually a
    # symlink into ~/.agents/skills managed by the skills CLI. Installing our own
    # copy alongside it loads the same skill twice under two names, which is how
    # ~37 duplicates accumulated here.
    if [ -e "$SKILLS_DIR/$skill_name" ]; then
        echo "  [skip] $skill_name — already provided under its plain name"
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

# --- skills.sh CLI packages ---
# 25 skills reached this machine through `npx skills add` and lived only in
# ~/.agents/skills, which nothing here recreated — so a fresh machine got a
# dangling symlink for each. Reinstalling them is the point of this step.
#
# Three non-obvious things about the CLI, each of which silently installs nothing:
#   - the harness slug is `claude-code`, not `claude`
#   - `--agent a,b,c` and `--skill a,b,c` are rejected as invalid even when every
#     value is valid on its own; it wants one flag per value
#   - npx reads stdin, so without `< /dev/null` the first call swallows the rest
#     of the loop's input and only one package installs
# `--agent '*'` would also work but targets ~70 harnesses, two of which (Eve,
# PromptScript) refuse global installs and make the CLI exit non-zero regardless.
#
# Every name must still exist upstream: one unknown name fails the WHOLE package.
# List what a repo currently offers with:
#   npx -y skills@latest add <owner/repo> --list
#
# Dropped because upstream renamed them (replacements already listed):
#   diagnose -> diagnosing-bugs, to-issues -> to-tickets
# Dropped because upstream removed them entirely — adopt into skills/ with MIT
# attribution if you want to keep one:
#   caveman, to-prd, write-a-prd, write-a-skill, zoom-out
install_cli_skills() {
    [ "$SKIP_EXTERNAL" -eq 1 ] && return 0
    command -v npx >/dev/null 2>&1 || { echo "  [warn] npx not found — skills.sh packages skipped"; return 0; }

    local agents=(--agent claude-code --agent codex --agent cursor)
    local pkg skills skill_flags _s
    while IFS='|' read -r pkg skills; do
        [ -z "$pkg" ] && continue
        skill_flags=()
        IFS=',' read -r -a _list <<< "$skills"
        for _s in "${_list[@]}"; do [ -n "$_s" ] && skill_flags+=(--skill "$_s"); done
        if npx -y skills@latest add "$pkg" --global "${agents[@]}" "${skill_flags[@]}" --yes \
             < /dev/null >/dev/null 2>&1; then
            echo "  [ok] $pkg"
        else
            echo "  [fail] $pkg — check the skill names still exist upstream"
        fi
    done <<'CLI_SKILLS'
mattpocock/skills|ask-matt,code-review,codebase-design,diagnosing-bugs,domain-modeling,grill-with-docs,grilling,implement,prototype,research,resolving-merge-conflicts,setup-matt-pocock-skills,teach,to-spec,to-tickets,triage,wayfinder,writing-great-skills
vercel-labs/agent-browser|*
CLI_SKILLS
}

echo ""
echo "Installing skills.sh packages..."
install_cli_skills

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
# Invoked from $CLAUDE_DIR, never from $SCRIPT_DIR: hook commands are written
# relative to the loop.mjs that installs them, so running the repo copy pins the
# hooks to a clone path that will not exist on the next machine.
node "$CLAUDE_DIR/loop/loop.mjs" install-hooks ${LOOP_RETRO:+--with-retro} || \
    echo "  [warn] could not install hooks — run: node $CLAUDE_DIR/loop/loop.mjs install-hooks"

# ---------------------------------------------------------------------------
# MCP servers
# ---------------------------------------------------------------------------
echo ""
echo "Installing MCP servers..."
if command -v claude >/dev/null 2>&1; then
    if command -v codegraph >/dev/null 2>&1; then
        claude mcp add-json --scope user codegraph \
            '{"type":"stdio","command":"codegraph","args":["serve","--mcp"]}' >/dev/null 2>&1 && \
            echo "  [ok] codegraph" || echo "  [skip] codegraph already registered"
    else
        echo "  [skip] codegraph — binary not on PATH"
    fi
else
    echo "  [skip] claude CLI not found — see mcp/servers.json"
fi

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
echo "Restart Claude Code to pick up the new skills and settings."

#!/usr/bin/env bash
# Reverse drift audit: what exists on THIS MACHINE that the repo does not know about.
#
#   bash sync-up.sh
#
# READ-ONLY. Writes nothing, installs nothing, deletes nothing. Every finding is
# something for you to decide about.
#
# install-claude.sh pushes repo -> machine. Nothing checked the other direction, so
# a skill written straight into ~/.claude/skills, a hand-edited setting, or a
# hand-installed CLI package stayed invisible to the repo until the next machine
# came up missing it. That is the gap this closes.
#
# Run it before committing changes to this repo.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
AGENTS_STORE="$HOME/.agents"
BASE_SETTINGS="$SCRIPT_DIR/claude/settings.base.json"

FINDINGS=0
note()    { FINDINGS=$((FINDINGS+1)); echo "  ! $1"; }
clean()   { echo "  ✓ $1"; }
info()    { echo "  · $1"; }
section() { echo; echo "── $1"; }

echo "Reverse drift audit"
echo "   machine: $CLAUDE_DIR"
echo "   repo:    $SCRIPT_DIR"

# Every skill name the repo can account for.
known_skills() {
  # Owned here
  [ -d "$SCRIPT_DIR/skills" ] && ls -1 "$SCRIPT_DIR/skills" 2>/dev/null
  # Third-party, installed by the install_skill / install_skill_repo_root calls in
  # install-claude.sh. Parsed from the script because that IS the manifest here.
  if [ -f "$SCRIPT_DIR/install-claude.sh" ]; then
    grep -hE '^install_skill(_repo_root)? ' "$SCRIPT_DIR/install-claude.sh" 2>/dev/null \
      | awk '{ gsub(/"/,""); print $NF }'
  fi
  # Declared for the skills.sh CLI inside install-claude.sh, as `pkg|a,b,c` lines
  # in the install_cli_skills heredoc rather than as install_skill calls.
  if [ -f "$SCRIPT_DIR/install-claude.sh" ]; then
    grep -hE '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+\|' "$SCRIPT_DIR/install-claude.sh" 2>/dev/null \
      | cut -d'|' -f2 | tr ',' '\n' | grep -v '^\*\?$'
  fi
  # Installed by the skills.sh CLI; its lockfiles are the record of what landed.
  for lock in "$AGENTS_STORE/.skill-lock.json" "$CLAUDE_DIR/skills/skills-lock.json"; do
    [ -f "$lock" ] && command -v jq >/dev/null 2>&1 && jq -r '.skills | keys[]' "$lock" 2>/dev/null
  done
}

# ---------------------------------------------------------------------------
section "Skills on the machine but unaccounted for by the repo"
if [ -d "$CLAUDE_DIR/skills" ]; then
  # `! -name '.*'` skips nested stores; they get their own check below.
  live=$(find "$CLAUDE_DIR/skills" -maxdepth 1 -mindepth 1 ! -name '.*' \( -type d -o -type l \) \
         -exec basename {} \; | sed 's/@$//' | sort -u)
  known=$(known_skills | sed 's/@$//' | grep -v '^$' | sort -u)
  missing=$(comm -23 <(echo "$live") <(echo "$known"))
  if [ -n "$missing" ]; then
    while read -r s; do [ -n "$s" ] && note "skill: $s"; done <<< "$missing"
    echo
    echo "    Yours to keep?  Add it to skills/ with a targets: line and commit."
    echo "    Third-party?    Add an install_skill call to install-claude.sh."
    echo "    Work-only?      Leave it — it belongs to a private channel, not a public repo."
  else
    clean "nothing unaccounted for"
  fi
else
  clean "no skills directory on this machine"
fi

# ---------------------------------------------------------------------------
section "Owned skills missing a targets: line"
# A skill with no targets: ships to every harness. That is the documented
# fallback, but for a new skill it is usually an omission rather than a choice.
missing_targets=0
for d in "$SCRIPT_DIR"/skills/*/; do
  [ -d "$d" ] || continue
  grep -q '^targets:' "$d/SKILL.md" 2>/dev/null || { note "$(basename "$d") — no targets:, will ship everywhere"; missing_targets=1; }
done
[ "$missing_targets" = 0 ] && clean "every owned skill declares targets:"

# ---------------------------------------------------------------------------
section "Skills installed twice under different names"
# The plain name and the `@`-suffixed external copy both declare the same skill
# in frontmatter, so the harness loads it twice. install-claude.sh guards against
# creating these, but one installed by hand earlier still needs finding.
dupes=0
if [ -d "$CLAUDE_DIR/skills" ]; then
  for d in "$CLAUDE_DIR/skills"/*@; do
    [ -e "$d" ] || continue
    plain="${d%@}"
    [ -e "$plain" ] && { note "$(basename "$plain") exists both plain and as @ — loaded twice"; dupes=1; }
  done
fi
[ "$dupes" = 0 ] && clean "no duplicate skill names"

# ---------------------------------------------------------------------------
section "Dead nested skill stores"
found_nested=0
for nested in .claude .agents; do
  if [ -d "$CLAUDE_DIR/skills/$nested" ]; then
    n=$(find "$CLAUDE_DIR/skills/$nested" -name SKILL.md 2>/dev/null | wc -l | tr -d ' ')
    note "skills/$nested holds $n skill(s) — the harness does not scan this path"
    found_nested=1
  fi
done
if [ "$found_nested" = 1 ]; then
  echo "    Reachable only by symlink. Re-run install-claude.sh, which installs"
  echo "    skills directly instead."
else
  clean "no dead nested stores"
fi

# ---------------------------------------------------------------------------
section "Broken symlinks in the skills directory"
if [ -d "$CLAUDE_DIR/skills" ]; then
  broken=$(find "$CLAUDE_DIR/skills" -maxdepth 1 -type l ! -exec test -e {} \; -print 2>/dev/null)
  if [ -n "$broken" ]; then
    while read -r l; do [ -n "$l" ] && note "dangling: $(basename "$l") → $(readlink "$l")"; done <<< "$broken"
    echo "    Points at a store nothing recreates. Re-run install-claude.sh, or drop the link."
  else
    clean "no dangling symlinks"
  fi
fi

# ---------------------------------------------------------------------------
section "Agents, commands and hooks on the machine but not in the repo"
for kind in agents commands; do
  [ -d "$CLAUDE_DIR/$kind" ] || { clean "$kind/: none on machine"; continue; }
  found=0
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    base="${f#"$CLAUDE_DIR/$kind/"}"
    # AIDesigner regenerates its own assets on every upgrade — not ours to commit.
    case "$base" in *aidesigner*) continue ;; esac
    [ -e "$SCRIPT_DIR/$kind/$base" ] || [ -e "$SCRIPT_DIR/cursor/$kind/$base" ] || { note "$kind/$base"; found=1; }
  done < <(find "$CLAUDE_DIR/$kind" -mindepth 1 -type f 2>/dev/null)
  [ "$found" = 0 ] && clean "$kind/: nothing unaccounted for"
done

# ---------------------------------------------------------------------------
section "settings.json drift"
LIVE="$CLAUDE_DIR/settings.json"
if [ ! -f "$LIVE" ]; then
  clean "no settings.json on this machine"
elif [ ! -f "$BASE_SETTINGS" ]; then
  note "claude/settings.base.json is missing from the repo"
elif ! command -v jq >/dev/null 2>&1; then
  note "jq not installed — cannot compare settings"
else
  # Leaf keys present live but absent from the base file. hooks and
  # permissions.allow are excluded: merge-settings.mjs deliberately unions those
  # and `loop install-hooks` owns the hook entries, so divergence there is normal.
  extra=$(jq -r --slurpfile b "$BASE_SETTINGS" '
    def leaves($p): to_entries[] | ($p + [.key]) as $np |
      if (.value|type) == "object" then (.value | leaves($np)) else $np end;
    [leaves([])] as $live
    | ($b[0] | [leaves([])]) as $base
    | ($live - $base)[] | join(".")' "$LIVE" 2>/dev/null \
    | grep -vE '^(hooks|permissions)\.')
  if [ -n "$extra" ]; then
    while read -r k; do
      [ -z "$k" ] && continue
      case "$k" in
        *vangwe*|*Vangwe*) info "$k  (private work overlay — deliberately not in this public repo)" ;;
        *) note "settings key not in claude/settings.base.json: $k" ;;
      esac
    done <<< "$extra"
  else
    clean "no settings keys missing from the base file"
  fi
fi

# ---------------------------------------------------------------------------
section "Global CLAUDE.md drift"
if [ ! -f "$CLAUDE_DIR/CLAUDE.md" ]; then
  clean "no global CLAUDE.md"
elif diff -q "$SCRIPT_DIR/CLAUDE.md" "$CLAUDE_DIR/CLAUDE.md" >/dev/null 2>&1; then
  clean "CLAUDE.md identical to repo"
else
  note "CLAUDE.md differs from the repo — review:"
  echo "      diff $SCRIPT_DIR/CLAUDE.md $CLAUDE_DIR/CLAUDE.md"
fi

# ---------------------------------------------------------------------------
section "skills.sh packages installed but not declared anywhere"
LOCK="$AGENTS_STORE/.skill-lock.json"
if [ ! -f "$LOCK" ]; then
  clean "no skills.sh store at $AGENTS_STORE"
elif ! command -v jq >/dev/null 2>&1; then
  note "jq not installed — cannot read the skills.sh lockfile"
else
  # Installed by the CLI, but no install_skill call and no owned copy — so a fresh
  # machine would not get it. These are the symlinks that dangle on a new box.
  undeclared=0
  while read -r s; do
    [ -z "$s" ] && continue
    [ -d "$SCRIPT_DIR/skills/$s" ] && continue
    grep -qE "^install_skill(_repo_root)? .*\"$s\"" "$SCRIPT_DIR/install-claude.sh" 2>/dev/null && continue
    # Named in the install_cli_skills heredoc?
    grep -hE '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+\|' "$SCRIPT_DIR/install-claude.sh" 2>/dev/null \
      | cut -d'|' -f2 | tr ',' '\n' | grep -qx "$s" && continue
    # Or covered by a package declared with `*`, which installs every skill it has —
    # so the names cannot be enumerated and the source repo is what to match on.
    src=$(jq -r --arg k "$s" '.skills[$k].source // empty' "$LOCK" 2>/dev/null)
    if [ -n "$src" ] && grep -qE "^${src//\//\\/}\|\*$" "$SCRIPT_DIR/install-claude.sh" 2>/dev/null; then
      continue
    fi
    note "$s — installed via skills.sh, nothing in the repo reinstalls it"
    undeclared=1
  done < <(jq -r '.skills | keys[]' "$LOCK" 2>/dev/null)
  if [ "$undeclared" = 1 ]; then
    echo "    A fresh machine gets a dangling symlink for each of these. Either add an"
    echo "    install step, or adopt the skill into skills/ if upstream dropped it."
  else
    clean "every skills.sh package is reinstallable from the repo"
  fi
fi

# ---------------------------------------------------------------------------
section "Duplicate third-party clones"
dupes=$(for d in "$HOME/Documents"/*/skills "$HOME/Documents"/*/*/skills; do
  [ -d "$d/.git" ] || continue
  printf '%s\t%s\n' "$(git -C "$d" remote get-url origin 2>/dev/null)" "$d"
done | sort | awk -F'\t' '$1!="" {c[$1]=c[$1]" "$2; n[$1]++} END {for (r in n) if (n[r]>1) print r"|"c[r]}')
if [ -n "$dupes" ]; then
  while IFS='|' read -r remote paths; do
    [ -z "$remote" ] && continue
    note "$remote cloned more than once:"
    for p in $paths; do echo "        $p  ($(git -C "$p" rev-parse --short HEAD 2>/dev/null))"; done
  done <<< "$dupes"
  echo "    Check for stashes and local-only branches before deleting either:"
  echo "      git -C <path> stash list && git -C <path> branch -vv"
else
  clean "no duplicate clones found"
fi

# ---------------------------------------------------------------------------
echo
echo "──────────────────────────────────────────"
if [ "$FINDINGS" -eq 0 ]; then
  echo " No drift. Machine and repo agree."
else
  echo " $FINDINGS finding(s) above need a decision."
fi
echo "──────────────────────────────────────────"
exit 0

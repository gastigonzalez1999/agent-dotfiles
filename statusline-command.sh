#!/usr/bin/env bash
input=$(cat)

# Parse fields via Node.js — one value per line
parsed=$(echo "$input" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{d=JSON.parse(d)}catch(e){d={}};const m=(d.model||{}).display_name||'';const s=d.session_id||'';const p=d.context_window?String(Math.round(d.context_window.used_percentage||0)):'';const c=(d.cost||{}).total_cost_usd||0;console.log(m+'\n'+s+'\n'+p+'\n'+c);})")

{
    IFS= read -r model_display
    IFS= read -r session_id
    IFS= read -r used_pct
    IFS= read -r total_cost_usd
} <<< "$parsed"

cwd="$(pwd)"
[ -z "$model_display" ] && model_display="Claude"

# ---------------------------------------------------------------------------
# ANSI colors
# ---------------------------------------------------------------------------
GREEN='\033[32m'
YELLOW='\033[33m'
RESET='\033[0m'

# ---------------------------------------------------------------------------
# Line 1 — model label + project folder + git branch
# ---------------------------------------------------------------------------
case "$model_display" in
    *Opus*)   model_short="Opus"   ;;
    *Sonnet*) model_short="Sonnet" ;;
    *Haiku*)  model_short="Haiku"  ;;
    *)        model_short="$model_display" ;;
esac

project_name="${cwd##*/}"
[ -z "$project_name" ] && project_name="$cwd"

git_branch=$(git -C "$cwd" --no-optional-locks branch --show-current 2>/dev/null)
[ -z "$git_branch" ] && git_branch=$(git --no-optional-locks branch --show-current 2>/dev/null)

model_label="[${model_short}]"
folder_part="$(printf '\xf0\x9f\x93\x81') ${project_name}"
if [ -n "$git_branch" ]; then
    branch_part="$(printf '\xf0\x9f\x8c\xbf') ${git_branch}"
    line1="${model_label} ${folder_part} | ${branch_part}"
else
    line1="${model_label} ${folder_part}"
fi

# ---------------------------------------------------------------------------
# Line 2 — context progress bar + cost + elapsed time
# ---------------------------------------------------------------------------
BAR_WIDTH=20
FILLED_CHAR=$'\xe2\x96\x88'
EMPTY_CHAR=$'\xc2\xb7'

if [ -n "$used_pct" ]; then
    used_int="$used_pct"
    filled=$(( used_int * BAR_WIDTH / 100 ))
    [ "$filled" -gt "$BAR_WIDTH" ] && filled=$BAR_WIDTH
else
    used_int=0
    filled=0
fi
empty=$(( BAR_WIDTH - filled ))

bar_filled=""
bar_empty=""
for ((i=0; i<filled; i++)); do bar_filled+="$FILLED_CHAR"; done
for ((i=0; i<empty;  i++)); do bar_empty+="$EMPTY_CHAR";   done

cost=$(awk -v c="$total_cost_usd" 'BEGIN { printf "$%.4f", c }')

# Elapsed time — uses $HOME for cross-OS compatibility
time_dir="$HOME/.claude/session-times"
mkdir -p "$time_dir" 2>/dev/null
if [ -n "$session_id" ]; then
    time_file="${time_dir}/${session_id}"
    [ ! -f "$time_file" ] && date +%s > "$time_file" 2>/dev/null
    start_ts=$(cat "$time_file" 2>/dev/null)
    now_ts=$(date +%s)
    if [ -n "$start_ts" ] && [ -n "$now_ts" ]; then
        elapsed_s=$(( now_ts - start_ts ))
        elapsed_m=$(( elapsed_s / 60 ))
        elapsed_r=$(( elapsed_s % 60 ))
        elapsed_str=$(printf "%dm%02ds" "$elapsed_m" "$elapsed_r")
    else
        elapsed_str="--"
    fi
else
    elapsed_str="--"
fi

stopwatch="$(printf '\xe2\x8f\xb1')"

line2=$(printf "${GREEN}%s${RESET}%s %s%% | ${YELLOW}%s${RESET} | %s %s" \
    "$bar_filled" "$bar_empty" "$used_int" "$cost" "$stopwatch" "$elapsed_str")

printf "${GREEN}%s${RESET}\n%s\n" "$line1" "$line2"

# Claude Code dotfiles setup — Windows PowerShell
#
# Parity with install-claude.sh for machines without Git Bash on PATH.
#   powershell -ExecutionPolicy Bypass -File .\install-claude.ps1
#   .\install-claude.ps1 -WithRetro      # also install the weekly retro hook
#
# Windows PowerShell 5.1 compatible: no &&/||, no ternary, no ?? operators.

param(
  [switch] $WithRetro,
  [switch] $SkipExternal   # custom skills + settings only; skip the GitHub clones
)

$ErrorActionPreference = "Stop"

$ScriptDir = $PSScriptRoot
$ClaudeDir = Join-Path $env:USERPROFILE ".claude"
$SkillsDir = Join-Path $ClaudeDir "skills"

New-Item -ItemType Directory -Force -Path $ClaudeDir | Out-Null
New-Item -ItemType Directory -Force -Path $SkillsDir | Out-Null

Write-Host "Setting up Claude Code dotfiles..."

$HasNode = [bool] (Get-Command node -ErrorAction SilentlyContinue)
$HasGit  = [bool] (Get-Command git  -ErrorAction SilentlyContinue)
if (-not $HasNode) {
  Write-Host "  [warn] node not found - the loop runner, hooks and settings merge will be skipped"
}

# ---------------------------------------------------------------------------
# 1. Statusline
# ---------------------------------------------------------------------------
Write-Host "Installing statusline script..."
Copy-Item -LiteralPath (Join-Path $ScriptDir "statusline-command.sh") `
          -Destination (Join-Path $ClaudeDir "statusline-command.sh") -Force
Write-Host "  [ok] statusline-command.sh"

# ---------------------------------------------------------------------------
# 2. Base settings (merged, never overwritten)
# ---------------------------------------------------------------------------
Write-Host "Merging base settings..."
if ($HasNode) {
  & node (Join-Path $ScriptDir "scripts\merge-settings.mjs")
  if ($LASTEXITCODE -ne 0) { Write-Host "  [warn] settings merge failed" }
} else {
  Write-Host "  [skip] node not available"
}

# ---------------------------------------------------------------------------
# 3. Skills
# ---------------------------------------------------------------------------

# Each skill declares who it ships to via `targets:` frontmatter. A skill with
# no `targets:` line ships everywhere, so older skills keep working.
function Test-TargetsInclude {
  param([string] $SkillDir, [string] $Harness)
  $skillMd = Join-Path $SkillDir "SKILL.md"
  if (-not (Test-Path -LiteralPath $skillMd)) { return $false }
  $line = Select-String -LiteralPath $skillMd -Pattern '^targets:' | Select-Object -First 1
  if ($null -eq $line) { return $true }
  return $line.Line -like "*$Harness*"
}

# Third-party skills land with an `@` suffix so they never collide with ours.
function Install-ExternalSkill {
  param([string] $Repo, [string] $Subfolder, [string] $Name)
  $target = Join-Path $SkillsDir ($Name + "@")
  if (Test-Path -LiteralPath $target) {
    Write-Host "  [skip] $Name already installed"
    return
  }
  # Something else already provides this skill under its plain name - usually a
  # symlink into ~/.agents/skills managed by the skills CLI. Installing our own
  # copy alongside it loads the same skill twice under two names.
  if (Test-Path -LiteralPath (Join-Path $SkillsDir $Name)) {
    Write-Host "  [skip] $Name - already provided under its plain name"
    return
  }
  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
  try {
    & git clone --depth=1 "https://github.com/$Repo" $tmp --quiet 2>$null
    if ($LASTEXITCODE -ne 0) { Write-Host "  [fail] $Name - clone failed"; return }
    $src = Join-Path $tmp $Subfolder
    if (-not (Test-Path -LiteralPath $src)) { Write-Host "  [fail] $Name - $Subfolder not in repo"; return }
    Copy-Item -LiteralPath $src -Destination $target -Recurse -Force
    Write-Host "  [ok] $Name"
  } finally {
    if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue }
  }
}

if (-not $SkipExternal) {
  if ($HasGit) {
    Write-Host "Installing external skills..."
    # Kept in step with the same list in install-claude.sh.
    $external = @(
      @("obra/superpowers",                  "skills/using-superpowers",        "using-superpowers"),
      @("obra/superpowers",                  "skills/using-git-worktrees",      "using-git-worktrees"),
      @("obra/superpowers",                  "skills/systematic-debugging",     "systematic-debugging"),
      @("softaworks/agent-toolkit",          "skills/session-handoff",          "session-handoff"),
      @("vercel-labs/skills",                "skills/find-skills",              "find-skills"),
      @("anthropics/skills",                 "frontend-design",                 "frontend-design"),
      @("addyosmani/web-quality-skills",     "skills/accessibility",            "accessibility"),
      @("addyosmani/web-quality-skills",     "skills/seo",                      "seo"),
      @("vercel-labs/next-skills",           "next-best-practices",             "next-best-practices"),
      @("vercel-labs/next-skills",           "next-cache-components",           "next-cache-components"),
      @("vercel-labs/next-skills",           "next-upgrade",                    "next-upgrade"),
      @("kadajett/agent-nestjs-skills",      "nestjs-best-practices",           "nestjs-best-practices"),
      @("mindrally/skills",                  "typeorm",                         "typeorm"),
      @("prisma/skills",                     "prisma-cli",                      "prisma-cli"),
      @("prisma/skills",                     "prisma-client-api",               "prisma-client-api"),
      @("prisma/skills",                     "prisma-database-setup",           "prisma-database-setup"),
      @("prisma/skills",                     "prisma-postgres",                 "prisma-postgres"),
      @("prisma/skills",                     "prisma-upgrade-v7",               "prisma-upgrade-v7"),
      @("hoodini/ai-agents-skills",          "skills/mongodb",                  "mongodb"),
      @("sickn33/antigravity-awesome-skills","skills/docker-expert",            "docker-expert"),
      @("sickn33/antigravity-awesome-skills","skills/typescript-advanced-types", "typescript-advanced-types"),
      @("sickn33/antigravity-awesome-skills","skills/nodejs-best-practices",    "nodejs-best-practices")
    )
    foreach ($e in $external) { Install-ExternalSkill -Repo $e[0] -Subfolder $e[1] -Name $e[2] }
  } else {
    Write-Host "  [skip] external skills - git not found"
  }
}

Write-Host "Installing custom skills..."
Get-ChildItem -LiteralPath (Join-Path $ScriptDir "skills") -Directory | ForEach-Object {
  if (-not (Test-TargetsInclude -SkillDir $_.FullName -Harness "claude")) {
    Write-Host "  [skip] $($_.Name) - not targeted at claude"
    return
  }
  $dest = Join-Path $SkillsDir $_.Name
  # Skipped skills are left alone: a same-named skill there may be a symlink
  # the user installed from elsewhere.
  if (Test-Path -LiteralPath $dest) { Remove-Item -LiteralPath $dest -Recurse -Force }
  Copy-Item -LiteralPath $_.FullName -Destination $dest -Recurse -Force
}
Write-Host "  [ok] custom skills synced"

# ---------------------------------------------------------------------------
# 4. Loop runner + enforcement hooks
# ---------------------------------------------------------------------------
if ($HasNode) {
  Write-Host "Installing the loop runner..."
  $loopDest = Join-Path $ClaudeDir "loop"
  if (Test-Path -LiteralPath $loopDest) { Remove-Item -LiteralPath $loopDest -Recurse -Force }
  Copy-Item -LiteralPath (Join-Path $ScriptDir "loop") -Destination $loopDest -Recurse -Force

  # Run the installed copy, not the repo copy: hook commands are written
  # relative to the loop.mjs that installs them.
  $loopMjs = Join-Path $loopDest "loop.mjs"
  if ($WithRetro) { & node $loopMjs install-hooks --with-retro } else { & node $loopMjs install-hooks }
  if ($LASTEXITCODE -ne 0) { Write-Host "  [warn] hook install failed - run: node `"$loopMjs`" install-hooks" }
}

# ---------------------------------------------------------------------------
# 5. MCP servers
# ---------------------------------------------------------------------------
Write-Host "Installing MCP servers..."
if (Get-Command claude -ErrorAction SilentlyContinue) {
  if (Get-Command codegraph -ErrorAction SilentlyContinue) {
    & claude mcp add-json --scope user codegraph '{"type":"stdio","command":"codegraph","args":["serve","--mcp"]}' 2>$null | Out-Null
    Write-Host "  [ok] codegraph"
  } else {
    Write-Host "  [skip] codegraph - binary not on PATH"
  }
} else {
  Write-Host "  [skip] claude CLI not found - see mcp/servers.json"
}

# ---------------------------------------------------------------------------
# 6. Global CLAUDE.md
# ---------------------------------------------------------------------------
# Merged rather than skipped, matching install-claude.sh: skipping meant a
# machine kept whatever CLAUDE.md it got on day one. Local-only sections survive.
$claudeMd = Join-Path $ClaudeDir "CLAUDE.md"
if ($HasNode) {
  & node (Join-Path $ScriptDir "scripts\merge-claude-md.mjs")
  if ($LASTEXITCODE -ne 0) { Write-Host "  [warn] CLAUDE.md merge failed" }
} elseif (Test-Path -LiteralPath $claudeMd) {
  Write-Host "  [warn] node not found - leaving the existing CLAUDE.md alone"
} else {
  Copy-Item -LiteralPath (Join-Path $ScriptDir "CLAUDE.md") -Destination $claudeMd -Force
  Write-Host "  [ok] CLAUDE.md"
}

Write-Host ""
Write-Host "Done. Skills: $SkillsDir"

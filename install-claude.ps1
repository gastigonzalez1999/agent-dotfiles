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
    # One list for every installer and the README: external-skills.txt.
    Get-Content -LiteralPath (Join-Path $ScriptDir "external-skills.txt") | ForEach-Object {
      $f = -split $_
      if ($f.Count -lt 3 -or $f[0].StartsWith("#")) { return }
      Install-ExternalSkill -Repo $f[0] -Subfolder $f[1] -Name $f[2]
    }
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
    # Windows PowerShell 5.1 strips the inner quotes of a JSON argument to a
    # native command, so add-json got invalid JSON; `mcp add` takes plain args.
    # Native stderr under "Stop" throws on 5.1, hence the local Continue.
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & claude mcp get codegraph *> $null
    if ($LASTEXITCODE -eq 0) {
      Write-Host "  [skip] codegraph already configured"
    } else {
      & claude mcp add --scope user codegraph -- codegraph serve --mcp *> $null
      if ($LASTEXITCODE -eq 0) { Write-Host "  [ok] codegraph" } else { Write-Host "  [warn] codegraph MCP add failed" }
    }
    $ErrorActionPreference = $prev
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

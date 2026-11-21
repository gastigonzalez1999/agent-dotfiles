import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { writeBlock } from './managed-block.mjs';

/**
 * Tell every agent in this repo that the loop exists.
 *
 * AGENTS.md is the one file nearly every agent reads natively (Cursor, Codex,
 * Copilot, Windsurf, Zed, Aider, Junie, opencode, ...). Claude Code reads it
 * only when no CLAUDE.md or CLAUDE.local.md exists in the project tree, so where
 * one does, it gets an `@AGENTS.md` import instead of a second copy.
 *
 * Team mode edits tracked files. Shadow mode never touches a tracked file and
 * hides everything it creates in .git/info/exclude, so a work repository's
 * `git status` and pull requests stay clean.
 */

export const BEGIN = '<!-- loop:begin -->';
export const END = '<!-- loop:end -->';
const IMPORT = '@AGENTS.md';

export const BLOCK = `${BEGIN}
## Verification loop

This repository declares how to verify work in \`.agent/loop.json\`. \`loop\` is
\`node ~/.claude/loop/loop.mjs\`, or \`npx -y github:gastigonzalez1999/agent-dotfiles loop\`
on a machine without it.

- After an edit: \`loop fast\`. Before saying the work is done: \`loop full\`, and it must exit 0.
- A failing \`guard\` check means a line you added breaks a project rule. Fix the cause; never suppress, reword or move the line to get past it.
- When the user corrects a mistake, propose a \`guard.rules\` entry in \`.agent/loop.json\` that would have caught it, instead of adding prose here.
- If \`features\` are declared, run \`loop prove\` for the ones you touched and cite \`.agent/.loop-proof/\` as evidence.
${END}`;

function git(root, ...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

export function isTracked(root, rel) {
  try {
    git(root, 'ls-files', '--error-unmatch', '--', rel);
    return true;
  } catch {
    return false;
  }
}

/** Add entries to .git/info/exclude, once each. Tracked paths are skipped: exclude cannot hide them. */
export function exclude(root, entries) {
  const path = git(root, 'rev-parse', '--path-format=absolute', '--git-path', 'info/exclude');
  const current = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const have = new Set(current.split(/\r?\n/).map((l) => l.trim()));
  const missing = entries.filter((e) => !have.has(e) && !isTracked(root, e.replace(/\/$/, '')));
  if (!missing.length) return [];
  mkdirSync(dirname(path), { recursive: true });
  const prefix = current && !current.endsWith('\n') ? '\n' : '';
  appendFileSync(path, `${prefix}# agent loop (shadow mode)\n${missing.join('\n')}\n`);
  return missing;
}

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null);
const hasImport = (text) => text.split(/\r?\n/).some((l) => l.trim() === IMPORT);
const withImport = (text) => (text ? `${text.replace(/\s*$/, '')}\n\n${IMPORT}\n` : `${IMPORT}\n`);

/**
 * Write the instructions. Returns { changed: [paths], excluded: [entries], notes: [strings] }.
 */
export function writeInstructions(root, { shadow = false } = {}) {
  const changed = [];
  const notes = [];
  const created = [];
  const agentsPath = join(root, 'AGENTS.md');
  const agents = read(agentsPath);
  const claudeFile = ['CLAUDE.md', join('.claude', 'CLAUDE.md')].find((f) => existsSync(join(root, f)));

  const canEditAgents = !shadow || !isTracked(root, 'AGENTS.md');
  if (canEditAgents) {
    const next = writeBlock(agents ?? '', BLOCK, BEGIN, END);
    if (next !== agents) {
      writeFileSync(agentsPath, next);
      changed.push('AGENTS.md');
      if (agents === null) created.push('AGENTS.md');
    }
  }

  if (!shadow) {
    if (claudeFile) {
      const text = read(join(root, claudeFile));
      if (!hasImport(text)) {
        writeFileSync(join(root, claudeFile), withImport(text));
        changed.push(claudeFile);
      }
    }
  } else {
    // Claude Code skips AGENTS.md when any CLAUDE.md or CLAUDE.local.md exists,
    // so it is routed through the untracked CLAUDE.local.md — which must always
    // import AGENTS.md, or creating it would switch off the native read. When
    // AGENTS.md is tracked and cannot be edited, the section goes there directly.
    const localPath = join(root, 'CLAUDE.local.md');
    const local = read(localPath);
    if (claudeFile || local !== null || !canEditAgents) {
      let next = local ?? '';
      if (!hasImport(next)) next = withImport(next);
      if (!canEditAgents) next = writeBlock(next, BLOCK, BEGIN, END);
      if (next !== local) {
        writeFileSync(localPath, next);
        changed.push('CLAUDE.local.md');
        if (local === null) created.push('CLAUDE.local.md');
      }
    }
    if (!canEditAgents) {
      notes.push(
        'AGENTS.md is tracked here, so shadow mode left it alone. Claude gets the loop section via CLAUDE.local.md; other agents rely on your global rules.',
      );
    }
  }

  const excluded = shadow ? exclude(root, ['.agent/', ...created]) : [];
  return { changed, excluded, notes };
}

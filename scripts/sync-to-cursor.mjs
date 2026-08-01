#!/usr/bin/env node
/**
 * Generate the Cursor toolkit from this repo.
 *
 * These two repos had ~15 hand-copied skills between them, already drifting.
 * agent-dotfiles is the source of truth; cursor-dotfiles is output. Skills are
 * authored once, here, and translated on the way out.
 *
 *   node scripts/sync-to-cursor.mjs <path-to-cursor-dotfiles> [--dry-run]
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(fileURLToPath(new URL('..', import.meta.url)));
const [, , targetArg, ...flags] = process.argv;
const dryRun = flags.includes('--dry-run');

if (!targetArg) {
  console.error('Usage: node scripts/sync-to-cursor.mjs <path-to-cursor-dotfiles> [--dry-run]');
  process.exit(2);
}

const target = resolve(targetArg);
if (!existsSync(join(target, 'skills')) || !existsSync(join(target, 'rules'))) {
  console.error(`${target} does not look like the cursor-dotfiles repo (needs skills/ and rules/).`);
  process.exit(2);
}

// Only the loop system is generated. The rest of cursor-dotfiles is hand-maintained
// and syncing it wholesale would clobber Cursor-specific edits.
const SKILLS = ['inner-loop', 'loop-init', 'outer-loop', 'loop-autonomous', 'loop-retro'];

let copied = 0;
for (const name of SKILLS) {
  const from = join(REPO, 'skills', name);
  if (!existsSync(from)) {
    console.log(`  [skip] ${name} — not in this repo`);
    continue;
  }
  const to = join(target, 'skills', name);
  if (!dryRun) {
    mkdirSync(dirname(to), { recursive: true });
    cpSync(from, to, { recursive: true });
    rewriteForCursor(join(to, 'SKILL.md'));
  }
  console.log(`  [ok]   skills/${name}`);
  copied++;
}

// The runner itself ships too — a rule telling the agent to run `loop` is useless
// on a machine where nothing provides it.
const loopTo = join(target, 'loop');
if (!dryRun) cpSync(join(REPO, 'loop'), loopTo, { recursive: true });
console.log('  [ok]   loop/ (runner)');

console.log(`\n${dryRun ? 'Would sync' : 'Synced'} ${copied} skills + runner to ${target}`);
console.log('Commit in cursor-dotfiles, then re-run its installer with --force.\n');

/** Claude skills reference ~/.claude paths; the Cursor copies must not. */
function rewriteForCursor(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8')
    .split('~/.claude/loop')
    .join('~/.cursor/loop')
    .split('.claude/skills')
    .join('.cursor/skills');
  writeFileSync(path, text);
}

/** Sanity check that every skill we claim to sync actually exists. */
export function listSkills() {
  return readdirSync(join(REPO, 'skills'));
}

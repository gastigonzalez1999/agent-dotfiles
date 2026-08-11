#!/usr/bin/env node
/**
 * Install this repo's codex/AGENTS.md into ~/.codex/AGENTS.md, without owning
 * the whole file.
 *
 * `install-codex.sh` used to `cp` straight over the target. That is fine while
 * this repo is the only writer, and destructive the moment something else
 * writes there too — which gentle-ai does. On a machine with both installed,
 * ~/.codex/AGENTS.md was 687 lines and *none* of them came from here: 74 lines
 * of gentle-ai persona, then its SDD orchestrator, Engram protocol and
 * agent-routing blocks. The copy replaced all of it with our 70 lines, every run.
 *
 *   node scripts/merge-codex-agents.mjs [--dry-run] [--target <path>]
 *
 * Policy — a shared file, so each writer owns a fenced region and nothing else:
 *   our fence      `<!-- agent-dotfiles:global -->` … `<!-- /agent-dotfiles:global -->`
 *                  is replaced with the current codex/AGENTS.md.
 *   fence absent   appended at the end, leaving existing content untouched.
 *   everything else preserved byte for byte, fenced or not.
 *
 * Appended rather than prepended: gentle-ai writes its persona at the top, and
 * reordering another tool's instructions is not ours to do.
 *
 * A timestamped .bak is written before any change.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SOURCE = join(REPO, 'codex', 'AGENTS.md');

const FENCE = 'agent-dotfiles:global';
const OPEN = `<!-- ${FENCE} -->`;
const CLOSE = `<!-- /${FENCE} -->`;

// $HOME wins over homedir(), and $CODEX_HOME wins over both: install-codex.sh
// resolves the target the same way, and on Windows homedir() reads USERPROFILE
// and ignores $HOME entirely.
const home = process.env.HOME || homedir();
const codexHome = process.env.CODEX_HOME || join(home, '.codex');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const targetPath = args.includes('--target')
  ? resolve(args[args.indexOf('--target') + 1])
  : join(codexHome, 'AGENTS.md');

if (!existsSync(SOURCE)) {
  console.error(`Missing ${SOURCE}`);
  process.exit(2);
}

const block = `${OPEN}\n${read(SOURCE).replace(/\n+$/, '')}\n${CLOSE}\n`;

// Nothing to preserve: this is a fresh machine, so our block is the whole file.
if (!existsSync(targetPath)) {
  if (dryRun) {
    console.log(`Would create ${targetPath}`);
    process.exit(0);
  }
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, block);
  console.log(`  [ok] installed AGENTS.md -> ${targetPath}`);
  process.exit(0);
}

const target = read(targetPath);
const { merged, action } = apply(target, block);

if (merged === target) {
  console.log(`AGENTS.md already matches the repo (${targetPath})`);
  process.exit(0);
}

if (dryRun) {
  const kept = target.split('\n').length - sliceOurs(target).length;
  console.log(`Would ${action} ${targetPath}`);
  console.log(`  keep     ${kept} line(s) owned by other tools`);
  process.exit(0);
}

const backup = `${targetPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
copyFileSync(targetPath, backup);
writeFileSync(targetPath, merged);

console.log(`  [ok] ${action === 'append' ? 'added' : 'updated'} ${FENCE} -> ${targetPath}`);
console.log(`  [ok] backup at ${backup}`);

/** Normalise line endings: a Windows checkout mixes CRLF and LF, and the scan below anchors on \n. */
function read(path) {
  return readFileSync(path, 'utf8').split('\r\n').join('\n');
}

/** The lines of `text` inside our fence, or [] when it is not there yet. */
function sliceOurs(text) {
  const lines = text.split('\n');
  const from = lines.findIndex((l) => l.trim() === OPEN);
  if (from === -1) return [];
  const to = lines.findIndex((l, i) => i > from && l.trim() === CLOSE);
  // An unclosed fence is ours to the end of the file — the safe reading, since
  // the alternative is appending a second copy of the block on every run.
  return lines.slice(from, to === -1 ? lines.length : to + 1);
}

/** Replace our fenced region in place, or append it when absent. */
function apply(text, body) {
  const lines = text.split('\n');
  const from = lines.findIndex((l) => l.trim() === OPEN);

  if (from === -1) {
    return { merged: `${text.replace(/\n+$/, '')}\n\n${body}`, action: 'append' };
  }

  const ours = sliceOurs(text);
  const after = lines.slice(from + ours.length);
  const merged = [
    ...lines.slice(0, from),
    ...body.replace(/\n+$/, '').split('\n'),
    ...after,
  ].join('\n');

  return { merged: merged.replace(/\n+$/, '') + '\n', action: 'update' };
}

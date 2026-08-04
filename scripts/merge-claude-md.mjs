#!/usr/bin/env node
/**
 * Merge this repo's CLAUDE.md into ~/.claude/CLAUDE.md.
 *
 * The installer used to skip CLAUDE.md whenever one already existed — the same
 * defect `merge-settings.mjs` was written to fix. The result is that a machine
 * keeps whatever CLAUDE.md it got on day one: skills ship, but the trigger
 * sections that tell a session those skills exist never arrive.
 *
 *   node scripts/merge-claude-md.mjs [--dry-run] [--target <path>]
 *
 * Policy — sections are keyed by their `# ` heading:
 *   in the repo         repo wins, in repo order. These are the shared rules;
 *                       editing them locally is what drift is made of.
 *   only in the target  kept, appended after the repo's sections. This is where
 *                       a machine's own notes live, and nothing here deletes them.
 *
 * Heading text is the key, so renaming a section upstream reads as "remove the
 * old, add the new" — the old one survives as if it were local. That is the safe
 * direction to fail: it keeps content rather than silently dropping it.
 *
 * A timestamped .bak is written before any change.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SOURCE = join(REPO, 'CLAUDE.md');

// $HOME wins over homedir(): install-claude.sh resolves everything else from
// $HOME, and on Windows homedir() reads USERPROFILE and ignores $HOME entirely.
const home = process.env.HOME || homedir();

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const targetPath = args.includes('--target')
  ? resolve(args[args.indexOf('--target') + 1])
  : join(home, '.claude', 'CLAUDE.md');

if (!existsSync(SOURCE)) {
  console.error(`Missing ${SOURCE}`);
  process.exit(2);
}

const source = read(SOURCE);

// Nothing to merge into: this is a fresh machine, so the repo copy is the answer.
if (!existsSync(targetPath)) {
  if (dryRun) {
    console.log(`Would create ${targetPath}`);
    process.exit(0);
  }
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, source);
  console.log(`  [ok] installed CLAUDE.md -> ${targetPath}`);
  process.exit(0);
}

const target = read(targetPath);

const sourceSections = splitSections(source);
const targetSections = splitSections(target);
const sourceHeadings = new Set(sourceSections.map((s) => s.heading));

const localOnly = targetSections.filter((s) => !sourceHeadings.has(s.heading));
const merged = [...sourceSections, ...localOnly].map((s) => s.text).join('\n');

if (merged === target) {
  console.log(`CLAUDE.md already matches the repo (${targetPath})`);
  process.exit(0);
}

if (dryRun) {
  const targetHeadings = new Set(targetSections.map((s) => s.heading));
  console.log(`Would update ${targetPath}`);
  for (const s of sourceSections) {
    if (!targetHeadings.has(s.heading)) console.log(`  add      ${s.heading || '(preamble)'}`);
    else if (s.text !== targetSections.find((t) => t.heading === s.heading).text) {
      console.log(`  update   ${s.heading || '(preamble)'}`);
    }
  }
  for (const s of localOnly) console.log(`  keep     ${s.heading} (local only)`);
  process.exit(0);
}

const backup = `${targetPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
copyFileSync(targetPath, backup);
writeFileSync(targetPath, merged);

console.log(`  [ok] merged CLAUDE.md -> ${targetPath}`);
console.log(`  [ok] backup at ${backup}`);
if (localOnly.length) {
  console.log(`  [ok] kept ${localOnly.length} local section(s): ${localOnly.map((s) => s.heading).join(', ')}`);
}

/** Normalise line endings: a Windows checkout mixes CRLF and LF, and every split below anchors on \n. */
function read(path) {
  return readFileSync(path, 'utf8').split('\r\n').join('\n');
}

/**
 * Split into `# `-level sections. Anything before the first heading is one
 * section with a null heading, so a file that opens with prose keeps it.
 */
function splitSections(text) {
  const sections = [];
  let current = { heading: null, lines: [] };
  for (const line of text.split('\n')) {
    if (/^# (?!#)/.test(line)) {
      sections.push(current);
      current = { heading: line.trim(), lines: [line] };
    } else {
      current.lines.push(line);
    }
  }
  sections.push(current);
  return sections
    .filter((s) => s.heading !== null || s.lines.join('').trim() !== '')
    .map((s) => ({ heading: s.heading, text: `${s.lines.join('\n').replace(/\n+$/, '')}\n` }));
}

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
 *   vendor fenced       lifted out before the split and re-appended at the end,
 *                       untouched. See extractVendorBlocks below for why.
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
const { text: targetBody, blocks: vendorBlocks } = extractVendorBlocks(target);

const sourceSections = splitSections(source);
const targetSections = splitSections(targetBody);
const sourceHeadings = new Set(sourceSections.map((s) => s.heading));

const localOnly = targetSections.filter((s) => !sourceHeadings.has(s.heading));
const merged = [
  ...[...sourceSections, ...localOnly].map((s) => s.text),
  ...vendorBlocks.map((b) => `${b.replace(/\n+$/, '')}\n`),
].join('\n');

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
  for (const b of vendorBlocks) console.log(`  keep     ${b.split('\n')[0].trim()} (vendor block)`);
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
if (vendorBlocks.length) {
  console.log(`  [ok] kept ${vendorBlocks.length} vendor block(s): ${vendorBlocks.map((b) => b.split('\n')[0].trim()).join(', ')}`);
}

/** Normalise line endings: a Windows checkout mixes CRLF and LF, and every split below anchors on \n. */
function read(path) {
  return readFileSync(path, 'utf8').split('\r\n').join('\n');
}

/**
 * Lift `<!-- vendor:block -->` … `<!-- /vendor:block -->` regions out of the
 * target before the heading split, returning them alongside the remaining text.
 *
 * gentle-ai writes its blocks into this same file, and several of them trail
 * after our last `# ` section without a heading of their own. The splitter read
 * them as part of that section, and replacing the section from the repo then
 * deleted them outright — silently, which is the one thing the policy above says
 * this script must never do. One block also *contains* `# ` headings, so the
 * splitter used to cut it into three.
 *
 * A marker only counts as a fence when its closer actually exists. gentle-ai
 * also emits `:start`/`:end` markers inside its own blocks, and treating one of
 * those as an unclosed fence would swallow the rest of the file.
 */
function extractVendorBlocks(text) {
  const lines = text.split('\n');
  const opener = /^<!-- ([a-z0-9-]+:[a-z0-9-]+) -->$/;
  const blocks = [];
  const kept = [];

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].trim().match(opener);
    if (!match) {
      kept.push(lines[i]);
      continue;
    }
    const closer = `<!-- /${match[1]} -->`;
    const end = lines.findIndex((l, j) => j > i && l.trim() === closer);
    if (end === -1) {
      kept.push(lines[i]);
      continue;
    }
    blocks.push(lines.slice(i, end + 1).join('\n'));
    i = end;
  }

  return { text: kept.join('\n'), blocks };
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

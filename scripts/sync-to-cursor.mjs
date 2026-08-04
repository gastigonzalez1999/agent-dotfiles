#!/usr/bin/env node
/**
 * Generate the Cursor toolkit from this repo.
 *
 * These two repos had ~15 hand-copied skills between them, already drifting.
 * agent-dotfiles is the source of truth; cursor-dotfiles is output. Skills are
 * authored once, here, and translated on the way out.
 *
 * What ships is decided per skill by its `targets:` frontmatter, not by a list
 * kept in this file — a list here is the thing that goes stale.
 *
 *   node scripts/sync-to-cursor.mjs <path-to-cursor-dotfiles> [--dry-run|--check]
 *
 * --dry-run  report what would change, write nothing
 * --check    exit 1 if the target is out of date (for CI / pre-push)
 */
import {
  cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync,
  rmSync, statSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { REPO, readAllSkills } from './lib/skills.mjs';

const [, , targetArg, ...flags] = process.argv;
const dryRun = flags.includes('--dry-run');
const check = flags.includes('--check');

if (!targetArg) {
  console.error('Usage: node scripts/sync-to-cursor.mjs <path-to-cursor-dotfiles> [--dry-run|--check]');
  process.exit(2);
}

const target = resolve(targetArg);
if (!existsSync(join(target, 'skills')) || !existsSync(join(target, 'rules'))) {
  console.error(`${target} does not look like the cursor-dotfiles repo (needs skills/ and rules/).`);
  process.exit(2);
}

// The index rule is generated, never copied — a hand-maintained routing table
// silently starts lying the moment a skill is added or renamed.
const GENERATED_RULE = 'toolkit-skills-index.mdc';

/** .gitattributes pins these to LF, so a CRLF working copy is a checkout artefact. */
const TEXT = /\.(md|mdc|mjs|js|json|sh|txt|yml|yaml)$/i;

// ---------------------------------------------------------------------------
// Read the manifest: every skill declares who it ships to.
// ---------------------------------------------------------------------------

const all = readAllSkills();
const shipping = all.filter((s) => s.targets.includes('cursor'));

// ---------------------------------------------------------------------------
// Stage the full output, then compare. Staging first is what makes --check
// honest: it compares against what a real sync would actually produce.
// ---------------------------------------------------------------------------

const stage = mkdtempSync(join(tmpdir(), 'cursor-sync-'));

mkdirSync(join(stage, 'skills'), { recursive: true });
for (const skill of shipping) {
  const to = join(stage, 'skills', skill.name);
  cpSync(join(REPO, 'skills', skill.name), to, { recursive: true });
  rewriteTree(to);
}

mkdirSync(join(stage, 'rules'), { recursive: true });
for (const file of readdirSync(join(REPO, 'rules'))) {
  if (file === GENERATED_RULE) continue;
  cpSync(join(REPO, 'rules', file), join(stage, 'rules', file));
}
writeFileSync(join(stage, 'rules', GENERATED_RULE), buildSkillsIndex(shipping));

// Slash commands live under ~/.cursor/commands, installed globally.
mkdirSync(join(stage, 'commands'), { recursive: true });
for (const file of readdirSync(join(REPO, 'cursor', 'commands'))) {
  cpSync(join(REPO, 'cursor', 'commands', file), join(stage, 'commands', file));
}

// The runner itself ships too — a rule telling the agent to run `loop` is
// useless on a machine where nothing provides it.
cpSync(join(REPO, 'loop'), join(stage, 'loop'), { recursive: true });

// Emit LF regardless of how the source repo happens to be checked out, matching
// what .gitattributes pins on both sides.
normalizeTree(stage);

// ---------------------------------------------------------------------------
// Diff staging against the target.
// ---------------------------------------------------------------------------

const MANAGED = ['skills', 'rules', 'commands', 'loop'];
const changes = [];

// The target README is hand-written except for one inventory block. It used to
// claim "Eight rules" and list a skill that had been deleted, so the counts are
// generated here rather than remembered there.
const readmePath = join(target, 'README.md');
const readmeBefore = existsSync(readmePath)
  ? readFileSync(readmePath, 'utf8').split('\r\n').join('\n')
  : null;
const readmeAfter = readmeBefore === null ? null : applyInventory(readmeBefore);
if (readmeAfter !== null && readmeAfter !== readmeBefore) changes.push(['update', 'README.md']);

for (const dir of MANAGED) {
  const wanted = walk(join(stage, dir));
  const present = walk(join(target, dir));

  for (const [rel, content] of wanted) {
    const existing = present.get(rel);
    if (existing === undefined) changes.push(['add', `${dir}/${rel}`]);
    else if (!existing.equals(content)) changes.push(['update', `${dir}/${rel}`]);
  }
  for (const rel of present.keys()) {
    if (!wanted.has(rel)) changes.push(['remove', `${dir}/${rel}`]);
  }
}

if (check) {
  if (changes.length) {
    console.error(`cursor-dotfiles is out of date — ${changes.length} file(s) differ:\n`);
    for (const [kind, path] of changes.slice(0, 40)) console.error(`  [${kind}] ${path}`);
    if (changes.length > 40) console.error(`  … and ${changes.length - 40} more`);
    console.error('\nRun: node scripts/sync-to-cursor.mjs <path>');
    rmSync(stage, { recursive: true, force: true });
    process.exit(1);
  }
  console.log(`cursor-dotfiles is up to date (${shipping.length} skills).`);
  rmSync(stage, { recursive: true, force: true });
  process.exit(0);
}

if (!changes.length) {
  console.log(`Already up to date (${shipping.length} skills).`);
  rmSync(stage, { recursive: true, force: true });
  process.exit(0);
}

for (const [kind, path] of changes) console.log(`  [${kind}] ${path}`);

if (dryRun) {
  console.log(`\nWould sync ${shipping.length} skills + ${readdirSync(join(stage, 'rules')).length} rules + runner to ${target}`);
  rmSync(stage, { recursive: true, force: true });
  process.exit(0);
}

// Replace wholesale: the target is output, so stale files must not survive.
for (const dir of MANAGED) {
  rmSync(join(target, dir), { recursive: true, force: true });
  cpSync(join(stage, dir), join(target, dir), { recursive: true });
}
// The README is not wholesale-replaced — only its inventory block is touched.
if (readmeAfter !== null && readmeAfter !== readmeBefore) writeFileSync(readmePath, readmeAfter);
rmSync(stage, { recursive: true, force: true });

const skipped = all.length - shipping.length;
console.log(`\nSynced ${shipping.length} skills + rules + runner to ${target}`);
console.log(`(${skipped} skill(s) not targeted at cursor)`);
console.log('Commit in cursor-dotfiles, then re-run its installer with --force.\n');

// ---------------------------------------------------------------------------

/**
 * Fill the target README's inventory block, if it has one.
 *
 * Returns the text unchanged when the markers are absent, so this stays
 * optional: the README is hand-written and a clone without the markers is not
 * an error, just one that keeps its own counts.
 */
function applyInventory(text) {
  const begin = '<!-- generated:begin inventory -->';
  const end = '<!-- generated:end inventory -->';
  const from = text.indexOf(begin);
  const to = text.indexOf(end);
  if (from === -1 || to === -1) return text;

  const rules = readdirSync(join(stage, 'rules')).sort();
  const body = [
    '<!-- Generated by agent-dotfiles/scripts/sync-to-cursor.mjs. Edits here are overwritten. -->',
    '',
    `- **${shipping.length} skills** under \`.cursor/skills/<slug>/SKILL.md\`. The full routing`,
    '  table, with each skill\'s trigger, is in `rules/toolkit-skills-index.mdc`.',
    `- **${rules.length} rules** under \`.cursor/rules/toolkit-*.mdc\`:`,
    `  ${rules.map((r) => `\`${r.replace(/^toolkit-|\.mdc$/g, '')}\``).join(', ')}.`,
  ].join('\n');

  return `${text.slice(0, from + begin.length)}\n${body}\n${text.slice(to)}`;
}

/**
 * Every file under `dir`, keyed by path relative to it.
 *
 * Text files are normalized to LF first. Without this, a source file that a
 * Windows tool happened to write with CRLF makes --check report a divergence
 * git itself does not see (it normalizes before diffing), and a sync that
 * "fixes" it by copying the CRLF straight through.
 */
function walk(dir, base = dir, into = new Map()) {
  if (!existsSync(dir)) return into;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, base, into);
    else {
      const rel = relative(base, full).split('\\').join('/');
      const raw = readFileSync(full);
      into.set(rel, TEXT.test(entry) ? Buffer.from(raw.toString('utf8').split('\r\n').join('\n')) : raw);
    }
  }
  return into;
}

/** Rewrite every text file under `dir` with LF endings, in place. */
function normalizeTree(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) normalizeTree(full);
    else if (TEXT.test(entry)) {
      const raw = readFileSync(full, 'utf8');
      const lf = raw.split('\r\n').join('\n');
      if (lf !== raw) writeFileSync(full, lf);
    }
  }
}

/** Claude skills reference ~/.claude paths; the Cursor copies must not. */
function rewriteTree(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) rewriteTree(full);
    else if (entry.endsWith('.md')) {
      const text = readFileSync(full, 'utf8')
        .split('~/.claude/loop').join('~/.cursor/loop')
        .split('.claude/skills').join('.cursor/skills');
      writeFileSync(full, text);
    }
  }
}

/**
 * The routing table Cursor reads to decide which skill to open. Generated from
 * the same frontmatter the skills themselves declare, so it cannot drift.
 */
function buildSkillsIndex(skills) {
  const rows = skills
    .map((s) => `| ${s.description.replace(/\|/g, '\\|')} | \`${s.name}\` |`)
    .join('\n');

  return `---
description: When to read bundled toolkit skills under .cursor/skills/<slug>/SKILL.md
alwaysApply: true
---

<!-- Generated by agent-dotfiles/scripts/sync-to-cursor.mjs. Do not edit by hand. -->

# Toolkit skills index

Cursor discovers skills in **this project's** \`.cursor/skills/\` (each skill is a
folder with \`SKILL.md\`). When a task matches a row below, **read that skill
once** and apply it. You do not need to quote paths in the reply.

| Use when… | Skill folder |
|-----------|--------------|
${rows}
`;
}

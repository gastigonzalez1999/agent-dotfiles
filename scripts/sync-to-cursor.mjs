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
import { fileURLToPath } from 'node:url';

const REPO = resolve(fileURLToPath(new URL('..', import.meta.url)));
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

// ---------------------------------------------------------------------------
// Read the manifest: every skill declares who it ships to.
// ---------------------------------------------------------------------------

/** Parse the frontmatter we care about. Deliberately minimal — no YAML dep. */
function readSkill(name) {
  const path = join(REPO, 'skills', name, 'SKILL.md');
  if (!existsSync(path)) return null;
  // Normalize line endings before parsing: a Windows checkout can leave CRLF
  // here, and every pattern below anchors on \n.
  const text = readFileSync(path, 'utf8').split('\r\n').join('\n');
  if (!text.startsWith('---')) return { name, targets: [], description: '', invalid: 'no frontmatter' };

  const end = text.indexOf('\n---', 3);
  const front = text.slice(3, end === -1 ? undefined : end);

  const targetsMatch = front.match(/^targets:\s*\[(.*?)\]/m);
  const targets = targetsMatch
    ? targetsMatch[1].split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  // `description:` is either inline or a `>-` folded block continuing on
  // indented lines.
  let description = '';
  const inline = front.match(/^description:[ \t]*([^>\s].*)$/m);
  if (inline) {
    description = inline[1].trim().replace(/^["']|["']$/g, '');
  } else {
    const folded = front.match(/^description:[ \t]*>-?\n((?:[ \t]+.*\n?)+)/m);
    if (folded) description = folded[1].split('\n').map((l) => l.trim()).filter(Boolean).join(' ');
  }

  const invalid = !targetsMatch ? 'no targets:' : !description ? 'no description:' : null;
  return { name, targets, description, invalid };
}

const all = readdirSync(join(REPO, 'skills'))
  .filter((n) => statSync(join(REPO, 'skills', n)).isDirectory())
  .map(readSkill)
  .filter(Boolean);

const broken = all.filter((s) => s.invalid);
if (broken.length) {
  console.error('These skills cannot be shipped — fix their frontmatter first:');
  for (const s of broken) console.error(`  ${s.name}: ${s.invalid}`);
  process.exit(2);
}

const shipping = all.filter((s) => s.targets.includes('cursor')).sort((a, b) => a.name.localeCompare(b.name));

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

// ---------------------------------------------------------------------------
// Diff staging against the target.
// ---------------------------------------------------------------------------

const MANAGED = ['skills', 'rules', 'commands', 'loop'];
const changes = [];

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
rmSync(stage, { recursive: true, force: true });

const skipped = all.length - shipping.length;
console.log(`\nSynced ${shipping.length} skills + rules + runner to ${target}`);
console.log(`(${skipped} skill(s) not targeted at cursor)`);
console.log('Commit in cursor-dotfiles, then re-run its installer with --force.\n');

// ---------------------------------------------------------------------------

/** Every file under `dir`, keyed by path relative to it. */
function walk(dir, base = dir, into = new Map()) {
  if (!existsSync(dir)) return into;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, base, into);
    else into.set(relative(base, full).split('\\').join('/'), readFileSync(full));
  }
  return into;
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

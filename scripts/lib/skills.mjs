/**
 * Read the skill manifest: every skill declares who it ships to.
 *
 * Shared by sync-to-cursor.mjs and build-docs.mjs. Kept in one place because
 * the parser below has already been wrong twice — once on CRLF checkouts, once
 * on folded `>-` descriptions — and a second copy would only be fixed once.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));

/** Parse the frontmatter we care about. Deliberately minimal — no YAML dep. */
export function readSkill(name, repo = REPO) {
  const path = join(repo, 'skills', name, 'SKILL.md');
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

/** Every skill in the repo, sorted by name. Exits 2 if any cannot be shipped. */
export function readAllSkills(repo = REPO) {
  const all = readdirSync(join(repo, 'skills'))
    .filter((n) => statSync(join(repo, 'skills', n)).isDirectory())
    .map((n) => readSkill(n, repo))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  const broken = all.filter((s) => s.invalid);
  if (broken.length) {
    console.error('These skills cannot be shipped — fix their frontmatter first:');
    for (const s of broken) console.error(`  ${s.name}: ${s.invalid}`);
    process.exit(2);
  }
  return all;
}

/**
 * The third-party skills install-claude.sh clones, read from the script itself.
 * The README used to list these by hand and had drifted to naming seven skills
 * the installer does not install, several with invented attributions.
 */
export function readExternalSkills(repo = REPO) {
  const text = readFileSync(join(repo, 'install-claude.sh'), 'utf8');
  const out = [];
  for (const m of text.matchAll(/^install_skill\s+"([^"]+)"\s+"([^"]+)"\s+"([^"]+)"/gm)) {
    out.push({ repo: m[1], subfolder: m[2], name: m[3] });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

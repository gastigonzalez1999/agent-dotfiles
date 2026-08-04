#!/usr/bin/env node
/**
 * Merge claude/settings.base.json into ~/.claude/settings.json.
 *
 * The installer used to skip settings.json whenever one already existed, which
 * meant machine settings only ever landed on a brand new machine — i.e. never.
 * Merging is what makes them portable.
 *
 *   node scripts/merge-settings.mjs [--dry-run] [--settings <path>]
 *
 * Policy:
 *   hooks                 entries are added if absent, matched by command string.
 *                         Nothing is ever removed — `loop install-hooks` owns the
 *                         gate hooks and must not be fought over.
 *   permissions.allow     union, deduplicated. A permission you granted stays.
 *   env, enabledPlugins,
 *   extraKnownMarketplaces  shallow merge, base wins per key.
 *   everything else       base wins.
 *
 * Anything not mentioned in the base file is left exactly as it is, so local-only
 * keys survive. A timestamped .bak is written before any change.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(fileURLToPath(new URL('..', import.meta.url)));
const BASE = join(REPO, 'claude', 'settings.base.json');

// $HOME wins over homedir(): install-claude.sh resolves everything else from
// $HOME, and on Windows homedir() reads USERPROFILE and ignores $HOME entirely.
// When the two differ, the installer would copy skills to one home and write
// settings to another.
const home = process.env.HOME || homedir();

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const settingsPath = args.includes('--settings')
  ? resolve(args[args.indexOf('--settings') + 1])
  : join(home, '.claude', 'settings.json');

if (!existsSync(BASE)) {
  console.error(`Missing ${BASE}`);
  process.exit(2);
}

const base = JSON.parse(readFileSync(BASE, 'utf8'));
const current = readJson(settingsPath);
const before = JSON.stringify(current);

const SHALLOW_MERGE = ['env', 'enabledPlugins', 'extraKnownMarketplaces'];

for (const [key, value] of Object.entries(base)) {
  if (key === 'hooks') {
    current.hooks = mergeHooks(current.hooks ?? {}, value);
  } else if (key === 'permissions') {
    current.permissions ??= {};
    for (const [permKey, permValue] of Object.entries(value)) {
      current.permissions[permKey] = Array.isArray(permValue)
        ? [...new Set([...(current.permissions[permKey] ?? []), ...permValue])]
        : permValue;
    }
  } else if (SHALLOW_MERGE.includes(key)) {
    current[key] = { ...(current[key] ?? {}), ...value };
  } else {
    current[key] = value;
  }
}

if (JSON.stringify(current) === before) {
  console.log(`settings.json already matches the base (${settingsPath})`);
  process.exit(0);
}

if (dryRun) {
  console.log(`Would update ${settingsPath}:`);
  console.log(JSON.stringify(current, null, 2));
  process.exit(0);
}

let backup = null;
if (existsSync(settingsPath)) {
  backup = `${settingsPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  copyFileSync(settingsPath, backup);
}
mkdirSync(dirname(settingsPath), { recursive: true });
writeFileSync(settingsPath, `${JSON.stringify(current, null, 2)}\n`);

console.log(`  [ok] merged base settings -> ${settingsPath}`);
if (backup) console.log(`  [ok] backup at ${backup}`);

/**
 * Add missing hook entries without disturbing existing ones. Hooks are matched
 * on their command string: re-running must not stack duplicates, and must not
 * delete hooks this file does not know about.
 */
function mergeHooks(currentHooks, baseHooks) {
  const merged = { ...currentHooks };
  for (const [event, entries] of Object.entries(baseHooks)) {
    const existing = Array.isArray(merged[event]) ? merged[event] : [];
    const commands = new Set(
      existing.flatMap((e) => (e.hooks ?? []).map((h) => h.command)),
    );
    const missing = entries.filter(
      (e) => !(e.hooks ?? []).every((h) => commands.has(h.command)),
    );
    merged[event] = [...existing, ...missing];
  }
  return merged;
}

function readJson(path) {
  if (!existsSync(path)) return {};
  const text = readFileSync(path, 'utf8').trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    // Never overwrite a settings file we cannot parse — that is someone's whole setup.
    console.error(`${path} is not valid JSON (${err.message}). Fix it first.`);
    process.exit(2);
  }
}

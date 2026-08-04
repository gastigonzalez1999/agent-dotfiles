import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOKS_DIR = resolve(fileURLToPath(new URL('../hooks', import.meta.url)));

/** Backslashes are escape characters to the shell that runs hooks; Node accepts forward slashes on Windows. */
const shellPath = (p) => p.split('\\').join('/');

const HOOK_SPECS = [
  {
    event: 'Stop',
    script: 'stop-gate.mjs',
    timeout: 15,
  },
  {
    event: 'PostToolUse',
    matcher: 'Edit|Write|MultiEdit|NotebookEdit',
    script: 'post-edit-gate.mjs',
    // Generous: covers a fast gate when a repo opts into postEditGate. The
    // no-op path (just touching the dirty marker) returns in milliseconds.
    timeout: 120,
  },
];

/** Our entries are recognisable by path, so reinstalling replaces rather than duplicates. */
const isOurs = (entry) =>
  entry?.hooks?.some((h) => typeof h.command === 'string' && h.command.includes('/loop/hooks/'));

/** Unattended learning. Separate from the enforcement hooks because it *writes* rather than blocks. */
const RETRO_SPEC = { event: 'SessionStart', script: 'retro-auto.mjs', timeout: 60 };

// $HOME wins over homedir(): the installer resolves everything else from $HOME,
// and on Windows homedir() reads USERPROFILE and ignores $HOME entirely.
const HOME = process.env.HOME || homedir();

export function installHooks({
  settingsPath = join(HOME, '.claude', 'settings.json'),
  dryRun = false,
  withRetro = false,
} = {}) {
  // Hook commands are written as absolute paths to HOOKS_DIR, which resolves
  // relative to this file. Running the repo clone's copy therefore pins every
  // hook to that clone — fine on this machine, broken on the next one.
  const installedRoot = join(HOME, '.claude', 'loop');
  if (!resolve(HOOKS_DIR).startsWith(resolve(installedRoot))) {
    console.warn(
      `  [warn] installing hooks from ${HOOKS_DIR}\n` +
      `         These paths will not exist on another machine. Prefer:\n` +
      `           node ${join(installedRoot, 'loop.mjs')} install-hooks`,
    );
  }

  const settings = readSettings(settingsPath);
  const before = JSON.stringify(settings);

  settings.hooks ??= {};

  const specs = withRetro ? [...HOOK_SPECS, RETRO_SPEC] : HOOK_SPECS;

  // The flag is authoritative in both directions: without it, a previously
  // installed retro hook is removed rather than silently left running.
  if (!withRetro && Array.isArray(settings.hooks?.[RETRO_SPEC.event])) {
    settings.hooks[RETRO_SPEC.event] = settings.hooks[RETRO_SPEC.event].filter((e) => !isOurs(e));
  }

  for (const spec of specs) {
    const command = `node "${shellPath(join(HOOKS_DIR, spec.script))}"`;
    const entry = {
      ...(spec.matcher ? { matcher: spec.matcher } : {}),
      hooks: [{ type: 'command', command, timeout: spec.timeout }],
    };

    const existing = Array.isArray(settings.hooks[spec.event]) ? settings.hooks[spec.event] : [];
    // Drop only our own previous entries — everything else the user configured stays.
    settings.hooks[spec.event] = [...existing.filter((e) => !isOurs(e)), entry];
  }

  const changed = JSON.stringify(settings) !== before;
  if (!changed) return { settingsPath, changed: false, backup: null };

  let backup = null;
  if (!dryRun) {
    if (existsSync(settingsPath)) {
      backup = `${settingsPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
      copyFileSync(settingsPath, backup);
    }
    mkdirSync(dirname(settingsPath), { recursive: true });
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  }

  return { settingsPath, changed: true, backup, hooksDir: HOOKS_DIR };
}

function readSettings(path) {
  if (!existsSync(path)) return {};
  const text = readFileSync(path, 'utf8').trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    // Never overwrite a settings file we cannot parse — that is someone's whole setup.
    throw new Error(`${path} is not valid JSON (${err.message}). Fix it before installing hooks.`);
  }
}

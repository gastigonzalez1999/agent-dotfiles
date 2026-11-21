import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The git pre-commit hook: the one enforcement point every agent hits.
 *
 * The Claude Code Stop hook only binds Claude. Cursor, Codex, Copilot, Aider and
 * a human at a terminal all end in `git commit`, so that is where the guard and
 * the fast gate run for everyone.
 *
 * Hooks are written inside the git directory and selected with a *local*
 * core.hooksPath, so nothing is ever tracked, nothing shows in `git status`, and
 * a repo's own hooks (husky, lefthook, plain .git/hooks) keep running: every
 * hook that existed is forwarded to its original, and ours runs after the
 * original pre-commit succeeds.
 *
 * shortcut: forwarders are created for the hooks that exist at install time.
 * A hook the repo adds later is not forwarded until `loop git-hook` is re-run.
 */

const MARKER = '# loop-managed hook';
const ORIGINAL_KEY = 'loop.originalHooksPath';
const LOOP_CLI = fileURLToPath(new URL('../loop.mjs', import.meta.url));

// Client-side hooks from githooks(5). A hooks directory also holds helpers
// (husky's `h`, `husky.sh`) that must not be mistaken for hooks.
const GIT_HOOKS = new Set(
  'applypatch-msg pre-applypatch post-applypatch pre-commit pre-merge-commit prepare-commit-msg commit-msg post-commit pre-rebase post-checkout post-merge pre-push pre-auto-gc post-rewrite sendemail-validate fsmonitor-watchman post-index-change reference-transaction'.split(' '),
);

function gitIn(root) {
  return (...args) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function tryGit(git, ...args) {
  try {
    return git(...args);
  } catch {
    return null;
  }
}

const sh = (s) => `'${s.replace(/\\/g, '/').replace(/'/g, `'\\''`)}'`;

export function hookDir(root) {
  const commonDir = gitIn(root)('rev-parse', '--path-format=absolute', '--git-common-dir');
  return join(commonDir, 'loop-hooks');
}

/**
 * Install or refresh. Returns { dir, original, forwarded, husky }.
 * Throws when `root` is not a git repository.
 */
export function installGitHook(root) {
  const git = gitIn(root);
  const ours = hookDir(root);
  const current = tryGit(git, 'config', '--get', 'core.hooksPath');
  const alreadyOurs = current && resolve(root, current) === resolve(ours);

  // The original is what hooks git would run without us. Remember it once;
  // a refresh must not record our own directory as the original.
  let original = alreadyOurs ? tryGit(git, 'config', '--local', '--get', ORIGINAL_KEY) : current;
  if (!alreadyOurs) {
    const localValue = tryGit(git, 'config', '--local', '--get', 'core.hooksPath');
    git('config', '--local', ORIGINAL_KEY, localValue ?? '');
  }
  original = original || join(gitIn(root)('rev-parse', '--path-format=absolute', '--git-common-dir'), 'hooks');
  const originalAbs = isAbsolute(original) ? original : resolve(root, original);

  rmSync(ours, { recursive: true, force: true });
  mkdirSync(ours, { recursive: true });

  const existing = existsSync(originalAbs)
    ? readdirSync(originalAbs).filter((f) => GIT_HOOKS.has(f) && isFile(join(originalAbs, f)))
    : [];
  const names = new Set([...existing, 'pre-commit']);

  for (const name of names) {
    const target = join(ours, name);
    writeFileSync(target, name === 'pre-commit' ? preCommit(originalAbs) : forwarder(originalAbs, name));
    chmodSync(target, 0o755);
  }

  git('config', '--local', 'core.hooksPath', ours.replace(/\\/g, '/'));
  return { dir: ours, original: originalAbs, forwarded: existing, husky: /husky/.test(original) };
}

/** Restore whatever hooks path the repo had before. */
export function uninstallGitHook(root) {
  const git = gitIn(root);
  const saved = tryGit(git, 'config', '--local', '--get', ORIGINAL_KEY);
  if (saved === null) return false;
  if (saved) git('config', '--local', 'core.hooksPath', saved);
  else tryGit(git, 'config', '--local', '--unset', 'core.hooksPath');
  tryGit(git, 'config', '--local', '--unset', ORIGINAL_KEY);
  rmSync(hookDir(root), { recursive: true, force: true });
  return true;
}

function isFile(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

// Git runs hooks with the worktree root as cwd, and only if they are executable;
// the forwarder keeps both rules. `exec` keeps stdin intact for hooks that read
// it (pre-push, post-rewrite, reference-transaction).
function forwarder(originalDir, name) {
  return `#!/bin/sh
${MARKER} — forwards to the repo's own hook. Remove with: loop git-hook --uninstall
orig=${sh(join(originalDir, name))}
[ -x "$orig" ] && exec "$orig" "$@"
exit 0
`;
}

/**
 * Runs the repo's own pre-commit first; if that passes, the guard on the staged
 * lines and then the fast gate. A missing runner never blocks a commit — the
 * hook must not hold a repository hostage to this machine's setup.
 */
function preCommit(originalDir) {
  return `#!/bin/sh
${MARKER} — runs the repo's pre-commit, then loop guard + loop fast.
# Bypass once with: git commit --no-verify. Remove with: loop git-hook --uninstall
orig=${sh(join(originalDir, 'pre-commit'))}
if [ -x "$orig" ]; then "$orig" "$@" || exit $?; fi

[ -f .agent/loop.json ] || exit 0

# The runner that installed this hook first: it is known to support every
# command below. An older copy elsewhere may not.
if [ -f ./node_modules/.bin/loop ]; then
  run_loop() { ./node_modules/.bin/loop "$@"; }
elif [ -f ${sh(LOOP_CLI)} ]; then
  run_loop() { node ${sh(LOOP_CLI)} "$@"; }
elif [ -f "$HOME/.claude/loop/loop.mjs" ]; then
  run_loop() { node "$HOME/.claude/loop/loop.mjs" "$@"; }
else
  echo "loop: runner not found on this machine; commit allowed without checks." >&2
  exit 0
fi

run_loop guard --staged || exit 1
export LOOP_SKIP_GUARD=1
run_loop fast || exit 1
`;
}

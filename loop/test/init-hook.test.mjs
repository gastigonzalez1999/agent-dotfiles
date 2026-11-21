import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOOP = fileURLToPath(new URL('../loop.mjs', import.meta.url));

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'loop-init-'));
  // A scratch HOME keeps the real ~/.claude/loop out of the hook's runner lookup.
  const home = mkdtempSync(join(tmpdir(), 'loop-home-'));
  const env = { ...process.env, HOME: home, USERPROFILE: home };
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', stdio: 'pipe', env }).trim();
  git('init', '-q');
  git('config', 'user.email', 't@t');
  git('config', 'user.name', 't');
  git('config', 'commit.gpgsign', 'false');
  const loop = (...a) => spawnSync(process.execPath, [LOOP, ...a], { cwd: dir, encoding: 'utf8', env });
  const commit = (msg) => spawnSync('git', ['commit', '-qm', msg], { cwd: dir, encoding: 'utf8', env });
  const write = (rel, text) => {
    mkdirSync(join(dir, rel, '..'), { recursive: true });
    writeFileSync(join(dir, rel), text);
  };
  const read = (rel) => readFileSync(join(dir, rel), 'utf8');
  return { dir, git, loop, commit, write, read };
}

test('team mode: AGENTS.md, CLAUDE.md import, and a hook that blocks added suppressions', () => {
  const r = repo();
  r.write('CLAUDE.md', '# Project rules\n');
  r.write('a.ts', 'export const a = 1;\n');
  r.git('add', '.');
  r.git('commit', '-qm', 'init');

  const init = r.loop('init');
  assert.equal(init.status, 0, init.stderr + init.stdout);
  assert.match(r.read('AGENTS.md'), /<!-- loop:begin -->/);
  assert.match(r.read('CLAUDE.md'), /^# Project rules\n\n@AGENTS\.md\n$/);
  assert.deepEqual(JSON.parse(r.read('.agent/loop.json')).guard, { suppressions: true });

  r.git('add', '.');
  assert.equal(r.commit('adopt loop').status, 0);

  r.write('a.ts', 'export const a = 1;\n// @ts-ignore\nexport const b: number = "x";\n');
  r.git('add', 'a.ts');
  const blocked = r.commit('sneak');
  assert.equal(blocked.status, 1);
  assert.match(blocked.stdout + blocked.stderr, /a\.ts:2 +\[no-suppressions\]/);

  r.write('a.ts', 'export const a = 1;\nexport const b = 2;\n');
  r.git('add', 'a.ts');
  assert.equal(r.commit('clean').status, 0);

  const again = r.loop('init', '--force');
  assert.equal(again.status, 0);
  assert.equal(r.read('CLAUDE.md').match(/@AGENTS\.md/g).length, 1, 'idempotent');
  assert.equal(r.read('AGENTS.md').match(/loop:begin/g).length, 1, 'idempotent');
});

test('shadow mode: git status stays clean, husky still runs, uninstall restores it', () => {
  const r = repo();
  r.write('CLAUDE.md', '# Team rules\n');
  r.write('.husky/pre-commit', '#!/bin/sh\necho ran > husky-ran.txt\n');
  chmodSync(join(r.dir, '.husky/pre-commit'), 0o755);
  r.write('.gitignore', 'husky-ran.txt\n');
  r.git('add', '.');
  r.git('commit', '-qm', 'init', '--no-verify');
  r.git('config', 'core.hooksPath', '.husky');

  const init = r.loop('init', '--shadow');
  assert.equal(init.status, 0, init.stderr + init.stdout);
  assert.equal(r.git('status', '--porcelain'), '', 'shadow mode must not dirty the repo');
  assert.equal(r.read('CLAUDE.md'), '# Team rules\n', 'tracked files untouched');
  assert.match(r.read('CLAUDE.local.md'), /^@AGENTS\.md$/m);
  assert.match(r.read('AGENTS.md'), /loop:begin/);

  r.write('src/x.py', 'x = int("1")  # type: ignore\n');
  r.git('add', 'src/x.py');
  const blocked = r.commit('sneak');
  assert.equal(blocked.status, 1);
  assert.ok(existsSync(join(r.dir, 'husky-ran.txt')), "the repo's own pre-commit ran first");
  assert.match(blocked.stdout + blocked.stderr, /no-suppressions/);

  assert.equal(r.loop('git-hook', '--uninstall').status, 0);
  assert.equal(r.git('config', '--get', 'core.hooksPath'), '.husky');
});

test('a failing repo hook blocks before the loop runs', () => {
  const r = repo();
  r.write('.husky/pre-commit', '#!/bin/sh\nexit 3\n');
  chmodSync(join(r.dir, '.husky/pre-commit'), 0o755);
  r.git('config', 'core.hooksPath', '.husky');
  assert.equal(r.loop('init', '--shadow').status, 0);
  r.write('ok.ts', 'export const ok = 1;\n');
  r.git('add', 'ok.ts');
  // git reports any pre-commit failure as exit 1; the staged file is clean, so only the repo hook can block.
  assert.equal(r.commit('x').status, 1);
});

test('shadow mode with a tracked AGENTS.md routes the section through CLAUDE.local.md', () => {
  const r = repo();
  r.write('AGENTS.md', '# Team agent rules\n');
  r.git('add', '.');
  r.git('commit', '-qm', 'init');

  const init = r.loop('init', '--shadow');
  assert.equal(init.status, 0, init.stderr + init.stdout);
  assert.equal(r.read('AGENTS.md'), '# Team agent rules\n');
  const local = r.read('CLAUDE.local.md');
  assert.match(local, /^@AGENTS\.md$/m, 'keeps the team AGENTS.md loaded for Claude');
  assert.match(local, /loop:begin/);
  assert.equal(r.git('status', '--porcelain'), '');
});

test('shadow mode without any CLAUDE.md does not create CLAUDE.local.md', () => {
  const r = repo();
  assert.equal(r.loop('init', '--shadow').status, 0);
  assert.equal(existsSync(join(r.dir, 'CLAUDE.local.md')), false);
  assert.equal(r.git('status', '--porcelain'), '');
});

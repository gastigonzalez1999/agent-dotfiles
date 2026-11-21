import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkLines, collectChange, parseDiff, splitComment } from '../lib/guard.mjs';

const ids = (v) => v.map((x) => x.id);
const add = (file, text, line = 1) => ({ file, line, text });

test('splitComment ignores comment markers inside strings', () => {
  assert.equal(splitComment('const u = "https://example.com";', '.ts').comment, '');
  assert.equal(splitComment("color = '#fff'", '.py').comment, '');
  assert.equal(splitComment('echo ${#arr[@]}', '.sh').comment, '');
  assert.equal(splitComment('x = 1 // why', '.ts').comment, '// why');
  assert.equal(splitComment('x = 1  # why', '.py').comment, '# why');
  assert.equal(splitComment("fn f<'a>(s: &'a str) {} // c", '.rs').comment, '// c');
  assert.equal(splitComment('// anything', '.txt'), null);
});

test('suppressions are reported even in otherwise exempt comment forms', () => {
  const v = checkLines({ comments: {} }, [add('a.ts', '/** @ts-ignore */'), add('b.py', 'x = f()  # type: ignore')]);
  assert.deepEqual(ids(v), ['no-suppressions', 'no-suppressions']);
});

test('mentioning a suppression is not a suppression', () => {
  assert.deepEqual(
    checkLines({}, [
      add('a.ts', 'const s = "eslint-disable";'),
      add('a.ts', `check('@SuppressWarnings("x")')`),
      add('a.ts', '// prose that mentions `@ts-ignore` is fine'),
      add('schema.json', '"description": "reports @SuppressWarnings and # noqa"'),
    ]),
    [],
  );
});

test('directive forms tools actually honour are caught', () => {
  const v = checkLines({}, [
    add('a.ts', 'x(); // eslint-disable-line'),
    add('a.tsx', '{/* @ts-expect-error */}'),
    add('a.py', 'import os  # unused, keep # noqa: F401'),
    add('a.go', 'x := 1 //nolint:errcheck'),
  ]);
  assert.deepEqual(ids(v), ['no-suppressions', 'no-suppressions', 'no-suppressions', 'no-suppressions']);
});

test('code-level suppressions are caught', () => {
  assert.deepEqual(ids(checkLines({}, [add('A.java', '@SuppressWarnings("unchecked")')])), ['no-suppressions']);
  assert.deepEqual(ids(checkLines({}, [add('a.rs', '#[allow(dead_code)]')])), ['no-suppressions']);
});

test('suppressions can be turned off', () => {
  assert.deepEqual(checkLines({ suppressions: false }, [add('a.ts', '// @ts-ignore')]), []);
});

test('comments are off unless configured, and allow-listed forms pass', () => {
  assert.deepEqual(checkLines({}, [add('a.ts', '// explain')]), []);
  const guard = { comments: { exclude: ['test'] } };
  const v = checkLines(guard, [
    add('a.ts', '// explain'),
    add('a.ts', '// TODO(#12) remove after migration'),
    add('a.ts', '/** Public API. */'),
    add('main.go', '//go:build linux'),
    add('test/a.ts', '// fixture note'),
  ]);
  assert.deepEqual(ids(v), ['no-comments']);
});

test('rules match code only, honour paths and exclude', () => {
  const guard = {
    rules: [
      { id: 'no-sleep', pattern: '\\bsetTimeout\\(', message: 'No timers.', exclude: ['src/primitives'] },
      { id: 'client-server', pattern: "from ['\"].*server", message: 'Boundary.', paths: ['src/client/'] },
    ],
  };
  const v = checkLines(guard, [
    add('src/a.ts', 'setTimeout(fn, 10)'),
    add('src/a.ts', '// setTimeout( in a comment'),
    add('src/primitives/t.ts', 'setTimeout(fn, 10)'),
    add('src/client/x.ts', "import { db } from '../server/db'"),
    add('src/server/x.ts', "import { db } from '../server/db'"),
  ]);
  assert.deepEqual(ids(v), ['no-sleep', 'client-server']);
});

test('global exclude skips files entirely', () => {
  assert.deepEqual(checkLines({ exclude: ['vendor'] }, [add('vendor/x.ts', '// @ts-ignore')]), []);
});

test('new markdown outside the allow list is reported', () => {
  const v = checkLines({ markdown: { allow: ['README.md', 'docs/'] } }, [], ['README.md', 'docs/a.md', 'PLAN.md', 'src/NOTES.md', 'a.ts']);
  assert.deepEqual(v.map((x) => x.file), ['PLAN.md', 'src/NOTES.md']);
});

test('invalid rules fail loudly', () => {
  assert.throws(() => checkLines({ rules: [{ id: 'x', pattern: '(' , message: 'm' }] }, [add('a.ts', 'x')]), /invalid pattern/);
  assert.throws(() => checkLines({ rules: [{ id: 'x' }] }, []), /needs "id", "pattern" and "message"/);
});

test('parseDiff tracks new line numbers across hunks', () => {
  const diff = ['+++ b/a.ts', '@@ -1,0 +1,2 @@', '+one', '+two', '@@ -10 +12 @@', '-old', '+new\r'].join('\n');
  assert.deepEqual(parseDiff(diff), [add('a.ts', 'one', 1), add('a.ts', 'two', 2), add('a.ts', 'new', 12)]);
});

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'loop-guard-'));
  const git = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'pipe' });
  git('init', '-q');
  git('config', 'user.email', 't@t');
  git('config', 'user.name', 't');
  git('config', 'commit.gpgsign', 'false');
  return { dir, git };
}

test('collectChange only sees added lines, including untracked files', () => {
  const { dir, git } = repo();
  writeFileSync(join(dir, 'old.ts'), '// @ts-ignore legacy\n');
  git('add', '.');
  git('commit', '-qm', 'init');

  writeFileSync(join(dir, 'old.ts'), '// @ts-ignore legacy\nconst x = 1;\n');
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src', 'new.ts'), 'const y = 2;\n');

  const { added, newFiles } = collectChange(dir);
  assert.deepEqual(added.filter((a) => a.text).map((a) => `${a.file}:${a.line}`), ['old.ts:2', 'src/new.ts:1']);
  assert.deepEqual(newFiles, ['src/new.ts']);
  assert.deepEqual(checkLines({}, added, newFiles), []);
});

test('collectChange --staged works before the first commit', () => {
  const { dir, git } = repo();
  writeFileSync(join(dir, 'a.py'), 'x = 1  # noqa\n');
  git('add', '.');
  const { added } = collectChange(dir, { staged: true });
  assert.deepEqual(ids(checkLines({}, added)), ['no-suppressions']);
});

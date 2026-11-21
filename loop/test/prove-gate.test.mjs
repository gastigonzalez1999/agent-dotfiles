import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOOP = fileURLToPath(new URL('../loop.mjs', import.meta.url));
const node = JSON.stringify(process.execPath);

function project(contract) {
  const dir = mkdtempSync(join(tmpdir(), 'loop-prove-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  mkdirSync(join(dir, '.agent'));
  writeFileSync(join(dir, '.agent', 'loop.json'), JSON.stringify(contract));
  const loop = (...a) => spawnSync(process.execPath, [LOOP, ...a], { cwd: dir, encoding: 'utf8' });
  return { dir, loop };
}

test('loop prove runs proofs, keeps evidence, and fails on a broken feature', () => {
  const { dir, loop } = project({
    gates: {},
    features: [
      { id: 'core.ok', reach: 'cli', proof: `${node} -e "console.log('works')"` },
      { id: 'core.broken', proof: `${node} -e "process.exit(4)"` },
    ],
  });

  assert.equal(loop('prove', 'core.ok').status, 0);
  assert.match(readFileSync(join(dir, '.agent', '.loop-proof', 'core.ok.log'), 'utf8'), /works/);

  assert.equal(loop('prove').status, 1);
  const summary = JSON.parse(readFileSync(join(dir, '.agent', '.loop-proof', 'summary.json'), 'utf8'));
  assert.deepEqual(summary.results.map((r) => [r.id, r.ok]), [['core.ok', true], ['core.broken', false]]);

  const unknown = loop('prove', 'nope');
  assert.equal(unknown.status, 1);
  assert.match(unknown.stdout, /Unknown feature id\(s\): nope/);
});

test('a contract with a guard runs it first in every gate tier', () => {
  const { dir, loop } = project({ gates: { fast: [{ name: 'noop', cmd: `${node} -e "0"` }] }, guard: {} });
  writeFileSync(join(dir, 'a.ts'), '// @ts-nocheck\n');

  const red = loop('fast');
  assert.equal(red.status, 1);
  assert.match(red.stdout, /guard/);

  writeFileSync(join(dir, 'a.ts'), 'export {};\n');
  assert.equal(loop('fast').status, 0);
});

test('an invalid guard rule is a configuration error, not a gate failure', () => {
  const { loop } = project({ gates: {}, guard: { rules: [{ id: 'x', pattern: '(', message: 'm' }] } });
  assert.equal(loop('guard').status, 2);
});

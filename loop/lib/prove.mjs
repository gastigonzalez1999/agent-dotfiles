import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runCheck } from './exec.mjs';

export const proofDir = (root) => join(root, '.agent', '.loop-proof');

/**
 * Run the proof command of every declared feature (or just `ids`) and keep the
 * output as evidence. A reviewer reads these files instead of re-deriving from
 * the diff whether the feature works; that is the point of a feature map.
 * Returns true when every selected proof passed.
 */
export async function prove(contract, ids = []) {
  const root = contract.__root;
  const features = contract.features ?? [];
  if (!features.length) {
    console.log('\nNo features declared in .agent/loop.json — nothing to prove.\n');
    return true;
  }

  const unknown = ids.filter((id) => !features.some((f) => f.id === id));
  if (unknown.length) {
    console.log(`\nUnknown feature id(s): ${unknown.join(', ')}. Declared: ${features.map((f) => f.id).join(', ')}\n`);
    return false;
  }

  const selected = ids.length ? features.filter((f) => ids.includes(f.id)) : features;
  const dir = proofDir(root);
  mkdirSync(dir, { recursive: true });

  console.log('\nloop prove\n');
  const results = [];
  for (const feature of selected) {
    const res = await runCheck(
      { cmd: feature.proof, timeoutSec: feature.timeoutSec },
      { cwd: feature.cwd ? join(root, feature.cwd) : root, timeoutSec: contract.budget.gateTimeoutSec },
    );
    const log = join(dir, `${feature.id.replace(/[^\w.-]/g, '_')}.log`);
    writeFileSync(log, `$ ${feature.proof}\n# reach: ${feature.reach ?? '-'}\n# exit: ${res.timedOut ? 'timed out' : res.code}\n\n${res.output}\n`);
    results.push({ id: feature.id, ok: res.ok, durationMs: res.durationMs, log });
    console.log(`  ${res.ok ? '✓' : '✗'} ${feature.id.padEnd(24)} ${(res.durationMs / 1000).toFixed(1)}s  ${log}`);
  }

  writeFileSync(join(dir, 'summary.json'), JSON.stringify({ ts: new Date().toISOString(), results }, null, 2));
  const ok = results.every((r) => r.ok);
  console.log(ok ? '\n  PROVEN\n' : `\n  ${results.filter((r) => !r.ok).length} feature(s) failed their proof\n`);
  return ok;
}

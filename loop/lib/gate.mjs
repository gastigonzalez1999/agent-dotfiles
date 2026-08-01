import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runCheck } from './exec.mjs';
import { fingerprint, firstError, lastRunPath, recordRun } from './history.mjs';
import { registerProject } from './registry.mjs';

const OK = '✓';
const BAD = '✗';
const SKIP = '·';

/**
 * Catch environment problems that would otherwise surface as bogus check failures.
 * An agent that sees "cannot find module" burns iterations inventing code fixes for
 * what is really an uninstalled dependency tree, so this is reported separately
 * from a gate failure and never written to history.
 */
export function preflight(root) {
  const pkgPath = join(root, 'package.json');
  if (!existsSync(pkgPath)) return null;

  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch {
    return `${pkgPath} is not valid JSON.`;
  }

  const hasDeps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).length > 0;
  if (hasDeps && !existsSync(join(root, 'node_modules'))) {
    return `Dependencies are not installed (no node_modules in ${root}).\nRun your package manager's install first — every check would fail for the wrong reason.`;
  }
  return null;
}

/**
 * Run every check in a tier and report.
 *
 * The `fast` tier stops at the first required failure — its whole purpose is the
 * tightest possible edit-to-signal latency. `test` and `full` run everything so
 * the agent gets one complete list to fix in a single pass instead of discovering
 * failures one rerun at a time.
 */
export async function runGate(contract, tier, { quiet = false } = {}) {
  const checks = contract.gates[tier] ?? [];
  const root = contract.__root;
  const started = Date.now();

  if (!checks.length) {
    if (!quiet) console.log(`loop ${tier}: no checks defined in ${join('.agent', 'loop.json')} — nothing to verify.`);
    return { ok: true, tier, checks: [], empty: true };
  }

  if (!quiet) console.log(`\nloop ${tier}\n`);

  const failFast = tier === 'fast';
  const results = [];
  let stopped = false;

  for (const check of checks) {
    if (stopped) {
      results.push({ ...check, skipped: true, ok: true, durationMs: 0 });
      if (!quiet) console.log(`  ${SKIP} ${pad(check.name)} skipped`);
      continue;
    }

    const res = await runCheck(check, {
      cwd: check.cwd ? join(root, check.cwd) : root,
      timeoutSec: contract.budget.gateTimeoutSec,
    });

    const entry = {
      name: check.name,
      optional: check.optional ?? false,
      cmd: check.cmd,
      ...res,
      fingerprint: res.ok ? null : fingerprint(res.output),
      firstError: res.ok ? null : firstError(res.output),
    };
    results.push(entry);

    if (!quiet) console.log(`  ${statusMark(entry)} ${pad(entry.name)} ${secs(entry.durationMs)}${detail(entry)}`);

    if (failFast && !entry.ok && !entry.optional) stopped = true;
  }

  const blocking = results.filter((r) => !r.ok && !r.optional && !r.skipped);
  const ok = blocking.length === 0;
  const run = {
    ts: new Date(started).toISOString(),
    tier,
    ok,
    durationMs: Date.now() - started,
    checks: results,
  };
  recordRun(root, run);
  registerProject(root);

  if (!quiet) {
    console.log(
      ok
        ? `\n  GREEN in ${secs(run.durationMs)}\n`
        : `\n  FAILED — ${blocking.length} of ${results.filter((r) => !r.skipped).length} in ${secs(run.durationMs)}\n`,
    );
    for (const f of blocking) console.log(excerpt(f));
    if (!ok) console.log(`  Full output: ${lastRunPath(root)}\n`);
  }

  return run;
}

/** Compact failure text for hook stderr — no colours, no file references the agent must open. */
export function failureBrief(run) {
  const blocking = run.checks.filter((c) => !c.ok && !c.optional && !c.skipped);
  const lines = blocking.map((c) => {
    const head = c.output.split('\n').filter(Boolean).slice(0, 25).join('\n');
    return `--- ${c.name} (${c.cmd}) ${c.timedOut ? 'TIMED OUT' : `exit ${c.code}`} ---\n${head}`;
  });
  return lines.join('\n\n');
}

function statusMark(entry) {
  if (entry.ok) return OK;
  return entry.optional ? SKIP : BAD;
}

function detail(entry) {
  if (entry.ok) return '';
  if (entry.timedOut) return '  timed out';
  const tag = entry.optional ? 'optional, ignored' : entry.fingerprint;
  return `  ${tag}`;
}

function excerpt(check) {
  const body = check.output
    .split('\n')
    .filter(Boolean)
    .slice(0, 20)
    .map((l) => `    ${l}`)
    .join('\n');
  return `  ${check.name} — ${check.cmd}\n${body}\n`;
}

const pad = (s) => s.padEnd(14);
const secs = (ms) => `${(ms / 1000).toFixed(1)}s`;

import { readHistory } from './history.mjs';

/**
 * Summarise what the loop has actually cost and where it keeps failing.
 *
 * This is also the analysis `loop retro` runs on: everything reported here is
 * derived from the append-only history, never from the current source tree.
 */
export function analyse(root, { since } = {}) {
  let runs = readHistory(root);
  if (since) runs = runs.filter((r) => Date.parse(r.ts) >= since);

  const tiers = {};
  const failures = new Map();

  for (const run of runs) {
    const t = (tiers[run.tier] ??= { runs: 0, green: 0, totalMs: 0 });
    t.runs++;
    if (run.ok) t.green++;
    t.totalMs += run.durationMs ?? 0;

    for (const check of run.checks ?? []) {
      if (check.ok || check.optional) continue;
      const key = check.fingerprint ?? 'unknown';
      const f = failures.get(key) ?? { fingerprint: key, count: 0, checks: new Set(), example: null, first: run.ts, last: run.ts };
      f.count++;
      f.checks.add(check.name);
      f.example ??= check.firstError;
      f.last = run.ts;
      failures.set(key, f);
    }
  }

  return {
    total: runs.length,
    tiers,
    failures: [...failures.values()]
      .map((f) => ({ ...f, checks: [...f.checks] }))
      .sort((a, b) => b.count - a.count),
    streaks: iterationsToGreen(runs),
    neverFailed: neverFailedChecks(runs),
  };
}

/**
 * How many consecutive red runs precede each green one, per tier. This is the
 * closest thing to a measure of how much the agent thrashes: a rising number
 * means failures are getting harder to fix on the first try.
 */
function iterationsToGreen(runs) {
  const out = {};
  const streak = {};
  for (const run of runs) {
    streak[run.tier] = (streak[run.tier] ?? 0) + 1;
    if (run.ok) {
      (out[run.tier] ??= []).push(streak[run.tier]);
      streak[run.tier] = 0;
    }
  }
  return Object.fromEntries(
    Object.entries(out).map(([tier, list]) => [
      tier,
      { greenRuns: list.length, avgAttempts: +(list.reduce((a, b) => a + b, 0) / list.length).toFixed(1), worst: Math.max(...list) },
    ]),
  );
}

/** Checks that have never once failed — candidates for demotion to a slower tier. */
function neverFailedChecks(runs) {
  const seen = new Map();
  for (const run of runs) {
    for (const check of run.checks ?? []) {
      if (check.skipped) continue;
      const s = seen.get(check.name) ?? { name: check.name, runs: 0, failures: 0, tier: run.tier };
      s.runs++;
      if (!check.ok) s.failures++;
      seen.set(check.name, s);
    }
  }
  return [...seen.values()].filter((s) => s.failures === 0 && s.runs >= 10);
}

export function printReport(root) {
  const a = analyse(root);
  if (!a.total) {
    console.log('\nNo loop history yet. Run a gate first.\n');
    return;
  }

  console.log(`\nloop report — ${a.total} runs\n`);
  console.log('  tier   runs  green  avg');
  for (const [tier, t] of Object.entries(a.tiers)) {
    const pct = Math.round((t.green / t.runs) * 100);
    console.log(`  ${tier.padEnd(6)} ${String(t.runs).padStart(4)} ${String(pct + '%').padStart(6)} ${(t.totalMs / t.runs / 1000).toFixed(1)}s`);
  }

  if (Object.keys(a.streaks).length) {
    console.log('\n  attempts to reach green');
    for (const [tier, s] of Object.entries(a.streaks)) {
      console.log(`  ${tier.padEnd(6)} avg ${s.avgAttempts}  worst ${s.worst}  (${s.greenRuns} green runs)`);
    }
  }

  if (a.failures.length) {
    console.log('\n  most frequent failures');
    for (const f of a.failures.slice(0, 8)) {
      console.log(`  ${String(f.count).padStart(4)}x  ${f.fingerprint}  [${f.checks.join(', ')}]`);
      if (f.example) console.log(`         ${f.example.slice(0, 100)}`);
    }
  }

  if (a.neverFailed.length) {
    console.log('\n  never failed in 10+ runs — consider moving to a slower tier');
    for (const s of a.neverFailed) console.log(`         ${s.name} (${s.runs} runs)`);
  }
  console.log('');
}

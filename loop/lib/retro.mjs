import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readHistory } from './history.mjs';
import { analyse } from './report.mjs';
import { MAX_LINES, entryId, readEntries, renderBlock, writeBlock } from './managed-block.mjs';
import { LEDGER, ensureLedgerDir, registeredProjects } from './registry.mjs';

/** Evidence thresholds. Below these, a pattern is noise and gets written nowhere. */
export const MIN_OCCURRENCES = 5;
export const MIN_DAYS = 2;
export const MIN_REPOS_FOR_GLOBAL = 3;
const NEVER_FAILED_RUNS = 20;

/**
 * Derive findings from run history alone. Nothing here inspects the source tree —
 * a finding is a claim about what the loop observed, and it carries its evidence
 * so anyone reading the resulting rule can check it.
 */
export function findings(root) {
  const runs = readHistory(root);
  if (!runs.length) return [];
  const a = analyse(root);
  const out = [];

  for (const f of a.failures) {
    const days = distinctDays(runs, f.fingerprint);
    if (f.count < MIN_OCCURRENCES || days < MIN_DAYS) continue;
    out.push({
      kind: 'recurring-failure',
      fingerprint: f.fingerprint,
      count: f.count,
      since: f.first.slice(0, 10),
      target: 'doc',
      line: `- \`${f.checks.join('`, `')}\` fails with \`${f.fingerprint}\` repeatedly (${f.count} runs across ${days} days). Latest: ${truncate(f.example)}`,
    });
  }

  for (const s of a.neverFailed) {
    if (s.runs < NEVER_FAILED_RUNS || s.tier !== 'fast') continue;
    out.push({
      kind: 'demote-check',
      fingerprint: `never-failed:${s.name}`,
      count: s.runs,
      since: runs[0].ts.slice(0, 10),
      target: 'contract',
      check: s.name,
      note: `${s.name} has never failed in ${s.runs} fast-tier runs`,
    });
  }

  const fast = a.streaks.fast ?? a.streaks.test ?? a.streaks.full;
  if (fast && fast.worst >= 5) {
    out.push({
      kind: 'raise-budget',
      fingerprint: 'budget:maxIterations',
      count: fast.worst,
      since: runs[0].ts.slice(0, 10),
      target: 'contract',
      worst: fast.worst,
      note: `reaching green took up to ${fast.worst} attempts`,
    });
  }

  return out;
}

/**
 * Apply findings. Returns the list of changes made.
 * `dryRun` produces the same result without touching anything, which is what the
 * containment tests and `--log` rely on.
 */
export function apply(root, { dryRun = false, contract } = {}) {
  if (contract?.enforce?.retro === 'off') return { skipped: 'retro disabled for this repo', changes: [] };

  // Before touching anything: if the ledger is not writable we must not write at
  // all, because an applied change with no ledger entry can never be reverted.
  if (!dryRun) ensureLedgerDir();

  const found = findings(root);
  const changes = [];

  const docFindings = found.filter((f) => f.target === 'doc');
  if (docFindings.length) {
    const docPath = pickDoc(root);
    const before = existsSync(docPath) ? readFileSync(docPath, 'utf8') : '';
    const entries = docFindings.map((f) => ({
      id: entryId(docPath, f.fingerprint),
      fingerprint: f.fingerprint,
      count: f.count,
      since: f.since,
      line: f.line,
    }));
    const after = writeBlock(before, renderBlock(readEntries(before), entries));
    if (after !== before) {
      if (!dryRun) writeFileSync(docPath, after);
      changes.push({ id: entries[0].id, file: docPath, kind: 'doc', entries: entries.length, before, after });
    }
  }

  for (const f of found.filter((x) => x.target === 'contract')) {
    const change = applyContractChange(root, f, dryRun);
    if (change) changes.push(change);
  }

  if (!dryRun && changes.length) {
    for (const c of changes) recordLedger(root, c);
    commit(root, changes);
  }
  return { changes };
}

function applyContractChange(root, finding, dryRun) {
  const path = join(root, '.agent', 'loop.json');
  if (!existsSync(path)) return null;
  const before = readFileSync(path, 'utf8');
  const c = JSON.parse(before);

  if (finding.kind === 'demote-check') {
    const idx = (c.gates.fast ?? []).findIndex((x) => x.name === finding.check);
    if (idx === -1) return null;
    const [check] = c.gates.fast.splice(idx, 1);
    (c.gates.test ??= []).push(check);
  } else if (finding.kind === 'raise-budget') {
    const current = c.budget?.maxIterations ?? 5;
    const next = Math.min(finding.worst + 2, 12);
    if (next <= current) return null;
    (c.budget ??= {}).maxIterations = next;
  } else {
    return null;
  }

  const after = JSON.stringify(c, null, 2) + '\n';
  if (after === before) return null;
  if (!dryRun) writeFileSync(path, after);
  return { id: entryId(path, finding.fingerprint), file: path, kind: finding.kind, note: finding.note, before, after };
}

/**
 * Promote a pattern to the global rules only once it shows up in several repos.
 * A gotcha seen in one project is a fact about that project.
 */
export function globalFindings() {
  const counts = new Map();
  for (const root of registeredProjects()) {
    if (!existsSync(root)) continue;
    for (const f of findings(root).filter((x) => x.kind === 'recurring-failure')) {
      const e = counts.get(f.fingerprint) ?? { fingerprint: f.fingerprint, repos: new Set(), count: 0, since: f.since, example: f.line };
      e.repos.add(root);
      e.count += f.count;
      counts.set(f.fingerprint, e);
    }
  }
  return [...counts.values()]
    .filter((e) => e.repos.size >= MIN_REPOS_FOR_GLOBAL)
    .map((e) => ({ ...e, repos: [...e.repos] }));
}

function pickDoc(root) {
  for (const name of ['CLAUDE.md', 'AGENTS.md']) {
    if (existsSync(join(root, name))) return join(root, name);
  }
  return join(root, 'CLAUDE.md');
}

function recordLedger(root, change) {
  appendFileSync(
    LEDGER,
    JSON.stringify({
      id: change.id,
      ts: new Date().toISOString(),
      root,
      file: change.file,
      kind: change.kind,
      note: change.note ?? `${change.entries ?? 1} entr(ies)`,
      before: change.before,
    }) + '\n',
  );
}

/**
 * Commit only the files retro touched. `git commit -- <paths>` ignores the index,
 * so a user's unrelated staged work is never swept into an automated commit.
 */
function commit(root, changes) {
  if (!existsSync(join(root, '.git'))) return;
  const files = [...new Set(changes.map((c) => c.file))];
  const summary = changes.map((c) => c.kind).join(', ');
  const res = spawnSync('git', ['-C', root, 'commit', '-m', `chore(loop-retro): ${summary}`, '--', ...files], {
    encoding: 'utf8',
    windowsHide: true,
  });
  return res.status === 0;
}

export function revert(id) {
  if (!existsSync(LEDGER)) return null;
  const lines = readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const entry = [...lines].reverse().find((e) => e.id === id);
  if (!entry) return null;
  writeFileSync(entry.file, entry.before);
  appendFileSync(LEDGER, JSON.stringify({ ...entry, id: `${id}-reverted`, ts: new Date().toISOString(), kind: 'revert' }) + '\n');
  return entry;
}

const AUTO_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The unattended entry point. Throttled per project so opening the same repo ten
 * times in a day does not mean ten retro passes — learning is a weekly-scale
 * activity, and the history it reads barely moves in an hour.
 */
export function autoApply(root, contract) {
  const stamp = join(root, '.agent', '.loop-retro-stamp');
  try {
    if (existsSync(stamp) && Date.now() - Date.parse(readFileSync(stamp, 'utf8')) < AUTO_INTERVAL_MS) {
      return { throttled: true, changes: [] };
    }
  } catch {
    // An unreadable stamp just means "run now".
  }

  const result = apply(root, { dryRun: false, contract });
  try {
    writeFileSync(stamp, new Date().toISOString());
  } catch {
    // Failing to record the stamp only costs an extra pass next time.
  }
  return result;
}

export function ledger() {
  if (!existsSync(LEDGER)) return [];
  return readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

function distinctDays(runs, fingerprint) {
  const days = new Set();
  for (const run of runs) {
    for (const c of run.checks ?? []) {
      if (!c.ok && c.fingerprint === fingerprint) days.add(run.ts.slice(0, 10));
    }
  }
  return days.size;
}

const truncate = (s) => (s ? `\`${s.replace(/`/g, "'").slice(0, 120)}\`` : 'n/a');

export { MAX_LINES };

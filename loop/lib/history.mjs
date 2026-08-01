import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const HISTORY = ['.agent', '.loop-history.jsonl'];
const LAST = ['.agent', '.loop-last.json'];
const DIRTY = ['.agent', '.loop-dirty'];

export const historyPath = (root) => join(root, ...HISTORY);
export const lastRunPath = (root) => join(root, ...LAST);
export const dirtyPath = (root) => join(root, ...DIRTY);

/**
 * Record a completed gate run. Two artifacts, deliberately different:
 * the JSONL history is append-only and small (for `loop report` and `loop retro`),
 * while .loop-last.json holds full command output for the agent to read after a failure.
 */
export function recordRun(root, run) {
  mkdirSync(join(root, '.agent'), { recursive: true });

  const summary = {
    ts: run.ts,
    tier: run.tier,
    ok: run.ok,
    durationMs: run.durationMs,
    checks: run.checks.map((c) => ({
      name: c.name,
      ok: c.ok,
      optional: c.optional ?? false,
      durationMs: c.durationMs,
      timedOut: c.timedOut ?? false,
      ...(c.ok ? {} : { fingerprint: c.fingerprint, firstError: c.firstError }),
    })),
  };

  appendFileSync(historyPath(root), JSON.stringify(summary) + '\n');
  writeFileSync(lastRunPath(root), JSON.stringify(run, null, 2));
  return summary;
}

export function readHistory(root) {
  const path = historyPath(root);
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/** Most recent run of a tier, or null. */
export function lastRunOfTier(root, tier) {
  const runs = readHistory(root).filter((r) => r.tier === tier);
  return runs.length ? runs[runs.length - 1] : null;
}

/** Touch the marker recording that source files changed since the last gate run. */
export function markDirty(root) {
  mkdirSync(join(root, '.agent'), { recursive: true });
  writeFileSync(dirtyPath(root), new Date().toISOString());
}

/**
 * True when files were edited after the given run. Used by the Stop hook to decide
 * whether a previously green gate still means anything.
 */
export function isDirtySince(root, isoTimestamp) {
  const path = dirtyPath(root);
  if (!existsSync(path)) return false;
  return statSync(path).mtimeMs > Date.parse(isoTimestamp);
}

const EXTRACTORS = [
  // TypeScript: src/x.ts(12,5): error TS2322: ...
  { re: /error (TS\d+)/, tag: (m) => `ts:${m[1]}` },
  // ESLint stylish: 12:5  error  message  rule/name
  { re: /^\s*\d+:\d+\s+error\s+.*?\s{2,}([@\w][\w@/-]+)\s*$/m, tag: (m) => `eslint:${m[1]}` },
  // Jest / Vitest assertion and thrown-error classes
  { re: /^\s*(?:●|×|FAIL).*\n[\s\S]{0,400}?\b(\w*(?:Error|Exception))\b/m, tag: (m) => `test:${m[1]}` },
  // Go vet/build and generic compilers: file.go:12:5: message
  { re: /^[\w./\\-]+\.go:\d+:\d+:\s*(.+)$/m, tag: (m) => `go:${normalize(m[1])}` },
  // Python tracebacks
  { re: /^(\w*(?:Error|Exception)):/m, tag: (m) => `py:${m[1]}` },
];

/**
 * Collapse a failure into a stable key so repeated occurrences cluster across runs.
 * This is what makes `loop retro` able to say "this failed 14 times" instead of
 * comparing raw output that differs by line number every time.
 */
export function fingerprint(output) {
  if (!output) return 'unknown';
  for (const { re, tag } of EXTRACTORS) {
    const m = output.match(re);
    if (m) return tag(m);
  }
  return `raw:${normalize(firstError(output) ?? output.split('\n')[0] ?? '')}`;
}

/**
 * The most useful single line to show a human or agent about why a check failed.
 *
 * Scans from the end first: a stack trace's last line is the actual exception,
 * while its first line is boilerplate. Compiler output rarely matches the
 * exception pattern, so it falls through to the forward scan.
 */
export function firstError(output) {
  if (!output) return null;
  const lines = output.split('\n').filter((l) => l.trim());

  // `ImportError:` has no word boundary before "Error", so a \berror\b pattern
  // misses every Python exception. Match the class-name shape explicitly.
  const exception = [...lines].reverse().find((l) => /^\s*\w*(?:Error|Exception)\b.*:/.test(l));
  if (exception) return exception.trim().slice(0, 300);

  const signal = lines.find((l) => /\b(error|failed|failure)\b|✕|×|●/i.test(l));
  return (signal ?? lines[0] ?? '').trim().slice(0, 300) || null;
}

/** Strip paths, numbers and quoted literals so cosmetically different messages match. */
function normalize(text) {
  return text
    .replace(/["'`][^"'`]*["'`]/g, '?')
    .replace(/[\w./\\-]*[/\\][\w./\\-]+/g, '?')
    .replace(/\d+/g, 'N')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .slice(0, 80);
}

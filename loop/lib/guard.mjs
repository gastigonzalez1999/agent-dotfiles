import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';

/**
 * `loop guard` — deterministic checks on the lines a change *adds*.
 *
 * Only added lines are inspected. A legacy repository has thousands of
 * pre-existing violations; a guard that reports them is a guard nobody can turn
 * on. Judging the diff makes every rule a ratchet: the codebase can only get
 * cleaner, and the first day costs nothing.
 *
 * Messages are written for the agent that will read them, because that is who
 * reads them.
 */

const SLASH = new Set(
  '.js .jsx .mjs .cjs .ts .tsx .mts .cts .vue .svelte .astro .go .rs .java .kt .kts .scala .cs .c .h .cc .cpp .hpp .swift .dart .php'.split(' '),
);
const HASH = new Set('.py .pyi .rb .sh .bash .zsh .ps1 .psm1 .r .pl .ex .exs'.split(' '));

// Directives are recognised where tools recognise them — at the start of a
// comment — so prose that merely mentions "eslint-disable" is not reported.
// flake8 and mypy also honour `# noqa` / `# type: ignore` after other comment text.
const SUPPRESSION_IN_COMMENT =
  /^(\/\/+|#+|\/\*+|\{\/\*+)\s*(@ts-(ignore|nocheck|expect-error)\b|eslint-disable|biome-ignore|noqa\b|type:\s*ignore|pyright:\s*ignore|pylint:\s*disable|nolint\b|rubocop:disable|prettier-ignore)|#\s*(noqa\b|type:\s*ignore)|NOSONAR/;
// Suppressions that are code, not comments. Matched with string contents removed.
const SUPPRESSION_IN_CODE = /@SuppressWarnings\b|#!?\[allow\(|\[SuppressMessage\b|#pragma\s+warning\s+disable/;

const DEFAULT_COMMENT_ALLOW = [
  '^#!', // shebang
  '^//go:', // go directives
  '^// \\+build', // legacy go build tags
  '^#\\s*-\\*-', // python coding cookie
  '^///', // rust / C# doc comments
  '^/\\*\\*', // JSDoc / Javadoc on public APIs
  '^(//|#)\\s*(TODO|FIXME)\\([A-Za-z0-9#_.-]+\\)', // TODO tied to an issue: TODO(#123), TODO(ABC-12)
  '^//\\s*(swiftlint|region|endregion)', // tool directives
  '^#\\s*(region|endregion)\\b',
];

const FIX_CAUSE = 'Fix the cause. Do not reword, move or suppress the line to get past this check; if the rule itself is wrong here, stop and tell the user.';

export class GuardError extends Error {}

/**
 * Split a line into code and comment, respecting string literals, so that
 * `"https://example.com"` and `'#fff'` are code, not comments.
 * Returns { code, comment, bare }: comment is '' when there is none, and bare
 * is the code with string contents removed. Unknown extensions return null.
 *
 * shortcut: scans one line at a time, so a line inside a multi-line string or
 * block comment is read as code. Upgrade to a per-file tokenizer if that
 * produces real false positives.
 */
export function splitComment(line, ext) {
  const slash = SLASH.has(ext);
  const hash = HASH.has(ext);
  if (!slash && !hash) return null;

  let quote = null;
  let bare = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) {
        quote = null;
        bare += ch;
      }
      continue;
    }
    if (ch === '"' || ch === '`' || (ch === "'" && !isRustLifetime(line, i, ext))) {
      quote = ch;
      bare += ch;
      continue;
    }
    if (slash && ch === '/' && (line[i + 1] === '/' || line[i + 1] === '*')) {
      return { code: line.slice(0, i), comment: line.slice(i), bare };
    }
    // In shell-like languages `#` only starts a comment at a word boundary: `$#`, `${#x}` are code.
    if (hash && ch === '#' && (i === 0 || /\s/.test(line[i - 1]))) {
      return { code: line.slice(0, i), comment: line.slice(i), bare };
    }
    bare += ch;
  }
  return { code: line, comment: '', bare };
}

// `'a` in `fn f<'a>(x: &'a str)` is a lifetime, not the start of a char literal.
function isRustLifetime(line, i, ext) {
  return ext === '.rs' && /[<&\s,(]/.test(line[i - 1] ?? ' ') && line[i + 2] !== "'";
}

/**
 * Check a set of added lines against the guard config.
 * `added` is [{ file, line, text }]; `newFiles` lists paths added by the change.
 * Pure — no git, no filesystem — so every rule is testable in isolation.
 */
export function checkLines(guard, added, newFiles = []) {
  const exclude = guard.exclude ?? [];
  const rules = (guard.rules ?? []).map(compileRule);
  const commentAllow = guard.comments
    ? [...DEFAULT_COMMENT_ALLOW, ...(guard.comments.allow ?? [])].map((p) => new RegExp(p))
    : [];
  const commentExclude = guard.comments?.exclude ?? [];
  const violations = [];
  const report = (file, line, id, message) => violations.push({ file, line, id, message });

  for (const { file, line, text } of added) {
    if (underAny(file, exclude)) continue;
    const ext = extname(file).toLowerCase();
    // Not a known source language (JSON, Markdown, YAML, ...): no comments or
    // suppressions to find, but rules still apply to the whole line.
    const { code, comment, bare } = splitComment(text, ext) ?? { code: text, comment: '', bare: null };
    const trimmed = comment.trim();

    // Suppressions are checked before any comment exemption: an allowed comment
    // form must never become a way to smuggle in `@ts-ignore`.
    const suppressed =
      guard.suppressions !== false &&
      bare !== null &&
      ((trimmed && SUPPRESSION_IN_COMMENT.test(trimmed)) || SUPPRESSION_IN_CODE.test(bare));
    if (suppressed) {
      report(file, line, 'no-suppressions', `Silencing the compiler or linter is not a fix. ${FIX_CAUSE}`);
    } else if (
      guard.comments &&
      trimmed &&
      !underAny(file, commentExclude) &&
      !commentAllow.some((re) => re.test(trimmed))
    ) {
      report(
        file,
        line,
        'no-comments',
        'Explanatory comments are banned here. Make the code say it: a better name, a type, or a smaller function. A comment explaining a workaround means the workaround should not exist. ' +
          FIX_CAUSE,
      );
    }

    for (const rule of rules) {
      if (!appliesTo(rule, file)) continue;
      if (rule.re.test(code)) report(file, line, rule.id, `${rule.message} ${FIX_CAUSE}`);
    }
  }

  if (guard.markdown) {
    const allow = guard.markdown.allow ?? [];
    for (const file of newFiles) {
      if (!file.toLowerCase().endsWith('.md') || underAny(file, exclude)) continue;
      if (allow.some((a) => file === a || (a.endsWith('/') && file.startsWith(a)))) continue;
      report(
        file,
        0,
        'no-new-markdown',
        `New Markdown files are not allowed outside ${allow.join(', ') || 'the allow list'}. Put the information in code, a test, or an existing document — or delete the file if nobody asked for it.`,
      );
    }
  }

  return violations;
}

function compileRule(rule) {
  if (!rule?.id || !rule?.pattern || !rule?.message) {
    throw new GuardError('Every guard rule needs "id", "pattern" and "message".');
  }
  try {
    return { ...rule, re: new RegExp(rule.pattern, rule.flags ?? '') };
  } catch (err) {
    throw new GuardError(`Guard rule "${rule.id}" has an invalid pattern: ${err.message}`);
  }
}

function appliesTo(rule, file) {
  if (rule.paths?.length && !underAny(file, rule.paths)) return false;
  return !underAny(file, rule.exclude ?? []);
}

const underAny = (file, prefixes) => prefixes.some((p) => file === p || file.startsWith(p.endsWith('/') ? p : `${p}/`));

/**
 * Collect what the change adds, from git.
 *   staged:   what is about to be committed (pre-commit hook)
 *   base:     everything since the merge base with `base` (CI on a PR)
 *   default:  every uncommitted change, staged or not, plus untracked files
 */
export function collectChange(root, { staged = false, base = null } = {}) {
  const git = (...args) =>
    execFileSync('git', ['-c', 'core.quotepath=off', ...args], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

  try {
    git('rev-parse', '--git-dir');
  } catch {
    throw new GuardError(`${root} is not a git repository. loop guard judges changes, so it needs git.`);
  }

  let range;
  if (base) range = [`${base}...HEAD`];
  else if (staged || !hasHead(git)) range = ['--cached'];
  else range = ['HEAD'];

  const diffArgs = ['diff', '--no-color', '--no-ext-diff', '--src-prefix=a/', '--dst-prefix=b/', ...range];
  let added;
  let newFiles;
  try {
    added = parseDiff(git(...diffArgs, '-U0', '--diff-filter=ACMR'));
    newFiles = git(...diffArgs, '--name-only', '--diff-filter=A').split('\n').filter(Boolean);
  } catch (err) {
    throw new GuardError(`git diff failed${base ? ` for base "${base}"` : ''}: ${String(err.stderr || err.message).trim()}`);
  }

  if (!staged && !base) {
    const untracked = git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean);
    for (const file of untracked) {
      newFiles.push(file);
      let content;
      try {
        content = readFileSync(join(root, file), 'utf8');
      } catch {
        continue;
      }
      if (content.includes('\0')) continue; // binary
      content.split('\n').forEach((text, i) => added.push({ file, line: i + 1, text: text.replace(/\r$/, '') }));
    }
  }
  return { added, newFiles };
}

function hasHead(git) {
  try {
    git('rev-parse', '--verify', '--quiet', 'HEAD');
    return true;
  } catch {
    return false;
  }
}

/** Parse `git diff -U0` into added lines with their new line numbers. */
export function parseDiff(diff) {
  const added = [];
  let file = null;
  let line = 0;
  for (const raw of diff.split('\n')) {
    if (raw.startsWith('+++ ')) {
      file = raw === '+++ /dev/null' ? null : raw.slice(6).replace(/\t$/, '');
      continue;
    }
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      line = Number(hunk[1]);
      continue;
    }
    if (file && raw.startsWith('+')) {
      added.push({ file, line, text: raw.slice(1).replace(/\r$/, '') });
      line++;
    }
  }
  return added;
}

/** Run the guard for a contract and print the result. Returns true when clean. */
export function runGuard(contract, opts = {}) {
  const guard = contract.guard;
  if (!guard) {
    console.log('loop guard: no "guard" section in .agent/loop.json — nothing to check.');
    return true;
  }
  const { added, newFiles } = collectChange(contract.__root, opts);
  const violations = checkLines(guard, added, newFiles);
  if (!violations.length) {
    console.log(`loop guard: clean (${added.length} added lines checked)`);
    return true;
  }
  console.log(`\nloop guard: ${violations.length} violation(s) in added lines\n`);
  for (const v of violations) console.log(`  ${v.file}${v.line ? `:${v.line}` : ''}  [${v.id}]\n    ${v.message}\n`);
  return false;
}

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Build a starting contract for a repo.
 *
 * Declared scripts beat inferred commands every time: if package.json says
 * `"lint": "eslint --fix src"` we use that rather than guessing an eslint
 * invocation, because the declared one is the one that actually works here.
 */
export function detectContract(root) {
  const pkg = readJson(join(root, 'package.json'));
  const notes = [];

  const gates = pkg ? detectNode(root, pkg, notes) : detectNonNode(root, notes);
  const services = detectServices(root, pkg);

  return {
    contract: {
      $schema: 'https://raw.githubusercontent.com/gastigonzalez1999/agent-dotfiles/main/loop/schema.json',
      gates,
      ...(services.length ? { services } : {}),
      budget: { maxIterations: 5, gateTimeoutSec: 600 },
      enforce: { stopGate: gates.full.length ? 'full' : 'test', postEditGate: false, retro: 'auto' },
    },
    notes,
  };
}

function detectNode(root, pkg, notes) {
  const scripts = pkg.scripts ?? {};
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const pm = packageManager(root, pkg);
  const run = (script) => (pm === 'npm' ? `npm run ${script}` : `${pm} run ${script}`);
  // `npx foo` silently downloads an unrelated `foo` from the registry when the
  // local binary is missing — a gate can then "fail" against a package the
  // project never depended on. `--no` makes that a loud error instead.
  const exec = pm === 'npm' ? 'npx --no' : pm === 'bun' ? 'bunx' : `${pm} exec`;
  notes.push(`package manager: ${pm}`);

  const fast = [];
  const test = [];
  const full = [];

  // --- typecheck -----------------------------------------------------------
  const tsScript = ['typecheck', 'type-check', 'tsc', 'check-types'].find((s) => scripts[s]);
  if (tsScript) {
    fast.push({ name: 'typecheck', cmd: run(tsScript) });
  } else if (existsSync(join(root, 'tsconfig.json'))) {
    fast.push({ name: 'typecheck', cmd: `${exec} tsc --noEmit` });
    notes.push('no typecheck script found — using `tsc --noEmit`; point it at the right tsconfig if this is a monorepo');
  }

  // --- lint ----------------------------------------------------------------
  // Lint lands in `full`, not `fast`: it is usually the slowest of the cheap
  // checks and its failures rarely block further progress the way a type error does.
  if (scripts.lint) full.push({ name: 'lint', cmd: run('lint') });

  // --- unit tests ----------------------------------------------------------
  if (scripts.test && !/no test specified/i.test(scripts.test)) {
    const runner = deps.vitest ? 'vitest' : deps.jest || deps['ts-jest'] ? 'jest' : null;
    // Only ever append --passWithNoTests: a repo with no tests yet should not
    // fail its own gate. Anything else is left alone — patching flags onto a
    // declared script is how you break the command that already worked.
    const cmd = runner ? `${run('test')} -- --passWithNoTests` : run('test');
    test.push({ name: 'unit', cmd });
    if (runner) notes.push(`test runner: ${runner}`);
    if (/--watch|^(vitest|jest)$/.test(scripts.test.trim())) {
      notes.push(`"test" looks like a watcher (${scripts.test}) — it will hang the gate; point the unit check at a single-run command`);
    }
  }

  // --- build ---------------------------------------------------------------
  if (scripts.build) full.push({ name: 'build', cmd: run('build') });

  // --- e2e -----------------------------------------------------------------
  const e2eScript = ['test:e2e', 'e2e', 'test:integration'].find((s) => scripts[s]);
  if (e2eScript) {
    full.push({ name: 'e2e', cmd: run(e2eScript), optional: true });
    notes.push(`${e2eScript} added as optional — it reports but never blocks; drop "optional" once it is reliable`);
  }

  if (deps['@nestjs/core']) notes.push('NestJS detected');
  if (deps.next) notes.push('Next.js detected');
  if (existsSync(join(root, 'turbo.json'))) notes.push('Turborepo detected — consider scoping checks per app with "cwd"');

  return { fast, test, full };
}

function detectNonNode(root, notes) {
  if (existsSync(join(root, 'go.mod'))) {
    notes.push('Go module detected');
    return {
      fast: [{ name: 'vet', cmd: 'go vet ./...' }],
      test: [{ name: 'unit', cmd: 'go test ./...' }],
      full: [{ name: 'build', cmd: 'go build ./...' }],
    };
  }

  if (existsSync(join(root, 'pyproject.toml')) || existsSync(join(root, 'requirements.txt'))) {
    const conf = readText(join(root, 'pyproject.toml')) + readText(join(root, 'requirements.txt'));
    notes.push('Python project detected');
    const fast = [];
    if (/\bruff\b/.test(conf)) fast.push({ name: 'lint', cmd: 'ruff check .' });
    if (/\bmypy\b/.test(conf)) fast.push({ name: 'typecheck', cmd: 'mypy .' });
    const test = /\bpytest\b/.test(conf) ? [{ name: 'unit', cmd: 'pytest -q' }] : [];
    if (!fast.length && !test.length) notes.push('no ruff/mypy/pytest found — fill in gates by hand');
    return { fast, test, full: [] };
  }

  if (existsSync(join(root, 'Cargo.toml'))) {
    notes.push('Rust crate detected');
    return {
      fast: [{ name: 'check', cmd: 'cargo check' }],
      test: [{ name: 'unit', cmd: 'cargo test' }],
      full: [{ name: 'clippy', cmd: 'cargo clippy -- -D warnings' }],
    };
  }

  notes.push('unrecognised stack — gates left empty, fill them in by hand');
  return { fast: [], test: [], full: [] };
}

/** Long-running processes worth a `loop doctor` probe. Ports come from the repo, never from a constant. */
function detectServices(root, pkg) {
  const scripts = pkg?.scripts ?? {};
  const services = [];
  const devScript = ['start:dev', 'dev', 'start'].find((s) => scripts[s]);
  if (!devScript) return services;

  const port = guessPort(root);
  services.push({
    name: 'app',
    start: `npm run ${devScript}`,
    ...(port ? { port } : {}),
  });
  return services;
}

function guessPort(root) {
  for (const file of ['.env.example', '.env', '.env.development']) {
    const m = readText(join(root, file)).match(/^\s*(?:APP_)?PORT\s*=\s*(\d{2,5})/m);
    if (m) return Number(m[1]);
  }
  return null;
}

function packageManager(root, pkg) {
  const declared = pkg.packageManager?.split('@')[0];
  if (declared) return declared;
  if (existsSync(join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(root, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(root, 'bun.lockb')) || existsSync(join(root, 'bun.lock'))) return 'bun';
  return 'npm';
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function readText(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

/** True when the directory holds a recognisable project at all. */
export function looksLikeProject(root) {
  if (!existsSync(root)) return false;
  const markers = ['package.json', 'go.mod', 'pyproject.toml', 'requirements.txt', 'Cargo.toml', '.git'];
  const entries = new Set(readdirSync(root));
  return markers.some((m) => entries.has(m));
}

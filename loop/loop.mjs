#!/usr/bin/env node
/**
 * loop — the portable agent verification loop.
 *
 * The machinery here is generic. Everything project-specific lives in
 * .agent/loop.json, which is why this same script works in every repo on
 * every machine. See loop/schema.json for the contract format.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ContractError, TIERS, findRoot, isUnsafeRoot, loadContract } from './lib/config.mjs';
import { detectContract, looksLikeProject } from './lib/detect.mjs';
import { preflight, runGate } from './lib/gate.mjs';
import { installHooks } from './lib/install.mjs';
import { doctor } from './lib/doctor.mjs';
import { printReport } from './lib/report.mjs';
import { MIN_DAYS, MIN_OCCURRENCES, MIN_REPOS_FOR_GLOBAL, apply, globalFindings, ledger, revert } from './lib/retro.mjs';

const USAGE = `loop — portable agent verification loop

  loop init [--force]     detect this project's checks and write .agent/loop.json
  loop fast               quick gate: run after every edit
  loop test               unit gate: run after a unit of work
  loop full               complete gate: must pass before declaring work done
  loop doctor             check the services this project declares are up
  loop report             what the loop has cost and where it keeps failing
  loop install-hooks      merge the Claude Code enforcement hooks into settings.json

  loop retro              show what the loop would learn from this project (no writes)
  loop retro --apply      write those lessons into the managed block and commit
  loop retro --global     patterns seen in enough repos to belong in global rules
  loop retro --log        every automated change, with its evidence
  loop retro --revert ID  undo one change
  loop --help

Exit codes: 0 green · 1 gate failed · 2 configuration problem
`;

const [, , command, ...args] = process.argv;

try {
  await main(command, args);
} catch (err) {
  if (err instanceof ContractError) fail(err.message);
  throw err;
}

async function main(cmd, argv) {
  if (!cmd || cmd === '--help' || cmd === '-h') {
    console.log(USAGE);
    return;
  }

  if (cmd === 'init') return init(argv);
  if (cmd === 'install-hooks') return installCommand(argv);

  if (cmd === 'retro') return retroCommand(argv);

  if (cmd === 'doctor' || cmd === 'report') {
    const root = findRoot();
    if (!root) fail('Not inside a project. Run this from a repository.');
    if (cmd === 'report') return printReport(root);
    const healthy = await doctor(loadContract(root));
    process.exit(healthy ? 0 : 1);
  }

  if (TIERS.includes(cmd)) {
    const root = findRoot();
    if (!root) fail('Not inside a project. Run this from a repository.');
    const contract = loadContract(root);
    const problem = preflight(root);
    if (problem) fail(problem);
    const run = await runGate(contract, cmd, { quiet: argv.includes('--quiet') });
    process.exit(run.ok ? 0 : 1);
  }

  fail(`Unknown command "${cmd}".\n\n${USAGE}`);
}

function init(argv) {
  const root = findRoot() ?? process.cwd();
  if (isUnsafeRoot(root)) fail(`Refusing to write a contract to ${root}. Run \`loop init\` from inside a project.`);
  if (!looksLikeProject(root)) fail(`${root} does not look like a project (no package.json, go.mod, pyproject.toml or .git).`);

  const target = join(root, '.agent', 'loop.json');
  if (existsSync(target) && !argv.includes('--force')) {
    fail(`${target} already exists. Re-run with --force to regenerate it.`);
  }

  const { contract, notes } = detectContract(root);
  mkdirSync(join(root, '.agent'), { recursive: true });
  writeFileSync(target, JSON.stringify(contract, null, 2) + '\n');
  ignoreArtifacts(root);

  const total = TIERS.reduce((n, t) => n + contract.gates[t].length, 0);
  console.log(`\nWrote ${target}\n`);
  for (const tier of TIERS) {
    const checks = contract.gates[tier];
    console.log(`  ${tier.padEnd(5)} ${checks.length ? checks.map((c) => c.name).join(', ') : '—'}`);
  }
  if (notes.length) {
    console.log('\nNotes:');
    for (const note of notes) console.log(`  · ${note}`);
  }
  console.log(
    total
      ? '\nDetection is a starting point, not an answer. Verify each command runs, then commit the file.\n'
      : '\nNothing detected — fill in gates by hand before this is useful.\n',
  );
}

function retroCommand(argv) {
  if (argv.includes('--log')) {
    const entries = ledger();
    if (!entries.length) return console.log('\nNo automated changes recorded yet.\n');
    console.log('');
    for (const e of entries) {
      console.log(`  ${e.id.padEnd(10)} ${e.ts.slice(0, 16)}  ${e.kind.padEnd(18)} ${e.file}`);
      console.log(`             ${e.note}`);
    }
    console.log('');
    return;
  }

  const revertIdx = argv.indexOf('--revert');
  if (revertIdx !== -1) {
    const id = argv[revertIdx + 1];
    if (!id) fail('--revert needs an id. See `loop retro --log`.');
    const entry = revert(id);
    if (!entry) fail(`No change with id ${id}. See \`loop retro --log\`.`);
    console.log(`\nReverted ${entry.kind} in ${entry.file} (from ${entry.ts.slice(0, 16)}).\n`);
    return;
  }

  if (argv.includes('--global')) {
    const promoted = globalFindings();
    if (!promoted.length) {
      return console.log(`\nNothing seen in enough repositories yet (needs ${MIN_REPOS_FOR_GLOBAL}).\n`);
    }
    console.log('\nPatterns present in enough repositories to be global:\n');
    for (const p of promoted) console.log(`  ${p.fingerprint}  ${p.count} runs across ${p.repos.length} repos`);
    console.log('');
    return;
  }

  const root = findRoot();
  if (!root) fail('Not inside a project. Run this from a repository.');
  const contract = loadContract(root);
  const dryRun = !argv.includes('--apply');
  const { skipped, changes } = apply(root, { dryRun, contract });

  if (skipped) return console.log(`\n${skipped}\n`);
  if (!changes.length) {
    return console.log(`\nNothing to learn yet — needs ${MIN_OCCURRENCES}+ occurrences across ${MIN_DAYS}+ days.\n`);
  }

  console.log(dryRun ? '\nWould change:\n' : '\nChanged:\n');
  for (const c of changes) console.log(`  ${c.id}  ${c.kind.padEnd(18)} ${c.file}`);
  console.log(dryRun ? '\nRe-run with --apply to write these.\n' : '\nCommitted separately. Undo with `loop retro --revert <id>`.\n');
}

function installCommand(argv) {
  const dryRun = argv.includes('--dry-run');
  const withRetro = argv.includes('--with-retro');
  const result = installHooks({ dryRun, withRetro });

  if (!result.changed) {
    console.log(`Hooks already up to date in ${result.settingsPath}`);
    return;
  }
  console.log(dryRun ? `\nWould update ${result.settingsPath}` : `\nUpdated ${result.settingsPath}`);
  if (result.backup) console.log(`Backup: ${result.backup}`);
  console.log(`
  Stop          blocks finishing while the gate is red or stale
  PostToolUse   tracks edits; runs the fast gate only where enforce.postEditGate is on${
    withRetro
      ? `
  SessionStart  applies learned rules unattended, once a week per project`
      : ''
  }

Projects without .agent/loop.json are unaffected — the hooks exit immediately.
Restart Claude Code for the change to take effect.
`);
}

/** Keep run artifacts out of git; the contract itself is meant to be committed. */
function ignoreArtifacts(root) {
  const path = join(root, '.gitignore');
  const entry = '.agent/.loop-*';
  const current = existsSync(path) ? readFileSync(path, 'utf8') : '';
  if (current.split('\n').some((l) => l.trim() === entry)) return;
  const prefix = current && !current.endsWith('\n') ? '\n' : '';
  appendFileSync(path, `${prefix}\n# agent loop run artifacts (the contract itself is committed)\n${entry}\n`);
}

function fail(message) {
  console.error(message);
  process.exit(2);
}

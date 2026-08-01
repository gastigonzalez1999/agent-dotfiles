#!/usr/bin/env node
/**
 * Stop hook — refuses to let the agent finish while a gate is red or stale.
 *
 * This hook *asserts* freshness; it does not run the gate itself. Two reasons,
 * both of which matter more than the extra round trip:
 *
 *   1. `loop full` can take minutes. Hooks run under a timeout, so running the
 *      gate here would mean either a killed hook or a settings file full of
 *      ten-minute timeouts.
 *   2. When the agent runs the gate through its own tools it *sees* the whole
 *      output and can act on it. Failure text squeezed through hook stderr is a
 *      strictly worse feedback channel.
 *
 * Checks every project the session edited, not just the session cwd — the cwd is
 * often a directory that merely contains the repos, and checking only it would
 * enforce nothing.
 */
import { readHookInput, allow, block } from './shared.mjs';
import { tryLoadContract } from '../lib/config.mjs';
import { isDirtySince, lastRunOfTier } from '../lib/history.mjs';
import { touchedProjects } from '../lib/session.mjs';

const input = await readHookInput();

// Already blocked once this turn — blocking again would loop forever.
if (input.stop_hook_active) allow();

const contracts = new Map();
for (const dir of [...touchedProjects(input.session_id), input.cwd || process.cwd()]) {
  const contract = safely(() => tryLoadContract(dir));
  if (contract) contracts.set(contract.__root, contract);
}
if (!contracts.size) allow(); // nothing here has opted in

const problems = [];
for (const contract of contracts.values()) {
  const problem = check(contract);
  if (problem) problems.push(problem);
}
if (!problems.length) allow();

block(problems.join('\n\n'));

function check(contract) {
  const tier = contract.enforce.stopGate;
  if (!tier) return null; // gate explicitly disabled for this repo

  const root = contract.__root;
  const where = contracts.size > 1 ? ` in ${root}` : '';
  const last = safely(() => lastRunOfTier(root, tier));

  if (!last) {
    return (
      `Loop gate not satisfied${where}: \`${tier}\` has never been run.\n` +
      `Run it, fix anything it reports, and then finish:\n\n    loop ${tier}\n`
    );
  }

  if (!last.ok) {
    return (
      `Loop gate is red${where}: \`loop ${tier}\` failed.\n\n` +
      failedList(last) +
      `\nFix the causes and re-run \`loop ${tier}\` until it exits 0.\n` +
      `Full output from that run: .agent/.loop-last.json\n`
    );
  }

  if (safely(() => isDirtySince(root, last.ts))) {
    return (
      `Loop gate is stale${where}: files changed after the last green \`${tier}\` run.\n` +
      `Re-run it before finishing:\n\n    loop ${tier}\n`
    );
  }

  return null;
}

function failedList(run) {
  return run.checks
    .filter((c) => !c.ok && !c.optional)
    .map((c) => `  - ${c.name}: ${c.firstError ?? c.fingerprint ?? 'failed'}`)
    .join('\n');
}

/** Any unexpected failure means "let the agent through", never "crash the session". */
function safely(fn) {
  try {
    return fn();
  } catch {
    return null;
  }
}

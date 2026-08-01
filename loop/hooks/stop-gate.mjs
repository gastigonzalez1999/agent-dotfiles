#!/usr/bin/env node
/**
 * Stop hook — refuses to let the agent finish while the gate is red or stale.
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
 * So the agent is told to run the gate, and blocked again if it does not.
 */
import { readHookInput, allow, block } from './shared.mjs';
import { tryLoadContract } from '../lib/config.mjs';
import { isDirtySince, lastRunOfTier } from '../lib/history.mjs';

const input = await readHookInput();

// Already blocked once this turn — blocking again would loop forever.
if (input.stop_hook_active) allow();

const contract = safely(() => tryLoadContract(input.cwd || process.cwd()));
if (!contract) allow(); // project has not opted in

const tier = contract.enforce.stopGate;
if (!tier) allow(); // gate explicitly disabled for this repo

const root = contract.__root;
const last = safely(() => lastRunOfTier(root, tier));

if (!last) {
  block(
    `Loop gate not satisfied: \`${tier}\` has never been run in this project.\n` +
      `Run it, fix anything it reports, and then finish:\n\n    loop ${tier}\n`,
  );
}

if (!last.ok) {
  block(
    `Loop gate is red: \`loop ${tier}\` failed.\n\n` +
      failedList(last) +
      `\nFix the causes and re-run \`loop ${tier}\` until it exits 0.\n` +
      `Full output from that run: .agent/.loop-last.json\n`,
  );
}

if (safely(() => isDirtySince(root, last.ts))) {
  block(
    `Loop gate is stale: files changed after the last green \`${tier}\` run.\n` +
      `Re-run it before finishing:\n\n    loop ${tier}\n`,
  );
}

allow();

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

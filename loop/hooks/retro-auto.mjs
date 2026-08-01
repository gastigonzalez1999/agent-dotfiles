#!/usr/bin/env node
/**
 * SessionStart hook — the unattended learning pass.
 *
 * Throttled to once a week per project, writes only inside the managed block,
 * ledgers everything, and commits its own files separately. Never blocks: this
 * hook always exits 0, because a failure to learn is not a reason to stop a
 * session from starting.
 *
 * Opt in per repo with `"enforce": { "retro": "auto" }`. Off everywhere else,
 * because this commits to the repo unattended and that has to be a choice —
 * especially on a repo shared with other people.
 */
import { readHookInput, allow } from './shared.mjs';
import { tryLoadContract } from '../lib/config.mjs';
import { autoApply } from '../lib/retro.mjs';

const input = await readHookInput();

try {
  const contract = tryLoadContract(input.cwd || process.cwd());
  // Opt-in: only an explicit "auto" lets this write to a repo.
  if (contract && contract.enforce.retro === 'auto') {
    const { changes = [], throttled } = autoApply(contract.__root, contract) ?? {};
    if (!throttled && changes.length) {
      // Visible to the user, not injected into the agent's context.
      process.stdout.write(
        `loop retro applied ${changes.length} change(s): ${changes.map((c) => c.kind).join(', ')}. ` +
          `Review with \`loop retro --log\`.\n`,
      );
    }
  }
} catch {
  // Silent by design — see the header.
}

allow();

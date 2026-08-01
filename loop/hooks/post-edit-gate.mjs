#!/usr/bin/env node
/**
 * PostToolUse hook (Edit / Write / MultiEdit).
 *
 * Always does one cheap thing: touch the dirty marker, so the Stop hook can tell
 * a still-valid green run from a stale one. This part is unconditional — without
 * it a gate that went green an hour and forty edits ago still counts as green.
 *
 * Only when a repo opts in with `enforce.postEditGate` does it also run the fast
 * gate and block on failure. That is high friction by design and off by default.
 */
import { readHookInput, allow, block } from './shared.mjs';
import { tryLoadContract } from '../lib/config.mjs';
import { lastRunOfTier, markDirty } from '../lib/history.mjs';
import { failureBrief, preflight, runGate } from '../lib/gate.mjs';

const DEBOUNCE_MS = 20_000;

const input = await readHookInput();

const contract = safely(() => tryLoadContract(input.cwd || process.cwd()));
if (!contract) allow();

const root = contract.__root;
safely(() => markDirty(root));

if (!contract.enforce.postEditGate) allow();
if (!contract.gates.fast?.length) allow();

// A burst of edits should not mean a burst of gate runs.
const last = safely(() => lastRunOfTier(root, 'fast'));
if (last && Date.now() - Date.parse(last.ts) < DEBOUNCE_MS) allow();

// An environment problem is not something the agent should be blocked on mid-edit.
if (safely(() => preflight(root))) allow();

const run = await runGate(contract, 'fast', { quiet: true }).catch(() => null);
if (!run || run.ok) allow();

block(`Fast gate failed after your edit.\n\n${failureBrief(run)}\n\nFix this before continuing.`);

function safely(fn) {
  try {
    return fn();
  } catch {
    return null;
  }
}

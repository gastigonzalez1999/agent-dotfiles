#!/usr/bin/env node
/**
 * PostToolUse hook (Edit / Write / MultiEdit / NotebookEdit).
 *
 * Always does two cheap things: touch the dirty marker so the Stop hook can tell
 * a still-valid green run from a stale one, and record which project this session
 * has edited so Stop knows what to check.
 *
 * The project is resolved from the *edited file*, not the session cwd. Opening
 * Claude Code on a directory that merely contains your repos is normal, and a
 * cwd-based lookup enforces nothing under that setup.
 *
 * Only when a repo opts in with `enforce.postEditGate` does it also run the fast
 * gate and block on failure. That is high friction by design and off by default.
 */
import { dirname } from 'node:path';
import { readHookInput, allow, block } from './shared.mjs';
import { tryLoadContract } from '../lib/config.mjs';
import { lastRunOfTier, markDirty } from '../lib/history.mjs';
import { failureBrief, preflight, runGate } from '../lib/gate.mjs';
import { recordTouched } from '../lib/session.mjs';

const DEBOUNCE_MS = 20_000;

const input = await readHookInput();

const edited = editedPath(input);
const contract = safely(() => tryLoadContract(edited ? dirname(edited) : input.cwd || process.cwd()));
if (!contract) allow();

const root = contract.__root;
safely(() => markDirty(root));
safely(() => recordTouched(input.session_id, root));

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

/** Edit and Write use file_path; NotebookEdit uses notebook_path. */
function editedPath(hook) {
  const i = hook.tool_input ?? {};
  return i.file_path ?? i.notebook_path ?? null;
}

function safely(fn) {
  try {
    return fn();
  } catch {
    return null;
  }
}

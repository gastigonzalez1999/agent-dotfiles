import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Which projects on this machine use the loop.
 *
 * Cross-repo promotion needs to know where to look, and there is no other way to
 * discover it: a contract lives inside its own repo and knows nothing about the
 * others. Written only when a new root appears, so the common path is a read.
 */
const DIR = join(homedir(), '.claude', 'loop');
const REGISTRY = join(DIR, 'projects.json');
export const LEDGER = join(DIR, 'retro-ledger.jsonl');

export function registerProject(root) {
  try {
    const known = registeredProjects();
    if (known.includes(root)) return;
    mkdirSync(DIR, { recursive: true });
    writeFileSync(REGISTRY, JSON.stringify([...known, root], null, 2) + '\n');
  } catch {
    // A registry we cannot write is not worth failing a gate over.
  }
}

/** Must succeed before any file is modified — a change with no ledger entry cannot be reverted. */
export function ensureLedgerDir() {
  mkdirSync(DIR, { recursive: true });
}

export function registeredProjects() {
  try {
    if (!existsSync(REGISTRY)) return [];
    const parsed = JSON.parse(readFileSync(REGISTRY, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export { REGISTRY };

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

export const CONTRACT_REL = join('.agent', 'loop.json');
export const TIERS = ['fast', 'test', 'full'];

/**
 * The home directory is never a project, even though it very often contains a
 * .git (dotfiles repo) and a package.json (stray global install). Without this
 * boundary a `loop init` run from any scratch directory walks up and writes its
 * contract into the user's home.
 */
export const HOME = resolve(homedir());

const DEFAULTS = {
  budget: { maxIterations: 5, gateTimeoutSec: 600 },
  // retro defaults to off: it commits to the repo unattended, and a feature that
  // writes to shared code must be chosen, never inherited. Set "auto" per repo.
  enforce: { stopGate: 'full', postEditGate: false, retro: 'off' },
};

/**
 * Walk up from `start` looking for a repo root. A directory containing
 * .agent/loop.json wins outright; otherwise the nearest .git, then the
 * nearest package.json. Returns null when nothing looks like a project.
 */
export function findRoot(start = process.cwd()) {
  let dir = resolve(start);
  let gitFallback = null;
  let pkgFallback = null;

  for (;;) {
    if (dir === HOME) break;
    if (existsSync(join(dir, CONTRACT_REL))) return dir;
    if (!gitFallback && existsSync(join(dir, '.git'))) gitFallback = dir;
    if (!pkgFallback && existsSync(join(dir, 'package.json'))) pkgFallback = dir;

    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return gitFallback ?? pkgFallback;
}

/** True for locations no project contract should ever be written to. */
export function isUnsafeRoot(dir) {
  const resolved = resolve(dir);
  return resolved === HOME || resolved === dirname(resolved);
}

export class ContractError extends Error {}

/**
 * Load and normalise the contract. Throws ContractError with an actionable
 * message rather than letting a bad file surface as a JSON syntax error.
 */
export function loadContract(root) {
  const path = join(root, CONTRACT_REL);
  if (!existsSync(path)) {
    throw new ContractError(`No ${CONTRACT_REL} in ${root}. Run \`loop init\` to create one.`);
  }

  let raw;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new ContractError(`${path} is not valid JSON: ${err.message}`);
  }

  if (!raw.gates || typeof raw.gates !== 'object') {
    throw new ContractError(`${path} has no "gates" object.`);
  }

  for (const tier of Object.keys(raw.gates)) {
    if (!TIERS.includes(tier)) {
      throw new ContractError(`${path}: unknown gate tier "${tier}". Expected one of ${TIERS.join(', ')}.`);
    }
    if (!Array.isArray(raw.gates[tier])) {
      throw new ContractError(`${path}: gates.${tier} must be an array.`);
    }
    for (const check of raw.gates[tier]) {
      if (!check?.name || !check?.cmd) {
        throw new ContractError(`${path}: every check in gates.${tier} needs both "name" and "cmd".`);
      }
    }
  }

  return {
    ...raw,
    gates: { fast: [], test: [], full: [], ...raw.gates },
    services: raw.services ?? [],
    budget: { ...DEFAULTS.budget, ...raw.budget },
    enforce: { ...DEFAULTS.enforce, ...raw.enforce },
    __path: path,
    __root: root,
  };
}

/** Load the contract, or null if this project has not opted in. Never throws on absence. */
export function tryLoadContract(start = process.cwd()) {
  const root = findRoot(start);
  if (!root || !existsSync(join(root, CONTRACT_REL))) return null;
  return loadContract(root);
}

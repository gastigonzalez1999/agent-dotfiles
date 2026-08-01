import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Which projects a session has edited.
 *
 * Hooks receive the session's cwd, which is not necessarily a project: opening
 * Claude Code on a directory that *contains* your repos is a normal workflow,
 * and under it a cwd-only lookup finds no contract and enforces nothing. The
 * edited file's path is the reliable signal, so PostToolUse records the project
 * it belongs to and Stop checks everything the session actually touched.
 */
const DIR = join(homedir(), '.claude', 'loop', 'sessions');
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const sessionFile = (sessionId) => join(DIR, `${sanitise(sessionId)}.json`);

export function recordTouched(sessionId, root) {
  if (!sessionId || !root) return;
  try {
    const current = touchedProjects(sessionId);
    if (current.includes(root)) return;
    mkdirSync(DIR, { recursive: true });
    writeFileSync(sessionFile(sessionId), JSON.stringify([...current, root]));
    pruneOldSessions();
  } catch {
    // Losing this only costs enforcement on one edit; never break the session.
  }
}

export function touchedProjects(sessionId) {
  if (!sessionId) return [];
  try {
    const path = sessionFile(sessionId);
    if (!existsSync(path)) return [];
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Sessions end without telling us, so old files are swept opportunistically. */
function pruneOldSessions() {
  try {
    const cutoff = Date.now() - MAX_AGE_MS;
    for (const name of readdirSync(DIR)) {
      const path = join(DIR, name);
      if (statSync(path).mtimeMs < cutoff) rmSync(path, { force: true });
    }
  } catch {
    // Best effort.
  }
}

const sanitise = (id) => String(id).replace(/[^\w.-]/g, '_').slice(0, 100);

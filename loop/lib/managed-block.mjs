import { createHash } from 'node:crypto';

/**
 * Reading and writing the one region of a Markdown file that retro owns.
 *
 * Everything outside the markers is untouchable. These files are long,
 * hand-written documents that took real effort; an agent editing them freely
 * would destroy work no history file can reconstruct. Confining automated
 * writes to a delimited block is what makes unattended editing survivable.
 */

export const BEGIN = '<!-- loop-retro:begin -->';
export const END = '<!-- loop-retro:end -->';
const HEADING = '## Learned from the verification loop';
export const MAX_LINES = 40;

/** Stable per (target, fingerprint) so a repeat finding updates its entry instead of adding another. */
export function entryId(target, fingerprint) {
  return createHash('sha256').update(`${target}::${fingerprint}`).digest('hex').slice(0, 8);
}

/** Parse existing entries out of a document. Returns [] when there is no block yet. */
export function readEntries(text) {
  const block = extractBlock(text);
  if (!block) return [];

  const entries = [];
  const re = /<!-- retro:([0-9a-f]{8}) \| (.+?) \| (\d+) runs since (\S+) -->\n(.*)/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    entries.push({ id: m[1], fingerprint: m[2], count: Number(m[3]), since: m[4], line: m[5] });
  }
  return entries;
}

export function extractBlock(text) {
  const start = text.indexOf(BEGIN);
  const end = text.indexOf(END);
  if (start === -1 || end === -1 || end < start) return null;
  return text.slice(start + BEGIN.length, end);
}

/**
 * Merge new entries with existing ones and render the block.
 * Enforces the size cap by evicting the weakest evidence — without this the
 * block grows forever and slowly poisons the context of every future session.
 */
export function renderBlock(existing, incoming) {
  const byId = new Map(existing.map((e) => [e.id, e]));
  for (const entry of incoming) byId.set(entry.id, entry);

  const kept = [...byId.values()].sort((a, b) => b.count - a.count).slice(0, Math.floor((MAX_LINES - 3) / 2));

  const body = kept
    .map((e) => `<!-- retro:${e.id} | ${e.fingerprint} | ${e.count} runs since ${e.since} -->\n${e.line}`)
    .join('\n');

  return `${BEGIN}\n${HEADING}\n\n${body}\n${END}`;
}

/** Replace the managed block, or append one, leaving every other byte alone. */
export function writeBlock(text, block) {
  const start = text.indexOf(BEGIN);
  const end = text.indexOf(END);
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(0, start) + block + text.slice(end + END.length);
  }
  const sep = text.length && !text.endsWith('\n\n') ? (text.endsWith('\n') ? '\n' : '\n\n') : '';
  return text + sep + block + '\n';
}

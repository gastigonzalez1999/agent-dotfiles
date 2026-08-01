import { spawn } from 'node:child_process';

/**
 * Run one check command. Never rejects — a failure is a result, not an exception,
 * because the caller reports every check in the gate before deciding the verdict.
 *
 * Returns { ok, code, signal, timedOut, durationMs, output }.
 */
export function runCheck(check, { cwd, timeoutSec }) {
  const limitMs = (check.timeoutSec ?? timeoutSec) * 1000;
  const started = Date.now();

  return new Promise((resolve) => {
    const child = spawn(check.cmd, {
      cwd,
      shell: true,
      windowsHide: true,
      // Own process group on POSIX so killTree's negative-pid kill reaches
      // grandchildren (the shell's children), not just the shell.
      detached: process.platform !== 'win32',
      env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' },
    });

    let output = '';
    let timedOut = false;
    const capture = (buf) => {
      // Strip ANSI even though NO_COLOR is set — npm, pnpm and several CLIs
      // colour their own output regardless, and escape codes wreck both the
      // failure fingerprint and anything an agent reads.
      output += stripAnsi(buf.toString());
      // Bound memory on runaway output; keep the head, which is where
      // compiler and linter errors live.
      if (output.length > 512_000) output = output.slice(0, 512_000) + '\n...output truncated...';
    };
    child.stdout?.on('data', capture);
    child.stderr?.on('data', capture);

    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child);
    }, limitMs);

    const finish = (code, signal) => {
      clearTimeout(timer);
      resolve({
        ok: timedOut ? false : code === 0,
        code: code ?? null,
        signal: signal ?? null,
        timedOut,
        durationMs: Date.now() - started,
        output: output.trim(),
      });
    };

    child.on('error', (err) => {
      output += `\nfailed to spawn: ${err.message}`;
      finish(127, null);
    });
    child.on('close', finish);
  });
}

// CSI sequences (colour, cursor) and OSC sequences (window title). Built from
// char codes rather than literal escapes so this file stays pure ASCII — raw
// control bytes in source survive neither editors nor copy-paste reliably.
const ESC = String.fromCharCode(27);
const BEL = String.fromCharCode(7);
const ANSI = new RegExp(`${ESC}\\[[0-9;?]*[ -/]*[@-~]|${ESC}\\][^${BEL}]*${BEL}`, 'g');
const stripAnsi = (s) => s.replace(ANSI, '');

/**
 * Kill the whole process tree. `shell: true` means child.kill() only reaches the
 * shell, leaving jest/nest/tsc watchers alive and the port held.
 */
function killTree(child) {
  if (child.pid == null) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true }).on('error', () => {});
  } else {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      child.kill('SIGKILL');
    }
  }
}

/**
 * Helpers shared by the Claude Code hooks.
 *
 * Hooks run on every matching event in every project, including the many that
 * have never heard of this system. The overriding rule here is: when anything is
 * missing, unreadable or unexpected, exit 0 silently. A hook that breaks an
 * unrelated repo is far worse than a gate that occasionally fails to fire.
 */

export async function readHookInput() {
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    return JSON.parse(Buffer.concat(chunks).toString() || '{}');
  } catch {
    return {};
  }
}

/** Let the agent proceed. */
export function allow() {
  process.exit(0);
}

/**
 * Block the agent and hand it the reason. Exit code 2 is what makes Claude Code
 * feed stderr back into the conversation instead of showing it to the user.
 */
export function block(message) {
  process.stderr.write(message + '\n');
  process.exit(2);
}

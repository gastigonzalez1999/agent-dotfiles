import { connect } from 'node:net';

/**
 * Check that the services this project declares are actually up.
 *
 * Replaces the old verify-stack skill, which hardcoded ports 3000/3002/5433/6379
 * and shelled out to `lsof` — wrong for every project that is not that one, and
 * broken on Windows regardless. Ports come from the contract now.
 */
export async function doctor(contract) {
  const services = contract.services ?? [];
  if (!services.length) {
    console.log('\nNo services declared in .agent/loop.json — nothing to check.\n');
    return true;
  }

  console.log('\nloop doctor\n');
  const results = await Promise.all(services.map(probe));

  for (const r of results) {
    const mark = r.up ? '✓' : '✗';
    console.log(`  ${mark} ${r.name.padEnd(14)} ${r.detail}`);
  }

  const down = results.filter((r) => !r.up);
  if (down.length) {
    console.log('\n  to start:');
    for (const r of down) {
      console.log(r.start ? `    ${r.name}: ${r.start}` : `    ${r.name}: no start command declared`);
    }
  }
  console.log('');
  return down.length === 0;
}

async function probe(service) {
  const base = { name: service.name, start: service.start };

  if (service.health) {
    try {
      const res = await fetch(service.health, { signal: AbortSignal.timeout(4000) });
      const expected = service.expectStatus ?? 200;
      return { ...base, up: res.status === expected, detail: `${service.health} -> ${res.status}` };
    } catch (err) {
      return { ...base, up: false, detail: `${service.health} -> ${err.name === 'TimeoutError' ? 'timed out' : 'unreachable'}` };
    }
  }

  if (service.port) {
    const up = await portOpen(service.port);
    return { ...base, up, detail: `port ${service.port} ${up ? 'listening' : 'closed'}` };
  }

  return { ...base, up: true, detail: 'no health check or port declared — not checked' };
}

/** A plain TCP connect, which works identically on Windows and POSIX. */
function portOpen(port, host = '127.0.0.1', timeout = 2000) {
  return new Promise((resolve) => {
    const socket = connect({ port, host });
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeout);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

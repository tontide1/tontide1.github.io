/**
 * Shared plumbing for the verification suites.
 *
 * These are integration checks against a real build and a real browser, so the
 * runner owns server lifecycle and the suites only assert.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..');
export const DIST = path.join(ROOT, 'dist');
/** Screenshots and logs. node_modules is gitignored, so this is not tracked. */
export const ARTIFACTS = path.join(ROOT, 'node_modules', '.cache', 'verify');

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** An unused TCP port, so repeated or parallel runs never collide. */
export function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

/** Collects assertions and prints a summary with a non-zero exit on failure. */
export function createSuite(name) {
  const failures = [];
  const notes = [];
  let passed = 0;

  return {
    name,
    check(label, condition, detail = '') {
      if (condition) passed++;
      else failures.push(detail ? `${label} — ${detail}` : label);
    },
    note(label, value) {
      notes.push([label, String(value)]);
    },
    get passed() {
      return passed;
    },
    get failed() {
      return failures.length;
    },
    report() {
      const ok = failures.length === 0;
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${passed} assertions)`);
      for (const [label, value] of notes) console.log(`  - ${label}: ${value}`);
      for (const f of failures) console.log(`  FAIL ${f}`);
      return ok;
    },
  };
}

async function isUp(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

/**
 * Start a server and wait until it answers. Returns a handle whose `stop` is
 * safe to call more than once, and which tears down the whole process group:
 * killing only the direct child leaves the real server running and holding its
 * port, so the next run silently attaches to a stale process.
 */
export async function startServer({ label, cmd, args, url, cwd = ROOT, timeoutMs = 90000 }) {
  const proc = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  const log = [];
  const collect = (chunk) => log.push(chunk.toString());
  proc.stdout.on('data', collect);
  proc.stderr.on('data', collect);

  const signal = (sig) => {
    try {
      process.kill(-proc.pid, sig);
    } catch {
      try {
        proc.kill(sig);
      } catch {
        /* already gone */
      }
    }
  };

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isUp(url)) {
      let stopped = false;
      return {
        label,
        url,
        get log() {
          return log.join('');
        },
        async stop() {
          if (stopped) return;
          stopped = true;
          signal('SIGTERM');
          await Promise.race([new Promise((r) => proc.once('exit', r)), sleep(4000)]);
          if (proc.exitCode === null && proc.signalCode === null) signal('SIGKILL');
        },
      };
    }
    if (proc.exitCode !== null) {
      throw new Error(`${label} exited early (code ${proc.exitCode}):\n${log.join('')}`);
    }
    await sleep(250);
  }

  signal('SIGKILL');
  const file = path.join(ARTIFACTS, `${label}.log`);
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  fs.writeFileSync(file, log.join(''));
  throw new Error(`${label} did not come up within ${timeoutMs}ms; log at ${file}`);
}

/** Wait for the canvas to exist AND for R3F to have sized it (not the 300x150 default). */
export async function waitForCanvas(cdp, evaluate, { timeoutMs = 15000 } = {}) {
  const sized = `(() => {
    const c = document.querySelector('canvas');
    if (!c) return false;
    return c.width > 300 || c.height > 150 || (c.clientWidth > 300 && c.clientHeight > 150);
  })()`;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evaluate(cdp, sized)) return true;
    await sleep(150);
  }
  return false;
}

/** Console errors and uncaught exceptions, ignoring the favicon.ico probe. */
export function collectPageErrors(events) {
  return events.filter(
    (e) =>
      e.method === 'Runtime.exceptionThrown' ||
      (e.method === 'Log.entryAdded' &&
        e.params.entry.level === 'error' &&
        !/status of 404/.test(e.params.entry.text ?? ''))
  );
}

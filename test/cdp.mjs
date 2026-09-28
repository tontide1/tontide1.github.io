/**
 * Minimal headless Chrome driver for the browser suites.
 *
 * Chrome is spoken to over the DevTools protocol, which Node has built in, so
 * the suites stay dependency-free. Set CHROME_PATH to override binary discovery.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort, sleep } from './harness.mjs';

const CANDIDATES = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

export function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const found = CANDIDATES.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(
      'No Chrome or Chromium found. Install one, or set CHROME_PATH to its binary.'
    );
  }
  return found;
}

async function pageTarget(port, timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page;
    } catch {
      /* chrome is not listening yet */
    }
    await sleep(200);
  }
  throw new Error('Chrome did not expose a page target in time');
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  const listeners = new Set();
  /** Every DevTools event seen, for post-hoc assertions about a run. */
  const events = [];
  let id = 0;

  const ready = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
      return;
    }
    if (msg.method) {
      events.push(msg);
      for (const cb of listeners) cb(msg);
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });

  /** Subscribe to DevTools events; returns an unsubscribe function. */
  const on = (cb) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  };

  /** Resolve on the next occurrence of a DevTools event. */
  const once = (method) =>
    new Promise((resolve) => {
      const cb = (msg) => {
        if (msg.method !== method) return;
        listeners.delete(cb);
        resolve(msg.params);
      };
      listeners.add(cb);
    });

  return { ready, send, on, once, events };
}

export async function launch({ width = 1440, height = 900, port } = {}) {
  const debugPort = port ?? (await freePort());
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'tai-verify-chrome-'));

  const proc = spawn(
    findChrome(),
    [
      '--headless=new',
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profile}`,
      `--window-size=${width},${height}`,
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-scrollbars',
      // Software WebGL so the ASCII shader pipeline actually renders headless.
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      'about:blank',
    ],
    { stdio: 'ignore', detached: true }
  );

  const { webSocketDebuggerUrl } = await pageTarget(debugPort);
  const session = connect(webSocketDebuggerUrl);
  await session.ready;

  await session.send('Page.enable');
  await session.send('Runtime.enable');
  await session.send('Log.enable');

  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    // Chrome forks renderer, GPU and utility processes, and they hold the
    // profile. Signal the whole group, then the direct child as a fallback.
    for (const sig of ['SIGTERM', 'SIGKILL']) {
      for (const target of [-proc.pid, proc.pid]) {
        try {
          process.kill(target, sig);
        } catch {
          /* group or process already gone */
        }
      }
      if (proc.exitCode !== null || proc.signalCode !== null) break;
      await Promise.race([new Promise((r) => proc.once('exit', r)), sleep(2000)]);
    }
    // The profile directory is flushed on the way out, so a single rmSync often
    // races it. Retry for a few seconds rather than leaving the directory behind.
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        fs.rmSync(profile, { recursive: true, force: true });
        return;
      } catch {
        await sleep(300);
      }
    }
  };

  return { cdp: { send: session.send, on: session.on, once: session.once, events: session.events }, close, port: debugPort };
}

/**
 * Emulate a device: viewport, DPR, touch, and optional reduced motion.
 *
 * `cores` and `memoryGB` exist because the Emulation domain has no command for
 * either, so headless Chrome reports the *host's* CPU count and omits
 * deviceMemory entirely. `detectDeviceTier` keys off exactly those two numbers,
 * so without them a "phone" profile silently reads as a fast machine and the
 * tier assertions measure the host rather than the device under test. They are
 * injected before any page script runs, which keeps the app's real detection
 * logic in the path — only the browser-reported values are staged.
 */
export async function emulateDevice(cdp, opts) {
  const { width, height, dpr = 3, mobile = true, reducedMotion = false, cores, memoryGB } = opts;
  if (cores !== undefined || memoryGB !== undefined) {
    const overrides = [];
    if (cores !== undefined) {
      overrides.push(
        `Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', { get: () => ${Number(cores)}, configurable: true });`
      );
    }
    if (memoryGB !== undefined) {
      overrides.push(
        `Object.defineProperty(Navigator.prototype, 'deviceMemory', { get: () => ${Number(memoryGB)}, configurable: true });`
      );
    }
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: overrides.join('\n'),
    });
  }
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: dpr,
    mobile,
    screenWidth: width,
    screenHeight: height,
  });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: 5 });
  await cdp.send('Emulation.setEmitTouchEventsForMouse', {
    enabled: mobile,
    configuration: mobile ? 'mobile' : 'desktop',
  });
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' }],
  });
}

/**
 * Evaluate an expression in the page.
 *
 * Runtime.evaluate rejects a bare top-level `await`; wrap it, e.g.
 * `import(...).then(...)` or an async IIFE.
 */
export async function evaluate(cdp, expression) {
  const res = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (res.exceptionDetails) {
    const detail = res.exceptionDetails.exception?.description ?? res.exceptionDetails.text;
    throw new Error(`evaluate failed: ${detail}`);
  }
  return res.result.value;
}

export async function screenshot(cdp, filePath, clip) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) });
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
  return filePath;
}

export async function navigate(cdp, url) {
  const loaded = cdp.once('Page.loadEventFired');
  await cdp.send('Page.navigate', { url });
  await loaded;
}

/**
 * Bind the page's own copies of the app's nanostores onto `window.__stores`.
 *
 * The dev server serves src modules with a Vite HMR cache-busting query
 * (`universe.ts?t=1790577…`), so importing the bare path builds a SECOND copy of
 * every atom. Reading that copy shows an empty store while the app runs fine,
 * which is how a whole run of assertions once passed while measuring nothing.
 * Always resolve the URL the app actually loaded.
 */
export async function bindStores(cdp, names) {
  const wanted = names ?? ['universe', 'environment'];
  const result = await evaluate(
    cdp,
    `(async () => {
       const urls = performance.getEntriesByType('resource').map(r => r.name);
       const bound = {};
       ${wanted
         .map(
           (n) => `{
         const url = urls.find(u => u.includes('/stores/${n}.ts'));
         if (!url) return;
         bound.${n} = await import(url);
       }`
         )
         .join('\n       ')}
       window.__stores = Object.assign(window.__stores || {}, bound);
       return Object.keys(bound);
     })()`
  );
  return result;
}

// Re-exported so suites can import the whole browser toolkit from one place.
export { sleep };

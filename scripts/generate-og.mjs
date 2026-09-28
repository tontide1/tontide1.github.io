/**
 * Renders scripts/og-card.html into public/img/og-default.png.
 *
 *     pnpm generate:og
 *
 * The card is rendered by Chrome rather than an image library so the social
 * preview uses the same webfont and design tokens as the site. Headless Chrome
 * speaks the DevTools protocol over a WebSocket, which Node has built in, so
 * this stays dependency-free.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WIDTH = 1200;
const HEIGHT = 630;
const PORT = 9333;

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const CARD = path.join(here, 'og-card.html');
const OUT = path.join(root, 'public', 'img', 'og-default.png');

const CHROME =
  process.env.CHROME_PATH ||
  ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) =>
    fs.existsSync(p)
  );

if (!CHROME) {
  console.error('No Chrome found. Set CHROME_PATH to a Chrome or Chromium binary.');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'og-card-'));
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    `--window-size=${WIDTH},${HEIGHT}`,
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    'about:blank',
  ],
  { stdio: 'ignore' }
);

async function pageTarget(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page;
    } catch {
      /* chrome not listening yet */
    }
    await sleep(200);
  }
  throw new Error('Chrome did not expose a page target in time');
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  const listeners = new Set();
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
    if (msg.method) for (const cb of listeners) cb(msg);
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });

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

  return { ready, send, once };
}

try {
  const { webSocketDebuggerUrl } = await pageTarget();
  const { ready, send, once } = connect(webSocketDebuggerUrl);
  await ready;

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // Wait for the load event before reading document.fonts. Evaluating earlier
  // would race the navigation and could sample about:blank instead.
  const loaded = once('Page.loadEventFired');
  await send('Page.navigate', { url: `file://${CARD}` });
  await loaded;

  // The card is mostly type, so never capture against a fallback face.
  const fonts = await send('Runtime.evaluate', {
    expression: `Promise.race([
       document.fonts.ready.then(() => [...document.fonts].filter(f => f.status === 'loaded').length + '/' + document.fonts.size),
       new Promise((_, reject) => setTimeout(() => reject(new Error('webfonts did not settle in 15s')), 15000)),
     ])`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (fonts.exceptionDetails) throw new Error(fonts.exceptionDetails.text);
  console.log(`webfonts loaded: ${fonts.result.value}`);
  await sleep(400);

  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(data, 'base64'));
  console.log(`wrote ${path.relative(root, OUT)} (${fs.statSync(OUT).size} bytes, ${WIDTH}x${HEIGHT})`);
} finally {
  chrome.kill();
  // Chrome flushes its profile as it shuts down, so removing the directory
  // straight after kill() races it and throws ENOTEMPTY.
  if (chrome.exitCode === null && chrome.signalCode === null) {
    await Promise.race([new Promise((r) => chrome.once('exit', r)), sleep(5000)]);
  }
  try {
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch {
    // A stray temp profile is harmless. Never fail the generator over cleanup.
  }
}

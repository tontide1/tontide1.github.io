/**
 * The WebGL bundle must not compete with first paint.
 *
 * UniverseLoader defers the canvas behind requestIdleCallback, so the first
 * script the browser requests is the small loader and the three.js chunk lands
 * afterwards. Runs against the production preview build, where the chunk names
 * are the built ones.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  launch, emulateDevice, evaluate, navigate, screenshot, sleep,
} from './cdp.mjs';
import { ARTIFACTS, DIST, createSuite, collectPageErrors } from './harness.mjs';

export default async function run({ baseUrl }) {
  const s = createSuite('bundle deferral (production preview)');
  const W = 1440;
  const H = 900;

  const { cdp, close } = await launch({ width: W, height: H });
  try {
    await cdp.send('Network.enable');
    await emulateDevice(cdp, { width: W, height: H, dpr: 1, mobile: false });

    const requests = [];
    cdp.on((m) => {
      if (m.method === 'Network.requestWillBeSent' && m.params.type === 'Script') {
        requests.push({ url: m.params.request.url, ts: m.params.timestamp });
      }
    });
    const badResponses = [];
    cdp.on((m) => {
      if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) {
        badResponses.push(`${m.params.response.status} ${m.params.response.url}`);
      }
    });

    await navigate(cdp, `${baseUrl}/`);

    const paint = await evaluate(
      cdp,
      `new Promise(res => {
         const read = () => {
           const f = performance.getEntriesByName('first-contentful-paint')[0];
           const n = performance.getEntriesByType('navigation')[0];
           return f ? { fcp: Math.round(f.startTime), dcl: Math.round(n.domContentLoadedEventEnd) } : null;
         };
         const hit = read();
         if (hit) return res(hit);
         new PerformanceObserver((l, o) => {
           l.getEntries().some(e => e.name === 'first-contentful-paint') && (o.disconnect(), res(read()));
         }).observe({ type: 'paint', buffered: true });
         setTimeout(() => res(read() ?? { fcp: null, dcl: null }), 5000);
       })`
    );

    await sleep(2500);

    // Vite names the built chunk UniverseCanvas.<hash>.js but serves the source
    // module on the dev server, so match the module name in both modes.
    const heavy = requests.find((r) => r.url.includes('UniverseCanvas'));
    const loader = requests.find((r) => r.url.includes('UniverseLoader'));
    const first = requests[0];
    const base = requests.length ? requests[0].ts : 0;

    s.check('the first script is the small loader, not three.js', !!first && first.url.includes('UniverseLoader'), first?.url);
    s.check('the canvas chunk is requested', !!heavy);
    s.check('the loader precedes the canvas chunk', !!loader && !!heavy && loader.ts <= heavy.ts);
    const delay = heavy && first ? Math.round((heavy.ts - first.ts) * 1000) : NaN;
    s.check('the canvas chunk is deferred behind the first wave', delay > 50, `${delay}ms`);
    // First paint is the milestone the deferral exists to protect, and it is
    // bounded by the document. DOMContentLoaded is not: under CPU contention the
    // main thread can stall long enough for the chunk request to beat it, which
    // says nothing about the site. That ordering was a flaky gate.
    s.check(
      'the canvas chunk arrives after first contentful paint',
      !!heavy && !!paint?.fcp && heavy.ts * 1000 > paint.fcp,
      `fcp=${paint?.fcp}ms, chunk at ${heavy ? Math.round(heavy.ts * 1000) : '?'}ms`
    );
    s.note('first script', first ? first.url.split('/').pop() : 'none');
    s.note('canvas chunk requested at', `${delay}ms after the first wave`);
    s.note('FCP / DOMContentLoaded', `${paint?.fcp}ms / ${paint?.dcl}ms`);

    const chunk = fs
      .readdirSync(path.join(DIST, '_astro'))
      .find((f) => f.startsWith('UniverseCanvas') && f.endsWith('.js'));
    const bytes = chunk ? fs.statSync(path.join(DIST, '_astro', chunk)).size : 0;
    s.check('the canvas chunk exists on disk', !!chunk, chunk);
    s.note('canvas chunk size', `${(bytes / 1024).toFixed(1)} KiB raw (${(bytes / 1000).toFixed(1)} kB)`);

    // The universe must still come up identically once it arrives.
    const boot = await evaluate(
      cdp,
      `(() => {
         const c = document.querySelector('canvas');
         if (!c) return { canvas: false };
         return {
           canvas: true, w: c.width, h: c.height, cssW: c.clientWidth, cssH: c.clientHeight,
           fallbackNav: !!document.querySelector('nav[aria-label="Direct Navigation"]'),
           noscript: !!document.querySelector('noscript'),
         };
       })()`
    );
    s.check('canvas mounts after the deferral', boot.canvas === true, JSON.stringify(boot));
    s.check('canvas buffer matches its CSS size', boot.w === boot.cssW && boot.h === boot.cssH, `${boot.w}x${boot.h} vs ${boot.cssW}x${boot.cssH}`);
    s.check('HTML fallback nav still present', boot.fallbackNav === true);
    s.check('noscript fallback still present', boot.noscript === true);
    await screenshot(cdp, path.join(ARTIFACTS, 'bundle-home.png'));

    /**
     * The ASCII toggle swaps the render path: off draws the scene straight to
     * the canvas, on routes it through the post-processing composer. Freeze the
     * scene so one region can be compared byte for byte — turning ASCII on must
     * change those pixels, and turning it back off must restore them exactly. If
     * the direct render ever silently goes through the composer again, the two
     * frames become the same and the first check fails.
     */
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await sleep(600);

    const asciiButton = await evaluate(
      cdp,
      `(() => {
         const b = document.querySelector('button[title="Toggle GPU Fragment Shader ASCII Pipeline"]');
         if (!b) return null;
         const r = b.getBoundingClientRect();
         return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
       })()`
    );
    s.check('the ASCII toggle is in the HUD', !!asciiButton);

    const crop = async () =>
      (await cdp.send('Page.captureScreenshot', {
        format: 'png',
        clip: { x: 520, y: 250, width: 400, height: 400, scale: 1 },
      })).data;

    const toggleAscii = async () => {
      const args = { x: asciiButton.x, y: asciiButton.y, button: 'left', clickCount: 1 };
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', buttons: 1, ...args });
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', buttons: 0, ...args });
    };

    /** The first ASCII frame compiles its shader, so poll rather than guess a delay. */
    const captureUntil = async (direct, same, timeoutMs = 6000) => {
      const deadline = Date.now() + timeoutMs;
      let last = await crop();
      while (Date.now() < deadline && (last === direct) !== same) {
        await sleep(300);
        last = await crop();
      }
      return last;
    };

    if (asciiButton) {
      const direct = await crop();
      await toggleAscii();
      const ascii = await captureUntil(direct, false);
      s.check('turning ASCII on changes what the canvas draws', ascii !== direct);
      await screenshot(cdp, path.join(ARTIFACTS, 'bundle-ascii.png'), {
        x: 520, y: 250, width: 400, height: 400, scale: 1,
      });

      await toggleAscii();
      const restored = await captureUntil(direct, true);
      s.check('turning it back off restores the direct render exactly', restored === direct);
    }

    // Chrome probes /favicon.ico by default; the declared icon is /img/favicon.png.
    const unexpected = badResponses.filter((r) => !r.includes('/favicon.ico'));
    s.check('no unexpected 4xx or 5xx responses', unexpected.length === 0, unexpected.join(' | '));

    const errors = collectPageErrors(cdp.events);
    s.check('no console errors or exceptions', errors.length === 0, errors.map((e) => e.params?.entry?.text ?? e.params?.exceptionDetails?.text).join(' | '));
  } finally {
    await close();
  }

  return s;
}

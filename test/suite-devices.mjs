/**
 * Adaptive quality across device profiles: the tier, its star/dpr/cell budget,
 * the canvas backing-store size, and that reduced motion freezes the scene while
 * the default profile keeps animating.
 */
import {
  launch, emulateDevice, evaluate, navigate, sleep, bindStores,
} from './cdp.mjs';
import { createSuite, collectPageErrors, waitForCanvas } from './harness.mjs';

const PROFILES = [
  { name: 'phone (coarse, dpr 3)', width: 390, height: 844, dpr: 3, mobile: true, reduced: false, tier: 'low', maxDpr: 1, stars: 110, cell: 11 },
  { name: 'phone + reduced motion', width: 390, height: 844, dpr: 3, mobile: true, reduced: true, tier: 'low', maxDpr: 1, stars: 110, cell: 11 },
  { name: 'desktop 1440x900', width: 1440, height: 900, dpr: 1, mobile: false, reduced: false, tier: 'medium', maxDpr: 1.5, stars: 220, cell: 9.5 },
];

export default async function run({ devUrl }) {
  const s = createSuite('adaptive quality across device profiles');

  for (const p of PROFILES) {
    const { cdp, close } = await launch({ width: p.width, height: p.height });
    try {
      await emulateDevice(cdp, { width: p.width, height: p.height, dpr: p.dpr, mobile: p.mobile, reducedMotion: p.reduced });
      await navigate(cdp, `${devUrl}/`);
      s.check(`${p.name} canvas mounted`, await waitForCanvas(cdp, evaluate));
      await sleep(600);

      s.check(`${p.name} bound to the app's own module instances`, (await bindStores(cdp)).length === 2);

      const q = await evaluate(
        cdp,
        `(() => {
           const e = window.__stores.environment;
           const x = e.getQualityProfile();
           return { tier: x.tier, maxDpr: x.maxDpr, stars: x.starCount, cell: x.asciiCharSize, reduced: e.$prefersReducedMotion.get() };
         })()`
      );
      const boot = await evaluate(
        cdp,
        `(() => { const c = document.querySelector('canvas'); return c ? { w: c.width, h: c.height, cssW: c.clientWidth, cssH: c.clientHeight } : null; })()`
      );

      s.note(p.name, JSON.stringify(q));
      s.check(`${p.name} tier`, q.tier === p.tier, q.tier);
      s.check(`${p.name} maxDpr`, q.maxDpr === p.maxDpr, String(q.maxDpr));
      s.check(`${p.name} starCount`, q.stars === p.stars, String(q.stars));
      s.check(`${p.name} ascii cell size`, q.cell === p.cell, String(q.cell));
      s.check(`${p.name} reduced-motion flag`, q.reduced === p.reduced, String(q.reduced));
      s.check(`${p.name} canvas is present`, !!boot);
      s.check(`${p.name} canvas is sized to the viewport`, boot?.cssW === p.width && boot?.cssH === p.height, JSON.stringify(boot));
      s.check(`${p.name} backing store honours the dpr budget`, boot && boot.w / boot.cssW <= p.maxDpr + 0.01, `${boot?.w}/${boot?.cssW} > ${p.maxDpr}`);

      // Frames are compared as real screenshots. canvas.toDataURL() is useless
      // here: with preserveDrawingBuffer false the WebGL buffer is already
      // cleared by the time it is read, so every frame would hash the same and
      // "frozen" would pass without proving anything.
      const grab = async () => (await cdp.send('Page.captureScreenshot', { format: 'png' })).data;
      const a = await grab();
      await sleep(1100);
      const b = await grab();
      if (p.reduced) {
        s.check(`${p.name} the scene is frozen while motion is reduced`, a === b, 'frames changed despite reduced motion');
      } else {
        s.check(`${p.name} the scene animates when motion is allowed`, a !== b, 'frames identical, which would mask a false positive');
      }

      const errors = collectPageErrors(cdp.events);
      s.check(`${p.name} no console errors or exceptions`, errors.length === 0, errors.map((e) => e.params?.entry?.text ?? e.params?.exceptionDetails?.text).join(' | '));
    } finally {
      await close();
      await sleep(300);
    }
  }

  return s;
}

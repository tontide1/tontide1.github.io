/**
 * The body pull must work through the touch pipeline too, since phones are the
 * primary target for the mobile adaptation.
 *
 * TÀI sits at the world origin and the camera always looks at the origin, so it
 * is at the exact centre of the canvas: no projection needed. Its published
 * position is the drag offset, because its orbit base is the origin. Mouse hover
 * is unusable here because touch emulation swallows it.
 */
import {
  launch, emulateDevice, evaluate, navigate, sleep, bindStores,
} from './cdp.mjs';
import { createSuite, collectPageErrors, waitForCanvas } from './harness.mjs';

const W = 390;
const H = 844;

export default async function run({ devUrl }) {
  const s = createSuite('body pull (touch, phone profile)');

  const { cdp, close } = await launch({ width: W, height: H });
  const dragId = () => evaluate(cdp, 'window.__stores.universe.$draggingEntityId.get()');
  const posOf = (id) => evaluate(cdp, `JSON.stringify(window.__stores.universe.ENTITY_CURRENT_POSITIONS[${JSON.stringify(id)}])`);
  const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });

  try {
    await emulateDevice(cdp, { width: W, height: H, dpr: 3, mobile: true });
    await navigate(cdp, `${devUrl}/`);
    s.check('canvas mounted', await waitForCanvas(cdp, evaluate));
    await sleep(600);

    s.check("bound to the app's own module instances", (await bindStores(cdp)).length === 2);
    await evaluate(cdp, 'window.__stores.environment.$prefersReducedMotion.set(true)');
    await sleep(400);

    const centre = { x: Math.round(W / 2), y: Math.round(H / 2) };
    const before = JSON.parse(await posOf('tai'));
    s.check('TÀI starts at the origin', Math.hypot(before[0], before[1], before[2]) < 1e-6, JSON.stringify(before));
    s.note('touch target', `tai @ ${centre.x},${centre.y} (canvas centre)`);

    await touch('touchStart', [{ x: centre.x, y: centre.y, id: 1 }]);
    await sleep(150);
    s.check('touch claims the gesture', (await dragId()) === 'tai', String(await dragId()));
    s.check('cursor switches to grabbing on touch', (await evaluate(cdp, 'document.body.style.cursor')) === 'grabbing');

    for (let i = 1; i <= 8; i++) {
      await touch('touchMove', [{ x: centre.x + i * 9, y: centre.y + i * 7, id: 1 }]);
      await sleep(40);
    }
    await sleep(250);

    const pulled = JSON.parse(await posOf('tai'));
    const magnitude = Math.hypot(pulled[0], pulled[1], pulled[2]);
    s.check('a touch drag pulls the body', magnitude > 0.1, `only ${magnitude.toFixed(3)}`);
    s.check('touch pull respects the core clamp', magnitude <= 1.6 + 1e-3, `${magnitude.toFixed(3)} > 1.6`);
    s.note('touch pull', `${magnitude.toFixed(3)} world units`);

    await touch('touchEnd', []);
    await sleep(120);
    s.check('touchEnd clears the gesture', (await dragId()) === null, String(await dragId()));
    s.check('cursor restored after touch', (await evaluate(cdp, 'document.body.style.cursor')) === 'default');

    const back = JSON.parse(await posOf('tai'));
    s.check(
      'reduced motion returns the body at once',
      Math.hypot(back[0], back[1], back[2]) < 0.02,
      Math.hypot(back[0], back[1], back[2]).toFixed(4)
    );

    const errors = collectPageErrors(cdp.events);
    s.check('no console errors or exceptions', errors.length === 0, errors.map((e) => e.params?.entry?.text ?? e.params?.exceptionDetails?.text).join(' | '));
  } finally {
    await close();
  }

  return s;
}

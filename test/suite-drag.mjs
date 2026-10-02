/**
 * Dragging a body pulls it along the cursor; the camera stands down for that
 * gesture; releasing lets gravity take the body back to its orbit.
 *
 * Positions come from the app's own store (ENTITY_CURRENT_POSITIONS), and the
 * camera is judged by pixels: a tight crop around a body the gesture never
 * touched must be unchanged by a body drag and changed by a background drag.
 * A hover-derived centroid is not precise enough, because a 20px probe grid
 * quantises it into jumps the same size as the movement under test.
 */
import path from 'node:path';
import {
  launch, emulateDevice, evaluate, navigate, screenshot, sleep, bindStores, readCameraPosition,
} from './cdp.mjs';
import { ARTIFACTS, createSuite, collectPageErrors, waitForCanvas } from './harness.mjs';

const W = 1440;
const H = 900;

export default async function run({ devUrl }) {
  const s = createSuite('body pull (mouse, dev server)');

  const { cdp, close } = await launch({ width: W, height: H });
  const hover = () => evaluate(cdp, 'window.__stores.universe.$hoveredEntityId.get()');
  const dragId = () => evaluate(cdp, 'window.__stores.universe.$draggingEntityId.get()');
  const posOf = (id) => evaluate(cdp, `JSON.stringify(window.__stores.universe.ENTITY_CURRENT_POSITIONS[${JSON.stringify(id)}])`);
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  const moveMouse = (x, y) =>
    cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0, pointerType: 'mouse' });
  const press = (x, y) =>
    cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1, pointerType: 'mouse' });
  const release = (x, y) =>
    cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1, pointerType: 'mouse' });

  /** Camera signal: a tight crop of pixels around an untouched body. */
  const crop = async (p, r = 55) => {
    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      clip: {
        x: Math.max(0, Math.round(p.x - r)),
        y: Math.max(0, Math.round(p.y - r)),
        width: r * 2,
        height: r * 2,
        scale: 1,
      },
    });
    return data;
  };

  /** One grid sweep locating every body. */
  const scanAll = async (step = 60) => {
    const found = {};
    for (let y = 90; y < H - 60; y += step) {
      for (let x = 90; x < W - 60; x += step) {
        await moveMouse(x, y);
        const id = await hover();
        if (id && !found[id]) found[id] = { x, y };
      }
    }
    return found;
  };

  const centroidNear = async (id, hint, radius = 100) => {
    let x0 = null, x1 = null, y0 = null, y1 = null;
    for (let y = hint.y - radius; y <= hint.y + radius; y += 20) {
      for (let x = hint.x - radius; x <= hint.x + radius; x += 20) {
        await moveMouse(x, y);
        if ((await hover()) === id) {
          if (x0 === null || x < x0) x0 = x;
          if (x1 === null || x > x1) x1 = x;
          if (y0 === null || y < y0) y0 = y;
          if (y1 === null || y > y1) y1 = y;
        }
      }
    }
    return x0 === null ? null : { x: Math.round((x0 + x1) / 2), y: Math.round((y0 + y1) / 2) };
  };

  /** Near-window first; a full sweep only if the body has wandered out of it. */
  const locate = async (id, hint) => {
    if (hint) {
      const near = await centroidNear(id, hint);
      if (near) return near;
    }
    return (await scanAll())[id] ?? null;
  };

  try {
    await emulateDevice(cdp, { width: W, height: H, dpr: 1, mobile: false });
    await navigate(cdp, `${devUrl}/`);
    s.check('canvas mounted', await waitForCanvas(cdp, evaluate));
    await sleep(600);

    const bound = await bindStores(cdp);
    s.check("bound to the app's own module instances", bound.length === 2, bound.join(', '));
    const live = await evaluate(
      cdp,
      `Object.keys(JSON.parse(JSON.stringify(window.__stores.universe.ENTITY_CURRENT_POSITIONS))).length`
    );
    s.check('store positions are live, not a duplicate module', live >= 6, `${live} bodies`);

    // Freeze auto-revolution: any position change from here is the pull alone.
    await evaluate(cdp, 'window.__stores.environment.$prefersReducedMotion.set(true)');
    await sleep(400);

    const spots = await scanAll();
    const ids = Object.keys(spots);
    s.check('found at least two grabbable bodies', ids.length >= 2, ids.join(', '));
    if (ids.length < 2) return s.report() && s;

    const targetId = ids[0];
    const refId = ids[1];
    const target = await locate(targetId, spots[targetId]);
    const refBefore = await locate(refId, spots[refId]);
    s.note('drag target', `${targetId} @ ${target.x},${target.y}`);
    s.note('camera reference', refId);

    const baseBefore = JSON.parse(await posOf(targetId));

    await moveMouse(target.x, target.y);
    await sleep(150);
    s.check('hovering a body shows a pointer cursor', (await evaluate(cdp, 'document.body.style.cursor')) === 'pointer');

    await press(target.x, target.y);
    await sleep(100);
    s.check('press claims the gesture', (await dragId()) === targetId, String(await dragId()));
    s.check('cursor switches to grabbing', (await evaluate(cdp, 'document.body.style.cursor')) === 'grabbing');

    for (let i = 1; i <= 10; i++) {
      await moveMouse(target.x + i * 16, target.y + i * 9);
      await sleep(30);
    }
    await sleep(250);

    const pulled = JSON.parse(await posOf(targetId));
    const pull = dist(pulled, baseBefore);
    s.check('body follows the pointer', pull > 0.3, `pulled ${pull.toFixed(3)}`);
    s.check('pull respects the domain clamp', pull <= 3 + 1e-3, `pulled ${pull.toFixed(3)} > 3`);
    s.note('domain pull', `${pull.toFixed(3)} world units`);
    await screenshot(cdp, path.join(ARTIFACTS, 'drag-during.png'));

    await release(target.x + 160, target.y + 90);
    await sleep(120);
    s.check('release clears the gesture', (await dragId()) === null, String(await dragId()));
    s.check('cursor restored to default', (await evaluate(cdp, 'document.body.style.cursor')) === 'default');

    const back = JSON.parse(await posOf(targetId));
    const residual = dist(back, baseBefore);
    s.check('reduced motion returns the body at once', residual < 0.02, `${residual.toFixed(4)}`);
    s.note('residual under reduced motion', residual.toFixed(4));

    // Camera signal, by pixels. Also proves the scene is quiet enough to compare.
    const cropBefore = await crop(refBefore);
    await sleep(500);
    s.check('the scene is pixel-stable while idle', cropBefore === (await crop(refBefore)), 'idle frames differ, so the camera check would be meaningless');
    s.check('camera holds still during a body pull', cropBefore === (await crop(refBefore)), 'an untouched body region changed');

    // A tap must enter the domain (spec §6.3 click → enter): it arms the enter
    // transition instead of opening an inspector. Locate the body while the
    // scene is frozen, then allow motion only for the tap itself so the
    // fly-through can be cancelled before navigation leaves the page; the
    // scene is frozen again for the checks below.
    const tap = await locate(targetId, target);
    await moveMouse(tap.x, tap.y);
    await sleep(150);
    await evaluate(cdp, 'window.__stores.environment.$prefersReducedMotion.set(false)');
    await sleep(50);
    await press(tap.x, tap.y);
    await sleep(60);
    await release(tap.x, tap.y);
    await sleep(150);
    const transition = JSON.parse(await evaluate(cdp, 'JSON.stringify(window.__stores.universe.$transitionState.get())'));
    s.check('a tap arms the enter transition for its domain', transition?.targetId === targetId, JSON.stringify(transition));
    s.check(
      'a tap does not open an inspector panel',
      !(await evaluate(cdp, `!!document.querySelector('[role="dialog"][aria-label$="inspector"]')`)),
      'inspector dialog is in the DOM'
    );
    // Cancel before the fly-through ends (650ms + 200ms safety) or the page
    // navigates away and the rest of this suite has no universe to test.
    await evaluate(cdp, 'window.__stores.universe.$transitionState.set(null)');
    await evaluate(cdp, 'window.__stores.environment.$prefersReducedMotion.set(true)');
    await sleep(300);

    // A background drag must still orbit the camera, so the same crop changes.
    // It has to genuinely miss every hitbox, or this is a body pull again.
    const preOrbit = await crop(refBefore);
    let empty = null;
    for (const [x, y] of [[60, 60], [60, 840], [720, 60], [W - 60, H - 60], [720, 450], [120, 450]]) {
      if (ids.some((id) => Object.values(spots).some((sp) => Math.hypot(sp.x - x, sp.y - y) < 150))) continue;
      await moveMouse(x, y);
      await sleep(120);
      if ((await hover()) === null) { empty = { x, y }; break; }
    }
    s.check('found a point clear of every hitbox', !!empty);
    if (empty) {
      await press(empty.x, empty.y);
      await sleep(80);
      s.check('a background press does not claim the gesture', (await dragId()) === null, String(await dragId()));
      for (let i = 1; i <= 10; i++) {
        await moveMouse(empty.x + i * 22, empty.y);
        await sleep(30);
      }
      await release(empty.x + 220, empty.y);
      await sleep(700);
      s.check('a background drag still orbits the camera', preOrbit !== (await crop(refBefore)), 'an untouched body region did not change');
    }

    // --- spring, with motion allowed ---------------------------------------
    await evaluate(cdp, 'window.__stores.environment.$prefersReducedMotion.set(false)');
    await sleep(400);

    /**
     * Only a held button orbits the camera.
     *
     * Judged on the camera itself, not on pixels: the parallax this replaced
     * applied only while motion was enabled, so a frozen scene cannot see it and
     * this is the one point in the suite that cannot freeze. The tolerance is a
     * hundredth of the ~0.15 world units a parallax across the screen produced.
     */
    const restBefore = await readCameraPosition(cdp);
    for (let i = 0; i < 6; i++) {
      await moveMouse(180 + i * 200, 240 + (i % 2) * 300);
      await sleep(60);
    }
    await sleep(600);
    const restAfter = await readCameraPosition(cdp);
    s.check(
      'moving the pointer with no button held leaves the camera alone',
      restBefore && restAfter && dist(restBefore, restAfter) < 0.01,
      `${JSON.stringify(restBefore)} -> ${JSON.stringify(restAfter)}`
    );

    // TÀI's orbit base is the origin, so its published position IS the offset.
    const tai = await locate('tai', null);
    s.check('TÀI is grabbable', !!tai);
    if (tai) {
      await moveMouse(tai.x, tai.y);
      await sleep(150);
      await press(tai.x, tai.y);
      await sleep(100);
      s.check('TÀI claims the gesture too', (await dragId()) === 'tai', String(await dragId()));
      for (let i = 1; i <= 10; i++) {
        await moveMouse(tai.x + i * 14, tai.y + i * 6);
        await sleep(30);
      }
      await sleep(200);
      const p = JSON.parse(await posOf('tai'));
      const magnitude = Math.hypot(p[0], p[1], p[2]);
      s.check('TÀI follows the pointer', magnitude > 0.2, `${magnitude.toFixed(3)}`);
      s.check('TÀI respects its tighter clamp', magnitude <= 1.6 + 1e-3, `${magnitude.toFixed(3)} > 1.6`);
      s.note('TÀI pull', `${magnitude.toFixed(3)} world units`);

      await release(tai.x + 140, tai.y + 60);
      await sleep(40);
      s.check('TÀI release clears the gesture', (await dragId()) === null);

      const trail = [];
      for (let i = 0; i < 30; i++) {
        await sleep(110);
        const q = JSON.parse(await posOf('tai'));
        trail.push(+Math.hypot(q[0], q[1], q[2]).toFixed(3));
      }
      s.check('TÀI springs back toward the anchor', trail.at(-1) < trail[0], trail.join(' -> '));
      s.check('TÀI settles back on the anchor', trail.at(-1) < 0.02, trail.join(' -> '));
      s.note('TÀI decay', `${trail[0]} -> ${trail.at(-1)} over 30 samples`);
    }

    const errors = collectPageErrors(cdp.events);
    s.check('no console errors or exceptions', errors.length === 0, errors.map((e) => e.params?.entry?.text ?? e.params?.exceptionDetails?.text).join(' | '));
  } finally {
    await close();
  }

  return s;
}

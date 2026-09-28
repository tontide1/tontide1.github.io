/**
 * Keyboard reachability and focus visibility (spec §13.2).
 *
 * The universe is a canvas, so the HUD is the only keyboard surface over it. If a
 * control cannot be reached by Tab, or reaches focus without a visible indicator,
 * a keyboard or screen-reader user is stranded. The HTML fallback covers the
 * non-WebGL case; this covers the WebGL case.
 *
 * Focus indicators are checked while tabbing rather than via `el.focus()`,
 * because `:focus-visible` — which is what any styled ring should hang off — only
 * matches when the browser decides focus should be shown, and a programmatic
 * focus does not reliably trigger that decision.
 */
import { launch, evaluate, navigate, sleep } from './cdp.mjs';
import { createSuite, waitForCanvas } from './harness.mjs';

/** Enough stops to walk the whole tab ring: fallback nav, canvas controls, HUD. */
const MAX_TABS = 60;

const PROBE = `(() => {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  const cs = getComputedStyle(el);
  const outlineShown = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
  const shadowShown = cs.boxShadow !== 'none' && cs.boxShadow !== '';
  return {
    tag: el.tagName,
    text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 28),
    inHud: !!el.closest('div.fixed.inset-0.z-10'),
    focusVisible: el.matches(':focus-visible'),
    outline: cs.outlineStyle + ' ' + cs.outlineWidth,
    boxShadow: cs.boxShadow,
    indicator: outlineShown || shadowShown,
  };
})()`;

async function pressTab(cdp) {
  const base = {
    windowsVirtualKeyCode: 9,
    nativeVirtualKeyCode: 9,
    code: 'Tab',
    key: 'Tab',
  };
  await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}

export default async function run({ devUrl }) {
  const s = createSuite('keyboard reach and focus visibility');

  const { cdp, close } = await launch({ width: 1440, height: 900 });
  try {
    await navigate(cdp, `${devUrl}/`);
    s.check('canvas mounted', await waitForCanvas(cdp, evaluate));
    await sleep(400);

    // Walk the tab ring, recording the first time each HUD control takes focus.
    const seen = new Map();
    for (let i = 0; i < MAX_TABS; i++) {
      await pressTab(cdp);
      const probe = await evaluate(cdp, PROBE);
      if (!probe) continue;
      const key = `${probe.tag}:${probe.text}`;
      if (probe.inHud && !seen.has(key)) seen.set(key, probe);
    }

    s.check('Tab reaches HUD controls', seen.size > 0, `reached ${seen.size}`);
    s.note('HUD controls reached by Tab', `${seen.size}`);

    // Every reachable HUD control must show where focus is.
    const unindicated = [...seen.entries()].filter(([, p]) => !p.indicator);
    for (const [key, p] of seen) {
      s.check(
        `focus indicator on ${key}`,
        p.indicator,
        `outline: ${p.outline}, box-shadow: ${p.boxShadow}`
      );
    }
    s.check(
      'no HUD control is focusable without an indicator',
      unindicated.length === 0,
      unindicated.map(([k]) => k).join(', ')
    );

    // `focus:outline-none` is a silent trap: it suppresses the UA ring on plain
    // :focus and nothing replaces it. Suppressing *is* fine when a ring is
    // supplied in its place, which is why this checks for the pair, not the
    // class. Token-anchored so `focus-visible:outline-none` is not mistaken for
    // the bare `focus:outline-none`.
    const bare = await evaluate(
      cdp,
      `(() => {
         const hud = document.querySelector('div.fixed.inset-0.z-10');
         if (!hud) return [];
         return [...hud.querySelectorAll('button, a[href]')]
           .filter((el) => {
             const c = el.className;
             const suppresses = /(^|\\s)focus(-visible)?:outline-none(\\s|$)/.test(c);
             const replaces = /(^|\\s)focus(-visible)?:ring-/.test(c);
             return suppresses && !replaces;
           })
           .map((el) => (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 28));
       })()`
    );
    s.check(
      'no HUD control suppresses its focus ring without replacing it',
      bare.length === 0,
      bare.join(', ')
    );

    // Spec §13.2 minimum shortcuts.
    await evaluate(cdp, `(() => { document.activeElement.blur(); return true; })()`);

    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyDown', text: '/', key: '/', code: 'Slash', windowsVirtualKeyCode: 191,
    });
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyUp', key: '/', code: 'Slash', windowsVirtualKeyCode: 191,
    });
    await sleep(250);
    s.check(
      '`/` opens Search',
      await evaluate(cdp, `!!document.querySelector('[aria-label="Search the universe"]')`)
    );

    await cdp.send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27,
    });
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27,
    });
    await sleep(250);
    s.check(
      'Escape closes Search',
      !(await evaluate(cdp, `!!document.querySelector('[aria-label="Search the universe"]')`))
    );

    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyDown', text: 'm', key: 'm', code: 'KeyM', windowsVirtualKeyCode: 77,
    });
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyUp', key: 'm', code: 'KeyM', windowsVirtualKeyCode: 77,
    });
    await sleep(250);
    s.check(
      '`M` opens the Map',
      await evaluate(cdp, `!!document.querySelector('[aria-label="System orientation map"]')`)
    );

    return s;
  } finally {
    await close();
  }
}

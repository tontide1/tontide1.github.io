/**
 * The home screen and the pond on a real browser: the self-hosted fonts load,
 * the canvas actually paints, the citation card opens on focus, the theme
 * toggle flips the whole page, the phone layout holds, reduced motion still
 * draws a still frame, and no page pulls a third-party request or logs an error.
 */
import { launch, emulateDevice, evaluate, navigate, sleep } from './cdp.mjs';
import { collectPageErrors, createSuite } from './harness.mjs';

const canvasPainted = `(() => {
  const c = document.querySelector('[data-pond]');
  if (!c || !c.width || !c.height) return false;
  const ctx = c.getContext('2d');
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let lit = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i]) lit++;
  return lit > 500;
})()`;

export default async function run({ devUrl }) {
  const s = createSuite('home screen and pond (fonts, canvas, theme, motion)');

  const { cdp, close } = await launch();
  try {
    // --- desktop pass -------------------------------------------------------
    await navigate(cdp, `${devUrl}/`);
    s.check(
      'the pond opens dark',
      await evaluate(cdp, `document.documentElement.classList.contains('dark')`)
    );
    s.check(
      'Geist Mono is loaded',
      await evaluate(cdp, `document.fonts.ready.then(() => document.fonts.check('14px "Geist Mono"'))`)
    );
    s.check(
      'body resolves to Geist Mono',
      await evaluate(cdp, `getComputedStyle(document.body).fontFamily.includes('Geist Mono')`)
    );
    s.check(
      'the quote cursor blinks',
      await evaluate(cdp, `getComputedStyle(document.querySelector('.cursor')).animationName === 'blink'`)
    );
    s.check(
      'the citation card is hidden until its mention is focused',
      await evaluate(cdp, `getComputedStyle(document.querySelector('.cite-card')).visibility === 'hidden'`)
    );
    await evaluate(cdp, `document.querySelector('.cite').focus()`);
    await sleep(300);
    s.check(
      'focusing a mention opens its card',
      await evaluate(
        cdp,
        `(() => {
           const card = document.querySelector('.cite').parentElement.querySelector('.cite-card');
           return getComputedStyle(card).visibility === 'visible' && parseFloat(getComputedStyle(card).opacity) === 1;
         })()`
      )
    );
    await evaluate(cdp, `document.activeElement.blur()`);

    await sleep(1200);
    s.check('the pond canvas paints', await evaluate(cdp, canvasPainted));
    s.check(
      'the live counts are shown',
      await evaluate(
        cdp,
        `(() => {
           const el = document.querySelector('.pond-stats');
           return !el.hidden && Number(document.querySelector('[data-pond-monkeys]').textContent) > 0;
         })()`
      )
    );

    const themed = await evaluate(
      cdp,
      `(() => {
         const before = document.documentElement.classList.contains('dark');
         document.querySelector('[data-theme-toggle]').click();
         return { before, after: document.documentElement.classList.contains('dark') };
       })()`
    );
    s.check('the theme toggle flips the page', themed.before !== themed.after, JSON.stringify(themed));
    await sleep(500);
    s.check('the canvas keeps painting after a theme change', await evaluate(cdp, canvasPainted));

    s.check(
      'only same-origin requests',
      await evaluate(
        cdp,
        `performance.getEntriesByType('resource').every((r) => new URL(r.name).origin === location.origin)`
      )
    );

    // --- phone pass ---------------------------------------------------------
    await emulateDevice(cdp, { width: 390, height: 844, dpr: 3 });
    await navigate(cdp, `${devUrl}/`);
    await sleep(900);
    s.check(
      'home has no horizontal overflow at 390px',
      await evaluate(cdp, `document.documentElement.scrollWidth <= window.innerWidth + 1`)
    );
    s.check(
      'the phone shows the floating pill',
      await evaluate(cdp, `getComputedStyle(document.querySelector('.mobile-bar')).display !== 'none'`)
    );
    s.check(
      'the phone hides the desktop nav',
      await evaluate(cdp, `getComputedStyle(document.querySelector('.site-nav')).display === 'none'`)
    );
    await evaluate(cdp, `document.querySelector('[data-menu-toggle]').click()`);
    await sleep(300);
    s.check(
      'the menu opens from the pill',
      await evaluate(
        cdp,
        `(() => {
           const menu = document.querySelector('[data-mobile-menu]');
           const closeIcon = document.querySelector('[data-menu-icon="close"]');
           const openIcon = document.querySelector('[data-menu-icon="open"]');
           return menu.dataset.open === 'true' &&
             getComputedStyle(menu).visibility === 'visible' &&
             getComputedStyle(closeIcon).display !== 'none' &&
             getComputedStyle(openIcon).display === 'none';
         })()`
      )
    );
    s.check(
      'Escape closes the menu',
      await evaluate(
        cdp,
        `(() => {
           document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
           const menu = document.querySelector('[data-mobile-menu]');
           return menu.dataset.open === 'false';
         })()`
      )
    );
    s.check(
      'the phone canvas paints too',
      await evaluate(cdp, canvasPainted)
    );

    await navigate(cdp, `${devUrl}/notes/`);
    await sleep(400);
    s.check(
      'a list page has no horizontal overflow at 390px',
      await evaluate(cdp, `document.documentElement.scrollWidth <= window.innerWidth + 1`)
    );

    // --- reduced motion -----------------------------------------------------
    await emulateDevice(cdp, { width: 390, height: 844, dpr: 3, reducedMotion: true });
    await navigate(cdp, `${devUrl}/`);
    await sleep(600);
    s.check(
      'reduced motion stops the cursor',
      await evaluate(
        cdp,
        `(() => {
           const cs = getComputedStyle(document.querySelector('.cursor'));
           return cs.animationIterationCount === '1' || parseFloat(cs.animationDuration) <= 0.01;
         })()`
      )
    );
    s.check('reduced motion still draws a still pond', await evaluate(cdp, canvasPainted));
    s.note('reduced motion', 'cursor static, pond held on one frame');

    const errors = collectPageErrors(cdp.events);
    s.check(
      'no console errors across every pass',
      errors.length === 0,
      errors.map((e) => JSON.stringify(e.params).slice(0, 200)).join(' | ')
    );

    return s;
  } finally {
    await close();
  }
}

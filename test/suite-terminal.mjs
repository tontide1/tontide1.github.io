/**
 * The rendered terminal on a real browser: the self-hosted font actually
 * loads, the panel fits a phone without sideways scroll, the staggered reveal
 * settles, reduced motion keeps everything visible and still, and no page
 * pulls a third-party request or logs an error.
 *
 * Replaces the old devices suite. The device-tier assertions died with the
 * WebGL quality profiles they measured; what remains is what a reader sees.
 */
import { launch, emulateDevice, evaluate, navigate, sleep } from './cdp.mjs';
import { collectPageErrors, createSuite } from './harness.mjs';

export default async function run({ devUrl }) {
  const s = createSuite('terminal rendering (fonts, fit, motion, errors)');

  const { cdp, close } = await launch();
  try {
    // --- desktop pass -------------------------------------------------------
    await navigate(cdp, `${devUrl}/`);
    s.check(
      'OpenTUI Mono is loaded',
      await evaluate(cdp, `document.fonts.ready.then(() => document.fonts.check('14px "OpenTUI Mono"'))`)
    );
    s.check(
      'body resolves to OpenTUI Mono',
      await evaluate(cdp, `getComputedStyle(document.body).fontFamily.includes('OpenTUI Mono')`)
    );
    await sleep(900); // let the staggered reveal finish
    s.check(
      'every row reveals',
      await evaluate(cdp, `[...document.querySelectorAll('.ff-row')].every((el) => parseFloat(getComputedStyle(el).opacity) === 1)`)
    );
    s.check(
      'the cursor blinks',
      await evaluate(cdp, `getComputedStyle(document.querySelector('.cursor')).animationName === 'blink'`)
    );
    s.check(
      'banner and hostline are present',
      await evaluate(cdp, `!!document.querySelector('.banner') && !!document.querySelector('.hostline')`)
    );
    s.check(
      'only same-origin requests',
      await evaluate(cdp, `performance.getEntriesByType('resource').every((r) => new URL(r.name).origin === location.origin)`)
    );

    // --- phone pass ---------------------------------------------------------
    await emulateDevice(cdp, { width: 390, height: 844, dpr: 3 });
    await navigate(cdp, `${devUrl}/`);
    await sleep(700);
    s.check(
      'home has no horizontal overflow at 390px',
      await evaluate(cdp, `document.documentElement.scrollWidth <= window.innerWidth + 1`)
    );
    s.check(
      'the banner stays visible at 390px',
      await evaluate(cdp, `document.querySelector('.banner').getBoundingClientRect().width > 100`)
    );
    s.check(
      'the directory list is in the HTML',
      await evaluate(cdp, `!!document.querySelector('.tree a[href="/projects"]')`)
    );

    await navigate(cdp, `${devUrl}/research/hybrid-retrieval-legal-qa`);
    await sleep(500);
    s.check(
      'article page has no horizontal overflow at 390px',
      await evaluate(cdp, `document.documentElement.scrollWidth <= window.innerWidth + 1`)
    );
    s.check(
      'mobile tree navigation is present',
      await evaluate(cdp, `!!document.querySelector('.mobile-nav')`)
    );

    // --- reduced motion -----------------------------------------------------
    await emulateDevice(cdp, { width: 390, height: 844, dpr: 3, reducedMotion: true });
    await navigate(cdp, `${devUrl}/`);
    s.check(
      'reduced motion shows every row immediately',
      await evaluate(
        cdp,
        `[...document.querySelectorAll('.ff-row')].every((el) => {
           const cs = getComputedStyle(el);
           return parseFloat(cs.opacity) === 1 && cs.animationName === 'none';
         })`
      )
    );
    s.check(
      'reduced motion freezes the cursor',
      await evaluate(
        cdp,
        `(() => {
           const cs = getComputedStyle(document.querySelector('.cursor'));
           return cs.animationIterationCount === '1' || parseFloat(cs.animationDuration) <= 0.01;
         })()`
      )
    );
    s.note('reduced motion', 'rows static and visible, cursor not blinking');

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

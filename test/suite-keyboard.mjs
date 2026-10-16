/**
 * Keyboard reachability and focus visibility on the terminal pages.
 *
 * Nothing here is optional chrome: the directory tree, the search trigger and
 * the GitHub link are the navigation. If a control cannot be reached by Tab, or
 * reaches focus without a visible indicator, a keyboard user is stranded.
 *
 * Focus indicators are checked while tabbing rather than via `el.focus()`,
 * because `:focus-visible` — which is what the ring hangs off — only matches
 * when the browser decides focus should be shown, and a programmatic focus does
 * not reliably trigger that decision.
 */
import { launch, evaluate, navigate, sleep } from './cdp.mjs';
import { createSuite } from './harness.mjs';

/** More stops than the home page has links, so the whole ring is walked. */
const MAX_TABS = 40;

const PROBE = `(() => {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  // The Astro dev toolbar is dev-only chrome, not part of the site.
  if (el.closest('astro-dev-toolbar')) return null;
  const cs = getComputedStyle(el);
  const outlineShown = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
  const shadowShown = cs.boxShadow !== 'none' && cs.boxShadow !== '';
  return {
    tag: el.tagName,
    text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 28),
    focusVisible: el.matches(':focus-visible'),
    outline: cs.outlineStyle + ' ' + cs.outlineWidth,
    boxShadow: cs.boxShadow,
    indicator: outlineShown || shadowShown,
  };
})()`;

async function pressKey(cdp, { key, code, vk, text, modifiers = 0 }) {
  const base = { modifiers, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk };
  await cdp.send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', ...base, ...(text ? { text } : {}) });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}

const KEY = {
  tab: { key: 'Tab', code: 'Tab', vk: 9 },
  slash: { key: '/', code: 'Slash', vk: 191, text: '/' },
  escape: { key: 'Escape', code: 'Escape', vk: 27 },
  enter: { key: 'Enter', code: 'Enter', vk: 13 },
  ctrlK: { key: 'k', code: 'KeyK', vk: 75, modifiers: 2 },
};

const dialogOpen = `!!document.querySelector('dialog[open]')`;

async function waitForPath(cdp, path, timeoutMs = 5000) {
  const normalize = (p) => String(p).replace(/\/+$/, '');
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (normalize(await evaluate(cdp, 'location.pathname')) === normalize(path)) return true;
    await sleep(150);
  }
  return false;
}

export default async function run({ devUrl }) {
  const s = createSuite('keyboard reach and focus visibility');

  const { cdp, close } = await launch({ width: 1440, height: 900 });
  try {
    await navigate(cdp, `${devUrl}/`);
    await sleep(400);

    // Walk the tab ring, recording the first time each control takes focus.
    const seen = new Map();
    for (let i = 0; i < MAX_TABS; i++) {
      await pressKey(cdp, KEY.tab);
      const probe = await evaluate(cdp, PROBE);
      if (!probe) continue;
      const key = `${probe.tag}:${probe.text}`;
      if (!seen.has(key)) seen.set(key, probe);
    }

    s.check('Tab reaches page controls', seen.size >= 6, `reached ${seen.size}`);
    s.note('controls reached by Tab', `${seen.size}`);

    const unindicated = [...seen.entries()].filter(([, p]) => !p.indicator);
    s.check(
      'no control is focusable without an indicator',
      unindicated.length === 0,
      unindicated.map(([k]) => k).join(', ')
    );

    // `focus:outline-none` is a silent trap: it suppresses the UA ring on plain
    // :focus and nothing replaces it. Suppressing *is* fine when a ring is
    // supplied in its place, so check for the pair, not the class alone.
    const bare = await evaluate(
      cdp,
      `(() => {
         return [...document.querySelectorAll('a[href], button')]
           .filter((el) => !el.closest('astro-dev-toolbar'))
           .filter((el) => {
             const c = el.className;
             const suppresses = /(^|\\s)focus(-visible)?:outline-none(\\s|$)/.test(c);
             const replaces = /(^|\\s)focus(-visible)?:ring-/.test(c);
             return suppresses && !replaces;
           })
           .map((el) => (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 28));
       })()`
    );
    s.check('no control suppresses its focus ring without replacing it', bare.length === 0, bare.join(', '));

    // `/` opens the search dialog; Escape closes it (native <dialog> cancel).
    await evaluate(cdp, `(() => { document.activeElement.blur(); return true; })()`);
    await pressKey(cdp, KEY.slash);
    await sleep(250);
    s.check('`/` opens search', await evaluate(cdp, dialogOpen));

    await pressKey(cdp, KEY.escape);
    await sleep(250);
    s.check('Escape closes search', !(await evaluate(cdp, dialogOpen)));

    // Ctrl+K opens it as well (the trigger advertises `/`; both work).
    await pressKey(cdp, KEY.ctrlK);
    await sleep(250);
    s.check('Ctrl+K opens search', await evaluate(cdp, dialogOpen));

    // Typing filters, and Enter follows the first hit shown. The assertion reads
    // that hit from the DOM: ranking legitimately puts a project above a note
    // when both match, and the contract under test is "first hit", not "best".
    await cdp.send('Input.insertText', { text: 'bm25' });
    await sleep(250);
    const hits = await evaluate(cdp, `document.querySelectorAll('[data-search-results] a').length`);
    s.check('typing filters the index', hits >= 1, `${hits} hits`);
    const firstHref = await evaluate(
      cdp,
      `document.querySelector('[data-search-results] a')?.getAttribute('href') ?? null`
    );
    await pressKey(cdp, KEY.enter);
    s.check('Enter follows the first hit', !!firstHref && (await waitForPath(cdp, firstHref)));
    s.note('search navigation', `bm25 → ${firstHref}`);

    // The dialog is on article pages too, with no framework runtime behind it.
    await navigate(cdp, `${devUrl}/projects/legal-rag`);
    await sleep(300);
    await pressKey(cdp, KEY.slash);
    await sleep(250);
    s.check('`/` opens search on an article page', await evaluate(cdp, dialogOpen));

    return s;
  } finally {
    await close();
  }
}

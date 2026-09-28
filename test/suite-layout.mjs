/**
 * Accessibility and progressive-enhancement surface in the built output: the
 * HTML fallback, reduced-motion CSS surviving Tailwind, deep-link headings, and
 * a viewport that does not block pinch zoom.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DIST, createSuite } from './harness.mjs';

const read = (p) => fs.readFileSync(path.join(DIST, p), 'utf8');

export default async function run() {
  const s = createSuite('layout and accessibility (built output)');

  // dvh so mobile browser chrome cannot crop the universe
  const index = read('index.html');
  s.check('index uses dvh height', /h-dvh/.test(index));
  s.check('index no longer uses h-screen', !/h-screen/.test(index));
  s.note('index height', 'h-dvh, no h-screen');

  // The reduced-motion block must survive the Tailwind build.
  const cssFile = fs.readdirSync(path.join(DIST, '_astro')).find((f) => f.endsWith('.css'));
  s.check('a stylesheet was emitted', !!cssFile);
  const css = read(`_astro/${cssFile}`);
  s.check('reduced-motion media query present', css.includes('prefers-reduced-motion'));
  s.check('animation-duration is neutralised', /animation-duration:\s*\.01ms/.test(css));
  s.check('transition-duration is neutralised', /transition-duration:\s*\.01ms/.test(css));
  s.check('scroll behaviour is neutralised', /scroll-behavior:auto/.test(css));
  s.note('built CSS', 'prefers-reduced-motion block present');

  // Important navigation must exist in HTML, not only in canvas.
  for (const route of ['/about', '/life', '/thoughts', '/notes', '/projects', '/research']) {
    s.check(`fallback nav exposes ${route}`, index.includes(`href="${route}"`));
  }
  s.check('noscript fallback present', /<noscript/.test(index));
  s.note('HTML fallback', '6 domain links + noscript');

  // Deep links stay indexable and semantically headed.
  for (const route of [
    'projects/legal-rag',
    'research/hybrid-retrieval-legal-qa',
    'notes/bm25-vs-dense',
    'thoughts/gravity-as-information-architecture',
    'life/system-journey-2026',
  ]) {
    s.check(`${route} has an h1`, /<h1/.test(read(`${route}/index.html`)));
  }
  s.note('content routes', 'h1 present on every deep link');

  // Content pages must not drag a JavaScript runtime along.
  for (const route of ['projects/legal-rag', 'notes/bm25-vs-dense', 'about']) {
    const html = read(`${route}/index.html`);
    s.check(`${route} ships no executable script`, !/<script[^>]*\ssrc=/.test(html));
    s.check(`${route} ships no canvas`, !/<canvas/.test(html));
  }
  s.note('content pages', 'zero executable JavaScript');

  // Pinch zoom must stay available.
  s.check('pinch zoom is not disabled', !/user-scalable=no/.test(index));
  s.check('responsive viewport present', /width=device-width/.test(index));
  s.note('viewport', 'width=device-width, zoom allowed');

  return s;
}

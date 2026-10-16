/**
 * The static contract of the built output: HTML-first navigation, self-hosted
 * fonts, no framework runtime, reduced-motion CSS surviving Tailwind, semantic
 * headings, and a viewport that does not block pinch zoom.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DIST, createSuite } from './harness.mjs';

const read = (p) => fs.readFileSync(path.join(DIST, p), 'utf8');

export default async function run() {
  const s = createSuite('layout, fonts, and progressive enhancement (built output)');

  const index = read('index.html');

  // The home panel is plain HTML: the fastfetch rows and the directory tree
  // are the navigation, so a crawler or a no-JS visitor sees all of it.
  for (const row of ['OS:', 'Kernel:', 'Coding Agents:', 'Languages.Programming:', 'Hobbies:']) {
    s.check(`home renders ${row}`, index.includes(row));
  }
  for (const route of ['/about', '/life', '/notes', '/projects', '/research', '/thoughts']) {
    s.check(`home links ${route}`, index.includes(`href="${route}"`));
  }
  s.check('home has exactly one h1', (index.match(/<h1[\s>]/g) ?? []).length === 1);
  s.check('home renders the terminal prompt', index.includes('tontide1@github'));
  s.check('home ships the search index', index.includes('data-search-index'));
  s.check('home ships no canvas', !/<canvas/.test(index));
  s.check('home ships no external script', !/<script[^>]*\ssrc=/.test(index));
  s.note('home', 'fastfetch panel, whole tree in HTML, no external JS');

  // Fonts are self-hosted: the woff2 files ship and no page calls a font CDN.
  for (const face of ['Regular', 'Bold', 'Italic', 'BoldItalic']) {
    s.check(
      `font ${face} woff2 ships`,
      fs.existsSync(path.join(DIST, 'fonts', `OpenTUIMono-${face}.woff2`))
    );
  }

  // The reduced-motion block must survive the Tailwind build.
  const cssFile = fs.readdirSync(path.join(DIST, '_astro')).find((f) => f.endsWith('.css'));
  s.check('a stylesheet was emitted', !!cssFile);
  const css = read(`_astro/${cssFile}`);
  s.check('OpenTUI Mono is declared in CSS', css.includes('OpenTUI Mono'));
  s.check('reduced-motion media query present', css.includes('prefers-reduced-motion'));
  s.check('animation-duration is neutralised', /animation-duration:\s*\.01ms/.test(css));
  s.check('transition-duration is neutralised', /transition-duration:\s*\.01ms/.test(css));
  s.check('scroll behaviour is neutralised', /scroll-behavior:auto/.test(css));
  s.note('built CSS', 'OpenTUI Mono + prefers-reduced-motion block present');

  // No framework runtime anywhere: the only shipped JS is the inline search
  // dialog script, and it never becomes a file.
  const emittedJs = fs.readdirSync(path.join(DIST, '_astro')).filter((f) => f.endsWith('.js'));
  s.check('no JavaScript bundle is emitted', emittedJs.length === 0, emittedJs.join(', '));
  s.note('emitted JS', 'none — inline dialog script only');

  // Every page carries the whole directory tree in its own HTML — the sidebar,
  // the mobile details block, and the header all resolve without JavaScript.
  const contentRoutes = [
    'projects/legal-rag',
    'research/hybrid-retrieval-legal-qa',
    'notes/bm25-vs-dense',
    'thoughts/gravity-as-information-architecture',
    'life/system-journey-2026',
    'about',
    'projects',
    '404.html',
  ];
  for (const route of contentRoutes) {
    const html = read(route.endsWith('.html') ? route : `${route}/index.html`);
    const label = route.replace(/\/index\.html$/, '');
    s.check(`${label} has an h1`, /<h1[\s>]/.test(html));
    s.check(`${label} ships no external script`, !/<script[^>]*\ssrc=/.test(html));
    s.check(
      `${label} links the whole tree`,
      ['/about', '/life', '/notes', '/projects', '/research', '/thoughts'].every((r) =>
        html.includes(`href="${r}"`)
      )
    );
    s.check(`${label} calls no font CDN`, !/fonts\.(googleapis|gstatic)\.com/.test(html));
  }
  s.note('content routes', 'whole tree + h1 in HTML, no external JS, no font CDN');

  // Pinch zoom must stay available.
  s.check('pinch zoom is not disabled', !/user-scalable=no/.test(index));
  s.check('responsive viewport present', /width=device-width/.test(index));
  s.note('viewport', 'width=device-width, zoom allowed');

  return s;
}

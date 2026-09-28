/**
 * SEO metadata across every built page: canonical, Open Graph, Twitter cards,
 * JSON-LD, sitemap, robots and the RSS feed. Reads dist/ directly, so it needs a
 * build but no browser.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DIST, createSuite } from './harness.mjs';

const ORIGIN = 'https://tontide1.github.io';

function htmlPages(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '_astro') continue;
      htmlPages(p, found);
    } else if (entry.name.endsWith('.html')) {
      found.push(p);
    }
  }
  return found;
}

const meta = (html, attr, value) => html.match(new RegExp(`<meta ${attr}="${value}" content="([^"]*)"`))?.[1];

export default async function run() {
  const s = createSuite('SEO metadata (built HTML)');
  const pages = htmlPages(DIST).sort();

  for (const file of pages) {
    const html = fs.readFileSync(file, 'utf8');
    const rel = '/' + path.relative(DIST, file).replace(/index\.html$/, '');
    const label = rel === '/' ? '/' : rel;

    const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
    s.check(`${label} canonical matches the route`, canonical === ORIGIN + rel, canonical);

    const desc = meta(html, 'name', 'description');
    s.check(`${label} has a description`, !!desc && desc.length > 20, `${desc?.length} chars`);

    for (const p of ['og:site_name', 'og:type', 'og:url', 'og:title', 'og:description', 'og:image', 'og:image:alt', 'og:image:width', 'og:image:height']) {
      s.check(`${label} ${p}`, !!meta(html, 'property', p));
    }
    s.check(`${label} og:url equals canonical`, meta(html, 'property', 'og:url') === canonical);
    s.check(`${label} og:url is absolute`, meta(html, 'property', 'og:url')?.startsWith(ORIGIN));

    const image = meta(html, 'property', 'og:image');
    s.check(`${label} og:image is absolute`, !!image?.startsWith(ORIGIN), image);
    s.check(`${label} og:image resolves to a real file`, !!image && fs.existsSync(DIST + image.slice(ORIGIN.length)));

    for (const n of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt']) {
      s.check(`${label} ${n}`, !!meta(html, 'name', n));
    }
    s.check(`${label} twitter:card is summary_large_image`, meta(html, 'name', 'twitter:card') === 'summary_large_image');

    const raw = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    let ld = null;
    try {
      ld = JSON.parse(raw);
    } catch (e) {
      s.check(`${label} JSON-LD parses`, false, e.message);
    }
    if (ld) {
      s.check(`${label} JSON-LD declares schema.org`, ld['@context'] === 'https://schema.org');
      s.check(`${label} JSON-LD has a type`, !!ld['@type'], String(ld['@type']));
    }

    // Only dated content pages may claim to be articles.
    const isContent = /^\/(projects|research|thoughts|notes|life)\/[^/]+\/$/.test(rel);
    s.check(`${label} og:type matches intent`, meta(html, 'property', 'og:type') === (isContent ? 'article' : 'website'), meta(html, 'property', 'og:type'));
    if (isContent) {
      const pub = meta(html, 'property', 'article:published_time');
      s.check(`${label} article:published_time is ISO 8601`, !!pub && /^\d{4}-\d{2}-\d{2}T/.test(pub), String(pub));
      s.check(`${label} article:modified_time present`, !!meta(html, 'property', 'article:modified_time'));
    } else {
      s.check(`${label} has no stale article:timestamp`, !meta(html, 'property', 'article:published_time'));
    }

    s.check(`${label} links the RSS feed`, html.includes('type="application/rss+xml"') && html.includes(ORIGIN + '/rss.xml'));
  }
  s.note('pages checked', pages.length);

  // --- sitemap ---------------------------------------------------------------
  const index = fs.readFileSync(path.join(DIST, 'sitemap-index.xml'), 'utf8');
  const map = fs.readFileSync(path.join(DIST, 'sitemap-0.xml'), 'utf8');
  s.check('sitemap index references its chunk', index.includes('sitemap-0.xml'));
  const locs = [...map.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).sort();
  const expected = pages.map((f) => ORIGIN + '/' + path.relative(DIST, f).replace(/index\.html$/, '')).sort();
  s.check('sitemap covers every page', JSON.stringify(locs) === JSON.stringify(expected), `${locs.length} URLs vs ${expected.length} pages`);
  s.check('sitemap excludes the feed', !locs.some((l) => l.endsWith('rss.xml')));

  // --- robots ---------------------------------------------------------------
  const robots = fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8');
  const ref = robots.match(/Sitemap:\s*(\S+)/)?.[1];
  s.check('robots allows crawling', /User-agent:\s*\*/.test(robots) && /Allow:\s*\//.test(robots));
  s.check('robots points at a sitemap that exists', !!ref && fs.existsSync(DIST + ref.replace(ORIGIN, '')), String(ref));

  // --- RSS ------------------------------------------------------------------
  const feed = fs.readFileSync(path.join(DIST, 'rss.xml'), 'utf8');
  const itemLinks = [...feed.matchAll(/<item>[\s\S]*?<link>([^<]+)<\/link>/g)].map((m) => m[1]);
  s.check('feed is an RSS 2.0 document', feed.startsWith('<?xml') && feed.includes('<rss version="2.0"'));
  s.check('feed carries every published entry', itemLinks.length === 5, `${itemLinks.length} items`);
  s.check('feed item links are absolute', itemLinks.length > 0 && itemLinks.every((l) => l.startsWith(ORIGIN + '/')), itemLinks.join(' '));
  const dates = [...feed.matchAll(/<pubDate>([^<]+)<\/pubDate>/g)].map((m) => new Date(m[1]).getTime());
  s.check('feed is sorted newest first', dates.every((d, i) => i === 0 || dates[i - 1] >= d), dates.map((d) => new Date(d).toISOString().slice(0, 10)).join(' '));

  return s;
}

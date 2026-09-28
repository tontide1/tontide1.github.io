/**
 * Source-level invariants that are cheap to check and easy to regress.
 *
 * These read source rather than output, so they are not a substitute for
 * behaviour: a draft entry has to be built to prove it stays unpublished. What
 * they do catch is someone adding a call site and forgetting the filter.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, createSuite } from './harness.mjs';

function sourceFiles(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(p, found);
    else if (/\.(astro|tsx|ts|mdx)$/.test(entry.name)) found.push(p);
  }
  return found;
}

export default async function run() {
  const s = createSuite('source invariants');
  const files = sourceFiles(path.join(ROOT, 'src'));

  // A draft must never reach production. Every collection read needs the filter.
  // The filter argument contains its own parentheses, so find the real end of
  // the call by balancing them rather than stopping at the first ')'.
  const unfiltered = [];
  let callSites = 0;
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/getCollection\('/g)) {
      callSites++;
      let depth = 1;
      let i = m.index + m[0].length;
      for (; i < text.length && depth > 0; i++) {
        if (text[i] === '(') depth++;
        else if (text[i] === ')') depth--;
      }
      const call = text.slice(m.index, i);
      if (!call.includes('data.draft')) unfiltered.push(`${path.relative(ROOT, file)}: ${call}`);
    }
  }
  s.check('every getCollection call site filters drafts', unfiltered.length === 0, unfiltered.join(' | '));
  s.note('getCollection call sites checked', callSites);

  // spec.md §18 lists deterministic layout as a must-have: the universe is a
  // stable place, not a reshuffle on reload. StarField uses a seeded PRNG.
  const random = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (text.includes('Math.random()')) random.push(path.relative(ROOT, file));
  }
  s.check('no unseeded randomness in the scene graph', random.length === 0, random.join(', '));

  // `prose` needs @tailwindcss/typography, which this project does not depend on,
  // so the classes silently did nothing. Catch them reappearing.
  const deadProse = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (/class="[^"]*\bprose\b/.test(text)) deadProse.push(path.relative(ROOT, file));
  }
  s.check('no classes from the uninstalled typography plugin', deadProse.length === 0, deadProse.join(', '));
  s.check('typography plugin is genuinely not a dependency', !fs.existsSync(path.join(ROOT, 'node_modules', '@tailwindcss', 'typography')));

  return s;
}

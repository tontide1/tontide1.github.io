/**
 * Verification runner.
 *
 *   npm test               every suite: build, start dev + preview, run, tear down
 *   npm run test:static    only the suites that need neither a browser nor a server
 *   npm run test:seo       just the built-HTML metadata suite
 *
 * Two servers are started because two suites need different things: the browser
 * suites that read the app's own stores need the dev server, because a production
 * build serves no source modules; the bundle suite needs the preview build,
 * because it asserts on the emitted chunk names.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ARTIFACTS, DIST, ROOT, freePort, startServer } from './harness.mjs';
import { findChrome } from './cdp.mjs';

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--only='))?.slice(7);
const staticOnly = args.includes('--static');
const skipBuild = args.includes('--no-build');

/** Run the local Astro CLI directly: going through npx adds a process layer. */
const ASTRO = path.join(ROOT, 'node_modules', 'astro', 'astro.js');
const astro = (command) => [process.execPath, [ASTRO, command]];

const SUITES = [
  { id: 'environment', needs: { browser: false, server: null }, run: () => import('./suite-environment.mjs') },
  { id: 'source', needs: { browser: false, server: null }, run: () => import('./suite-source.mjs') },
  { id: 'seo', needs: { browser: false, server: null }, run: () => import('./suite-seo.mjs') },
  { id: 'layout', needs: { browser: false, server: null }, run: () => import('./suite-layout.mjs') },
  { id: 'bundle', needs: { browser: true, server: 'preview' }, run: () => import('./suite-bundle.mjs') },
  { id: 'devices', needs: { browser: true, server: 'dev' }, run: () => import('./suite-devices.mjs') },
  { id: 'drag', needs: { browser: true, server: 'dev' }, run: () => import('./suite-drag.mjs') },
  { id: 'touch-drag', needs: { browser: true, server: 'dev' }, run: () => import('./suite-touch-drag.mjs') },
];

const selected = SUITES.filter((s) => {
  if (only) return s.id === only;
  if (staticOnly) return !s.needs.browser;
  return true;
});

if (!selected.length) {
  console.error(`No suite matches ${args.join(' ')}. Known: ${SUITES.map((s) => s.id).join(', ')}`);
  process.exit(2);
}

function run(command, commandArgs) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, commandArgs, { cwd: ROOT, stdio: 'inherit', shell: false });
    proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`))));
    proc.on('error', reject);
  });
}

const servers = [];
let chromeChecked = false;
let failed = 0;
let totalAssertions = 0;

try {
  // A stale error file from an earlier run reads as a fresh failure.
  fs.rmSync(ARTIFACTS, { recursive: true, force: true });
  fs.mkdirSync(ARTIFACTS, { recursive: true });

  if (!skipBuild) {
    console.log('building…');
    await run(...astro('build'));
  }
  if (!fs.existsSync(DIST)) {
    throw new Error('dist/ is missing; run without --no-build');
  }

  const needs = {
    preview: selected.some((s) => s.needs.server === 'preview'),
    dev: selected.some((s) => s.needs.server === 'dev'),
  };

  if (needs.preview) {
    const port = await freePort();
    const [cmd, commandArgs] = astro('preview');
    servers.push(await startServer({
      label: 'preview',
      cmd,
      args: [...commandArgs, '--port', String(port)],
      url: `http://127.0.0.1:${port}/`,
    }));
    console.log(`preview on ${servers.at(-1).url}`);
  }
  if (needs.dev) {
    const port = await freePort();
    const [cmd, commandArgs] = astro('dev');
    servers.push(await startServer({
      label: 'dev',
      cmd,
      args: [...commandArgs, '--port', String(port)],
      url: `http://127.0.0.1:${port}/`,
    }));
    console.log(`dev on ${servers.at(-1).url}`);
  }

  if (selected.some((s) => s.needs.browser)) {
    try {
      console.log(`chrome: ${findChrome()}`);
    } catch (e) {
      throw new Error(`${e.message}\nRe-run with --static to skip the browser suites.`);
    }
    chromeChecked = true;
  }

  console.log('');
  for (const entry of selected) {
    const baseUrl = servers.find((s) => s.label === 'preview')?.url;
    const devUrl = servers.find((s) => s.label === 'dev')?.url;
    try {
      const mod = await entry.run();
      const suite = await mod.default({ baseUrl, devUrl });
      totalAssertions += suite.passed;
      if (!suite.report()) failed++;
    } catch (e) {
      failed++;
      console.log(`FAIL  ${entry.id}  (threw)`);
      console.log(`  FAIL ${e.message}`);
      fs.mkdirSync(ARTIFACTS, { recursive: true });
      fs.writeFileSync(path.join(ARTIFACTS, `${entry.id}.error.txt`), `${e.stack}\n`);
      console.log(`  stack: ${path.join(ARTIFACTS, `${entry.id}.error.txt`)}`);
    }
  }
} catch (e) {
  console.error(`\n${e.message}`);
  failed++;
} finally {
  for (const server of servers) await server.stop();
}

console.log('');
if (failed) {
  console.log(`${failed} of ${selected.length} suites failed. Artifacts in ${path.relative(ROOT, ARTIFACTS)}/`);
  process.exit(1);
}
const chromeNote = chromeChecked ? '' : ' (no browser suites ran)';
console.log(`${selected.length} suites passed, ${totalAssertions} assertions${chromeNote}`);

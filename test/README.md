# Verification suites

Behavioural checks for TONTIDE1, a personal portfolio rendered as a terminal
session. Everything here runs against the real build and a real browser; there
is no mocking of the app's own modules, because the interesting failures live in
the seams between the markup, the stylesheet and the DOM.

No test framework. The suites are plain Node scripts because what they mostly do
is drive Chrome over the DevTools protocol, which Node can speak on its own.
Adding Vitest would not reach the browser at all.

## Running

```sh
pnpm test              # build, start the dev server, run every suite, tear down
pnpm test:static       # only the suites needing neither a browser nor a server
pnpm test:seo          # one suite: pnpm test --only=<id>
pnpm test --no-build   # reuse the existing dist/
```

Suite ids: `source`, `seo`, `layout`, `terminal`, `keyboard`.

`pnpm test` needs Chrome or Chromium. It is found automatically; override with
`CHROME_PATH`. Without a browser, `pnpm test:static` still covers the build
output, SEO and source invariants.

Screenshots and stack traces land in `node_modules/.cache/verify/`, which is
gitignored.

## What each suite covers

| Suite | Needs | Asserts |
|---|---|---|
| `source` | nothing | Every `getCollection` call site filters drafts, no `Math.random()` anywhere in rendered code, no classes from the uninstalled typography plugin (the `-prose` suffix trips the same check) |
| `seo` | build | Canonical per route, full Open Graph and Twitter sets, JSON-LD per page type, sitemap coverage, robots, the 404 contract, RSS ordering |
| `layout` | build | The home panel renders its rows and the whole directory tree in HTML, no `<canvas>` and no external script anywhere, fonts ship self-hosted, no font CDN, the reduced-motion block survives Tailwind, zero emitted JavaScript, an `h1` on every route, pinch zoom left enabled |
| `terminal` | dev + Chrome | OpenTUI Mono actually loads, the staggered rows settle (and stay static under reduced motion), the cursor blinks (and freezes under reduced motion), no horizontal overflow at 390px on home and on an article page, only same-origin requests, no console errors |
| `keyboard` | dev + Chrome | Every control is reachable by Tab and shows a visible focus indicator, no control suppresses its ring without replacing it, `/` and Ctrl+K open the search dialog on home and on article pages, Escape closes it, typing filters and Enter follows the first hit |

## One server, on purpose

The browser suites load pages from the **dev** server. The old preview-server
suite existed to prove the WebGL chunk deferred behind first paint; there is no
emitted JavaScript left to defer, and `layout` asserts that against the build.
The runner starts a server only when a selected suite asks for it.

The server is started with `--host 127.0.0.1` to match the loopback address the
runner probes. Left to its own devices `astro dev` binds whatever `localhost`
resolves to first, which is `[::1]` on some machines and IPv4 on others, so the
probe misses a server that is up and healthy.

## Traps this harness already hit

Recorded here because each one produced a green result that meant nothing.

- **`el.focus()` does not reliably trigger `:focus-visible`.** Any styled focus
  ring should hang off that pseudo-class, and a programmatic focus skips the
  browser's heuristic, so the probe measures nothing. Tab to the control instead.
- **`focus:outline-none` without a replacement ring is a silent trap.** The
  keyboard suite checks for the class *and* the absence of `focus:ring-*`, not
  the class alone.
- **A word boundary can split a class name.** The typography-plugin check uses
  `\bprose\b`, which also matches a `-prose` suffix; the article wrapper is
  named `term-article` for that reason.
- **`Runtime.evaluate` rejects a bare top-level `await`.** Wrap it, or return a
  promise — `awaitPromise: true` resolves it.
- **A failed run can leave a headless Chrome holding its debug port**, so the
  next run silently attaches to the stale browser. `launch()` picks a free port
  and a temp profile, and waits for the process to exit before cleaning up —
  Chrome flushes its profile as it shuts down, so removing it too early throws
  `ENOTEMPTY`.

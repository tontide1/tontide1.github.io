# Verification suites

Behavioural checks for TONTIDE1, a personal site whose home screen is an ASCII
pond. Everything here runs against the real build and a real browser; there
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

Suite ids: `source`, `seo`, `layout`, `home`, `keyboard`.

`pnpm test` needs Chrome or Chromium. It is found automatically; override with
`CHROME_PATH`. Without a browser, `pnpm test:static` still covers the build
output, SEO and source invariants.

Screenshots and stack traces land in `node_modules/.cache/verify/`, which is
gitignored.

## What each suite covers

| Suite | Needs | Asserts |
|---|---|---|
| `source` | nothing | Every `getCollection` call site filters drafts, no `Math.random()` outside the client-only pond engine, no classes from the uninstalled typography plugin (the `-prose` suffix trips the same check) |
| `seo` | build | Canonical per route, full Open Graph and Twitter sets, JSON-LD per page type, sitemap coverage, robots, the 404 contract, RSS ordering |
| `layout` | build | The home renders its quote, intro, citations and the whole directory tree in HTML, the pond canvas ships, no third-party script or font CDN, the reduced-motion block survives Tailwind, one same-origin engine bundle, an `h1` on every route, pinch zoom left enabled |
| `home` | dev + Chrome | Geist Mono actually loads, the canvas paints (also after a theme flip and under reduced motion), the citation card opens on focus, the live counts appear, the phone pill opens and Escape closes the menu, no horizontal overflow at 390px, only same-origin requests, no console errors |
| `keyboard` | dev + Chrome | Every control is reachable by Tab and shows a visible focus indicator, no control suppresses its ring without replacing it, `/` and Ctrl+K open the search dialog on home and on article pages, Escape closes it, typing filters and Enter follows the first hit |

## One server, on purpose

The browser suites load pages from the **dev** server. The runner starts a
server only when a selected suite asks for it; `layout`, `seo` and `source`
read the built output and need none.

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
  named `article` and the dimming wrapper `cited-text` for that reason.
- **`[hidden]` loses to Tailwind's preflight.** `svg { display: block }` is an
  author rule and outranks the UA's `[hidden] { display: none }`, so the phone
  menu's open/close icon swap needs an explicit `svg[hidden]` rule.
- **`Runtime.evaluate` rejects a bare top-level `await`.** Wrap it, or return a
  promise — `awaitPromise: true` resolves it.
- **A failed run can leave a headless Chrome holding its debug port**, so the
  next run silently attaches to the stale browser. `launch()` picks a free port
  and a temp profile, and waits for the process to exit before cleaning up —
  Chrome flushes its profile as it shuts down, so removing it too early throws
  `ENOTEMPTY`.

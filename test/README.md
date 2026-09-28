# Verification suites

Behavioural checks for TÀI — a Personal Gravity System. Everything here runs
against the real build and a real browser; there is no mocking of the app's own
modules, because the interesting failures live in the seams between the canvas,
the stores and the DOM.

No test framework. The suites are plain Node scripts because what they mostly do
is drive Chrome over the DevTools protocol, which Node can speak on its own.
Adding Vitest would not reach the browser at all.

## Running

```sh
pnpm test              # build, start dev + preview, run every suite, tear down
pnpm test:static       # only the suites needing neither a browser nor a server
pnpm test:seo          # one suite: pnpm test --only=<id>
pnpm test --no-build   # reuse the existing dist/
```

Suite ids: `environment`, `source`, `seo`, `layout`, `bundle`, `devices`, `drag`,
`touch-drag`.

`pnpm test` needs Chrome or Chromium. It is found automatically; override with
`CHROME_PATH`. Without a browser, `pnpm test:static` still covers 375
assertions.

Screenshots and stack traces land in `node_modules/.cache/verify/`, which is
gitignored.

## What each suite covers

| Suite | Needs | Asserts |
|---|---|---|
| `environment` | nothing | Device tier detection, the SSR `matchMedia` guard, the high/medium/low dpr, star and ASCII-cell budgets, and that reduced motion thins the starfield without dropping desktop resolution |
| `source` | nothing | Every `getCollection` call site filters drafts, no unseeded randomness in the scene graph, no classes from the uninstalled typography plugin |
| `seo` | build | Canonical per route, full Open Graph and Twitter sets, JSON-LD per page type, sitemap coverage, robots, RSS ordering |
| `layout` | build | `dvh` height, the reduced-motion block surviving Tailwind, the HTML fallback and `noscript`, an `h1` on every deep link, zero executable JS on content pages, pinch zoom left enabled |
| `bundle` | preview + Chrome | The first script is the small loader, the three.js chunk lands after the first paint wave, the canvas still mounts, no unexpected 4xx |
| `devices` | dev + Chrome | Phone, phone-with-reduced-motion and desktop profiles: tier, budget, backing-store size, and that reduced motion freezes the scene while the default profile keeps animating |
| `drag` | dev + Chrome | A body follows the cursor, respects its clamp, and the camera holds still; a background drag still orbits; a tap still selects; release springs back to the orbit |
| `touch-drag` | dev + Chrome | The same pull through the real touch pipeline on a phone profile |

## Two servers, on purpose

`devices`, `drag` and `touch-drag` read the app's **own** nanostores, so they need
the dev server: a production build serves no source modules. `bundle` asserts on
emitted chunk names, so it needs the preview build. The runner starts each only
when a selected suite asks for it.

## Traps this harness already hit

Recorded here because each one produced a green result that meant nothing.

- **Never import a store by bare path.** Vite serves `universe.ts?t=1790577…`, so
  `import('/src/stores/universe.ts')` builds a *second* copy of every atom. The
  duplicate reads empty while the app runs fine. Use `bindStores`, which resolves
  the URL the page actually loaded.
- **`canvas.toDataURL()` cannot prove a frame is frozen.** With
  `preserveDrawingBuffer` false the WebGL buffer is already cleared by the time
  you read it, so every frame hashes the same. Compare real screenshots.
- **A hover-derived centroid is too coarse to measure camera motion.** A 20px
  probe grid quantises it into jumps the same size as the movement under test.
  Compare a tight pixel crop around a body the gesture never touched.
- **"Background drag" must be proved empty.** A point 48px from a body is still a
  body drag, and the camera correctly refuses to move. Hover-probe the point first.
- **Measure the return against the orbit, not the peak.** Distance-from-peak stays
  at the pull distance after a correct return, which reads as "never sprang back".
  The orbit base is the right reference.
- **`Runtime.evaluate` rejects a bare top-level `await`.** Wrap it.
- **A failed run can leave a headless Chrome holding its debug port**, so the
  next run silently attaches to the stale browser. `launch()` picks a free port
  and a temp profile, and waits for the process to exit before cleaning up —
  Chrome flushes its profile as it shuts down, so removing it too early throws
  `ENOTEMPTY`.

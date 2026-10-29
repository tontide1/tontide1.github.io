# TONTIDE1

Personal site of Tài Phan — software developer and AI engineer in Ho Chi Minh City. One screen with an ASCII monkey over blue water at the front door, then reading pages: projects, research, notes, thoughts, life.

- **Stack:** Astro 5 · Tailwind 4 · MDX · one canvas engine (no framework runtime)
- **Type:** Geist Mono for chrome, Geist Sans for prose, Playfair Display only for the phone menu — all self-hosted
- **Spec:** [`spec.md`](spec.md) · **Decisions:** [`docs/adr/`](docs/adr/) · **Context:** [`CONTEXT.md`](CONTEXT.md)
- **Live:** <https://tontide1.github.io/>

## Develop

Requires Node >= 24 and pnpm (pinned via mise).

```sh
pnpm install
pnpm dev        # dev server
pnpm build      # static build → dist/
pnpm preview    # preview the build
```

## Test

```sh
pnpm test             # build, then every suite in a real browser (5 suites)
pnpm test:static      # build + static checks only
pnpm test:seo         # SEO checks only
```

## Content

Posts live as MDX under `src/content/` (one collection per domain). The home-page mentions and their hover cards live in `src/lib/sources.ts`; the site-wide nav comes from `src/lib/domains.ts`. Deploy is automatic via GitHub Pages on push to `master`.

## How it is put together

- `src/pages/index.astro` — the single-screen home: quote, intro, citations, canvas.
- `src/components/pond/` — the canvas engine: `world.ts` (motion), `monkeys.ts` (silhouettes), `renderer.ts` (ASCII tiles), `engine.ts` (DOM, RAF, input, theme).
- `src/components/site/` — nav, phone menu, search dialog, citation card, entry rows.
- `src/layouts/` — `Layout.astro` (head, SEO, theme boot), `ListLayout.astro` (index pages), `ProseLayout.astro` (reading pages).
- `src/styles/global.css` — theme tokens, prose, strip, search, view transitions, reduced motion.

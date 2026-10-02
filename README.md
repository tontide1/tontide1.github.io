# TÀI — A Personal Gravity System

Personal site built as an interactive ASCII/WebGL gravity universe: Tài at the center, five domains (life, notes, thoughts, projects, research) orbiting around it. WebGL to explore; HTML/MDX to read.

- **Stack:** Astro 5 · React 19 · Three.js/R3F · Tailwind 4 · MDX
- **Spec:** [`spec.md`](spec.md) (source of truth) · **Decisions:** [`docs/adr/`](docs/adr/) · **Context:** [`CONTEXT.md`](CONTEXT.md)
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
pnpm test             # full harness (9 suites, 482 assertions)
pnpm test:static      # build + static checks only
pnpm test:seo         # SEO checks only
```

## Content

Posts live as MDX under `src/content/` (one collection per domain). Deploy is automatic via GitHub Pages on push to `master`.

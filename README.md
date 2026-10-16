# TONTIDE1 — Terminal Portfolio

Personal site rendered as a terminal session: a fastfetch-style panel as the front door, and one command-framed page per piece of content. HTML/MDX to read; the terminal is only the frame.

- **Stack:** Astro 5 · Tailwind 4 · MDX — no framework runtime, no emitted JavaScript bundle
- **Typeface:** OpenTUI Mono (self-hosted, from the [OpenCode website](https://github.com/anomalyco/opencode), MIT)
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
pnpm test             # full harness (5 suites, 419 assertions)
pnpm test:static      # build + static checks only
pnpm test:seo         # SEO checks only
```

## Content

Posts live as MDX under `src/content/` (one collection per domain). The identity rows on the home page live in `src/lib/profile.ts`. Deploy is automatic via GitHub Pages on push to `master`.

## How it is put together

- `src/layouts/ContentLayout.astro` — the frame every content page shares: sticky header, prompt line, directory tree, article typography.
- `src/components/terminal/` — the prompt line, the search trigger, and the native-`<dialog>` search with its inline script.
- `src/styles/global.css` — theme tokens, the component layer, and the reduced-motion contract.

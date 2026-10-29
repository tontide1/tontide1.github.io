# Pond redesign: the daoho visual language replaces the terminal

## Context

ADR-0005 made the terminal the site's identity. The owner has since pointed at
[daoho.dev](https://www.daoho.dev/) — whose source is
[Dao-Ho/portfolio](https://github.com/Dao-Ho/portfolio) — and asked for that
UI/UX, with one substitution: the koi in its ASCII canvas become a monkey
perched on a branch above the water.

The two languages are opposites. The terminal was dark-only, bordered, and
framed every page as command output. The reference is a warm two-theme,
borderless single screen: tiny lowercase mono nav, prose sitting on a live
canvas, an underlined mention opening a source card, and a horizontal project
strip.

## Decision

- **Home is one screen** (`100dvh`, no document scroll): a quote with a blinking
  cursor, an intro, three citation cards (pure CSS `:focus-within`/`:hover`),
  and a decorative canvas behind it. Clicking empty space drops peanuts that
  the monkey comes over to inspect.
- **The canvas is a port of the reference engine**, not a lookalike: a 2D
  `World` (perch, avoid boxes measured from the prose, cursor curiosity,
  peanuts, ambient rings) and a tile rasteriser that etches ASCII glyphs into
  each cell. The hero is a perched monkey: dark fur with an orange rim, a cream
  face, a pale dotted branch with orange leaves, and a tail curled below.
- **Two themes**, following the reference: paper `#f5f4f1` / ink `#262523`, and
  `#1a1917` / `#fff7f0`. No accent colour; hierarchy is opacity and hairlines.
- **Type:** Geist Mono for chrome and home prose, Geist Sans for reading pages,
  Playfair Display only for the phone menu labels. All self-hosted.
- **Projects are a horizontal strip** of typographic covers (the site has no
  project screenshots), with wheel/keyboard/touch glide, and cross-document
  view transitions that slide the project page in and back out.
- **Reading pages** keep the same DOM-first, one-`h1`, crawlable/SEO contract.
  The search dialog survives, restyled.
- The terminal vocabulary, the fastfetch panel, the sidebar tree, the prompt
  line, and `src/lib/profile.ts` are deleted. The five domains, content model,
  URLs, SEO/JSON-LD, RSS and sitemap are unchanged.

This ADR supersedes ADR-0005 in full. ADR-0002's Astro template and content
collections remain in force; the "no framework runtime" goal is narrowed to
"one same-origin canvas bundle on the home page".

## Consequences

- **Performance:** the home page loads one ~22 kB script (9 kB gzip) and no
  third-party requests; every other page is HTML/CSS only. Font preloads are
  Geist Mono and Geist Sans.
- **Identity:** the site is no longer a terminal. `CONTEXT.md` gains *Pond*,
  *Monkey*, *Citation*, *Strip*, *Mobile pill* and loses *Terminal*, *Panel*
  and *Directory tree*; `AGENTS.md`'s UI rules are rewritten (the serif ban now
  carves out the Playfair phone menu only).
- **Tests:** `suite-terminal` becomes `suite-home` (canvas paints, citation card
  opens on focus, theme flips, phone pill/menu, reduced-motion still frame,
  no console errors). The layout suite now expects one engine bundle and the
  canvas instead of asserting zero JavaScript.
- **Assets:** the social card is regenerated in the new palette; OpenTUI Mono
  and the unused terminal icons are deleted.
- **Reversal cost:** the terminal build is in git history; this ADR and ADR-0005
  document both directions.

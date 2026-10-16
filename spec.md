# TONTIDE1 — Terminal Portfolio

## 1. Document Status

- **Version:** 2.0
- **Status:** Shipped specification — describes the deployed site
- **Product:** Personal website + portfolio + blog + research archive
- **Primary experience:** A terminal session: a fastfetch-style panel as the front door, one command-framed page per piece of content
- **Primary audience:** Developers, technical readers, recruiters
- **Secondary audience:** Visitors interested in Tai as a person
- **Content authoring:** Git + Markdown/MDX
- **Theme:** Dark only
- **Core rule:** **HTML to read; the terminal is the frame, never the source of truth.**

This document is the source of truth for the product concept, UX, information
architecture, and technical constraints.

Version 1 of this document specified *TÀI — A Personal Gravity System*, an
interactive ASCII/WebGL celestial universe. That build was removed in the
terminal rewrite; [ADR-0005](docs/adr/0005-terminal-identity.md) records the
decision, and the universe survives in git history at `ef8dcd4`.

---

## 2. Product Vision

### 2.1 Concept

**TONTIDE1** is a personal site that presents itself as a terminal session.
The home page is a fastfetch-style panel: an ASCII wordmark, a host line, and
labelled identity rows. Every content page reads like the output of one
command, with the prompt line stating where you are and what produced the page.

The interface is visual: nothing on the site executes a command. The terminal
is a lens on ordinary, crawlable HTML.

> The terminal is the map; the pages are the territory.

### 2.2 Core hierarchy

```text
TONTIDE1 / identity            ("tontide1@github")
    ↓
Domain                         (one directory per domain: ~/projects …)
    ↓
Content object                 (one file per entry)
    ↓
Readable page                  (the output of `cat`)
```

### 2.3 Product principles

1. **Reading is the product.** The terminal frame must never compete with the text.
2. **Navigation is real HTML.** Every route is reachable with JavaScript disabled.
3. **The site never executes commands.** Input exists only in the search dialog.
4. **One command per page.** The prompt states cwd and the command the page is "the output of".
5. **Flat and quiet.** One accent color, 1px borders, no shadows, no glow.
6. **Motion is brief and optional.** Reveal and cursor animations are disabled under reduced motion.
7. **Every page is reachable three ways:** URL, keyboard, search.
8. **No framework runtime.** No React, no 3D engine, no store library.

### 2.4 Desired character

The site should feel:

- personal
- technical
- calm
- precise
- readable

Avoid:

- neon cyberpunk
- glowing-green hacker cosplay
- glitch effects and scanlines
- fake boot sequences
- blur/glass chrome for its own sake

---

## 3. Information Architecture

### 3.1 Primary domains

```text
TONTIDE1
├── ABOUT      (identity, skills, contact)
├── LIFE
├── THOUGHTS
├── NOTES
├── PROJECTS
└── RESEARCH
```

No additional top-level directory is added during MVP.

### 3.2 Domain definitions

#### ABOUT

Identity page. Bio, skills, contact links. The analog of `tontide1@github`
itself; not a normal content category.

#### LIFE

Public personal experiences only: milestones, workspace, journey.
Frame: an editorial timeline.

#### THOUGHTS

Reflections, opinions, technology perspectives, personal essays.
Frame: long-form writing.

#### NOTES

Technical notes, tooling, debugging logs, concise implementation references.
Frame: compact knowledge fragments.

#### PROJECTS

Concrete systems with related artifacts: repositories, demos, architecture,
experiments, related notes.

#### RESEARCH

Structured investigation: question → hypothesis → experiment → result →
conclusion. More rigorous than THOUGHTS or NOTES.

---

## 4. Terminal Interface

### 4.1 Home — the fastfetch panel

The home page is a panel in the visual language of fastfetch/neofetch:

```text
tontide1@github ───────────────────────────

OS:                     Omarchy, Hackintosh, Windows
Host:                   Ho Chi Minh City, Vietnam
Kernel:                 Software Developer & AI Engineer
IDE:                    Zed
Coding Agents:          pi, opencode, omp, Claude Code
Languages.Programming:  Python, C, TypeScript
Languages.Real:         Vietnamese, English
Hobbies:                Cars, food, walks

– Contact
Email:                  phantantaiforwork@gmail.com
LinkedIn:               in/tontide1
GitHub:                 github.com/tontide1

– Directories
~/about  ~/life  ~/notes  ~/projects  ~/research  ~/thoughts
```

Rules:

- Rows are owner-supplied data (`src/lib/profile.ts`). Never invent a row.
- The ASCII wordmark is decorative and `aria-hidden`; the page carries a real `h1`.
- The Directories listing is real links in HTML — it is the navigation.
- A missing value means the row is removed, not filled with a placeholder.

### 4.2 Content frame

Every content page is built from the same frame:

```text
tontide1@github:~/projects $ ls ▊        [Search /]      GitHub
─────────────────────────────────────────────────────────────
~/about          │  Engineered Systems & Projects
~/life           │  What Tai builds: concrete systems, …
~/notes          │
~/projects  ←    │  – list / article body
~/research       │
~/thoughts       │
─────────────────────────────────────────────────────────────
[/] search · [esc] close                                    cd ~
```

- **Prompt line** — `{handle}:{cwd} $ {command}`, with a blinking block cursor.
- **Sticky header** — brand, search trigger, GitHub link.
- **Sidebar tree** — the six directories; the current one is marked and bold.
- **Mobile** — the sidebar collapses into a `<details>` tree under the header.
- **Footer** — shortcut hints and `cd ~` (the way home).
- **Back navigation** — `cd ~` replaces v1's `RETURN TO ORBIT`.

### 4.3 Search

- Opens with `/` (when not typing) or `Ctrl/⌘ + K`, from the header trigger, or
  any `[data-search-open]` element.
- Closes with `Escape`, the `esc` button, or a form submit.
- Index: every directory plus every published entry (title, summary, domain,
  tags, meta, date), serialised into the page as JSON.
- Filtering is client-side, all query terms must match, capped at 8 hits.
- `Enter` follows the first hit shown; ranking is index order, not relevance.
- Implemented as a native `<dialog>` plus one inline script. No framework.

### 4.4 Interaction budget

The site is **semi-interactive**: it looks alive, it is not a shell.

- Rows reveal with a short stagger on first paint (CSS only, 45 ms steps).
- The block cursor blinks.
- Nothing responds to typing outside the search dialog; there is no command
  parser, no history, no tab completion.

Reduced motion keeps everything visible and still (see §8.3).

---

## 5. Content Model

Content is authored through Git + Markdown/MDX under `src/content/`.

### 5.1 Repository structure

```text
src/content/
├── life/
├── thoughts/
├── notes/
├── projects/
└── research/
```

### 5.2 Common frontmatter

```yaml
title: ""
date: "YYYY-MM-DD"
updated: "YYYY-MM-DD"        # optional
tags: []
summary: ""
draft: false
```

### 5.3 Project metadata

```yaml
stack: []
status: "active | archived | completed"
github: ""                    # optional
demo: ""                      # optional
```

### 5.4 Research metadata

```yaml
status: "idea | active | completed | archived"
research_question: ""
hypothesis: ""
```

### 5.5 Notes metadata

```yaml
category: "GENERAL"
```

### 5.6 Relationships

Explicit relationships are declared in frontmatter and rendered as a `related`
section on the page:

```yaml
related:
  - /projects/legal-rag
  - /notes/bm25-vs-dense
```

### 5.7 Drafts

Every collection read filters `data.draft`. Drafts are never built, never
listed, never indexed, never fed. The `source` suite enforces the filter at
every call site.

---

## 6. URL Architecture

URLs are independent of any presentation state.

```text
/
/about
/life            /life/<slug>
/thoughts        /thoughts/<slug>
/notes           /notes/<slug>
/projects        /projects/<slug>
/research        /research/<slug>
/rss.xml
```

Requirements:

- direct deep links work
- refresh preserves content
- canonical URLs are stable and trailing-slash normalised
- URLs remain meaningful without JavaScript
- no page-state parameter exists

---

## 7. Visual Design System

### 7.1 Theme: dark only

The palette follows the OpenCode website (anomalyco/opencode,
`services/www`, MIT). Tokens live in `src/styles/global.css`:

```text
Background      #090909
Foreground      #efefef
Muted           #929292
Border          #303030
Surface         #101010
Surface-hover   #181818
Link / accent   #4d8eff
Secondary blue  #73a7ff     (host line, wordmark)
Green           #70c997     (cwd, prompt accents)
Amber           #e0af68     (row labels, statuses, badges)
Red             #e67c7c     (404 / error line)
```

### 7.2 Typography

- **OpenTUI Mono**, self-hosted (`public/fonts/`, four faces: regular, bold,
  italic, bold-italic). Sourced from the OpenCode website.
- Fallback stack: `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`.
- Base size 14px, line-height 1.8. All-caps micro-labels at 12px with 0.04em
  letter-spacing.
- No external font request is made on any page.

### 7.3 Layout rules

- Flat: 1px `#303030` borders, no border radius, no box shadows.
- fastfetch rows align values right on desktop and stack on narrow screens.
- Article typography is adapted from the OpenCode docs prose rules
  (`.term-article`): 20px h2 with 3rem top margin, inline code with a 10%
  currentColor background, bordered `pre` blocks, 2px blockquote rule, and
  underlined table rows.
- Cards are flat bordered boxes; hover raises the surface, never a shadow.

### 7.4 Avoid clichés

Do not default to:

- neon cyberpunk everywhere
- glowing green hacker terminal
- constant glitch
- excessive scanlines
- heavy RGB aberration
- generic AI-brain imagery
- unnecessary chrome / glass effects

Target aesthetic:

> **quiet computational + terminal-native + editorial + readable**

---

## 8. Accessibility

Accessibility is a core requirement, and the terminal frame makes it cheaper:
there is no canvas to duplicate.

### 8.1 HTML-first

- Every directory is a real `<a href>` in the page HTML — sidebar, mobile tree,
  home panel, and 404 all carry the complete set.
- No page needs JavaScript to navigate or read.
- The decorative wordmark is `aria-hidden`; each page has exactly one real `h1`.

### 8.2 Keyboard

Minimum:

- `Tab` → move focus
- `Enter` → activate
- `Escape` → close the search dialog
- `/` → open search
- `Ctrl/⌘ + K` → open search

Focus is always visible: a global `:focus-visible` ring (2px `#4d8eff`,
2px offset) is never suppressed. The `keyboard` suite walks the tab ring and
fails on any focusable control without an indicator.

Shortcuts never fire while a text field is focused.

### 8.3 Reduced motion

Respect `prefers-reduced-motion: reduce`:

- the row reveal animation is not applied (rows are visible immediately)
- the cursor stops blinking
- no transition or smooth scrolling

### 8.4 Contrast

Body text (`#efefef` on `#090909`) and labels (`#e0af68`) stay well above
WCAG AA. The frame's dim text (`#929292`) is metadata only, never the sole
carrier of information.

---

## 9. Performance and Progressive Enhancement

This is a personal website, not an application.

The shipped site contains **no JavaScript bundle**:

- content pages ship no external script at all
- the only script is the inline search dialog (a few KB per page)
- fonts are self-hosted and preloaded; no third-party request is made
- there is no WebGL, no island hydration, no store library

Target behavior:

```text
Any browser      → full experience (HTML + CSS + inline search)
JavaScript off   → everything except the search dialog
```

---

## 10. SEO

Important information must exist in HTML.

Requirements:

- semantic headings
- crawlable links on every page
- canonical URLs
- per-page metadata
- Open Graph and Twitter metadata
- RSS feed for content
- sitemap covering every page
- direct indexable article/project/research pages
- a useful `noindex` 404 with the full directory tree

The `seo` suite holds every built page to this contract.

---

## 11. Technical Architecture

Shipped stack:

```text
Astro
 ├── Markdown / MDX (content collections, Zod schemas)
 ├── Tailwind CSS v4 (tokens via @theme, component classes in a layer)
 └── One inline vanilla-JS script (search dialog)
```

No runtime framework. No React, no Three.js, no nanostores.

### 11.1 Data flow

```text
Markdown / MDX
      ↓
Content collection
      ↓
Astro page markup  ──→  HTML (canonical, crawlable)
      ↓
Search index (JSON, serialised into each page)
```

Content stays independent of presentation: the same collection feeds pages,
search, RSS, and sitemap.

### 11.2 Component structure

```text
src/
├── assets/
│   └── banner.txt                 # ASCII wordmark (imported ?raw)
├── components/terminal/
│   ├── CommandLine.astro          # prompt line
│   ├── SearchDialog.astro         # <dialog> + index + inline script
│   └── SearchTrigger.astro
├── content/                       # one directory per domain
├── layouts/
│   ├── Layout.astro               # head, SEO, fonts
│   └── ContentLayout.astro        # header + tree + article frame
├── lib/
│   ├── domains.ts                 # the six directories
│   ├── profile.ts                 # fastfetch rows (owner data)
│   ├── search.ts                  # SearchItem + index builder
│   └── seo.ts                     # JSON-LD builders
├── pages/
└── styles/global.css
```

---

## 12. MVP Scope

### Must have

```text
[x] fastfetch home panel
[x] 5 primary domains + about
[x] command-framed content pages
[x] directory-tree navigation in HTML
[x] search (/ and Ctrl+K)
[x] Markdown/MDX authoring with typed frontmatter
[x] related-content links
[x] direct URLs
[x] keyboard + focus visibility
[x] reduced-motion support
[x] zero-JS content pages
[x] SEO basics (canonical, OG, JSON-LD, sitemap, RSS)
[x] verification suites (source, seo, layout, terminal, keyboard)
```

### Explicitly out of MVP

```text
[ ] a working shell / command execution
[ ] a light theme
[ ] CMS / admin dashboard
[ ] comments
[ ] real-time anything
[ ] multiplayer / social features
[ ] heavy procedural generation
[ ] elaborate Easter eggs
[ ] a 3D universe
```

These may be considered later without changing the core information
architecture.

---

## 13. Non-Goals

The project is **not**:

- a terminal emulator — it never executes a command, and its only text input is search
- a game
- a WebGL benchmark
- a visual-only art piece
- a generic portfolio template
- a full CMS
- a social network

The site must remain useful as a personal website with JavaScript disabled.

---

## 14. Acceptance Criteria

### Product

- A first-time visitor can see who runs the site from the home panel alone.
- A visitor can reach every directory without reading documentation.
- A visitor can read any entry normally, and return home with `cd ~`.

### Terminal

- Every page states its cwd and its command.
- The wordmark renders identically on every load (no randomness).
- Search finds directories and entries.
- No interaction executes anything.

### Content

- Every published item has a stable URL.
- Content is authored through Git + Markdown/MDX.
- Related content can be linked explicitly.

### Accessibility

- Navigation is real HTML on every page.
- The site is usable without JavaScript (except search).
- Keyboard navigation works and focus is always visible.
- Reduced motion is honoured.

### Performance

- No JavaScript bundle is emitted.
- No third-party request is made.
- Fonts are preloaded and self-hosted.

### SEO

- Navigation and content are crawlable HTML.
- Deep links work directly and carry canonical URLs.
- Metadata, sitemap, and RSS pass the `seo` suite.

---

## 15. Future Direction

Possible extensions that fit the current architecture:

- richer search ranking (today: index order)
- tag/directory filtering views
- a `man`-style page for how the site works
- optional keyboard navigation for directory jumps (e.g. `g p`)
- experimental colour themes (still dark-first)

Future features must preserve the core rule:

> **The frame explains and exposes the content; it must not compete with it.**

---

## 16. Final Product Definition

```text
$ fastfetch

tontide1@github ───────────────────────────
OS:                     Omarchy, Hackintosh, Windows
Host:                   Ho Chi Minh City, Vietnam
Kernel:                 Software Developer & AI Engineer

– Directories
~/about  ~/life  ~/notes  ~/projects  ~/research  ~/thoughts
```

The user experience is:

```text
                THE PANEL
                    ↓
             pick a directory
                    ↓
            read the entries
                    ↓
              `cat` a page
                    ↓
               read normally
                    ↓
                  cd ~
```

The product principle is:

> **HTML to read. A terminal to frame it. One command per page.**

# TÀI — Personal Gravity System

## 1. Document Status

- **Version:** 1.1
- **Status:** Implementation-ready MVP specification
- **Product:** Personal website + portfolio + blog + research archive
- **Primary experience:** Interactive ASCII/WebGL gravity universe
- **Primary audience:** Developers, technical readers, recruiters
- **Secondary audience:** Visitors interested in Tài as a person
- **Content authoring:** Git + Markdown/MDX
- **Theme:** Dark only for v1
- **Core rule:** **WebGL to explore; HTML/MDX to read.**

This document is the source of truth for the product concept, UX, information architecture, and technical constraints.

---

## 2. Product Vision

### 2.1 Concept

**TÀI — A Personal Gravity System** is a personal digital universe where **Tài is the stable center** and the public parts of his life, thoughts, notes, projects, and research orbit around him.

The website is not a conventional portfolio with a navbar. The primary information architecture is represented as a deterministic celestial system rendered with ASCII/WebGL.

> The universe is the map of Tài's identity and work.

### 2.2 Core hierarchy

```text
                         ✦ THOUGHTS
                       ·    ·    ·

                🌍 LIFE

                         ☀
                        TÀI

            🪐 PROJECTS       ✦ RESEARCH

                       · NOTES
```

Semantic hierarchy:

```text
TÀI / Identity
    ↓
Domain / Celestial system
    ↓
Content object
    ↓
Readable page
```

### 2.3 Product principles

1. **Gravity is information architecture, not decoration.**
2. **TÀI is the stable center.**
3. **Each domain has its own visual grammar.**
4. **Semantic relationships may affect spatial relationships.**
5. **Visual size must not become a ranking system.**
6. **Exploration may be novel; reading must remain conventional.**
7. **The site must remain usable without WebGL.**
8. **The visual system must stay calm, sparse, and intentional.**

### 2.4 Desired character

The site should feel:

- personal
- technical
- curious
- calm
- experimental
- slightly mysterious
- computational
- readable

Avoid making it feel like a generic cyberpunk dashboard or a game.

---

## 3. Information Architecture

### 3.1 Primary domains

Version 1 has exactly five primary domains:

```text
TÀI
├── LIFE
├── THOUGHTS
├── NOTES
├── PROJECTS
└── RESEARCH
```

No additional top-level domain should be added during MVP without a strong information-architecture reason.

### 3.2 Domain definitions

#### TÀI

Identity / About.

May contain:

- short bio
- professional identity
- education
- skills / roles
- CV / resume
- selected links
- contact
- optional portrait

`TÀI` is the central identity, not a normal content category.

#### LIFE

Public personal experiences only.

Examples:

- experiences
- travel
- hobbies
- workspace
- public internship experiences
- personal milestones

Private or sensitive personal information is excluded.

Information model:

```text
LIFE → editorial / timeline archive
```

#### THOUGHTS

What Tài thinks.

Examples:

- reflections
- opinions
- career thoughts
- technology perspectives
- personal essays

Information model:

```text
THOUGHTS → constellation / network of ideas
```

#### NOTES

What Tài learns or records.

Examples:

- technical notes
- Linux / tooling notes
- debugging notes
- small implementation references
- concise lessons learned

Information model:

```text
NOTES → compact knowledge fragments
```

#### PROJECTS

What Tài builds.

Examples:

- DriveBook
- Legal-RAG
- experiments
- open-source work
- personal applications
- prototypes

Projects may link to repositories, demos, architecture, experiments, and related notes.

Information model:

```text
PROJECTS → concrete systems with related artifacts
```

#### RESEARCH

What Tài investigates.

Examples:

- research questions
- hypotheses
- experiments
- benchmarks
- papers
- datasets
- research pipelines
- conclusions

Information model:

```text
RESEARCH → question → hypothesis → experiment → result → conclusion
```

Research is more structured and rigorous than `THOUGHTS` or `NOTES`.

---

## 4. Gravity Language

### 4.1 Semantic mapping

| Visual | Meaning |
|---|---|
| Central core / sun | Tài / identity |
| Planet | Major domain |
| Star | Individual content |
| Asteroid / small object | Small note or supporting content |
| Orbit | Contextual relationship |
| Distance | Semantic relationship, never importance |
| Brightness | Freshness / activity |
| Density | Amount of content |
| Movement | Living / changing system |
| Zoom | Increasing information density |

### 4.2 Visual size is not ranking

Object size must **not** encode:

- quality
- popularity
- importance
- professional seniority
- personal value

Size primarily represents entity type or a deliberate visual role.

### 4.3 Semantic distance

Spatial proximity may be derived from:

- same domain
- shared tags
- explicit `related` links
- strong project ↔ note relationships
- shared topics

Unrelated content may be farther apart.

Distance must never communicate that one domain is more valuable than another.

### 4.4 Brightness

Brightness may indicate activity/freshness:

```text
new / active       → brighter
older              → dimmer
archived           → dimmer
```

Archived content remains fully accessible.

### 4.5 Stable center

`TÀI` is a stable gravitational anchor.

The center does not drift because of random physics.

### 4.6 Deterministic layout

Core positioning must be deterministic and reproducible.

Use:

- predefined orbital planes
- deterministic seeded positions
- semantic placement rules
- light procedural variation

Do **not** depend on an uncontrolled physics simulation for information architecture.

### 4.7 Semantic gravity

A content relationship may influence spatial proximity.

Conceptual model:

```text
relationship strength
    = same domain
    + shared tags
    + explicit links
    + project/content association
```

The exact scoring algorithm is implementation detail and should remain simple in MVP.

---

## 5. Domain-Specific Visual Grammar

Domains must not be identical spheres with different labels.

### LIFE

Visual character:

- organic planetary body
- subtle atmosphere
- slower motion
- softer visual density

### THOUGHTS

Visual character:

- constellation
- connected stars
- sparse
- exploratory

### NOTES

Visual character:

- small scattered objects
- asteroid-field feeling
- compact
- relatively high density

### PROJECTS

Visual character:

- larger structured celestial bodies
- solid geometry
- related satellite objects

### RESEARCH

Visual character:

- clustered / connected systems
- binary-like or multi-body composition
- analytical / technical feeling

The visual grammar should remain subtle. The user should discover meaning rather than seeing five obvious UI widgets.

---

## 6. Core UX

### 6.1 Primary journey

```text
Universe
   ↓
Domain
   ↓
Content object
   ↓
Readable page
```

Reverse journey:

```text
Readable page
   ↓
RETURN TO ORBIT
   ↓
Universe
```

### 6.2 Homepage

The homepage is the Gravity universe.

It contains:

- TÀI central core
- five primary domains
- subtle orbital motion
- sparse ASCII star field
- domain-specific objects
- lightweight HUD
- Search
- Map
- accessible HTML navigation

No mandatory splash or `ENTER UNIVERSE` screen.

### 6.3 Interaction level

Target: **exploration, not gaming**.

Desktop:

```text
drag             → rotate
scroll           → zoom
hover            → inspect
click            → enter
```

Do not require:

- WASD
- character control
- collision
- game mechanics

### 6.4 Object inspection

Hover/focus should expose concise metadata.

Example:

```text
┌───────────────────────┐
│ LIFE                  │
│ 14 entries            │
│ Last update           │
│ Sep 24, 2026          │
└───────────────────────┘
```

The user should understand what an object represents before entering it.

### 6.5 Domain transition

Expected transition:

```text
select object
    ↓
object highlights
    ↓
camera moves toward object
    ↓
ASCII / geometry expands
    ↓
visual transition
    ↓
domain/content page
```

The transition may be skipped or simplified under reduced-motion settings.

### 6.6 Content transition

Example:

```text
Universe
   ↓
PROJECTS
   ↓
Legal-RAG
   ↓
/projects/legal-rag
```

A content page should offer a clear:

```text
← RETURN TO ORBIT
```

### 6.7 Mobile

Mobile is a simplified representation, not a desktop simulation.

Preferred behavior:

- simplified orbital composition
- tap to select
- optional swipe interaction
- lower particle density
- lower render resolution
- obvious Search / Map access

The user must never need complex gestures to read content.

---

## 7. Progressive Disclosure / LOD

The system must scale with content volume.

### Level 0 — Universe

Shows major domains only.

```text
               ☀
      🌍              🪐
            ✦
```

### Level 1 — Domain

Shows clusters, topics, or selected content.

```text
             THOUGHTS

        ✦ AI
                 ✦ Linux

  ✦ Career             ✦ Life
```

### Level 2 — Content

Shows individual articles, projects, notes, or research objects.

### Scaling rule

Do not render hundreds/thousands of individual content objects in the initial universe.

Use:

```text
Universe
  → domain-level objects
  → clusters / selected objects
  → individual content
```

The information remains available through Search, Map, and direct URLs.

---

## 8. Search and Map

### 8.1 Search

`/` focuses Search.

Search fields:

- title
- summary
- tags
- domain
- selected metadata

Example:

```text
PROJECT
Legal-RAG

RESEARCH
Hybrid Retrieval for Vietnamese Legal QA

NOTE
BM25 vs Dense Retrieval
```

Search may highlight matching objects in the universe.

### 8.2 Map

Map is a 2D orientation layer.

```text
                    TÀI
                     ☀
          ┌──────────┼──────────┐
          ↓          ↓          ↓
        LIFE      PROJECTS    THOUGHTS
          ↓          ↓          ↓
        posts      projects    posts
```

Map is important for:

- orientation
- mobile
- accessibility
- users who prefer explicit navigation

---

## 9. Content Model

Content is authored through Git + Markdown/MDX.

### 9.1 Repository structure

```text
content/
├── life/
├── thoughts/
├── notes/
├── projects/
└── research/
```

### 9.2 Common frontmatter

```yaml
title: ""
slug: ""
date: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
domain: "life | thoughts | notes | projects | research"
tags: []
summary: ""
featured: false
draft: false
```

### 9.3 Project metadata

```yaml
stack: []
status: "active | archived | completed"
github: ""
demo: ""
```

### 9.4 Research metadata

```yaml
status: "idea | active | completed | archived"
research_question: ""
hypothesis: ""
```

### 9.5 Relationships

Explicit relationships may be declared:

```yaml
related:
  - /projects/legal-rag
  - /notes/bm25
```

These relationships may influence the visual layout and related-content sections.

---

## 10. URL Architecture

Web URLs are independent of WebGL scene state.

```text
/
/life
/life/<slug>
/thoughts
/thoughts/<slug>
/notes
/notes/<slug>
/projects
/projects/<slug>
/research
/research/<slug>
```

Requirements:

- direct deep links work
- refresh preserves content
- canonical URLs are stable
- visual scene state is not part of the canonical URL
- URLs remain meaningful without JavaScript

---

## 11. Visual Design System

### 11.1 Theme

Dark only for v1.

Suggested starting palette:

```text
Background   #050505
Primary      #E8E8E8
Secondary    #777777
Muted        #3A3A3A
Accent       #6EA8FE
```

Exact values may change during implementation.

### 11.2 Typography

Preferred direction:

- JetBrains Mono
- IBM Plex Mono
- Space Mono
- Geist Mono

Use 1–2 font families maximum.

Monospace should define the identity, while long-form body text remains comfortable to read.

### 11.3 ASCII identity

ASCII is the visual identity; WebGL is the rendering technology.

Possible luminance mapping:

```text
Bright  → @ # █
Medium  → % * +
Dark    → . ·
```

The implementation should favor GPU-side or low-resolution rendering over thousands of DOM text nodes.

### 11.4 Avoid clichés

Do not default to:

- neon cyberpunk everywhere
- glowing green hacker terminal
- constant glitch
- excessive scanlines
- heavy RGB aberration
- generic AI-brain imagery
- unnecessary chrome / glass effects

Target aesthetic:

> **quiet computational + astronomical + terminal-inspired + experimental**

---

## 12. Content Page Design

The universe is the **discovery layer**. Content pages are the **consumption layer**.

### 12.1 Principles

Content pages prioritize:

1. readability
2. information hierarchy
3. navigation
4. technical depth
5. personality

### 12.2 Shared visual DNA

Keep subtle elements such as:

- monospace headings
- ASCII separators
- small metadata
- technical labels
- subtle visual effects
- `RETURN TO ORBIT`

Do not make every article a full-screen WebGL experience.

### 12.3 Project pages

Support:

- overview
- motivation
- architecture
- implementation
- experiments
- results
- lessons learned
- repository
- demo
- related content

### 12.4 Research pages

Support:

- research question
- context
- hypothesis
- methodology
- experiments
- results
- interpretation
- limitations
- references
- related work

### 12.5 LIFE / THOUGHTS / NOTES

`LIFE` → editorial / timeline-friendly.

`THOUGHTS` → long-form personal writing.

`NOTES` → concise, technical, scan-friendly.

---

## 13. Accessibility

Accessibility is a core requirement.

### 13.1 HTML fallback

Primary navigation must exist as real HTML outside the Canvas/WebGL layer.

At minimum:

- Tài / About
- Life
- Thoughts
- Notes
- Projects
- Research
- Search
- Map
- content links

If WebGL fails, the site remains navigable and readable.

### 13.2 Keyboard

Minimum:

- Tab → focus
- Enter → activate
- Escape → close overlay / return context
- `/` → focus Search

Optional advanced shortcuts:

```text
H → Home / Universe
P → Projects
R → Research
B → Life / blog-like content
N → Notes
/ → Search
M → Map
```

Shortcuts must never interfere with normal text entry.

### 13.3 Reduced motion

Respect:

```text
prefers-reduced-motion: reduce
```

Disable or simplify:

- orbital animation
- camera fly-through
- heavy particles
- dramatic transitions

All content remains accessible.

### 13.4 Contrast

ASCII effects must not reduce body-text readability.

---

## 14. Performance and Progressive Enhancement

This is a personal website, not a game.

### Requirements

- render the HTML shell before heavy WebGL initialization
- progressively enhance with WebGL
- lazy-load heavy visual modules
- avoid unnecessary textures
- keep geometry simple
- adapt particle count and render resolution
- avoid persistent heavy GPU usage on content pages

Target behavior:

```text
High capability
→ full ASCII/WebGL

Medium capability
→ reduced particles / resolution

Low capability / mobile
→ simplified scene

WebGL unavailable
→ HTML/CSS experience
```

The website must never depend on WebGL availability.

---

## 15. SEO

Important information must exist in HTML.

Requirements:

- semantic headings
- crawlable links
- canonical URLs
- metadata per content page
- Open Graph metadata
- RSS feed for content where appropriate
- sitemap
- direct indexable article/project/research pages

Canvas/WebGL must never be the only representation of important navigation or content.

---

## 16. Technical Architecture

Recommended v1 stack:

```text
Astro
 ├── Markdown / MDX
 ├── React islands
 ├── React Three Fiber
 ├── Three.js
 └── GLSL
```

Potential supporting tools:

- content collections / schema validation
- Shiki or equivalent for code highlighting
- MiniSearch / Fuse.js or equivalent for local search

These are implementation choices, not product requirements.

### 16.1 Data flow

```text
Markdown / MDX
      ↓
Content collection
      ↓
Normalized content model
      ↓
Gravity layout model
      ↓
WebGL renderer
```

Semantic content must remain independent from the renderer.

This same model should support:

- WebGL
- Map
- Search
- HTML fallback
- related-content sections
- testing

### 16.2 Suggested component structure

```text
src/
├── components/
│   ├── universe/
│   │   ├── UniverseCanvas
│   │   ├── GravitySystem
│   │   ├── CelestialBody
│   │   ├── Orbit
│   │   ├── StarField
│   │   ├── AsciiRenderer
│   │   └── HUD
│   ├── navigation/
│   │   ├── Search
│   │   ├── Map
│   │   └── ReturnToOrbit
│   └── content/
│       ├── ArticleLayout
│       ├── ProjectLayout
│       ├── ResearchLayout
│       └── LifeLayout
├── content/
│   ├── life/
│   ├── thoughts/
│   ├── notes/
│   ├── projects/
│   └── research/
├── layouts/
└── pages/
```

Structure may change without changing the product requirements.

### 16.3 ASCII rendering strategy

Prefer:

```text
3D scene
   ↓
low-resolution render target
   ↓
luminance / density sampling
   ↓
character mapping
   ↓
ASCII visual
```

Do not build the main visual using thousands of DOM text nodes.

---

## 17. Prototype Baseline

The current prototype validates the core concept and should be treated as the visual starting point, not as a final implementation.

Prototype already validates:

- TÀI at the center
- five domains
- orbit-like placement
- deterministic composition
- HUD / search affordance
- HTML fallback navigation
- content/object counts
- dark technical aesthetic

### Prototype gaps to resolve

1. **Domain grammar is not distinct enough yet.**
   The domains currently read too much like a generic graph. Implement distinct LIFE / THOUGHTS / NOTES / PROJECTS / RESEARCH visual forms.

2. **ASCII identity is still weak.**
   Celestial bodies should become visibly ASCII/dithered rather than mostly circles and labels.

3. **Semantic links must be meaningful.**
   Lines should represent actual relationships rather than decorative graph edges.

4. **Domain → content navigation must be demonstrated.**
   The next validation target is a full vertical slice:

```text
Universe
   ↓
PROJECTS
   ↓
Legal-RAG
   ↓
Project page
   ↓
RETURN TO ORBIT
```

5. **Debug information should be removable.**
   Development overlays such as node counts, link counts, and `spike` labels belong in a debug mode, not the normal production UI.

6. **HTML fallback should remain functional but visually quiet.**
   It is a navigation/accessibility layer, not a debug message.

---

## 18. MVP Scope

### Must have

```text
[ ] Gravity universe
[ ] TÀI central identity
[ ] 5 primary domains
[ ] deterministic layout
[ ] domain-specific visual grammar
[ ] hover / focus metadata
[ ] click-to-enter interaction
[ ] domain → content navigation
[ ] content pages
[ ] return-to-orbit flow
[ ] Search
[ ] Map
[ ] Markdown/MDX authoring
[ ] semantic relationships
[ ] HTML fallback
[ ] mobile adaptation
[ ] reduced-motion support
[ ] direct URLs
[ ] SEO basics
[ ] adaptive WebGL quality
```

### Explicitly out of MVP

```text
[ ] real-time physics simulation
[ ] character / game mechanics
[ ] CMS / admin dashboard
[ ] comments
[ ] light theme
[ ] complex multiplayer / social features
[ ] large-scale knowledge-graph engine
[ ] heavy procedural generation
[ ] elaborate Easter eggs
```

These may be considered later without changing the core information architecture.

---

## 19. Non-Goals

The project is **not** intended to be:

- a game
- a WebGL benchmark
- a visual-only art piece
- a generic portfolio template
- a terminal emulator
- a full CMS
- a social network

The website must remain useful as a personal website even when the interactive layer is unavailable.

---

## 20. Acceptance Criteria

### Product

- A first-time visitor can understand that the center is Tài and the surrounding objects are parts of his personal/professional world.
- A visitor can reach Projects, Research, Life, Thoughts, and Notes without learning a game mechanic.
- A visitor can enter content and read it normally.
- A visitor can return from content to the Gravity universe.

### Gravity system

- TÀI remains a stable center.
- Layout is deterministic.
- Domains have distinct visual grammars.
- Semantic relationships influence proximity where useful.
- Visual size does not rank content.

### Content

- Every published content item has a stable URL.
- Content can be authored through Git + Markdown/MDX.
- Related content can be linked explicitly.

### Accessibility

- Major navigation exists as HTML.
- Site remains usable without WebGL.
- Keyboard navigation works.
- Reduced-motion mode works.

### Performance

- HTML content does not wait for heavy WebGL initialization.
- WebGL quality adapts to device capability.
- Content pages do not continuously run expensive visual effects unnecessarily.

### SEO

- Important navigation and content exist in crawlable HTML.
- Deep links work directly.
- Content pages have metadata and canonical URLs.

---

## 21. Implementation Order

Build in vertical slices rather than implementing the entire visual system first.

### Slice 1 — Core universe

```text
TÀI
+ 5 domains
+ deterministic layout
+ basic interactions
```

### Slice 2 — Domain transition

```text
Universe
→ Projects
→ domain scene
```

### Slice 3 — Real content

```text
Projects
→ Legal-RAG
→ project page
→ Return to Orbit
```

### Slice 4 — Domain visual grammar

Implement distinct rendering for:

- Life
- Thoughts
- Notes
- Projects
- Research

### Slice 5 — Search + Map

### Slice 6 — ASCII renderer

### Slice 7 — Mobile + accessibility

### Slice 8 — Performance + SEO + polish

Do not over-polish the homepage before the `Universe → Domain → Content → Return` loop is proven.

---

## 22. Future Direction

Possible future extensions:

- richer semantic knowledge graph
- deeper content clustering
- dynamic constellation generation
- content freshness visualization
- timeline overlays
- CLI-style discovery mode
- optional Easter eggs
- richer project/research satellites
- experimental WebGPU renderer

Future features must preserve the core rule:

> **The visual system explains and exposes the content; it must not compete with the content.**

---

## 23. Final Product Definition

The website can be summarized as:

```text
                         ✦ THOUGHTS
                       ·    ·    ·

                🌍 LIFE

                         ☀
                        TÀI
                    /     |     \
                   /      |      \
          🪐 PROJECTS     ·      ✦ RESEARCH
             / |  \                     \
            ✦  ✦   ✦                     ✦

                       · NOTES
```

The user experience is:

```text
                PERSONAL UNIVERSE
                       ↓
                Explore the system
                       ↓
                  Enter a domain
                       ↓
                 Discover content
                       ↓
                  Read normally
                       ↓
                Return to orbit
```

The product principle is:

> **WebGL to explore. HTML to read. Gravity to organize. Tài at the center.**

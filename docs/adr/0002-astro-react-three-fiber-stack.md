# Migrate from Hugo to Astro with React Three Fiber

## Context

The previous site architecture ran on Hugo with `hugo-theme-stack` as a traditional static portfolio/blog. The site vision evolved into **TÀI — A Personal Gravity System**, an interactive ASCII/WebGL celestial universe operating as the discovery layer while preserving readable HTML/MDX as the consumption layer.

Embedding advanced WebGL pipelines, custom GLSL post-processing shaders, camera state transitions, and interactive HUDs directly within Hugo templates poses significant tooling bottlenecks (lacking modern JS/TS bundling, component island hydration, and fine-grained React ecosystem integration).

## Decision

Migrate the entire repository framework to:
- **Astro**: Core static site generator and content-first orchestrator. Provides zero-JS server rendering by default for readable content pages, HTML fallbacks, and fast first paint.
- **React Three Fiber (R3F) & Three.js**: Declarative 3D scene graph running as an Astro client island (`client:only="react"` or `client:idle`) strictly for the discovery layer.
- **Custom GLSL**: Shader-based ASCII luminance mapping and post-processing.
- **Content Collections (MDX)**: Typed schema validation for the 5 primary domains (`life`, `thoughts`, `notes`, `projects`, `research`).
- **English-first**: English remains the primary default language across root URLs.

## Consequences

- Hugo-specific templates (`layouts/`, `config/`, Hugo modules) will be removed or replaced by Astro project structure.
- Content will follow Astro's `src/content/` collections with Zod schema enforcement.
- Fast content reading and crawlable SEO remain intact via Astro's server-rendered HTML shell, while the WebGL universe is progressively enhanced.

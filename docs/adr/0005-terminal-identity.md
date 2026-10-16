# Terminal identity: the fastfetch panel replaces the gravity universe

## Context

ADR-0002 built the site as **TÀI — A Personal Gravity System**: an interactive
ASCII/WebGL celestial universe (React Three Fiber plus a custom GLSL
post-processing pipeline, ADR-0003) as the discovery layer, with HTML/MDX as
the consumption layer.

The owner has since chosen a different identity. The site now presents itself
as a **terminal session**: a fastfetch-style panel of labelled rows on the home
page, and a prompt-line-plus-article frame on every content page. The typeface
and palette follow the OpenCode website (`anomalyco/opencode`, `services/www`,
MIT): self-hosted OpenTUI Mono, near-black ground, flat 1px borders, one blue
accent.

The gravity universe was **deleted, not relocated**. The visual language
("orbit", "celestial body", "constellation") went with it. The 3D dependency
tree (`three`, `@react-three/fiber`), the nanostores, the React integration,
and the WebGL-specific verification suites were removed in the same change.
The site now emits **no JavaScript bundle at all**: the only script is a small
inline search dialog.

## Decision

The public interface is a terminal session:

- **Home** is a fastfetch panel: an ASCII wordmark, `tontide1@github`, labelled
  identity rows (owner-supplied in `src/lib/profile.ts`), a Contact section,
  and a Directories listing.
- **Content pages** are framed as the output of a command: a prompt line
  (`tontide1@github:~/projects $ ls`), a sticky header, a directory-tree
  sidebar, and flat article typography.
- **Search** is a native `<dialog>` with an inline script, mounting on every
  page from a small JSON index. No framework runtime.
- The gravity metaphor is retired from the public identity. The five domain
  names and their URLs survive, as do the content model and the
  accessibility/SEO requirements.

This ADR supersedes ADR-0003 in full and the R3F/GLSL parts of ADR-0002; the
Astro, Content Collections, and server-rendered-HTML decisions of ADR-0002
remain in force. The non-goal "a terminal emulator" (spec §13) is kept
verbatim: the terminal is a visual metaphor, and nothing on the site executes
a command.

## Consequences

- **Performance:** no framework JavaScript, no WebGL, no third-party requests;
  fonts are self-hosted and preloaded. The chunk-deferral machinery (loader
  island, preview-server bundle suite) became meaningless and was deleted.
- **Identity:** "Personal Gravity System" no longer names anything public.
  `CONTEXT.md` drops the *Universe* term and gains *Terminal*, *Panel*, and
  *Directory tree*.
- **Tests:** the WebGL suites (`bundle`, `devices`, `drag`, `touch-drag`,
  `environment`) are deleted with their subject. `layout`, `terminal`, and
  `keyboard` now cover the terminal contract, including zero-JS content pages
  and no emitted bundle.
- **Reversal cost:** restoring the universe means reverting this change. It is
  preserved in git history at `ef8dcd4`, and the ADRs that designed it are
  retained, marked superseded.

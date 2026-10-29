## UI rules

- Interface type is Geist Mono for chrome (nav, metadata, labels) and Geist Sans for reading prose and headings, both self-hosted in `public/fonts/`. Playfair Display is allowed in exactly one place — the phone menu labels — and nowhere else. Serif faces are banned from every other surface: they read as novel typesetting.
- Two themes only: paper `#f5f4f1` / ink `#262523`, and ink `#1a1917` / paper `#fff7f0`. No accent colour. Hierarchy comes from opacity and 1px hairlines, not borders, shadows or colour.
- The home screen and the project strip are single-screen (`100dvh`, no document scroll). Every other page reads normally.
- The pond canvas is decoration: it is `aria-hidden`, never carries content, and yields to `prefers-reduced-motion`.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues — use the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical labels with default names: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

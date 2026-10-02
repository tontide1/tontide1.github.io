# English-only for MVP: supersede the bilingual content policy

## Context

ADR-0001 (*Bilingual content policy: English primary, Vietnamese secondary*) declared a bilingual site with English at root URLs and Vietnamese under `/vi/`, including both languages for all site-chrome pages.

The Astro rewrite (ADR-0002) shipped without any `/vi/` route: `src/pages/` contains no Vietnamese counterparts, content collections (`src/content.config.ts`) carry no locale field, and the site is de facto English-only. With 5 MDX entries (one per domain), building dual-language chrome and translation routing now would cost far more than the content it would serve, while contradicting what is actually deployed.

## Decision

The site is **English-only for the MVP**. ADR-0001 is superseded by this ADR.

- No `/vi/` routes, locale fields, or translation links are built.
- Posts are authored in English; no translation obligations attach to them.
- The decision is revisited only when a concrete trigger is met: a sustained Vietnamese-reading audience, or a content volume where translation meaningfully expands reach (roughly >20 posts). At that point a new ADR specifies Astro i18n routing and dual site-chrome.

## Consequences

- Documentation matches the deployed site; readers and agents no longer infer a missing `/vi/` tree.
- Content metadata schemas stay locale-free, so no migration is needed if bilingualism returns.
- Early Vietnamese-only writing would violate this policy — either write in English or reopen the decision first via a new ADR.
- ADR-0001 is retained for history, marked superseded.

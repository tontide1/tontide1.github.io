/**
 * JSON-LD builders for identity and content pages.
 *
 * URLs are passed in absolute form (from `Astro.url`) so this module never has
 * to hardcode the deploy origin that also lives in `astro.config.mjs`.
 */

const IN_LANGUAGE = 'en';

export const PERSON = {
  '@type': 'Person',
  '@id': '#tai',
  name: 'Tai Phan',
  jobTitle: 'Software Developer & AI Engineer',
  description:
    'Software developer and AI engineer based in Ho Chi Minh City, Vietnam, specializing in RAG architectures, high-performance backend systems, and agentic workflows.',
  knowsAbout: [
    'Retrieval-Augmented Generation',
    'Hybrid Retrieval',
    'Agentic Workflows',
    'Backend & Distributed Systems',
  ],
  sameAs: ['https://github.com/tontide1'],
};

export const WEBSITE = {
  '@type': 'WebSite',
  '@id': '#website',
  name: 'TÀI — A Personal Gravity System',
  description:
    'Personal digital universe where Tài is the stable gravitational center and his public life, thoughts, notes, projects, and research orbit around him.',
  inLanguage: IN_LANGUAGE,
  author: PERSON,
};

/** `2026-09-20` → ISO 8601 datetime, which Open Graph and schema.org both expect. */
export function toIsoDate(value?: string): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

interface CollectionPageInput {
  title: string;
  description?: string;
  /** Absolute URL of the page, from `Astro.url`. */
  url: string;
  section: string;
  items: { name: string; url: string }[];
}

/** Domain listing pages, so crawlers see the artifact inventory without canvas. */
export function collectionPage({
  title,
  description,
  url,
  section,
  items,
}: CollectionPageInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    ...(description ? { description } : {}),
    url,
    inLanguage: IN_LANGUAGE,
    isPartOf: WEBSITE,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        url: item.url,
      })),
    },
  };
}

interface ArticleInput {
  title: string;
  description?: string;
  /** Absolute URL of the page, from `Astro.url`. */
  url: string;
  /** Domain label, e.g. 'PROJECTS'. */
  section: string;
  tags?: string[];
  date?: string;
  updated?: string;
}

/**
 * Article node with the author inlined so each page's JSON-LD stays
 * self-contained instead of dangling on a cross-page `@id` reference.
 */
export function article({
  title,
  description,
  url,
  section,
  tags,
  date,
  updated,
}: ArticleInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    ...(description ? { description } : {}),
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: PERSON,
    publisher: PERSON,
    articleSection: section,
    ...(tags?.length ? { keywords: tags.join(', ') } : {}),
    datePublished: toIsoDate(date),
    dateModified: toIsoDate(updated ?? date),
    inLanguage: IN_LANGUAGE,
  };
}

/**
 * What a home-page @-mention shows in its hover card, and where a click lands.
 * The prose names the work; the card carries the source, role, date and line.
 */
export type Source = {
  key: string;
  /** Shown beside the monogram in the card header. */
  name: string;
  /** The mark's letter. Falls back to the source name's first character. */
  mark?: string;
  /** Prominent line in the card — the title slot. */
  role: string;
  /** Right-aligned metadata, the way a date sits in a real citation. */
  dates: string;
  /** One line on the work itself. */
  summary: string;
  /** Where a click lands: an in-app path or an external URL. */
  href: string;
  /** Set for links that leave the site. */
  external?: boolean;
};

export const SOURCES: Record<string, Source> = {
  'legal-rag': {
    key: 'legal-rag',
    name: 'Legal-RAG',
    mark: 'L',
    role: 'Vietnamese legal question answering',
    dates: '2026',
    summary: 'Hybrid BM25 + dense retrieval with cross-encoder reranking, built for statutory citations.',
    href: '/projects/legal-rag',
  },
  'hybrid-retrieval': {
    key: 'hybrid-retrieval',
    name: 'Hybrid Retrieval',
    mark: 'H',
    role: 'Research study',
    dates: '2026',
    summary: 'Where dense embeddings drop exact citations, and how lexical scoring keeps them.',
    href: '/research/hybrid-retrieval-legal-qa',
  },
  github: {
    key: 'github',
    name: 'GitHub',
    mark: 'G',
    role: '@tontide1',
    dates: 'open source',
    summary: 'Source for this site and the systems written alongside it.',
    href: 'https://github.com/tontide1',
    external: true,
  },
};

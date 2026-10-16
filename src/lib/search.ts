/**
 * Search index shared by every page: the home panel, the content frame, and
 * the dialog script only read `SearchItem`s — nothing here knows about layout.
 */
import { getCollection } from 'astro:content';
import { DOMAINS } from './domains';

export interface SearchItem {
  id: string;
  title: string;
  summary: string;
  domain: string;
  tags: string[];
  path: string;
  date?: string;
  meta?: string;
}

export async function buildSearchIndex(): Promise<SearchItem[]> {
  const [projects, research, life, thoughts, notes] = await Promise.all([
    getCollection('projects', ({ data }) => !data.draft),
    getCollection('research', ({ data }) => !data.draft),
    getCollection('life', ({ data }) => !data.draft),
    getCollection('thoughts', ({ data }) => !data.draft),
    getCollection('notes', ({ data }) => !data.draft),
  ]);

  return [
    ...DOMAINS.map((domain) => ({
      id: `dir-${domain.id}`,
      title: `~/${domain.label}`,
      summary: domain.blurb,
      domain: domain.label,
      tags: [] as string[],
      path: domain.path,
      meta: 'directory',
    })),
    ...projects.map((p) => ({
      id: p.id,
      title: p.data.title,
      summary: p.data.summary,
      domain: 'projects',
      tags: p.data.tags ?? [],
      path: `/projects/${p.id}`,
      date: p.data.date,
      meta: p.data.stack?.join(', ') || 'system',
    })),
    ...research.map((r) => ({
      id: r.id,
      title: r.data.title,
      summary: r.data.summary,
      domain: 'research',
      tags: r.data.tags ?? [],
      path: `/research/${r.id}`,
      date: r.data.date,
      meta: r.data.status,
    })),
    ...life.map((l) => ({
      id: l.id,
      title: l.data.title,
      summary: l.data.summary,
      domain: 'life',
      tags: l.data.tags ?? [],
      path: `/life/${l.id}`,
      date: l.data.date,
      meta: 'timeline',
    })),
    ...thoughts.map((t) => ({
      id: t.id,
      title: t.data.title,
      summary: t.data.summary,
      domain: 'thoughts',
      tags: t.data.tags ?? [],
      path: `/thoughts/${t.id}`,
      date: t.data.date,
      meta: 'essay',
    })),
    ...notes.map((n) => ({
      id: n.id,
      title: n.data.title,
      summary: n.data.summary,
      domain: 'notes',
      tags: n.data.tags ?? [],
      path: `/notes/${n.id}`,
      date: n.data.date,
      meta: n.data.category,
    })),
  ];
}

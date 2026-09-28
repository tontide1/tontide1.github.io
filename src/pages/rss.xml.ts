import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

/** Newest first, drafts excluded, across every content domain. */
async function entries() {
  const [projects, research, thoughts, notes, life] = await Promise.all([
    getCollection('projects', ({ data }) => !data.draft),
    getCollection('research', ({ data }) => !data.draft),
    getCollection('thoughts', ({ data }) => !data.draft),
    getCollection('notes', ({ data }) => !data.draft),
    getCollection('life', ({ data }) => !data.draft),
  ]);

  return [...projects, ...research, ...thoughts, ...notes, ...life]
    .map((entry) => ({
      entry,
      section: entry.collection,
      url: `/${entry.collection}/${entry.id}`,
    }))
    .sort((a, b) => b.entry.data.date.localeCompare(a.entry.data.date));
}

export async function GET(context: { site: URL }) {
  return rss({
    title: 'TÀI — A Personal Gravity System',
    description:
      'Projects, research, life, thoughts, and notes orbiting one stable center.',
    site: context.site,
    items: (await entries()).map(({ entry, section, url }) => ({
      title: entry.data.title,
      description: entry.data.summary,
      pubDate: new Date(entry.data.date),
      link: url,
      categories: [section.toUpperCase(), ...(entry.data.tags ?? [])],
    })),
    customData: '<language>en</language>',
  });
}

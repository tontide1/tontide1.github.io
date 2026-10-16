import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://tontide1.github.io',
  integrations: [mdx(), sitemap()],
  markdown: {
    // The site is dark-only; pin the code-block theme so MDX pre blocks do not
    // render with Shiki's light default.
    shikiConfig: {
      theme: 'github-dark',
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});

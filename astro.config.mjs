import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://tontide1.github.io',
  integrations: [mdx(), sitemap()],
  markdown: {
    // Code blocks stay dark in both themes (they sit on their own surface), so
    // pin the theme instead of letting Shiki pick a light default.
    shikiConfig: {
      theme: 'github-dark',
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});

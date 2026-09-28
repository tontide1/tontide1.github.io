import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://tontide1.github.io',
  integrations: [react(), mdx(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
    // The universe island is ~895 kB raw / ~242 kB gzip, which trips Vite's
    // 500 kB default. It is not a splitting failure: the chunk contains no
    // GLTF/FBX/OBJ/Text loaders, no OrbitControls and no MarchingCubes, so
    // tree-shaking is already working and what remains is the irreducible cost
    // of WebGLRenderer itself. It is also already deferred behind first paint —
    // the `bundle` suite asserts the loader ships first and the canvas chunk
    // lands afterwards. Raise the limit rather than pretend the number is small.
    build: {
      chunkSizeWarningLimit: 1000,
    },
  },
});

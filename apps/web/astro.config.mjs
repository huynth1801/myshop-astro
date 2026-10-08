import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // TODO: set to the real domain before launch — required for sitemap + canonical URLs
  site: 'https://myshop.example.com',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  image: {
    // Astro's remote image loader refuses redirects at build time, so seed
    // images come from placehold.co (direct 200s). Replace with the real image
    // host (S3/Cloudinary) when actual product photos land.
    domains: ['placehold.co'],
  },
  redirects: {
    // Old slugs → new slugs, keep SEO equity. Slugs are stable forever (AGENTS.md).
  },
});

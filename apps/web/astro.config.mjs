import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import fs from 'node:fs';

const isCloudflare =
  process.env.OUTPUT_ADAPTER === 'cloudflare' ||
  Boolean(process.env.CF_PAGES) ||
  Boolean(process.env.CF_WORKER) ||
  Boolean(process.env.WORKERS_CI) ||
  fs.existsSync('/opt/buildhome');

export default defineConfig({
  // Default to pages.dev, customizable via SITE_URL or custom domain
  site: process.env.SITE_URL || 'https://myshop.pages.dev',
  output: 'server',
  adapter: isCloudflare ? cloudflare() : node({ mode: 'standalone' }),
  integrations: [react(), sitemap(), icon()],
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

import type { APIRoute } from 'astro';
import { getCategories } from '../lib/api/categories';
import { getPosts } from '../lib/api/blog';
import { getProducts } from '../lib/api/products';

// ADR 0011: catalog/blog pages render on demand, so @astrojs/sitemap (which only
// sees build-time routes) would emit a near-empty file. Generate it live instead —
// URLs are always in sync with what the API returns.
export const prerender = false;

const PAGE_SIZE = 100; // AGENTS.md #4: no unbounded queries — walk the API page by page
const POST_PAGE_SIZE = 50; // /api/v1/posts rejects size > 50 with 400
const MAX_PRODUCT_PAGES = 20; // hard cap: 2 000 product URLs, sitemap stays cheap
const MAX_POST_PAGES = 10;

function xmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export const GET: APIRoute = async ({ site }) => {
  const origin = site ?? new URL('https://myshop.pages.dev');

  let categories: Awaited<ReturnType<typeof getCategories>>;
  let productSlugs: string[] = [];
  let postSlugs: string[] = [];
  try {
    categories = await getCategories();

    for (let page = 0; page < MAX_PRODUCT_PAGES; page++) {
      const { content, totalPages } = await getProducts(page, PAGE_SIZE);
      productSlugs.push(...content.map((p) => p.slug));
      if (page + 1 >= totalPages) break;
    }

    for (let page = 0; page < MAX_POST_PAGES; page++) {
      const { content, totalPages } = await getPosts({ page, size: POST_PAGE_SIZE });
      postSlugs.push(...content.filter((p) => p.status === 'PUBLISHED').map((p) => p.slug));
      if (page + 1 >= totalPages) break;
    }
  } catch {
    // API down → tell crawlers to come back later instead of deindexing everything
    return new Response('Sitemap tạm thời không khả dụng', {
      status: 503,
      headers: { 'retry-after': '600' },
    });
  }

  const entries: Array<{ loc: string; changefreq?: string; priority?: string }> = [
    { loc: '/', changefreq: 'daily', priority: '1.0' },
    { loc: '/blog', changefreq: 'daily', priority: '0.6' },
    ...categories.map((c) => ({
      loc: `/categories/${c.slug}/`,
      changefreq: 'daily',
      priority: '0.8',
    })),
    ...postSlugs.map((slug) => ({ loc: `/blog/${slug}`, priority: '0.4' })),
    ...productSlugs.map((slug) => ({ loc: `/products/${slug}/`, priority: '0.9' })),
  ];

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries
      .map(
        (e) =>
          `  <url>\n    <loc>${xmlEscape(new URL(e.loc, origin).toString())}</loc>\n` +
          (e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>\n` : '') +
          (e.priority ? `    <priority>${e.priority}</priority>\n` : '') +
          '  </url>',
      )
      .join('\n') +
    '\n</urlset>\n';

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
};

import { defineMiddleware } from 'astro:middleware';

/**
 * Security headers on every SSR response (cart/checkout/account in Phase 1).
 * NOTE: the Node standalone adapter serves prerendered pages from its static
 * handler BEFORE middleware runs — headers for static pages must be set at the
 * edge (nginx/Cloudflare) or host platform config when we deploy.
 *
 * ADR 0011: catalog pages are SSR — HTML must never be browser-cached, or
 * admin edits would look stale again (just from a different cache layer).
 */
export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (response.headers.get('content-type')?.includes('text/html')) {
    response.headers.set('Cache-Control', 'no-cache');
  }
  return response;
});

import { defineMiddleware } from 'astro:middleware';

/**
 * Security headers on every SSR response (cart/checkout/account in Phase 1).
 * NOTE: the Node standalone adapter serves prerendered pages from its static
 * handler BEFORE middleware runs — headers for static pages must be set at the
 * edge (nginx/Cloudflare) or host platform config when we deploy.
 */
export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
});

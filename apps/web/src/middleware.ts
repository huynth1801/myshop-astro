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
export const onRequest = defineMiddleware(async (context, next) => {
  // Capture Cloudflare Workers runtime env so server-side fetches can read variables set in Cloudflare Dashboard
  const runtimeEnv = (context.locals as unknown as { runtime?: { env?: Record<string, string> } })?.runtime?.env;
  if (runtimeEnv) {
    const globalObj = globalThis as unknown as {
      __API_BASE_URL__?: string;
      __PUBLIC_API_URL__?: string;
    };
    if (runtimeEnv.API_BASE_URL) {
      globalObj.__API_BASE_URL__ = runtimeEnv.API_BASE_URL;
      if (typeof process !== 'undefined' && process.env) {
        process.env.API_BASE_URL = runtimeEnv.API_BASE_URL;
      }
    }
    if (runtimeEnv.PUBLIC_API_URL) {
      globalObj.__PUBLIC_API_URL__ = runtimeEnv.PUBLIC_API_URL;
      if (typeof process !== 'undefined' && process.env) {
        process.env.PUBLIC_API_URL = runtimeEnv.PUBLIC_API_URL;
      }
    }
  }

  const response = await next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (response.headers.get('content-type')?.includes('text/html')) {
    const pathname = context.url.pathname;
    if (
      pathname.startsWith('/admin') ||
      pathname.startsWith('/checkout') ||
      pathname.startsWith('/orders')
    ) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    } else if (pathname.startsWith('/products/') || pathname.startsWith('/categories/')) {
      // Short cache (30s browser, 60s CDN) enables instant hover prefetch & fast CDN edge delivery
      response.headers.set(
        'Cache-Control',
        'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
      );
    } else {
      response.headers.set('Cache-Control', 'no-cache');
    }
  }
  return response;
});

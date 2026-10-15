/**
 * Resolves the Backend API URL dynamically.
 * In browser: reads window.__PUBLIC_API_URL__ (injected via BaseHead) -> import.meta.env.PUBLIC_API_URL -> fallback.
 * In SSR (Cloudflare Workers/Node): reads runtime env captured in middleware -> process.env -> import.meta.env -> fallback.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const win = window as unknown as { __PUBLIC_API_URL__?: string };
    if (win.__PUBLIC_API_URL__) return win.__PUBLIC_API_URL__;
    return import.meta.env.PUBLIC_API_URL || 'http://localhost:8080';
  }

  const globalObj = globalThis as unknown as {
    __API_BASE_URL__?: string;
    __PUBLIC_API_URL__?: string;
  };
  if (globalObj.__API_BASE_URL__) return globalObj.__API_BASE_URL__;
  if (globalObj.__PUBLIC_API_URL__) return globalObj.__PUBLIC_API_URL__;

  if (typeof process !== 'undefined' && process.env) {
    if (process.env.API_BASE_URL) return process.env.API_BASE_URL;
    if (process.env.PUBLIC_API_URL) return process.env.PUBLIC_API_URL;
  }

  return import.meta.env.API_BASE_URL || import.meta.env.PUBLIC_API_URL || 'http://localhost:8080';
}

/**
 * Product image URLs are opaque strings (ADR 0005): absolute CDN links,
 * API-served uploads ("/api/v1/files/…", origin = the API), or the web's own
 * static files ("/images/…"). Normalize so any <img>/fetch can use the result
 * directly — works on server and client (PUBLIC_* reaches both).
 */
export function resolveImageUrl(url: string): string;
export function resolveImageUrl(url: string | null | undefined): string | null;
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith('/api/')) return `${getApiBaseUrl()}${url}`;
  return url;
}

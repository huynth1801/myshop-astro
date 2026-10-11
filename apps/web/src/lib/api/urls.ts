const API_ORIGIN = import.meta.env.PUBLIC_API_URL;

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
  if (url.startsWith('/api/')) return `${API_ORIGIN}${url}`;
  return url;
}

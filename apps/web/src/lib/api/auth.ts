import { z } from 'zod';
import { getApiBaseUrl } from './urls';

export interface AuthUser {
  email: string;
  name: string;
  /** Present after /me (bootstrap/refresh) — absent right after login/register. */
  role?: string;
}

const tokenResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int(),
  email: z.string().nullish(),
  name: z.string().nullish(),
});

const meResponseSchema = z.object({
  email: z.string(),
  name: z.string(),
  role: z.string(),
});

/**
 * Access token lives in module memory and tab-isolated sessionStorage — never localStorage (XSS).
 * The refresh token is an httpOnly cookie the browser manages for us.
 */
let accessToken: string | null = null;
const TOKEN_SESSION_KEY = 'myshop_access_token_session';

interface StoredTokenData {
  token: string;
  expiresAt: number;
}

function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(TOKEN_SESSION_KEY);
    if (!raw) return null;
    const parsed: StoredTokenData = JSON.parse(raw);
    if (typeof parsed?.token === 'string' && typeof parsed?.expiresAt === 'number') {
      if (Date.now() < parsed.expiresAt - 30_000) {
        return parsed.token;
      }
    }
    sessionStorage.removeItem(TOKEN_SESSION_KEY);
    return null;
  } catch {
    return null;
  }
}

function setStoredAccessToken(token: string | null, expiresIn = 900): void {
  accessToken = token;
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      const expiresAt = Date.now() + Math.max(expiresIn, 60) * 1000;
      sessionStorage.setItem(TOKEN_SESSION_KEY, JSON.stringify({ token, expiresAt }));
    } else {
      sessionStorage.removeItem(TOKEN_SESSION_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly code: string | undefined,
    readonly status: number,
  ) {
    super(message);
  }
}

async function authPost(path: string, body: unknown): Promise<z.infer<typeof tokenResponseSchema>> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    credentials: 'include', // send + receive the refresh cookie
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let code: string | undefined;
    let message = `Request failed (${res.status})`;
    try {
      const problem: { code?: string; detail?: string } = await res.json();
      code = problem.code;
      message = problem.detail ?? message;
    } catch {
      // keep generic message
    }
    throw new AuthError(message, code, res.status);
  }
  return tokenResponseSchema.parse(await res.json());
}

function extractUserFromToken(token: string): AuthUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.email) return null;
    return {
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      role: payload.role || 'CUSTOMER',
    };
  } catch {
    return null;
  }
}

export async function register(email: string, password: string, name: string): Promise<AuthUser> {
  const tokens = await authPost('/api/v1/auth/register', { email, password, name });
  setStoredAccessToken(tokens.accessToken, tokens.expiresIn);
  const decoded = extractUserFromToken(tokens.accessToken);
  if (decoded) return decoded;
  try {
    return await me(); // full profile incl. role (the admin page needs it right away)
  } catch {
    return { email: tokens.email ?? email, name: tokens.name ?? name };
  }
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const tokens = await authPost('/api/v1/auth/login', { email, password });
  setStoredAccessToken(tokens.accessToken, tokens.expiresIn);
  const decoded = extractUserFromToken(tokens.accessToken);
  if (decoded) return decoded;
  try {
    return await me(); // full profile incl. role (the admin page needs it right away)
  } catch {
    return { email: tokens.email ?? email, name: tokens.name ?? '' };
  }
}

export async function logout(): Promise<void> {
  setStoredAccessToken(null);
  await fetch(`${getApiBaseUrl()}/api/v1/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => {
    // signing out is best-effort client-side; the cookie clear is the goal
  });
}

async function me(): Promise<AuthUser> {
  if (!accessToken) {
    throw new AuthError('No access token', 'UNAUTHENTICATED', 401);
  }
  const res = await fetch(`${getApiBaseUrl()}/api/v1/auth/me`, {
    headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' },
  });
  if (!res.ok) {
    throw new AuthError('Session expired', 'UNAUTHENTICATED', res.status);
  }
  const parsed = meResponseSchema.parse(await res.json());
  return { email: parsed.email, name: parsed.name, role: parsed.role };
}
let refreshPromise: Promise<string | null> | null = null;

/**
 * Silently rotate access token using httpOnly refresh cookie.
 * Deduplicated so multiple concurrent requests share the exact same refresh HTTP call.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const tokens = await authPost('/api/v1/auth/refresh', {});
      setStoredAccessToken(tokens.accessToken, tokens.expiresIn);
      return accessToken;
    } catch {
      setStoredAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

/**
 * Returns the current valid access token, or silently retrieves one via refresh cookie if missing.
 */
export async function getValidAccessToken(): Promise<string | null> {
  if (accessToken) return accessToken;
  const stored = getStoredAccessToken();
  if (stored) {
    accessToken = stored;
    return stored;
  }
  return refreshAccessToken();
}

/**
 * Bearer headers for authenticated islands (admin) — empty when signed out.
 * Callers must re-run after bootstrapAuth()/login() so a fresh token is used.
 */
export function authHeaders(): Record<string, string> {
  return accessToken ? { authorization: `Bearer ${accessToken}` } : {};
}

/**
 * Restore a session on page load: try /me with the in-memory token, else
 * silently rotate via the refresh cookie. Returns null for guests.
 */
export async function bootstrapSession(): Promise<AuthUser | null> {
  if (!accessToken) {
    accessToken = getStoredAccessToken();
  }
  if (accessToken) {
    const decoded = extractUserFromToken(accessToken);
    if (decoded) return decoded;
    try {
      return await me();
    } catch {
      // access token expired, fallthrough to refresh
    }
  }
  const token = await refreshAccessToken();
  if (!token) return null;
  const decoded = extractUserFromToken(token);
  if (decoded) return decoded;
  try {
    return await me();
  } catch {
    setStoredAccessToken(null);
    return null;
  }
}

/**
 * Full-page navigation target for Google sign-in (ADR 0004). The API redirects
 * to Google and finally back here; the silent bootstrap above then restores
 * the session from the refresh cookie — no token ever touches the browser URL.
 * Browser-only (reads location) — call from islands, never at module scope.
 */
export function googleLoginUrl(): string {
  return `${getApiBaseUrl()}/api/v1/auth/oauth/google/authorize?redirect_uri=${encodeURIComponent(
    window.location.origin,
  )}`;
}

import { z } from 'zod';

const BASE_URL = import.meta.env.PUBLIC_API_URL;

if (!BASE_URL) {
  throw new Error('PUBLIC_API_URL is not set — copy apps/web/.env.example to .env');
}

export interface AuthUser {
  email: string;
  name: string;
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
 * Access token lives in module memory only — never localStorage (XSS).
 * The refresh token is an httpOnly cookie the browser manages for us.
 */
let accessToken: string | null = null;

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
  const res = await fetch(`${BASE_URL}${path}`, {
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

export async function register(email: string, password: string, name: string): Promise<AuthUser> {
  const tokens = await authPost('/api/v1/auth/register', { email, password, name });
  accessToken = tokens.accessToken;
  return { email: tokens.email ?? email, name: tokens.name ?? name };
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const tokens = await authPost('/api/v1/auth/login', { email, password });
  accessToken = tokens.accessToken;
  return { email: tokens.email ?? email, name: tokens.name ?? '' };
}

export async function logout(): Promise<void> {
  accessToken = null;
  await fetch(`${BASE_URL}/api/v1/auth/logout`, {
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
  const res = await fetch(`${BASE_URL}/api/v1/auth/me`, {
    headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' },
  });
  if (!res.ok) {
    throw new AuthError('Session expired', 'UNAUTHENTICATED', res.status);
  }
  const parsed = meResponseSchema.parse(await res.json());
  return { email: parsed.email, name: parsed.name };
}

/**
 * Restore a session on page load: try /me with the in-memory token, else
 * silently rotate via the refresh cookie. Returns null for guests.
 */
export async function bootstrapSession(): Promise<AuthUser | null> {
  try {
    return await me();
  } catch {
    // no/invalid access token — try refresh
  }
  try {
    const tokens = await authPost('/api/v1/auth/refresh', {});
    accessToken = tokens.accessToken;
    return await me();
  } catch {
    accessToken = null;
    return null;
  }
}

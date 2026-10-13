import { atom } from 'nanostores';
import { bootstrapSession, logout as apiLogout, type AuthUser } from '../api/auth';

/** Signed-in user, or null for guests. Hydrated by AuthButton on mount. */
export const authUser = atom<AuthUser | null>(null);
export const authOpen = atom(false);

let bootstrapped = false;
let bootstrapPromise: Promise<AuthUser | null> | null = null;

export async function bootstrapAuth(): Promise<AuthUser | null> {
  if (bootstrapped) return authUser.get();
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    try {
      const user = await bootstrapSession();
      bootstrapped = true;
      authUser.set(user);
      return user;
    } catch {
      bootstrapped = true;
      authUser.set(null);
      return null;
    } finally {
      bootstrapPromise = null;
    }
  })();

  return bootstrapPromise;
}

export function setUser(user: AuthUser | null): void {
  authUser.set(user);
}

export async function signOut(): Promise<void> {
  await apiLogout();
  authUser.set(null);
}

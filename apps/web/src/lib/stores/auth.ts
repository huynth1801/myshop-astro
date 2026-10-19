import { atom } from 'nanostores';
import { bootstrapSession, logout as apiLogout, type AuthUser } from '../api/auth';

const STORAGE_KEY = 'myshop_auth_user';

function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Signed-in user, or null for guests. Hydrated from localStorage immediately, synced with session. */
export const authUser = atom<AuthUser | null>(getStoredUser());
export const authOpen = atom(false);
/** True while bootstrapping / checking session with backend on page load. Only true if stored user exists. */
export const authLoading = atom<boolean>(typeof window !== 'undefined' ? !!getStoredUser() : false);

let bootstrapped = false;
let bootstrapPromise: Promise<AuthUser | null> | null = null;

export async function bootstrapAuth(): Promise<AuthUser | null> {
  if (bootstrapped) {
    authLoading.set(false);
    return authUser.get();
  }
  if (bootstrapPromise) return bootstrapPromise;

  // No stored user ⇒ no session to restore: the user never signed in on this
  // device, or signed out (which clears both the stored user and the refresh
  // cookie). Skip the guaranteed-401 /refresh round-trip on every page load.
  if (!getStoredUser()) {
    bootstrapped = true;
    setUser(null);
    authLoading.set(false);
    return null;
  }

  bootstrapPromise = (async () => {
    try {
      const user = await bootstrapSession();
      bootstrapped = true;
      setUser(user);
      return user;
    } catch {
      bootstrapped = true;
      setUser(null);
      return null;
    } finally {
      authLoading.set(false);
      bootstrapPromise = null;
    }
  })();

  return bootstrapPromise;
}

export function setUser(user: AuthUser | null): void {
  authUser.set(user);
  if (typeof window !== 'undefined') {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore storage access errors
    }
  }
}

export async function signOut(): Promise<void> {
  await apiLogout();
  setUser(null);
  authLoading.set(false);
}

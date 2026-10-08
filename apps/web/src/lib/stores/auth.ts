import { atom } from 'nanostores';
import { bootstrapSession, logout as apiLogout, type AuthUser } from '../api/auth';

/** Signed-in user, or null for guests. Hydrated by AuthButton on mount. */
export const authUser = atom<AuthUser | null>(null);
export const authOpen = atom(false);

let bootstrapped = false;

export async function bootstrapAuth(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;
  authUser.set(await bootstrapSession());
}

export function setUser(user: AuthUser | null): void {
  authUser.set(user);
}

export async function signOut(): Promise<void> {
  await apiLogout();
  authUser.set(null);
}

import { atom } from 'nanostores';
import { authUser } from './auth';

const LEGACY_STORAGE_KEY = 'myshop_recent_orders';

export const recentOrderCodes = atom<string[]>([]);
export const pendingVietQrCount = atom<number>(0);

let initialized = false;

function getStorageKey(): string {
  if (typeof window === 'undefined') return LEGACY_STORAGE_KEY;
  const user = authUser.get();
  if (user && user.email) {
    const safeEmail = encodeURIComponent(user.email.toLowerCase().trim());
    return `myshop_recent_orders_${safeEmail}`;
  }
  return 'myshop_recent_orders_guest';
}

function cleanOrMigrateLegacyStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return;
    const user = authUser.get();
    if (user && user.email) {
      // User is logged in: migrate legacy orders to this user account if empty
      const safeEmail = encodeURIComponent(user.email.toLowerCase().trim());
      const userKey = `myshop_recent_orders_${safeEmail}`;
      if (!localStorage.getItem(userKey)) {
        localStorage.setItem(userKey, raw);
      }
    }
    // Remove legacy un-namespaced key so it never leaks into logged-out guest state
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

function readStorageCodes(): string[] {
  if (typeof window === 'undefined') return [];
  cleanOrMigrateLegacyStorage();
  try {
    const key = getStorageKey();
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => (typeof item === 'string' ? item : item?.orderCode))
        .filter((code): code is string => typeof code === 'string' && code.trim().length > 0);
    }
  } catch {
    // Ignore storage parse error
  }
  return [];
}

function ensureInitialized(): void {
  if (initialized || typeof window === 'undefined') return;
  initRecentOrders();
}

export function getRecentOrderCodes(): string[] {
  ensureInitialized();
  return readStorageCodes();
}

export function initRecentOrders(): void {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;

  cleanOrMigrateLegacyStorage();
  const codes = readStorageCodes();
  recentOrderCodes.set(codes);

  // Re-sync when user logs in or out
  authUser.listen((user) => {
    if (!user) {
      clearRecentOrders();
    } else {
      cleanOrMigrateLegacyStorage();
      const updated = readStorageCodes();
      recentOrderCodes.set(updated);
      window.dispatchEvent(new CustomEvent('recent-orders-changed', { detail: { userChanged: true } }));
    }
  });

  window.addEventListener('storage', (e) => {
    if (e.key === getStorageKey() || e.key === LEGACY_STORAGE_KEY) {
      recentOrderCodes.set(readStorageCodes());
    }
  });
}

export function addRecentOrderCode(code: string): void {
  if (typeof window === 'undefined' || !code) return;
  ensureInitialized();
  cleanOrMigrateLegacyStorage();
  const cleanCode = code.trim().toUpperCase();
  try {
    const key = getStorageKey();
    const current = readStorageCodes();
    const filtered = current.filter((c) => c !== cleanCode);
    const updated = [cleanCode, ...filtered].slice(0, 50); // Keep up to 50 recent orders
    localStorage.setItem(key, JSON.stringify(updated));
    recentOrderCodes.set(updated);
    window.dispatchEvent(new CustomEvent('recent-orders-changed', { detail: { code: cleanCode } }));
  } catch {
    // Ignore storage errors
  }
}

export function removeRecentOrderCode(code: string): void {
  if (typeof window === 'undefined' || !code) return;
  ensureInitialized();
  cleanOrMigrateLegacyStorage();
  const cleanCode = code.trim().toUpperCase();
  try {
    const key = getStorageKey();
    const current = readStorageCodes();
    const updated = current.filter((c) => c !== cleanCode);
    localStorage.setItem(key, JSON.stringify(updated));
    recentOrderCodes.set(updated);
    window.dispatchEvent(new CustomEvent('recent-orders-changed', { detail: { code: cleanCode } }));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Completely clears unauthenticated and guest orders from browser storage upon sign-out.
 */
export function clearRecentOrders(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem('myshop_recent_orders_guest');
    sessionStorage.removeItem('myshop_order_status_cache');
    sessionStorage.removeItem('myshop_admin_order_badge');
    recentOrderCodes.set([]);
    window.dispatchEvent(new CustomEvent('recent-orders-changed', { detail: { cleared: true } }));
  } catch {
    // Ignore storage errors
  }
}

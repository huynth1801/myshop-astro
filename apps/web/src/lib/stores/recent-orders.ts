import { atom } from 'nanostores';

const STORAGE_KEY = 'myshop_recent_orders';

export const recentOrderCodes = atom<string[]>([]);
export const pendingVietQrCount = atom<number>(0);

let initialized = false;

export function getRecentOrderCodes(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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

export function initRecentOrders(): void {
  if (typeof window === 'undefined') return;
  const codes = getRecentOrderCodes();
  recentOrderCodes.set(codes);

  if (!initialized) {
    initialized = true;
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        recentOrderCodes.set(getRecentOrderCodes());
      }
    });
  }
}

export function addRecentOrderCode(code: string): void {
  if (typeof window === 'undefined' || !code) return;
  const cleanCode = code.trim().toUpperCase();
  try {
    const current = getRecentOrderCodes();
    const filtered = current.filter((c) => c !== cleanCode);
    const updated = [cleanCode, ...filtered].slice(0, 50); // Keep up to 50 recent orders
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    recentOrderCodes.set(updated);
    window.dispatchEvent(new CustomEvent('recent-orders-changed', { detail: { code: cleanCode } }));
  } catch {
    // Ignore storage errors
  }
}

export function removeRecentOrderCode(code: string): void {
  if (typeof window === 'undefined' || !code) return;
  const cleanCode = code.trim().toUpperCase();
  try {
    const current = getRecentOrderCodes();
    const updated = current.filter((c) => c !== cleanCode);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    recentOrderCodes.set(updated);
    window.dispatchEvent(new CustomEvent('recent-orders-changed', { detail: { code: cleanCode } }));
  } catch {
    // Ignore storage errors
  }
}

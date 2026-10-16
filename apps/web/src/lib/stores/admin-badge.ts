import { atom } from 'nanostores';

export interface AdminOrderBadgeData {
  pendingCount: number;
  totalOrders: number;
}

const STORAGE_KEY = 'myshop_admin_order_badge';

export const adminOrderBadgeStore = atom<AdminOrderBadgeData | null>(null);

export function getCachedAdminBadgeData(): AdminOrderBadgeData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.pendingCount === 'number' && typeof parsed?.totalOrders === 'number') {
      return parsed as AdminOrderBadgeData;
    }
  } catch {
    // Ignore parse error
  }
  return null;
}

export function setCachedAdminBadgeData(data: AdminOrderBadgeData): void {
  adminOrderBadgeStore.set(data);
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

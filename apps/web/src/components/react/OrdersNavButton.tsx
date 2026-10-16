import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { getRecentOrderCodes } from '../../lib/stores/recent-orders';
import { getOrder } from '../../lib/api/orders';
import { authUser } from '../../lib/stores/auth';
import { useStore } from '../../lib/stores/useStore';

const STATUS_CACHE_KEY = 'myshop_order_status_cache';
const THROTTLE_MS = 60_000; // 1 minute throttle for re-checking pending orders

interface CachedOrderStatus {
  status: string;
  paymentMethod: string;
  checkedAt: number;
}

function getCachedStatuses(): Record<string, CachedOrderStatus> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(STATUS_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setCachedStatus(code: string, status: string, paymentMethod: string) {
  if (typeof window === 'undefined') return;
  try {
    const current = getCachedStatuses();
    current[code] = { status, paymentMethod, checkedAt: Date.now() };
    sessionStorage.setItem(STATUS_CACHE_KEY, JSON.stringify(current));
  } catch {
    // Ignore storage errors
  }
}

export default function OrdersNavButton() {
  const user = useStore(authUser);
  const [hasPending, setHasPending] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Do not run background order check on admin pages or for ADMIN users
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      return;
    }
    if (user?.role === 'ADMIN') {
      return;
    }

    checkOrders();

    const handleStorageChange = () => {
      checkOrders(true);
    };
    window.addEventListener('recent-orders-changed', handleStorageChange);
    return () => window.removeEventListener('recent-orders-changed', handleStorageChange);
  }, [user]);

  async function checkOrders(force = false) {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      return;
    }
    if (user?.role === 'ADMIN') {
      return;
    }

    const codes = getRecentOrderCodes();
    setCount(codes.length);
    if (codes.length === 0) {
      setHasPending(false);
      return;
    }

    const latestCodes = codes.slice(0, 3);
    const cachedMap = getCachedStatuses();
    const now = Date.now();

    // Determine which codes need an API check:
    // Terminal statuses (PAID, CONFIRMED, SHIPPING, FULFILLED, CANCELLED, REFUNDED)
    // NEVER transition back to PENDING, so skip them if cached.
    const terminalStatuses = new Set(['PAID', 'CONFIRMED', 'SHIPPING', 'FULFILLED', 'CANCELLED', 'REFUNDED']);
    const codesToCheck = latestCodes.filter((code) => {
      if (force) return true;
      const cached = cachedMap[code];
      if (!cached) return true;
      if (terminalStatuses.has(cached.status)) return false;
      // Pending order: recheck only if throttle expired
      return now - cached.checkedAt > THROTTLE_MS;
    });

    // Check if any already-cached order is pending
    let foundPending = latestCodes.some((code) => {
      const cached = cachedMap[code];
      return cached && cached.paymentMethod === 'VIETQR' && cached.status === 'PENDING';
    });

    if (codesToCheck.length > 0) {
      try {
        const results = await Promise.allSettled(codesToCheck.map((c) => getOrder(c)));
        results.forEach((r, idx) => {
          if (r.status === 'fulfilled') {
            const ord = r.value;
            setCachedStatus(codesToCheck[idx], ord.status, ord.paymentMethod);
            if (ord.paymentMethod === 'VIETQR' && ord.status === 'PENDING') {
              foundPending = true;
            }
          }
        });
      } catch {
        // Ignore background check failure
      }
    }

    setHasPending(foundPending);
  }

  return (
    <a
      href="/orders"
      aria-label="Đơn mua của bạn"
      title="Đơn mua của bạn"
      className="relative flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      <div className="relative">
        <Package className="h-4.5 w-4.5" />
        {hasPending && (
          <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ee4d2d] opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#ee4d2d]" />
          </span>
        )}
      </div>
      <span className="hidden sm:inline">Đơn mua</span>
      {count > 0 && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium transition ${
            hasPending
              ? 'bg-rose-500/15 font-semibold text-rose-600 dark:text-rose-400'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {count}
        </span>
      )}
    </a>
  );
}

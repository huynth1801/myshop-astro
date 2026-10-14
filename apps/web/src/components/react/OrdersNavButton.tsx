import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { getRecentOrderCodes } from '../../lib/stores/recent-orders';
import { getOrder } from '../../lib/api/orders';

export default function OrdersNavButton() {
  const [hasPending, setHasPending] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    checkOrders();

    const handleStorageChange = () => {
      checkOrders();
    };
    window.addEventListener('recent-orders-changed', handleStorageChange);
    return () => window.removeEventListener('recent-orders-changed', handleStorageChange);
  }, []);

  async function checkOrders() {
    const codes = getRecentOrderCodes();
    setCount(codes.length);
    if (codes.length === 0) {
      setHasPending(false);
      return;
    }

    try {
      // Check the latest 3 orders for pending VietQR status
      const latestCodes = codes.slice(0, 3);
      const results = await Promise.allSettled(latestCodes.map((code) => getOrder(code)));
      const hasUnpaid = results.some(
        (r) =>
          r.status === 'fulfilled' &&
          r.value.paymentMethod === 'VIETQR' &&
          r.value.status === 'PENDING'
      );
      setHasPending(hasUnpaid);
    } catch {
      // Ignore background check failure
    }
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
      {count > 0 && !hasPending && (
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {count}
        </span>
      )}
    </a>
  );
}

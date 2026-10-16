import { useEffect, useState } from 'react';
import { useStore } from '../../lib/stores/useStore';
import { adminOrderBadgeStore, getCachedAdminBadgeData } from '../../lib/stores/admin-badge';

interface Props {
  activeTab: 'products' | 'orders' | 'blog';
}

export default function AdminNavTabs({ activeTab }: Props) {
  const badgeData = useStore(adminOrderBadgeStore);
  const [cachedData, setCachedData] = useState(() => getCachedAdminBadgeData());

  useEffect(() => {
    if (!badgeData) {
      setCachedData(getCachedAdminBadgeData());
    }
  }, [badgeData]);

  const currentBadge = badgeData || cachedData;
  const pendingCount = currentBadge?.pendingCount ?? 0;

  return (
    <div className="mb-6 flex border-b border-border">
      <a
        href="/admin"
        className={`border-b-2 px-4 py-2.5 text-xs uppercase tracking-wider transition ${
          activeTab === 'products'
            ? 'border-foreground font-semibold text-foreground'
            : 'border-transparent font-medium text-muted-foreground hover:text-foreground'
        }`}
      >
        Sản phẩm
      </a>

      <a
        href="/admin/orders"
        className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs uppercase tracking-wider transition ${
          activeTab === 'orders'
            ? 'border-foreground font-semibold text-foreground'
            : 'border-transparent font-medium text-muted-foreground hover:text-foreground'
        }`}
      >
        <span>Đơn hàng</span>
        {pendingCount > 0 && (
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
              activeTab === 'orders'
                ? 'bg-amber-500/25 text-amber-800 dark:text-amber-200'
                : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
            }`}
            title={`${pendingCount} đơn hàng chờ xử lý`}
          >
            {pendingCount}
          </span>
        )}
      </a>

      <a
        href="/admin/blog"
        className={`border-b-2 px-4 py-2.5 text-xs uppercase tracking-wider transition ${
          activeTab === 'blog'
            ? 'border-foreground font-semibold text-foreground'
            : 'border-transparent font-medium text-muted-foreground hover:text-foreground'
        }`}
      >
        Bài viết & SEO Crawler
      </a>
    </div>
  );
}

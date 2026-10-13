import { AlertTriangle, CheckCircle2, FileEdit, Package } from 'lucide-react';
import type { AdminProduct } from '../../lib/api/admin';

interface Props {
  totalElements: number;
  products: AdminProduct[] | null;
}

export default function AdminStatsBar({ totalElements, products }: Props) {
  const activeCount = products ? products.filter((p) => p.status === 'ACTIVE').length : 0;
  const draftCount = products ? products.filter((p) => p.status === 'DRAFT').length : 0;
  const stockAlertCount = products
    ? products.filter((p) => {
        if (!p.inStock || p.totalStock <= 0) return true;
        return p.variants?.some((v) => v.stock <= 5);
      }).length
    : 0;

  const cards = [
    {
      label: 'Tổng sản phẩm',
      value: totalElements,
      sub: 'Trong cơ sở dữ liệu',
      color: 'text-foreground',
      icon: Package,
      iconColor: 'text-muted-foreground',
    },
    {
      label: 'Đang mở bán',
      value: activeCount,
      sub: 'Hiển thị trên shop',
      color: 'text-emerald-700 dark:text-emerald-400',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Bản nháp',
      value: draftCount,
      sub: 'Chưa công khai',
      color: 'text-amber-700 dark:text-amber-400',
      icon: FileEdit,
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Cần chú ý kho',
      value: stockAlertCount,
      sub: 'Hết hoặc sắp hết hàng',
      color: stockAlertCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground',
      icon: AlertTriangle,
      iconColor: stockAlertCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => {
        const IconComponent = c.icon;
        return (
          <div
            key={c.label}
            className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-xs"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{c.label}</p>
              <IconComponent className={`h-4 w-4 ${c.iconColor}`} />
            </div>
            <p className={`mt-1.5 text-2xl font-semibold tracking-tight ${c.color}`}>
              {products === null ? '—' : c.value}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground/80">{c.sub}</p>
          </div>
        );
      })}
    </div>
  );
}

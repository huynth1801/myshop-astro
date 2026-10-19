import { formatCents } from './money';
import type { AdminVariant } from './api/admin';

export const STATUS_CONFIG: Record<
  'ACTIVE' | 'DRAFT' | 'ARCHIVED',
  { label: string; badgeClass: string; dotClass: string }
> = {
  ACTIVE: {
    label: 'Đang bán',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    dotClass: 'bg-emerald-500',
  },
  DRAFT: {
    label: 'Bản nháp',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
    dotClass: 'bg-amber-500',
  },
  ARCHIVED: {
    label: 'Lưu trữ',
    badgeClass: 'bg-stone-100 text-stone-600 border-stone-200',
    dotClass: 'bg-stone-400',
  },
};

const ATTR_LABELS: Record<string, string> = {
  size: 'Size',
  color: 'Màu',
};

/** Format attributes map like { size: 'M', color: 'Đen' } into a clean label string. */
export function formatVariantAttributes(attributes: Record<string, unknown> | undefined): string {
  if (!attributes || Object.keys(attributes).length === 0) {
    return 'Tiêu chuẩn';
  }
  const parts = Object.entries(attributes).map(([k, v]) => {
    const label = ATTR_LABELS[k] ?? k;
    return `${label}: ${String(v)}`;
  });
  return parts.join(' · ');
}

/** Get brief variant name (e.g. "Size M" or "M") for chips. */
export function getVariantShortName(attributes: Record<string, unknown> | undefined, fallbackSku: string): string {
  if (!attributes || Object.keys(attributes).length === 0) {
    return fallbackSku || 'Mặc định';
  }
  if (attributes.size) return String(attributes.size);
  const firstVal = Object.values(attributes)[0];
  return firstVal ? String(firstVal) : fallbackSku;
}

export interface StockStatus {
  label: string;
  badgeClass: string;
  dotClass: string;
}

/** Stock status styling for individual variants. */
export function getVariantStockStatus(stock: number): StockStatus {
  if (stock <= 0) {
    return {
      label: 'Hết hàng',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
      dotClass: 'bg-rose-500',
    };
  }
  if (stock <= 5) {
    return {
      label: `Sắp hết (${stock})`,
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
      dotClass: 'bg-amber-500',
    };
  }
  return {
    label: `Còn ${stock}`,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    dotClass: 'bg-emerald-500',
  };
}

/** Aggregated stock health across all variants of a product. */
export function getProductStockSummary(variants: AdminVariant[], totalStock: number) {
  const outOfStockCount = variants.filter((v) => v.stock <= 0).length;
  const lowStockCount = variants.filter((v) => v.stock > 0 && v.stock <= 5).length;
  const hasVariants = variants.length > 0;

  let alertBadge: { text: string; badgeClass: string } | null = null;
  if (totalStock <= 0) {
    alertBadge = { text: 'Hết hàng', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' };
  } else if (outOfStockCount > 0) {
    alertBadge = {
      text: `${outOfStockCount} size hết`,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    };
  } else if (lowStockCount > 0) {
    alertBadge = {
      text: `${lowStockCount} size sắp hết`,
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  } else if (hasVariants) {
    alertBadge = { text: 'Đủ hàng', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }

  return { outOfStockCount, lowStockCount, alertBadge };
}

/** Formats price display, including range if variants differ. */
export function formatProductPriceRange(
  fromCents: number | null | undefined,
  toCents: number | null | undefined,
): { primary: string; subtitle?: string } {
  if (fromCents == null) return { primary: '—' };
  if (toCents != null && toCents !== fromCents) {
    return {
      primary: `${formatCents(fromCents)} – ${formatCents(toCents)}`,
      subtitle: 'tuỳ phân loại',
    };
  }
  return { primary: formatCents(fromCents) };
}

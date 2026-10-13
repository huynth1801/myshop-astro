import { useState } from 'react';
import type { AdminProduct } from '../../lib/api/admin';
import { resolveImageUrl } from '../../lib/api/urls';
import {
  formatProductPriceRange,
  getProductStockSummary,
  getVariantShortName,
  getVariantStockStatus,
  STATUS_CONFIG,
} from '../../lib/admin-helpers';
import AdminVariantTable from './AdminVariantTable';

interface Props {
  product: AdminProduct;
  busy: boolean;
  onStatusChange: (product: AdminProduct, next: AdminProduct['status']) => void;
  onReload: () => void;
}

export default function AdminProductRow({ product: p, busy, onStatusChange, onReload }: Props) {
  const [expanded, setExpanded] = useState(false);
  const thumb = resolveImageUrl(p.image?.url);
  const variants = p.variants ?? [];
  const { alertBadge } = getProductStockSummary(variants, p.totalStock);
  const priceInfo = formatProductPriceRange(p.priceFromCents, p.priceToCents);
  const statusCfg = STATUS_CONFIG[p.status];

  return (
    <>
      <tr className={`border-b border-border/60 transition-colors hover:bg-muted/30 ${expanded ? 'bg-muted/20' : ''}`}>
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? 'Thu gọn' : 'Xem chi tiết'}
              className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-background text-xs text-muted-foreground transition hover:border-foreground hover:text-foreground"
            >
              {expanded ? '▲' : '▼'}
            </button>
            <a
              href={`/admin/products/${p.id}`}
              className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40 transition hover:opacity-90"
            >
              {thumb ? (
                <img src={thumb} alt={p.image?.alt || p.name} width={48} height={48} loading="lazy" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">Không ảnh</div>
              )}
            </a>
            <div className="min-w-0 max-w-xs">
              <a href={`/admin/products/${p.id}`} className="block truncate font-medium text-foreground transition hover:underline">
                {p.name}
              </a>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="truncate">/{p.slug}</span>
                <span>·</span>
                <a href={`/products/${p.slug}`} target="_blank" rel="noreferrer" title="Xem trên shop" className="hover:text-foreground">
                  Shop ↗
                </a>
              </div>
            </div>
          </div>
        </td>

        <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
          <span className="rounded-md border border-border/60 bg-muted/30 px-2 py-1">{p.category.name}</span>
        </td>

        <td className="px-4 py-3.5">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">{variants.length} phân loại</span>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
              >
                {expanded ? 'Thu gọn' : 'Chi tiết'}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {variants.slice(0, 4).map((v) => {
                const s = getVariantStockStatus(v.stock);
                return (
                  <span
                    key={v.id}
                    title={`${v.sku} · ${s.label}`}
                    className="inline-flex items-center gap-1 rounded border border-border/80 bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground"
                  >
                    <span className={`size-1.5 rounded-full ${s.dotClass}`} />
                    <span className="font-medium text-foreground">{getVariantShortName(v.attributes, v.sku)}</span>
                  </span>
                );
              })}
              {variants.length > 4 && <span className="text-[11px] text-muted-foreground">+{variants.length - 4} khác</span>}
            </div>
          </div>
        </td>

        <td className="px-4 py-3.5 text-right whitespace-nowrap">
          <div className="font-medium text-foreground">{priceInfo.primary}</div>
          {priceInfo.subtitle && <div className="text-[11px] text-muted-foreground">{priceInfo.subtitle}</div>}
        </td>

        <td className="px-4 py-3.5 text-right whitespace-nowrap">
          <div className="flex flex-col items-end gap-1">
            <span className="font-semibold text-foreground">{p.totalStock}</span>
            {alertBadge && (
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${alertBadge.badgeClass}`}>
                {alertBadge.text}
              </span>
            )}
          </div>
        </td>

        <td className="px-4 py-3.5 whitespace-nowrap">
          <div className="relative inline-block">
            <select
              aria-label={`Trạng thái ${p.name}`}
              value={p.status}
              disabled={busy}
              onChange={(e) => onStatusChange(p, e.target.value as AdminProduct['status'])}
              className={`cursor-pointer appearance-none rounded-full border py-1 pr-6 pl-2.5 text-xs font-medium outline-none transition focus:ring-1 focus:ring-foreground ${statusCfg.badgeClass}`}
            >
              <option value="ACTIVE">● Đang bán</option>
              <option value="DRAFT">● Bản nháp</option>
              <option value="ARCHIVED">● Lưu trữ</option>
            </select>
            <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[10px] opacity-70">▼</span>
          </div>
        </td>

        <td className="px-4 py-3.5 text-right whitespace-nowrap">
          <a
            href={`/admin/products/${p.id}`}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-2xs transition hover:border-foreground hover:bg-muted"
          >
            Chỉnh sửa
          </a>
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-border/80 bg-muted/15">
          <td colSpan={7} className="px-6 py-4">
            <div className="pl-10">
              <AdminVariantTable productId={p.id} variants={variants} onVariantUpdated={onReload} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

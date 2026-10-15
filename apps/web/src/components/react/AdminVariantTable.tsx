import { useState } from 'react';
import { updateVariant, type AdminVariant } from '../../lib/api/admin';
import { formatCents } from '../../lib/money';
import {
  formatVariantAttributes,
  getVariantStockStatus,
} from '../../lib/admin-helpers';

interface Props {
  productId: string;
  variants: AdminVariant[];
  onVariantUpdated?: () => void;
}

export default function AdminVariantTable({ productId, variants, onVariantUpdated }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [stockInput, setStockInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Only digits (plus dot/space thousand separators for VND) can ever be typed.
  const sanitizeVnd = (input: string) => input.replace(/[^0-9.\s]/g, '');
  const sanitizeInt = (input: string) => input.replace(/\D/g, '');

  function startEdit(variant: AdminVariant) {
    setEditingId(variant.id);
    setPriceInput(String(Math.round(variant.priceCents / 100)));
    setStockInput(String(variant.stock));
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function saveEdit(variantId: string) {
    const rawPrice = Number(priceInput.replace(/[.\s,]/g, ''));
    const rawStock = Number(stockInput.trim());

    if (isNaN(rawPrice) || rawPrice < 0 || isNaN(rawStock) || rawStock < 0) {
      setEditError('Giá và tồn kho phải là số hợp lệ không âm.');
      return;
    }

    setBusy(true);
    setEditError(null);
    try {
      await updateVariant(variantId, {
        priceCents: Math.round(rawPrice * 100),
        stock: Math.round(rawStock),
      });
      setEditingId(null);
      onVariantUpdated?.();
    } catch {
      setEditError('Không thể lưu biến thể. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }

  if (variants.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-background/50 px-4 py-3 text-xs text-muted-foreground">
        Sản phẩm chưa có biến thể nào.{' '}
        <a href={`/admin/products/${productId}`} className="font-medium text-foreground underline">
          Thêm biến thể ngay →
        </a>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-background/80 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-2.5 text-xs">
        <span className="font-semibold text-foreground">
          Bảng phân loại chi tiết ({variants.length} biến thể)
        </span>
        <a
          href={`/admin/products/${productId}`}
          className="text-xs text-muted-foreground transition hover:text-foreground hover:underline"
        >
          Quản lý SKU & ảnh phân loại →
        </a>
      </div>

      {editError && (
        <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
          {editError}
        </div>
      )}

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/60 bg-muted/20 text-left font-medium text-muted-foreground">
            <th className="px-3.5 py-2">Phân loại / Kích cỡ</th>
            <th className="px-3.5 py-2">Mã SKU</th>
            <th className="px-3.5 py-2 text-right">Giá bán</th>
            <th className="px-3.5 py-2 text-right">Tồn kho</th>
            <th className="px-3.5 py-2 text-center w-28">Thao tác nhanh</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {variants.map((v) => {
            const isEditing = editingId === v.id;
            const stockStatus = getVariantStockStatus(v.stock);

            return (
              <tr key={v.id} className="transition-colors hover:bg-muted/30">
                <td className="px-3.5 py-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-0.5 font-medium text-foreground">
                    <span className={`size-1.5 rounded-full ${stockStatus.dotClass}`} />
                    {formatVariantAttributes(v.attributes)}
                  </span>
                </td>
                <td className="px-3.5 py-2.5 font-mono text-muted-foreground">{v.sku}</td>
                <td className="px-3.5 py-2.5 text-right font-medium">
                  {isEditing ? (
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="text"
                        value={priceInput}
                        onChange={(e) => setPriceInput(sanitizeVnd(e.target.value))}
                        placeholder="Giá đ"
                        aria-label="Giá biến thể"
                        className="w-24 rounded border border-border bg-card px-1.5 py-1 text-right text-xs outline-none focus:border-foreground"
                      />
                      <span className="text-muted-foreground">₫</span>
                    </div>
                  ) : (
                    <div>
                      <span>{formatCents(v.priceCents)}</span>
                      {v.compareAtPriceCents != null && v.compareAtPriceCents > v.priceCents && (
                        <span className="ml-1.5 text-[11px] text-muted-foreground line-through">
                          {formatCents(v.compareAtPriceCents)}
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-3.5 py-2.5 text-right">
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      value={stockInput}
                      onChange={(e) => setStockInput(sanitizeInt(e.target.value))}
                      placeholder="Số lượng"
                      aria-label="Tồn kho biến thể"
                      className="w-16 rounded border border-border bg-card px-1.5 py-1 text-right text-xs outline-none focus:border-foreground"
                    />
                  ) : (
                    <div className="inline-flex items-center gap-1.5">
                      <span className="font-semibold text-foreground">{v.stock}</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${stockStatus.badgeClass}`}
                      >
                        {stockStatus.label}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-3.5 py-2.5 text-center">
                  {isEditing ? (
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void saveEdit(v.id)}
                        className="rounded bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                      >
                        Lưu
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={cancelEdit}
                        className="rounded border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        Huỷ
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(v)}
                      className="rounded-full border border-border/80 bg-card px-2.5 py-1 text-[11px] text-muted-foreground transition hover:border-foreground hover:text-foreground"
                    >
                      Sửa nhanh
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

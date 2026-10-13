import { useMemo, useState } from 'react';
import { Check, Loader2, Minus, Plus, ShoppingBag } from 'lucide-react';
import { ApiError } from '../../lib/api/cart';
import { formatCents } from '../../lib/money';
import { addToCart } from '../../lib/stores/cart';
import {
  checkOptionAvailability,
  extractDimensionGroups,
  findMatchingVariant,
  getColorSwatch,
  getDefaultSelection,
} from '../../lib/variant-helpers';

export interface VariantOption {
  id: string;
  label: string;
  sku: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  stock: number;
  attributes?: Record<string, unknown>;
}

export default function AddToCartButton({ variants }: { variants: VariantOption[] }) {
  const groups = useMemo(() => extractDimensionGroups(variants), [variants]);
  const [selection, setSelection] = useState(() => getDefaultSelection(variants, groups));
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const selected = useMemo(() => {
    if (groups.length === 0) return variants[0];
    return findMatchingVariant(variants, selection) ?? variants.find((v) => v.stock > 0) ?? variants[0];
  }, [variants, groups, selection]);

  const soldOut = !selected || selected.stock <= 0;

  function handleSelect(key: string, value: string) {
    setSelection((prev) => ({ ...prev, [key]: value }));
    setAdded(false);
  }

  async function handleAdd() {
    if (!selected || busy || soldOut) return;
    setBusy(true);
    setError(null);
    try {
      await addToCart(selected.id, quantity);
      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    } catch (e) {
      setError(e instanceof ApiError && e.code === 'OUT_OF_STOCK'
        ? 'Rất tiếc — lựa chọn này vừa hết hàng.'
        : 'Không thêm được vào giỏ. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Grouped attribute selector */}
      {groups.map((group) => {
        const activeVal = selection[group.key] ?? group.values[0];
        return (
          <div key={group.key} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="uppercase tracking-wider text-muted-foreground">{group.label}</span>
              <span className="font-semibold text-foreground">{activeVal}</span>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label={`Chọn ${group.label}`}>
              {group.values.map((val) => {
                const isSelected = activeVal === val;
                const av = checkOptionAvailability(variants, selection, group.key, val);
                const isOutOfStock = av.exists && !av.inStock;
                const swatchHex = group.key === 'color' ? getColorSwatch(val) : null;
                return (
                  <button
                    key={val}
                    type="button"
                    disabled={!av.exists}
                    onClick={() => handleSelect(group.key, val)}
                    aria-pressed={isSelected}
                    className={`relative inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-xs font-medium transition-all select-none ${
                      isSelected
                        ? 'border-2 border-foreground bg-card text-foreground shadow-xs'
                        : 'border border-border bg-background text-muted-foreground hover:border-foreground/60 hover:text-foreground'
                    } ${isOutOfStock ? 'opacity-45 line-through hover:opacity-70' : ''} ${!av.exists ? 'cursor-not-allowed opacity-25' : ''}`}
                  >
                    {swatchHex && <span className="size-3 shrink-0 rounded-full border border-black/20" style={{ backgroundColor: swatchHex }} />}
                    <span>{val}</span>
                    {isOutOfStock && <span className="text-[10px] text-rose-500">(Hết)</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Selected variant live price & stock status */}
      {selected && (
        <div className="flex items-center justify-between border-y border-border/80 py-2.5 text-xs">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-foreground">{formatCents(selected.priceCents)}</span>
            {selected.compareAtPriceCents != null && selected.compareAtPriceCents > selected.priceCents && (
              <>
                <s className="text-muted-foreground">{formatCents(selected.compareAtPriceCents)}</s>
                <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">
                  -{Math.round((1 - selected.priceCents / selected.compareAtPriceCents) * 100)}%
                </span>
              </>
            )}
          </div>
          <div>
            {soldOut ? (
              <span className="font-medium text-rose-600">Tạm hết hàng</span>
            ) : selected.stock <= 10 ? (
              <span className="font-medium text-amber-600">Chỉ còn {selected.stock} sản phẩm</span>
            ) : (
              <span className="text-muted-foreground">Còn hàng</span>
            )}
          </div>
        </div>
      )}

      {/* Quantity picker + Add to cart button */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 items-center rounded-full border border-border bg-card px-2">
          <button
            type="button"
            disabled={quantity <= 1 || soldOut}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30"
            aria-label="Giảm số lượng"
          >
            <Minus className="size-3.5" />
          </button>
          <span className="w-8 text-center text-xs font-semibold tabular-nums text-foreground">{quantity}</span>
          <button
            type="button"
            disabled={soldOut || (selected != null && quantity >= selected.stock)}
            onClick={() => setQuantity((q) => q + 1)}
            className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30"
            aria-label="Tăng số lượng"
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={soldOut || busy}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 text-xs font-semibold text-primary-foreground shadow-xs transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Đang thêm…</span>
            </>
          ) : added ? (
            <>
              <Check className="size-4 text-emerald-400" />
              <span>Đã thêm vào giỏ!</span>
            </>
          ) : soldOut ? (
            <span>Hết hàng</span>
          ) : (
            <>
              <ShoppingBag className="size-4" />
              <span>Thêm vào giỏ — {formatCents((selected?.priceCents ?? 0) * quantity)}</span>
            </>
          )}
        </button>
      </div>

      {error && <p className="text-xs text-rose-600" role="alert">{error}</p>}
    </div>
  );
}

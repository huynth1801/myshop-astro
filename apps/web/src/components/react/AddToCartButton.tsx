import { useState } from 'react';
import { ApiError } from '../../lib/api/cart';
import { formatCents } from '../../lib/money';
import { addToCart } from '../../lib/stores/cart';

export interface VariantOption {
  id: string;
  label: string;
  sku: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  stock: number;
}

/**
 * Island on the product page: variant picker + add to cart. All prices are
 * display-only; the server recalculates everything (AGENTS.md).
 */
export default function AddToCartButton({ variants }: { variants: VariantOption[] }) {
  const purchasable = variants.filter((v) => v.stock > 0);
  const [selectedId, setSelectedId] = useState(purchasable[0]?.id ?? variants[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = variants.find((v) => v.id === selectedId);
  const anyInStock = purchasable.length > 0;

  async function handleAdd() {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      await addToCart(selected.id, 1);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'OUT_OF_STOCK') {
        setError('Rất tiếc — lựa chọn này vừa hết hàng. Vui lòng chọn lựa chọn khác.');
      } else {
        setError('Không thêm được vào giỏ. Vui lòng thử lại.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {variants.length > 1 && (
        <>
          <p className="text-sm font-medium text-muted-foreground">Lựa chọn</p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Chọn lựa chọn">
            {variants.map((variant) => {
              const soldOut = variant.stock === 0;
              const isSelected = variant.id === selectedId;
              return (
                <button
                  key={variant.id}
                  type="button"
                  aria-pressed={isSelected}
                  disabled={soldOut}
                  onClick={() => setSelectedId(variant.id)}
                  className={[
                    'h-9 rounded-full px-4 text-sm font-medium transition',
                    soldOut
                      ? 'cursor-not-allowed border border-border text-muted-foreground line-through opacity-50'
                      : '',
                    !soldOut && isSelected ? 'border-2 border-foreground' : '',
                    !soldOut && !isSelected
                      ? 'border border-border text-muted-foreground transition-colors hover:border-foreground'
                      : '',
                  ].join(' ')}
                >
                  {variant.label}
                </button>
              );
            })}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => void handleAdd()}
        disabled={!anyInStock || busy}
        className="mt-4 h-12 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy
          ? 'Đang thêm…'
          : !anyInStock
            ? 'Hết hàng'
            : selected && selected.compareAtPriceCents != null ? (
              <>
                <s className="mr-2 opacity-60">{formatCents(selected.compareAtPriceCents)}</s>
                Thêm vào giỏ — {formatCents(selected.priceCents)}
              </>
            ) : (
              <>Thêm vào giỏ — {selected ? formatCents(selected.priceCents) : ''}</>
            )}
      </button>

      {error && <p className="mt-2 text-sm text-accent" role="alert">{error}</p>}
    </div>
  );
}

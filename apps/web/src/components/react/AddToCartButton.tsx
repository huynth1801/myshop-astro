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
        setError('Sorry — that option just sold out. Pick another one.');
      } else {
        setError('Could not add to cart. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {variants.length > 1 && (
        <>
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Option</h2>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Choose option">
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
                    'rounded-full border px-4 py-2 text-sm transition',
                    soldOut ? 'cursor-not-allowed border-neutral-200 text-neutral-300 line-through' : '',
                    !soldOut && isSelected ? 'border-neutral-900 bg-neutral-900 text-white' : '',
                    !soldOut && !isSelected
                      ? 'border-neutral-300 text-neutral-700 hover:border-neutral-900'
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
        className="mt-4 w-full rounded-lg bg-neutral-900 px-6 py-3 font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {busy
          ? 'Adding…'
          : !anyInStock
            ? 'Sold out'
            : selected && selected.compareAtPriceCents != null ? (
                <>
                  <s className="mr-2 opacity-60">{formatCents(selected.compareAtPriceCents)}</s>
                  Add to cart — {formatCents(selected.priceCents)}
                </>
              ) : (
                <>Add to cart — {selected ? formatCents(selected.priceCents) : ''}</>
              )}
      </button>

      {error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
    </div>
  );
}

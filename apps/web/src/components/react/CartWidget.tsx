import { useEffect } from 'react';
import { formatCents } from '../../lib/money';
import { cart, cartCount, cartOpen, refreshCart, removeItem, setItemQty } from '../../lib/stores/cart';
import { useStore } from '../../lib/stores/useStore';

/**
 * Header cart island: badge button + slide-in drawer. Hydrates client:load
 * (above-fold interaction). Cart state comes from the shared nanostores cart.
 */
export default function CartWidget() {
  const count = useStore(cartCount);
  const open = useStore(cartOpen);
  const data = useStore(cart);

  // Fetch the cart on first open (not on page load — bots would mint carts)
  useEffect(() => {
    if (open && cart.get() === null) {
      refreshCart().catch(() => {
        /* drawer shows an error via empty state */
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cartOpen.set(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const remainingForFreeShipping =
    data && data.subtotalCents < data.freeShippingThresholdCents
      ? data.freeShippingThresholdCents - data.subtotalCents
      : 0;

  return (
    <>
      <button
        type="button"
        onClick={() => cartOpen.set(true)}
        aria-label={`Open cart, ${count} item${count === 1 ? '' : 's'}`}
        className="relative rounded-full p-2 text-neutral-600 transition hover:text-neutral-900"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M6 7h12l1.5 12.5a1 1 0 0 1-1 1.1H5.5a1 1 0 0 1-1-1.1L6 7Z" strokeLinejoin="round" />
          <path d="M9 9V6a3 3 0 0 1 6 0v3" strokeLinecap="round" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-semibold text-white">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            aria-hidden="true"
            onClick={() => cartOpen.set(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
            className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <h2 className="font-semibold">Cart ({count})</h2>
              <button
                type="button"
                onClick={() => cartOpen.set(false)}
                aria-label="Close cart"
                className="rounded-full p-2 text-neutral-500 transition hover:text-neutral-900"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5">
              {data === null && <p className="py-8 text-center text-sm text-neutral-500">Loading cart…</p>}
              {data && data.items.length === 0 && (
                <p className="py-8 text-center text-sm text-neutral-500">Your cart is empty.</p>
              )}
              {data?.items.map((item) => (
                <div key={item.id} className="flex gap-3 border-b border-neutral-100 py-4 last:border-0">
                  <div className="min-w-0 flex-1">
                    <a
                      href={`/products/${item.productSlug}/`}
                      onClick={() => cartOpen.set(false)}
                      className="font-medium hover:underline"
                    >
                      {item.productName}
                    </a>
                    <p className="mt-0.5 text-xs uppercase tracking-wide text-neutral-400">{item.sku}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${item.productName}`}
                        onClick={() => void setItemQty(item.id, item.qty - 1)}
                        className="size-8 rounded-full border border-neutral-300 leading-none text-neutral-700 transition hover:border-neutral-900"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm">{item.qty}</span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${item.productName}`}
                        onClick={() => void setItemQty(item.id, item.qty + 1)}
                        className="size-8 rounded-full border border-neutral-300 leading-none text-neutral-700 transition hover:border-neutral-900"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCents(item.lineTotalCents)}</p>
                    <button
                      type="button"
                      onClick={() => void removeItem(item.id)}
                      className="mt-2 text-xs text-neutral-400 transition hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {data && data.items.length > 0 && (
              <div className="border-t border-neutral-200 px-5 py-4">
                {remainingForFreeShipping > 0 ? (
                  <p className="text-sm text-neutral-600">
                    Add <strong>{formatCents(remainingForFreeShipping)}</strong> more for free shipping
                  </p>
                ) : (
                  <p className="text-sm font-medium text-green-700">Free shipping unlocked 🎉</p>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-neutral-600">Subtotal</span>
                  <span className="text-lg font-semibold">{formatCents(data.subtotalCents)}</span>
                </div>
                <button
                  type="button"
                  disabled
                  title="Checkout arrives with Stripe in Phase 1"
                  className="mt-3 w-full cursor-not-allowed rounded-lg bg-neutral-200 px-6 py-3 font-medium text-neutral-500"
                >
                  Checkout — coming soon
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

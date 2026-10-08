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
        aria-label={`Mở giỏ hàng (${count} sản phẩm)`}
        className="relative rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M6 7h12l1.5 12.5a1 1 0 0 1-1 1.1H5.5a1 1 0 0 1-1-1.1L6 7Z" strokeLinejoin="round" />
          <path d="M9 9V6a3 3 0 0 1 6 0v3" strokeLinecap="round" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
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
            aria-label="Giỏ hàng"
            className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-background shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-semibold">Giỏ hàng ({count})</h2>
              <button
                type="button"
                onClick={() => cartOpen.set(false)}
                aria-label="Đóng giỏ hàng"
                className="rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5">
              {data === null && <p className="py-8 text-center text-sm text-muted-foreground">Đang tải giỏ hàng…</p>}
              {data && data.items.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">Giỏ hàng của bạn đang trống.</p>
              )}
              {data?.items.map((item) => (
                <div key={item.id} className="flex gap-3 border-b border-border/60 py-4 last:border-0">
                  <div className="min-w-0 flex-1">
                    <a
                      href={`/products/${item.productSlug}/`}
                      onClick={() => cartOpen.set(false)}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {item.productName}
                    </a>
                    <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">{item.sku}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        type="button"
                        aria-label={`Giảm số lượng ${item.productName}`}
                        onClick={() => void setItemQty(item.id, item.qty - 1)}
                        className="size-8 rounded-full border border-border leading-none text-muted-foreground transition hover:border-foreground"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm">{item.qty}</span>
                      <button
                        type="button"
                        aria-label={`Tăng số lượng ${item.productName}`}
                        onClick={() => void setItemQty(item.id, item.qty + 1)}
                        className="size-8 rounded-full border border-border leading-none text-muted-foreground transition hover:border-foreground"
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
                      className="mt-2 text-xs text-muted-foreground transition hover:text-accent"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {data && data.items.length > 0 && (
              <div className="border-t border-border px-5 py-4">
                {remainingForFreeShipping > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Thêm <strong>{formatCents(remainingForFreeShipping)}</strong> nữa để được freeship
                  </p>
                ) : (
                  <p className="text-sm font-medium text-foreground">Đã đạt mức freeship 🎉</p>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Tạm tính</span>
                  <span className="text-lg font-semibold">{formatCents(data.subtotalCents)}</span>
                </div>
                <button
                  type="button"
                  disabled
                  title="Thanh toán sẽ mở cùng Stripe"
                  className="mt-3 w-full cursor-not-allowed rounded-full bg-muted px-6 py-3 font-semibold text-muted-foreground"
                >
                  Thanh toán — sắp mở
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ApiError } from '../../lib/api/cart';
import { formatCents } from '../../lib/money';
import {
  applyCouponCode,
  cart,
  cartCount,
  cartOpen,
  refreshCart,
  removeCoupon,
  removeItem,
  setItemQty,
} from '../../lib/stores/cart';
import { useStore } from '../../lib/stores/useStore';

const COUPON_ERRORS: Record<string, string> = {
  COUPON_NOT_FOUND: 'Mã không tồn tại hoặc đã hết hiệu lực.',
  COUPON_MIN_ORDER_NOT_MET: 'Đơn của bạn chưa đạt giá trị tối thiểu của mã này.',
};

/**
 * Header cart island: badge button + slide-in drawer. Hydrates client:load
 * (above-fold interaction). Cart state comes from the shared nanostores cart.
 */
export default function CartWidget() {
  const count = useStore(cartCount);
  const open = useStore(cartOpen);
  const data = useStore(cart);
  const [couponInput, setCouponInput] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

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

  async function handleApplyCoupon(event: React.FormEvent) {
    event.preventDefault();
    const code = couponInput.trim();
    if (!code || couponBusy) return;
    setCouponBusy(true);
    setCouponError(null);
    try {
      await applyCouponCode(code);
      setCouponInput('');
    } catch (e) {
      const errorCode = e instanceof ApiError ? e.code : undefined;
      setCouponError(
        errorCode && COUPON_ERRORS[errorCode]
          ? COUPON_ERRORS[errorCode]
          : 'Không áp dụng được mã. Vui lòng thử lại.',
      );
    } finally {
      setCouponBusy(false);
    }
  }

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

      {open &&
        createPortal(
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

                {data.couponCode ? (
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                    <span>
                      Mã <strong>{data.couponCode}</strong>
                      {data.discountCents > 0 && (
                        <span className="ml-2 text-accent">−{formatCents(data.discountCents)}</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => void removeCoupon()}
                      className="text-xs text-muted-foreground transition hover:text-accent"
                    >
                      Xóa mã
                    </button>
                  </div>
                ) : (
                  <form onSubmit={(event) => void handleApplyCoupon(event)} className="mt-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(event) => setCouponInput(event.target.value)}
                        placeholder="Mã giảm giá (vd: WELCOME10)"
                        aria-label="Mã giảm giá"
                        autoComplete="off"
                        className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-sm uppercase outline-none focus:border-foreground"
                      />
                      <button
                        type="submit"
                        disabled={couponBusy || couponInput.trim().length === 0}
                        className="h-9 shrink-0 rounded-full border border-foreground px-4 text-sm font-medium transition hover:bg-muted disabled:opacity-40"
                      >
                        {couponBusy ? '…' : 'Áp dụng'}
                      </button>
                    </div>
                    {couponError && (
                      <p className="mt-2 text-xs text-accent" role="alert">
                        {couponError}
                      </p>
                    )}
                  </form>
                )}

                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tạm tính</span>
                    <span>{formatCents(data.subtotalCents)}</span>
                  </div>
                  {data.discountCents > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Giảm giá</span>
                      <span className="text-accent">−{formatCents(data.discountCents)}</span>
                    </div>
                  )}
                  {data.discountCents > 0 && (
                    <div className="flex items-center justify-between pt-1 text-base font-semibold">
                      <span>Tổng cộng</span>
                      <span>{formatCents(data.subtotalCents - data.discountCents)}</span>
                    </div>
                  )}
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
          </div>,
          document.body,
        )}
    </>
  );
}

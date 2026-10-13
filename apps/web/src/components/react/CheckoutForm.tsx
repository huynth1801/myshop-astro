import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Loader2,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from 'lucide-react';
import { formatCents } from '../../lib/money';
import { authUser } from '../../lib/stores/auth';
import { cart, clearCart, refreshCart } from '../../lib/stores/cart';
import { useStore } from '../../lib/stores/useStore';
import { toast } from '../../lib/stores/toast';
import { submitCheckout, type CustomerAddress, type PaymentMethod } from '../../lib/api/orders';

const SAVED_ADDRESS_STORAGE_KEY = 'myshop_saved_shipping_address';

const POPULAR_CITIES = [
  'TP. Hồ Chí Minh',
  'Hà Nội',
  'Đà Nẵng',
  'Hải Phòng',
  'Cần Thơ',
  'Bình Dương',
  'Đồng Nai',
  'Bà Rịa - Vũng Tàu',
  'Khánh Hòa',
  'Lâm Đồng',
  'Quảng Nam',
  'Thừa Thiên Huế',
  'Quảng Ninh',
  'Bắc Ninh',
  'Hải Dương',
  'Nam Định',
  'Thái Bình',
  'Thanh Hóa',
  'Nghệ An',
  'Kiên Giang',
  'An Giang',
  'Tiền Giang',
  'Bến Tre',
  'Tỉnh / Thành khác',
];

export default function CheckoutForm() {
  const user = useStore(authUser);
  const cartData = useStore(cart);
  const [loadingCart, setLoadingCart] = useState(true);

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('TP. Hồ Chí Minh');
  const [customCity, setCustomCity] = useState('');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [line1, setLine1] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('VIETQR');
  const [isAutoFilled, setIsAutoFilled] = useState(false);

  // Submit State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Try reading saved address from localStorage
    try {
      const saved = localStorage.getItem(SAVED_ADDRESS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.fullName) setFullName(parsed.fullName);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.line1) setLine1(parsed.line1);
        if (parsed.district) setDistrict(parsed.district);
        if (parsed.ward) setWard(parsed.ward);
        if (parsed.city) {
          if (POPULAR_CITIES.includes(parsed.city)) {
            setCity(parsed.city);
          } else {
            setCity('Tỉnh / Thành khác');
            setCustomCity(parsed.city);
          }
        }
        setIsAutoFilled(true);
      } else if (user) {
        if (user.name) setFullName(user.name);
        if (user.email) setEmail(user.email);
      }
    } catch {
      // Ignore localStorage parse errors
    }

    // 2. If cart is not yet loaded in store, fetch it
    if (cart.get() === null) {
      refreshCart()
        .catch(() => {})
        .finally(() => setLoadingCart(false));
    } else {
      setLoadingCart(false);
    }
  }, [user]);

  if (loadingCart) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">Đang tải thông tin đơn hàng…</p>
      </div>
    );
  }

  if (!cartData || cartData.items.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">Giỏ hàng của bạn đang trống</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Hãy chọn các sản phẩm yêu thích trước khi tiến hành thanh toán nhé.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Khám phá sản phẩm</span>
        </a>
      </div>
    );
  }

  const FREE_SHIPPING_THRESHOLD_CENTS = 50_000_000; // 500.000₫
  const STANDARD_SHIPPING_CENTS = 3_000_000; // 30.000₫
  const isFreeShipping = cartData.subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS;
  const shippingCents = isFreeShipping ? 0 : STANDARD_SHIPPING_CENTS;
  const totalCents = Math.max(0, cartData.subtotalCents - cartData.discountCents + shippingCents);
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - cartData.subtotalCents);

  const effectiveCity = city === 'Tỉnh / Thành khác' ? customCity.trim() : city;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Basic client validation
    if (!fullName.trim()) {
      setError('Vui lòng nhập họ và tên người nhận.');
      return;
    }
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setError('Vui lòng nhập số điện thoại hợp lệ (ít nhất 9 chữ số).');
      return;
    }
    if (!line1.trim()) {
      setError('Vui lòng nhập địa chỉ cụ thể (số nhà, tên đường).');
      return;
    }
    if (!effectiveCity) {
      setError('Vui lòng chọn hoặc nhập Tỉnh / Thành phố.');
      return;
    }

    setIsSubmitting(true);

    try {
      const address: CustomerAddress = {
        fullName: fullName.trim(),
        phone: cleanPhone,
        email: email.trim() || undefined,
        line1: line1.trim(),
        city: effectiveCity,
        district: district.trim() || undefined,
        ward: ward.trim() || undefined,
        countryCode: 'VN',
      };

      const idempotencyKey = crypto.randomUUID();
      const response = await submitCheckout(
        {
          cartToken: cartData?.id,
          email: email.trim() || undefined,
          phone: cleanPhone,
          shippingAddress: address,
          paymentMethod,
          customerNote: customerNote.trim() || undefined,
        },
        idempotencyKey
      );

      // Save address to localStorage for future orders
      try {
        localStorage.setItem(
          SAVED_ADDRESS_STORAGE_KEY,
          JSON.stringify({
            fullName: fullName.trim(),
            phone: cleanPhone,
            email: email.trim(),
            city: effectiveCity,
            district: district.trim(),
            ward: ward.trim(),
            line1: line1.trim(),
          })
        );
      } catch {
        // Ignore localStorage errors
      }

      clearCart();
      toast.success('Đặt hàng thành công! Đang chuyển hướng…');

      // Navigate to order success page
      window.location.href = `/order-success?code=${encodeURIComponent(response.orderCode)}`;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.';
      setError(message);
      toast.error(message);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      {/* Checkout Form */}
      <div className="lg:col-span-7">
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">Chưa thể hoàn tất đặt hàng</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* 1. Thông tin giao hàng */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  1
                </span>
                Thông tin nhận hàng
              </h2>

              {isAutoFilled && (
                <button
                  type="button"
                  onClick={() => {
                    setFullName('');
                    setPhone('');
                    setEmail('');
                    setLine1('');
                    setDistrict('');
                    setWard('');
                    setCity('TP. Hồ Chí Minh');
                    setCustomCity('');
                    setIsAutoFilled(false);
                  }}
                  className="text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Nhập địa chỉ mới
                </button>
              )}
            </div>

            {isAutoFilled && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Đã tự động điền địa chỉ & số điện thoại từ đơn hàng trước của bạn.</span>
              </div>
            )}

            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="fullName" className="block text-xs font-medium text-foreground">
                    Họ và tên <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-foreground"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-xs font-medium text-foreground">
                    Số điện thoại <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912345678"
                    className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-foreground"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-medium text-foreground">
                  Email nhận thông báo <span className="text-muted-foreground font-normal">(không bắt buộc)</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-foreground"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="city" className="block text-xs font-medium text-foreground">
                    Tỉnh / Thành phố <span className="text-destructive">*</span>
                  </label>
                  <select
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-foreground"
                  >
                    {POPULAR_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="district" className="block text-xs font-medium text-foreground">
                    Quận / Huyện
                  </label>
                  <input
                    id="district"
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="Quận 1, Cầu Giấy…"
                    className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-foreground"
                  />
                </div>

                <div>
                  <label htmlFor="ward" className="block text-xs font-medium text-foreground">
                    Phường / Xã
                  </label>
                  <input
                    id="ward"
                    type="text"
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    placeholder="Phường Bến Nghé…"
                    className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-foreground"
                  />
                </div>
              </div>

              {city === 'Tỉnh / Thành khác' && (
                <div>
                  <label htmlFor="customCity" className="block text-xs font-medium text-foreground">
                    Nhập tên Tỉnh / Thành phố cụ thể <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="customCity"
                    type="text"
                    required
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                    placeholder="Tên Tỉnh hoặc Thành phố của bạn"
                    className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-foreground"
                  />
                </div>
              )}

              <div>
                <label htmlFor="line1" className="block text-xs font-medium text-foreground">
                  Địa chỉ chi tiết (Số nhà, tên đường, tòa nhà) <span className="text-destructive">*</span>
                </label>
                <input
                  id="line1"
                  type="text"
                  required
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  placeholder="Ví dụ: 123 Nguyễn Huệ, Chung cư Horizon, P. Tân Định"
                  className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-foreground"
                />
              </div>

              <div>
                <label htmlFor="customerNote" className="block text-xs font-medium text-foreground">
                  Ghi chú đơn hàng <span className="text-muted-foreground font-normal">(tùy chọn)</span>
                </label>
                <textarea
                  id="customerNote"
                  rows={2}
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder="Ví dụ: Giao giờ hành chính, gọi điện trước khi giao hàng…"
                  className="mt-1.5 w-full rounded-lg border border-border bg-background p-3 text-sm outline-none transition focus:border-foreground"
                />
              </div>
            </div>
          </div>

          {/* 2. Phương thức thanh toán */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                2
              </span>
              Phương thức thanh toán
            </h2>

            <div className="mt-5 space-y-3">
              {/* VietQR Option */}
              <label
                className={`relative flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition ${
                  paymentMethod === 'VIETQR'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-background hover:border-foreground/30'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="VIETQR"
                  checked={paymentMethod === 'VIETQR'}
                  onChange={() => setPaymentMethod('VIETQR')}
                  className="mt-1 text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-foreground">Chuyển khoản VietQR (Ngân hàng 24/7)</span>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      Khuyên dùng
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Quét mã QR tự động hiển thị số tiền & nội dung qua mọi ứng dụng ngân hàng (Vietcombank, MB, Techcombank, VPBank, v.v.).
                  </p>
                </div>
              </label>

              {/* COD Option */}
              <label
                className={`relative flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition ${
                  paymentMethod === 'COD'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-background hover:border-foreground/30'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="COD"
                  checked={paymentMethod === 'COD'}
                  onChange={() => setPaymentMethod('COD')}
                  className="mt-1 text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-foreground" />
                    <span className="font-semibold text-foreground">Thanh toán khi nhận hàng (COD)</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Nhận hàng và thanh toán tiền mặt trực tiếp cho nhân viên vận chuyển tận nơi.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Submit Button (Mobile / Tablet helper) */}
          <div className="lg:hidden">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Đang xử lý đơn hàng…</span>
                </>
              ) : (
                <>
                  <span>Xác nhận đặt hàng · {formatCents(totalCents)}</span>
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Order Summary Sidebar */}
      <div className="lg:col-span-5">
        <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-xs">
          <h2 className="text-base font-semibold">Tóm tắt đơn hàng ({cartData.itemCount} món)</h2>

          {/* Free shipping progress */}
          <div className="mt-4 rounded-xl bg-muted/60 p-3 text-xs">
            {isFreeShipping ? (
              <p className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>Đơn hàng đã đủ điều kiện <strong>Miễn phí vận chuyển</strong></span>
              </p>
            ) : (
              <p className="text-muted-foreground">
                Mua thêm <strong>{formatCents(remainingForFreeShipping)}</strong> để được <strong>Freeship toàn quốc</strong>!
              </p>
            )}
          </div>

          {/* Item List */}
          <div className="mt-4 max-h-72 divide-y divide-border/60 overflow-y-auto pr-1">
            {cartData.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.productName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    SKU: {item.sku} · SL: {item.qty}
                  </p>
                </div>
                <div className="text-right text-sm font-medium">
                  {formatCents(item.lineTotalCents)}
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Breakdown */}
          <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Tạm tính</span>
              <span className="font-medium text-foreground">{formatCents(cartData.subtotalCents)}</span>
            </div>

            {cartData.discountCents > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Mã giảm giá {cartData.couponCode ? `(${cartData.couponCode})` : ''}</span>
                <span className="font-medium text-accent">−{formatCents(cartData.discountCents)}</span>
              </div>
            )}

            <div className="flex justify-between text-muted-foreground">
              <span>Phí vận chuyển</span>
              <span className="font-medium text-foreground">
                {isFreeShipping ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Miễn phí</span>
                ) : (
                  formatCents(shippingCents)
                )}
              </span>
            </div>

            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold text-foreground">
              <span>Tổng thanh toán</span>
              <span className="text-lg text-primary">{formatCents(totalCents)}</span>
            </div>
          </div>

          {/* Submit button (Desktop) */}
          <div className="mt-6 hidden lg:block">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang xử lý đơn hàng…</span>
                </>
              ) : (
                <>
                  <span>Xác nhận đặt hàng</span>
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          {/* Guarantee Badges */}
          <div className="mt-6 space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Cam kết sản phẩm chất lượng chuẩn mô tả</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Hỗ trợ đổi trả trong vòng 30 ngày</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

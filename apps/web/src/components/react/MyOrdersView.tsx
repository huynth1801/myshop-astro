import { useEffect, useState, useMemo } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Package,
  PackageCheck,
  QrCode,
  Search,
  ShoppingBag,
  Store,
  Truck,
} from 'lucide-react';
import { formatCents } from '../../lib/money';
import { getOrder, cancelCustomerOrder, type OrderDetail } from '../../lib/api/orders';
import {
  getRecentOrderCodes,
  addRecentOrderCode,
} from '../../lib/stores/recent-orders';
import { toast } from '../../lib/stores/toast';
import { authOpen, authUser } from '../../lib/stores/auth';
import { useStore } from '../../lib/stores/useStore';
import ConfirmDialog from './ConfirmDialog';

type TabKey = 'ALL' | 'PAY' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PAY', label: 'Chờ thanh toán' },
  { key: 'SHIPPING', label: 'Chờ giao hàng' },
  { key: 'COMPLETED', label: 'Hoàn thành' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

export default function MyOrdersView() {
  const user = useStore(authUser);
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [addingCode, setAddingCode] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<OrderDetail | null>(null);
  const [cancelling, setCancelling] = useState(false);

  async function handleConfirmCancel() {
    if (!orderToCancel) return;
    setCancelling(true);
    try {
      const updated = await cancelCustomerOrder(orderToCancel.orderCode);
      setOrders((prev) =>
        prev.map((o) => (o.orderCode === updated.orderCode ? updated : o))
      );
      toast.success(`Đã hủy đơn hàng #${updated.orderCode} thành công!`);
      setOrderToCancel(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể hủy đơn hàng. Vui lòng thử lại.');
    } finally {
      setCancelling(false);
    }
  }

  // Load all recent orders on mount and whenever user auth state changes
  useEffect(() => {
    loadOrders();

    const handleStorageChange = () => {
      loadOrders();
    };
    window.addEventListener('recent-orders-changed', handleStorageChange);
    return () => window.removeEventListener('recent-orders-changed', handleStorageChange);
  }, [user]);

  async function loadOrders() {
    setLoading(true);
    const codes = getRecentOrderCodes();

    if (codes.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      const results = await Promise.allSettled(codes.map((code) => getOrder(code)));
      const fetched: OrderDetail[] = [];

      results.forEach((res, index) => {
        if (res.status === 'fulfilled') {
          fetched.push(res.value);
        } else {
          // If order does not exist or 404, we don't break the whole list
          console.warn(`Could not load order ${codes[index]}:`, res.reason);
        }
      });

      // Sort newest first
      fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(fetched);
    } catch {
      toast.error('Không thể tải một số thông tin đơn hàng.');
    } finally {
      setLoading(false);
    }
  }

  // Handle manual code addition (e.g. from another device or email)
  async function handleAddManualCode(e: React.FormEvent) {
    e.preventDefault();
    const clean = manualCode.trim().toUpperCase();
    if (!clean) return;

    setAddingCode(true);
    try {
      const detail = await getOrder(clean);
      addRecentOrderCode(detail.orderCode);
      setManualCode('');
      toast.success(`Đã thêm đơn hàng ${detail.orderCode}!`);
      // Update local state directly
      setOrders((prev) => [detail, ...prev.filter((o) => o.orderCode !== detail.orderCode)]);
    } catch {
      toast.error(`Không tìm thấy đơn hàng "${clean}". Vui lòng kiểm tra lại.`);
    } finally {
      setAddingCode(false);
    }
  }

  function copyToClipboard(text: string, key: string, label: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedKey(key);
        toast.success(`Đã sao chép ${label}!`);
        setTimeout(() => setCopiedKey(null), 2000);
      })
      .catch(() => {
        toast.error('Không thể sao chép vào bộ nhớ tạm.');
      });
  }

  // Tab counts
  const counts = useMemo(() => {
    let pay = 0;
    let shipping = 0;
    let completed = 0;
    let cancelled = 0;

    for (const order of orders) {
      if (order.status === 'PENDING' && order.paymentMethod === 'VIETQR') {
        pay++;
      } else if (
        order.status === 'CONFIRMED' ||
        order.status === 'SHIPPING' ||
        (order.status === 'PENDING' && order.paymentMethod === 'COD')
      ) {
        shipping++;
      } else if (order.status === 'FULFILLED' || order.status === 'PAID') {
        completed++;
      } else if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
        cancelled++;
      }
    }

    return { all: orders.length, pay, shipping, completed, cancelled };
  }, [orders]);

  // Filtered orders by active tab
  const filteredOrders = useMemo(() => {
    switch (activeTab) {
      case 'PAY':
        return orders.filter((o) => o.status === 'PENDING' && o.paymentMethod === 'VIETQR');
      case 'SHIPPING':
        return orders.filter(
          (o) =>
            o.status === 'CONFIRMED' ||
            o.status === 'SHIPPING' ||
            (o.status === 'PENDING' && o.paymentMethod === 'COD')
        );
      case 'COMPLETED':
        return orders.filter((o) => o.status === 'FULFILLED' || o.status === 'PAID');
      case 'CANCELLED':
        return orders.filter((o) => o.status === 'CANCELLED' || o.status === 'REFUNDED');
      case 'ALL':
      default:
        return orders;
    }
  }, [orders, activeTab]);

  function getStatusBadge(order: OrderDetail) {
    if (order.status === 'PENDING' && order.paymentMethod === 'VIETQR') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
          <Clock className="h-3.5 w-3.5" />
          Chờ thanh toán VietQR
        </span>
      );
    }
    if (order.status === 'PENDING' && order.paymentMethod === 'COD') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400">
          <Clock className="h-3.5 w-3.5" />
          Chờ xác nhận (COD)
        </span>
      );
    }
    if (order.status === 'CONFIRMED') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Đã xác nhận
        </span>
      );
    }
    if (order.status === 'SHIPPING') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
          <Truck className="h-3.5 w-3.5" />
          Đang vận chuyển
        </span>
      );
    }
    if (order.status === 'FULFILLED' || order.status === 'PAID') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <PackageCheck className="h-3.5 w-3.5" />
          Hoàn thành
        </span>
      );
    }
    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          Đã hủy
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
        {order.status}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* Login Prompt for guests */}
      {!user && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-xs shadow-xs">
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <AlertCircle className="h-4 w-4 shrink-0 text-primary" />
            <span>
              Bạn chưa đăng nhập. Đăng nhập để đồng bộ và xem tất cả đơn mua của tài khoản.
            </span>
          </div>
          <button
            type="button"
            onClick={() => authOpen.set(true)}
            className="rounded-full bg-primary px-4 py-1.5 font-semibold text-primary-foreground shadow-xs transition hover:opacity-90 active:scale-95"
          >
            Đăng nhập ngay
          </button>
        </div>
      )}

      {/* Shopee-style Status Tabs */}
      <div className="sticky top-16 z-20 -mx-4 border-b border-border bg-background/95 px-4 backdrop-blur-md sm:mx-0 sm:px-0">
        <div className="flex gap-2 overflow-x-auto no-scrollbar sm:gap-4">
          {TABS.map((tab) => {
            const count =
              tab.key === 'ALL'
                ? counts.all
                : tab.key === 'PAY'
                ? counts.pay
                : tab.key === 'SHIPPING'
                ? counts.shipping
                : tab.key === 'COMPLETED'
                ? counts.completed
                : counts.cancelled;

            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex shrink-0 items-center gap-2 border-b-2 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider transition ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                      tab.key === 'PAY'
                        ? 'bg-[#ee4d2d] text-white'
                        : isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual Code Lookup Bar (Subtle & Convenient) */}
      <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
        <form onSubmit={handleAddManualCode} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Bạn đặt hàng trên thiết bị khác? Nhập mã đơn (vd: ORD-20261014-ABC12)..."
              className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground sm:text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={addingCode || !manualCode.trim()}
            className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
          >
            {addingCode ? 'Đang tìm…' : 'Thêm vào danh sách'}
          </button>
        </form>
      </div>

      {/* Orders List / Loading / Empty State */}
      {loading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center py-12 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-xs text-muted-foreground">Đang tải danh sách đơn hàng của bạn…</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="mx-auto max-w-md py-16 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="h-10 w-10 text-muted-foreground/60" />
          </div>
          <h2 className="mt-4 text-base font-semibold">
            {activeTab === 'ALL'
              ? 'Bạn chưa có đơn hàng nào'
              : `Không có đơn hàng nào ở mục "${TABS.find((t) => t.key === activeTab)?.label}"`}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeTab === 'ALL'
              ? 'Tất cả các đơn hàng bạn đã đặt sẽ tự động hiển thị tại đây mà không cần tìm kiếm.'
              : 'Hãy chuyển qua tab "Tất cả" hoặc mua sắm thêm sản phẩm yêu thích nhé.'}
          </p>
          <a
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Tiếp tục mua sắm</span>
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isUnpaidVietQr = order.paymentMethod === 'VIETQR' && order.status === 'PENDING';
            const orderDate = new Date(order.createdAt).toLocaleString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={order.id}
                className={`overflow-hidden rounded-2xl border bg-card shadow-xs transition hover:shadow-sm ${
                  isUnpaidVietQr ? 'border-amber-500/40' : 'border-border'
                }`}
              >
                {/* Shopee Card Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-muted/20 px-4 py-3 sm:px-6">
                  <div className="flex items-center gap-2 text-xs">
                    <Store className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-foreground">Thuy Shop</span>
                    <span className="text-muted-foreground">|</span>
                    <span className="font-mono font-medium text-foreground">
                      #{order.orderCode}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(order.orderCode, order.orderCode, 'Mã đơn hàng')
                      }
                      title="Sao chép mã đơn"
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {copiedKey === order.orderCode ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                    <span className="hidden text-muted-foreground sm:inline">· {orderDate}</span>
                  </div>

                  <div className="flex items-center gap-2">{getStatusBadge(order)}</div>
                </div>

                {/* Unpaid Alert Banner (If VietQR Pending) */}
                {isUnpaidVietQr && (
                  <div className="flex items-center justify-between gap-2 border-b border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-300 sm:px-6">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 shrink-0 text-amber-600" />
                      <span>
                        Đơn hàng chưa hoàn tất thanh toán. Vui lòng quét mã QR chuyển khoản để đơn được xử lý.
                      </span>
                    </div>
                    <a
                      href={`/order-success?code=${encodeURIComponent(order.orderCode)}`}
                      className="shrink-0 font-semibold text-[#ee4d2d] underline hover:opacity-80"
                    >
                      Quét mã QR ngay
                    </a>
                  </div>
                )}

                {/* Shopee Card Body: Items List */}
                <div className="divide-y divide-border/60 px-4 sm:px-6">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 py-3 sm:gap-4 sm:py-4"
                    >
                      {/* Product Thumbnail */}
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40 sm:h-20 sm:w-20">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <Package className="h-6 w-6" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-xs font-medium text-foreground sm:text-sm">
                          {item.productName}
                        </h3>
                        <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
                          Mã SKU: <span className="font-mono">{item.sku}</span>
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Số lượng: <span className="font-semibold text-foreground">x{item.qty}</span>
                        </p>
                      </div>

                      {/* Item Price */}
                      <div className="text-right text-xs font-semibold text-foreground sm:text-sm">
                        {formatCents(item.totalPriceCents)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shopee Card Footer: Totals & Action Buttons */}
                <div className="border-t border-border/70 bg-muted/10 px-4 py-4 sm:px-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Payment Info */}
                    <div className="text-xs text-muted-foreground">
                      Phương thức:
                      <span className="ml-1 font-medium text-foreground">
                        {order.paymentMethod === 'VIETQR'
                          ? 'Chuyển khoản VietQR'
                          : order.paymentMethod === 'COD'
                          ? 'Thanh toán khi nhận hàng (COD)'
                          : 'Thẻ thanh toán (Stripe)'}
                      </span>
                    </div>

                    {/* Total Amount */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-muted-foreground">Thành tiền:</span>
                      <span className="text-base font-bold text-[#ee4d2d] dark:text-[#ff6533] sm:text-lg">
                        {formatCents(order.totalCents)}
                      </span>
                    </div>
                  </div>

                  {/* Actions Group (Shopee style buttons) */}
                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5">
                    {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                      <button
                        type="button"
                        onClick={() => setOrderToCancel(order)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-background px-4 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/10 hover:border-destructive/60"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        <span>Hủy đơn</span>
                      </button>
                    )}

                    {isUnpaidVietQr && (
                      <a
                        href={`/order-success?code=${encodeURIComponent(order.orderCode)}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#ee4d2d] px-5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#d73211]"
                      >
                        <QrCode className="h-4 w-4" />
                        <span>Thanh toán ngay</span>
                      </a>
                    )}

                    <a
                      href={`/order-success?code=${encodeURIComponent(order.orderCode)}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Chi tiết đơn hàng</span>
                    </a>

                    <a
                      href="/"
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>Mua thêm</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Order Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!orderToCancel}
        title="Xác nhận hủy đơn hàng"
        description={
          orderToCancel ? (
            <>
              Bạn có chắc chắn muốn hủy đơn hàng <strong>#{orderToCancel.orderCode}</strong> không?
              <br />
              <span className="mt-1 block text-muted-foreground">
                Số lượng sản phẩm trong đơn sẽ được hoàn lại kho cho các khách hàng khác.
              </span>
            </>
          ) : undefined
        }
        note="Thao tác này sẽ hủy đơn hàng và không thể khôi phục."
        icon={<Ban className="h-5 w-5 text-destructive" />}
        confirmIcon={<Ban className="h-3.5 w-3.5 text-white" />}
        confirmLabel="Xác nhận hủy đơn"
        cancelLabel="Giữ lại đơn"
        variant="danger"
        isLoading={cancelling}
        onConfirm={handleConfirmCancel}
        onClose={() => setOrderToCancel(null)}
      />
    </div>
  );
}

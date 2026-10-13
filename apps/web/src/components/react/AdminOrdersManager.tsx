import { useCallback, useEffect, useState } from 'react';
import {
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  PackageCheck,
  QrCode,
  RefreshCw,
  Search,
  Truck,
  X,
} from 'lucide-react';
import { formatCents } from '../../lib/money';
import { authUser, bootstrapAuth } from '../../lib/stores/auth';
import { useStore } from '../../lib/stores/useStore';
import { toast } from '../../lib/stores/toast';
import ConfirmDialog from './ConfirmDialog';
import {
  cancelAdminOrder,
  getAdminOrderDetail,
  getAdminOrderMetrics,
  listAdminOrders,
  updateAdminOrderStatus,
  type AdminOrderMetrics,
  type AdminOrderSummary,
  type OrderDetail,
  type OrderStatus,
} from '../../lib/api/orders';

const STATUS_TABS: { key: string; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ xử lý' },
  { key: 'CONFIRMED', label: 'Đã xác nhận' },
  { key: 'SHIPPING', label: 'Đang giao' },
  { key: 'FULFILLED', label: 'Hoàn thành' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

export default function AdminOrdersManager() {
  const user = useStore(authUser);

  // Metrics
  const [metrics, setMetrics] = useState<AdminOrderMetrics | null>(null);

  // List State
  const [orders, setOrders] = useState<AdminOrderSummary[] | null>(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected Order / Drawer
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Cancel Confirmation Dialog
  const [cancelDialogOrder, setCancelDialogOrder] = useState<OrderDetail | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    void bootstrapAuth();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadMetrics = useCallback(async () => {
    try {
      const data = await getAdminOrderMetrics();
      setMetrics(data);
    } catch {
      // ignore metrics error
    }
  }, []);

  const loadOrders = useCallback(
    async (targetPage = page) => {
      setLoading(true);
      setError(null);
      try {
        const data = await listAdminOrders({
          page: targetPage,
          size: 15,
          status: activeTab === 'ALL' ? undefined : activeTab,
          search: debouncedSearch.trim() || undefined,
        });
        setOrders(data.content);
        setPage(data.page);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Không tải được danh sách đơn hàng.');
      } finally {
        setLoading(false);
      }
    },
    [activeTab, debouncedSearch, page]
  );

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      void loadMetrics();
      void loadOrders(0);
    }
  }, [user, activeTab, debouncedSearch]);

  const openOrderDetail = async (id: string) => {
    setSelectedOrderId(id);
    setLoadingDetail(true);
    setOrderDetail(null);
    try {
      const data = await getAdminOrderDetail(id);
      setOrderDetail(data);
    } catch (err: unknown) {
      toast.error('Không tải được thông tin đơn hàng');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleStatusChange = async (nextStatus: OrderStatus) => {
    if (!orderDetail) return;
    setUpdatingStatus(true);
    try {
      const updated = await updateAdminOrderStatus(orderDetail.id, nextStatus);
      setOrderDetail(updated);
      toast.success(`Đã cập nhật trạng thái sang ${nextStatus}`);
      void loadOrders(page);
      void loadMetrics();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Cập nhật trạng thái thất bại.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelDialogOrder) return;
    setCancelling(true);
    try {
      const updated = await cancelAdminOrder(cancelDialogOrder.id);
      if (orderDetail?.id === cancelDialogOrder.id) {
        setOrderDetail(updated);
      }
      toast.success(`Đã hủy đơn ${cancelDialogOrder.orderCode} và hoàn tồn kho thành công!`);
      setCancelDialogOrder(null);
      void loadOrders(page);
      void loadMetrics();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không thể hủy đơn hàng.');
    } finally {
      setCancelling(false);
    }
  };

  if (!user) {
    return (
      <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Cần đăng nhập tài khoản ADMIN — bấm <strong>Đăng nhập</strong> trên thanh menu.
      </p>
    );
  }

  if (user.role !== 'ADMIN') {
    return (
      <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Tài khoản <strong>{user.email}</strong> không có quyền quản trị.
      </p>
    );
  }

  function renderStatusBadge(status: string) {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <Clock className="h-3 w-3" />
            Chờ xử lý
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">
            <CheckCircle2 className="h-3 w-3" />
            Đã xác nhận
          </span>
        );
      case 'SHIPPING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-400">
            <Truck className="h-3 w-3" />
            Đang giao
          </span>
        );
      case 'FULFILLED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <PackageCheck className="h-3 w-3" />
            Hoàn thành
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
            <Ban className="h-3 w-3" />
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {status}
          </span>
        );
    }
  }

  function formatDate(dateStr: string) {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      {metrics && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Tổng đơn hàng</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{metrics.totalOrders}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Chờ xử lý</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-300">
              {metrics.pendingCount}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Đã xác nhận</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-blue-700 dark:text-blue-300">
              {metrics.confirmedCount}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Đang giao</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-indigo-700 dark:text-indigo-300">
              {metrics.shippingCount}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Hoàn thành</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
              {metrics.fulfilledCount}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Doanh thu ghi nhận</p>
            <p className="mt-1 text-lg font-bold tracking-tight text-primary">
              {formatCents(metrics.totalRevenueCents)}
            </p>
          </div>
        </div>
      )}

      {/* Toolbar & Filter Tabs */}
      <div className="space-y-4 rounded-xl border border-border bg-card p-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setPage(0);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                activeTab === tab.key
                  ? 'bg-foreground text-background font-semibold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {tab.label}
              {metrics && tab.key === 'PENDING' && metrics.pendingCount > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] text-amber-700 dark:text-amber-300">
                  {metrics.pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-64 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã đơn (MS-…), tên hoặc số điện thoại khách…"
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-xs outline-none transition focus:border-foreground"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              void loadOrders(page);
              void loadMetrics();
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        {error && (
          <div className="p-4 text-xs text-destructive bg-destructive/10 border-b border-border">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Mã đơn</th>
                <th className="px-4 py-3">Ngày tạo</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Thanh toán</th>
                <th className="px-4 py-3">Số lượng</th>
                <th className="px-4 py-3">Tổng tiền</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading && orders === null && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    <p className="mt-2">Đang tải danh sách đơn hàng…</p>
                  </td>
                </tr>
              )}

              {!loading && orders && orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    Không có đơn hàng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              )}

              {orders?.map((ord) => (
                <tr key={ord.id} className="transition hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono font-bold text-foreground">
                    {ord.orderCode}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {formatDate(ord.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{ord.customerName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {ord.customerPhone} {ord.customerCity ? `· ${ord.customerCity}` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {ord.paymentMethod === 'VIETQR' ? (
                      <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        <QrCode className="h-3 w-3" />
                        VietQR
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                        <Truck className="h-3 w-3" />
                        COD
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-muted-foreground">
                    {ord.itemCount} món
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">
                    {formatCents(ord.totalCents)}
                  </td>
                  <td className="px-4 py-3">{renderStatusBadge(ord.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void openOrderDetail(ord.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Xem</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <span>
              Tổng số <strong>{totalElements}</strong> đơn hàng · Trang {page + 1}/{totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => void loadOrders(page - 1)}
                className="rounded-lg border border-border px-2.5 py-1 font-medium transition hover:bg-muted disabled:opacity-40"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => void loadOrders(page + 1)}
                className="rounded-lg border border-border px-2.5 py-1 font-medium transition hover:bg-muted disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal / Drawer */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setSelectedOrderId(null)}
          />

          <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Chi tiết đơn hàng {orderDetail ? orderDetail.orderCode : ''}
                </h3>
                {orderDetail && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Tạo lúc {formatDate(orderDetail.createdAt)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderId(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {loadingDetail && (
                <div className="py-16 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  <p className="mt-2 text-xs">Đang tải chi tiết đơn hàng…</p>
                </div>
              )}

              {orderDetail && (
                <>
                  {/* Status & Transitions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-4">
                    <div>
                      <span className="text-xs text-muted-foreground">Trạng thái hiện tại:</span>
                      <div className="mt-1">{renderStatusBadge(orderDetail.status)}</div>
                    </div>

                    {/* Action buttons depending on status */}
                    <div className="flex flex-wrap items-center gap-2">
                      {orderDetail.status === 'PENDING' && (
                        <button
                          type="button"
                          disabled={updatingStatus}
                          onClick={() => void handleStatusChange('CONFIRMED')}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Xác nhận đơn</span>
                        </button>
                      )}

                      {orderDetail.status === 'CONFIRMED' && (
                        <button
                          type="button"
                          disabled={updatingStatus}
                          onClick={() => void handleStatusChange('SHIPPING')}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-50"
                        >
                          <Truck className="h-3.5 w-3.5" />
                          <span>Chuyển sang giao hàng</span>
                        </button>
                      )}

                      {orderDetail.status === 'SHIPPING' && (
                        <button
                          type="button"
                          disabled={updatingStatus}
                          onClick={() => void handleStatusChange('FULFILLED')}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                          <span>Hoàn thành đơn</span>
                        </button>
                      )}

                      {orderDetail.status !== 'CANCELLED' && orderDetail.status !== 'FULFILLED' && (
                        <button
                          type="button"
                          disabled={updatingStatus}
                          onClick={() => setCancelDialogOrder(orderDetail)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          <span>Hủy đơn</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Customer & Address */}
                  <div className="rounded-xl border border-border bg-background p-4 space-y-2 text-xs">
                    <h4 className="font-bold text-foreground">Thông tin người nhận</h4>
                    {orderDetail.shippingAddress ? (
                      <div className="space-y-1 text-muted-foreground">
                        <p className="font-semibold text-foreground">
                          {orderDetail.shippingAddress.fullName} · {orderDetail.shippingAddress.phone}
                        </p>
                        {orderDetail.shippingAddress.email && (
                          <p>Email: {orderDetail.shippingAddress.email}</p>
                        )}
                        <p>
                          Địa chỉ: {orderDetail.shippingAddress.line1}
                          {orderDetail.shippingAddress.ward ? `, ${orderDetail.shippingAddress.ward}` : ''}
                          {orderDetail.shippingAddress.district ? `, ${orderDetail.shippingAddress.district}` : ''}
                          {orderDetail.shippingAddress.city ? `, ${orderDetail.shippingAddress.city}` : ''}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Không có địa chỉ.</p>
                    )}

                    {orderDetail.customerNote && (
                      <div className="mt-2 rounded-lg bg-muted p-2 text-muted-foreground">
                        <span className="font-medium text-foreground">Ghi chú từ khách:</span> {orderDetail.customerNote}
                      </div>
                    )}
                  </div>

                  {/* Item List */}
                  <div className="rounded-xl border border-border bg-background p-4">
                    <h4 className="font-bold text-xs text-foreground mb-3">Sản phẩm đặt mua</h4>
                    <div className="divide-y divide-border/60">
                      {orderDetail.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2.5 text-xs first:pt-0 last:pb-0">
                          <div className="min-w-0 flex-1 pr-3">
                            <p className="font-medium text-foreground truncate">{item.productName}</p>
                            <p className="text-muted-foreground text-[11px]">
                              SKU: {item.sku} · SL: {item.qty} × {formatCents(item.unitPriceCents)}
                            </p>
                          </div>
                          <div className="font-semibold text-foreground">
                            {formatCents(item.totalPriceCents)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Breakdown */}
                    <div className="mt-4 border-t border-border pt-3 space-y-1.5 text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Tạm tính</span>
                        <span className="font-medium text-foreground">{formatCents(orderDetail.subtotalCents)}</span>
                      </div>
                      {orderDetail.discountCents > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Giảm giá</span>
                          <span className="font-medium text-accent">−{formatCents(orderDetail.discountCents)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-muted-foreground">
                        <span>Phí giao hàng</span>
                        <span className="font-medium text-foreground">
                          {orderDetail.shippingCents === 0 ? 'Miễn phí' : formatCents(orderDetail.shippingCents)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-2 text-sm font-bold text-foreground">
                        <span>Tổng tiền</span>
                        <span className="text-primary">{formatCents(orderDetail.totalCents)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-6 py-3 text-right">
              <button
                type="button"
                onClick={() => setSelectedOrderId(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Cancel Dialog */}
      <ConfirmDialog
        isOpen={!!cancelDialogOrder}
        title="Xác nhận hủy đơn hàng"
        description={
          cancelDialogOrder ? (
            <>
              Bạn có chắc chắn muốn hủy đơn hàng <strong>{cancelDialogOrder.orderCode}</strong>?
              <br />
              <span className="mt-1 block text-muted-foreground">
                Hệ thống sẽ tự động hoàn trả số lượng tồn kho của các sản phẩm trong đơn này.
              </span>
            </>
          ) : undefined
        }
        confirmLabel="Hủy đơn & Hoàn tồn kho"
        cancelLabel="Đóng"
        variant="danger"
        isLoading={cancelling}
        onConfirm={handleConfirmCancel}
        onClose={() => setCancelDialogOrder(null)}
      />
    </div>
  );
}

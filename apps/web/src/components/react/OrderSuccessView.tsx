import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Package,
  PackageCheck,
  Printer,
  QrCode,
  Share2,
  Truck,
} from 'lucide-react';
import { formatCents } from '../../lib/money';
import { getOrder, cancelCustomerOrder, type OrderDetail } from '../../lib/api/orders';
import { addRecentOrderCode } from '../../lib/stores/recent-orders';
import { toast } from '../../lib/stores/toast';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  initialCode?: string;
  initialOrder?: OrderDetail | null;
}

export default function OrderSuccessView({ initialCode, initialOrder }: Props) {
  const [order, setOrder] = useState<OrderDetail | null>(initialOrder ?? null);
  const [loading, setLoading] = useState(!initialOrder && !!initialCode);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  async function handleConfirmCancel() {
    if (!order) return;
    setCancelling(true);
    try {
      const updated = await cancelCustomerOrder(order.orderCode);
      setOrder(updated);
      toast.success(`Đã hủy đơn hàng #${updated.orderCode} thành công!`);
      setShowCancelDialog(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể hủy đơn hàng. Vui lòng thử lại.');
    } finally {
      setCancelling(false);
    }
  }

  useEffect(() => {
    const code = initialCode || new URLSearchParams(window.location.search).get('code');
    if (!code) {
      setError('Không tìm thấy thông tin mã đơn hàng.');
      setLoading(false);
      return;
    }

    if (!order) {
      setLoading(true);
      getOrder(code)
        .then((data) => {
          setOrder(data);
          addRecentOrderCode(data.orderCode);
          setError(null);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Không tìm thấy thông tin đơn hàng.');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      addRecentOrderCode(order.orderCode);
    }
  }, [initialCode]);

  function copyToClipboard(text: string, key: string, label: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedKey(key);
        toast.success(`Đã sao chép ${label}!`);
        setTimeout(() => setCopiedKey(null), 2500);
      })
      .catch(() => {
        toast.error('Không thể sao chép vào bộ nhớ tạm.');
      });
  }

  if (loading) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-4 text-sm text-muted-foreground">Đang tải chi tiết đơn hàng…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">Không tìm thấy đơn hàng</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error || 'Mã đơn hàng không hợp lệ hoặc đã bị thay đổi.'}
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Về trang chủ</span>
        </a>
      </div>
    );
  }

  const isVietQr = order.paymentMethod === 'VIETQR';
  const isCod = order.paymentMethod === 'COD';
  const isCancelled = order.status === 'CANCELLED';

  function renderStatusBadge(status: string) {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <Clock className="h-3.5 w-3.5" />
            Chờ xác nhận
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Đã xác nhận
          </span>
        );
      case 'SHIPPING':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
            <Truck className="h-3.5 w-3.5" />
            Đang vận chuyển
          </span>
        );
      case 'FULFILLED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <PackageCheck className="h-3.5 w-3.5" />
            Hoàn thành
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            {status}
          </span>
        );
    }
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div
        className={`rounded-2xl border p-6 text-center sm:p-8 ${
          isCancelled
            ? 'border-destructive/20 bg-destructive/5'
            : 'border-emerald-500/20 bg-emerald-500/5'
        }`}
      >
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            isCancelled
              ? 'bg-destructive/20 text-destructive'
              : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {isCancelled ? <AlertCircle className="h-8 w-8" /> : <CheckCircle2 className="h-8 w-8" />}
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {isCancelled ? 'Đơn hàng đã bị hủy' : 'Đặt hàng thành công!'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isCancelled
            ? 'Đơn hàng đã bị hủy (quá thời hạn thanh toán 24h hoặc theo yêu cầu). Sản phẩm đã được hoàn lại kho.'
            : 'Cảm ơn bạn đã tin chọn Thuy Shop. Đơn hàng của bạn đã được ghi nhận vào hệ thống.'}
        </p>
        {!isCancelled && order.shippingAddress?.email && (
          <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            ✉️ Thông tin xác nhận đơn hàng đã được gửi tới email <strong>{order.shippingAddress.email}</strong>
          </p>
        )}

        <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 shadow-xs">
          <span className="text-xs text-muted-foreground">Mã đơn hàng:</span>
          <span className="font-mono text-base font-bold tracking-wider text-foreground">
            {order.orderCode}
          </span>
          <button
            type="button"
            onClick={() => copyToClipboard(order.orderCode, 'orderCode', 'Mã đơn hàng')}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            {copiedKey === 'orderCode' ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>Sao chép</span>
          </button>
          <div className="h-4 w-px bg-border" />
          {renderStatusBadge(order.status)}
        </div>
      </div>

      {/* Main Grid: Payment Guide & Order Details */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Payment Guide Column */}
        <div className="lg:col-span-6 space-y-6">
          {isCancelled && (
            <div className="rounded-2xl border border-destructive/20 bg-card p-6 shadow-xs">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <h2 className="text-base font-semibold">Đơn hàng không còn hiệu lực</h2>
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Đơn hàng đã hết hạn thanh toán (24 giờ) hoặc đã bị hủy. Hệ thống không thể tiếp nhận thanh toán cho đơn hàng này nữa. Số lượng sản phẩm đã được tự động hoàn lại tồn kho cho người mua khác.
              </p>
              <div className="mt-5">
                <a
                  href="/products"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Tiếp tục mua sắm</span>
                </a>
              </div>
            </div>
          )}

          {!isCancelled && isVietQr && order.bankInfo && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold">Chuyển khoản VietQR</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Quét mã QR bằng App Ngân hàng bất kỳ để tự động điền đúng số tiền và nội dung chuyển khoản.
              </p>

              {/* VietQR Code Image */}
              {order.vietQrUrl && (
                <div className="mt-5 flex flex-col items-center justify-center rounded-xl border border-border bg-white p-4 text-center">
                  <img
                    src={order.vietQrUrl}
                    alt={`Mã VietQR cho đơn hàng ${order.orderCode}`}
                    className="h-64 w-64 object-contain shadow-xs"
                    loading="eager"
                  />
                  <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                    Hỗ trợ quét qua Vietcombank, MB, VPBank, Techcombank, BIDV, MoMo…
                  </p>
                </div>
              )}

              {/* Bank Details Table */}
              <div className="mt-5 divide-y divide-border/60 rounded-xl border border-border bg-background p-4 text-xs">
                <div className="flex items-center justify-between py-2.5 first:pt-0">
                  <span className="text-muted-foreground">Ngân hàng</span>
                  <span className="font-semibold text-foreground">{order.bankInfo.bankName}</span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="text-muted-foreground">Số tài khoản</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-foreground">
                      {order.bankInfo.bankAccount}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          order.bankInfo?.bankAccount || '',
                          'bankAccount',
                          'Số tài khoản'
                        )
                      }
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Sao chép số tài khoản"
                    >
                      {copiedKey === 'bankAccount' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="text-muted-foreground">Chủ tài khoản</span>
                  <span className="font-semibold text-foreground">{order.bankInfo.accountHolder}</span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="text-muted-foreground">Số tiền</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-primary text-sm">
                      {formatCents(order.totalCents)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          String(order.bankInfo?.amountVnd || ''),
                          'amountVnd',
                          'Số tiền'
                        )
                      }
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Sao chép số tiền"
                    >
                      {copiedKey === 'amountVnd' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2.5 last:pb-0">
                  <span className="text-muted-foreground">Nội dung CK</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-foreground">
                      {order.bankInfo.transferContent}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          order.bankInfo?.transferContent || '',
                          'transferContent',
                          'Nội dung chuyển khoản'
                        )
                      }
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Sao chép nội dung chuyển khoản"
                    >
                      {copiedKey === 'transferContent' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <p className="font-medium">Lưu ý quan trọng:</p>
                <p className="mt-0.5">
                  Vui lòng giữ nguyên nội dung chuyển khoản <strong>{order.bankInfo.transferContent}</strong> để hệ thống đối soát tự động xử lý đơn nhanh nhất.
                </p>
                <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                  ⏱️ Đơn hàng sẽ tự động hủy nếu không hoàn tất thanh toán trong vòng <strong>24 giờ</strong> kể từ lúc tạo đơn.
                </p>
              </div>
            </div>
          )}

          {!isCancelled && isCod && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold">Thanh toán khi nhận hàng (COD)</h2>
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Đơn hàng đã được ghi nhận và đang chuẩn bị đóng gói. Nhân viên giao hàng sẽ liên hệ với bạn trước khi giao.
              </p>

              <div className="mt-4 rounded-xl border border-border bg-background p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số tiền cần chuẩn bị:</span>
                  <span className="font-semibold text-foreground text-sm">
                    {formatCents(order.totalCents)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Thời gian giao dự kiến:</span>
                  <span className="font-medium text-foreground">2 - 4 ngày làm việc</span>
                </div>
              </div>
            </div>
          )}

          {/* Shipping Address Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-base font-semibold">Địa chỉ nhận hàng</h2>
            {order.shippingAddress ? (
              <div className="mt-3 space-y-1.5 text-xs">
                <p className="text-sm font-semibold text-foreground">
                  {order.shippingAddress.fullName} · {order.shippingAddress.phone}
                </p>
                {order.shippingAddress.email && (
                  <p className="text-muted-foreground">Email: {order.shippingAddress.email}</p>
                )}
                <p className="text-foreground leading-relaxed">
                  {order.shippingAddress.line1}
                  {order.shippingAddress.ward ? `, ${order.shippingAddress.ward}` : ''}
                  {order.shippingAddress.district ? `, ${order.shippingAddress.district}` : ''}
                  {order.shippingAddress.city ? `, ${order.shippingAddress.city}` : ''}
                </p>
                {order.customerNote && (
                  <div className="mt-2 rounded-lg bg-muted p-2.5 text-muted-foreground">
                    <span className="font-medium text-foreground">Ghi chú:</span> {order.customerNote}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Chưa có thông tin địa chỉ.</p>
            )}
          </div>
        </div>

        {/* Order Items & Totals Column */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-base font-semibold">Danh sách sản phẩm</h2>

            <div className="mt-4 divide-y divide-border/60">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="font-medium text-sm text-foreground truncate">{item.productName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Mã SKU: {item.sku} · SL: {item.qty} × {formatCents(item.unitPriceCents)}
                    </p>
                  </div>
                  <div className="text-right text-sm font-semibold text-foreground">
                    {formatCents(item.totalPriceCents)}
                  </div>
                </div>
              ))}
            </div>

            {/* Price Calculations */}
            <div className="mt-6 space-y-2 border-t border-border pt-4 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Tạm tính</span>
                <span className="font-medium text-foreground">{formatCents(order.subtotalCents)}</span>
              </div>

              {order.discountCents > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Giảm giá khuyến mãi</span>
                  <span className="font-medium text-accent">−{formatCents(order.discountCents)}</span>
                </div>
              )}

              <div className="flex justify-between text-muted-foreground">
                <span>Phí vận chuyển</span>
                <span className="font-medium text-foreground">
                  {order.shippingCents === 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400">Miễn phí</span>
                  ) : (
                    formatCents(order.shippingCents)
                  )}
                </span>
              </div>

              <div className="flex justify-between border-t border-border pt-3 text-base font-semibold text-foreground">
                <span>Tổng cộng</span>
                <span className="text-lg text-primary">{formatCents(order.totalCents)}</span>
              </div>
            </div>
          </div>

          {/* Helpful reminder for pending VietQR */}
          {isVietQr && order.status === 'PENDING' && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-blue-900 dark:text-blue-200">
              <p className="font-semibold flex items-center gap-1.5">
                <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Đơn hàng đã được lưu vào mục <strong>"Đơn mua"</strong></span>
              </p>
              <p className="mt-1 text-muted-foreground leading-relaxed">
                Nếu bạn vô tình chuyển trang hoặc rời đi trước khi thanh toán xong, bạn có thể bấm vào mục <strong>"Đơn mua"</strong> trên thanh menu bất kỳ lúc nào để lấy lại mã QR và thanh toán tiếp.
              </p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => copyToClipboard(typeof window !== 'undefined' ? window.location.href : '', 'orderUrl', 'Link thanh toán')}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-xs font-semibold text-foreground transition hover:bg-muted"
            >
              {copiedKey === 'orderUrl' ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Share2 className="h-3.5 w-3.5" />
              )}
              <span>Sao chép link</span>
            </button>

            <a
              href="/orders"
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-xs font-semibold text-foreground transition hover:bg-muted"
            >
              <Package className="h-3.5 w-3.5 text-primary" />
              <span>Xem đơn mua</span>
            </a>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-xs font-semibold text-foreground transition hover:bg-muted"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>In đơn hàng</span>
            </button>

            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-xs transition hover:opacity-90"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Tiếp tục mua sắm</span>
            </a>

            {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
              <button
                type="button"
                onClick={() => setShowCancelDialog(true)}
                className="inline-flex items-center gap-2 rounded-full border border-destructive/30 px-4 py-2.5 text-xs font-semibold text-destructive transition hover:bg-destructive/10 hover:border-destructive/60"
              >
                <Ban className="h-3.5 w-3.5" />
                <span>Hủy đơn hàng</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Order Confirm Dialog */}
      <ConfirmDialog
        isOpen={showCancelDialog}
        title="Xác nhận hủy đơn hàng"
        description={
          order ? (
            <>
              Bạn có chắc chắn muốn hủy đơn hàng <strong>#{order.orderCode}</strong> không?
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
        onClose={() => setShowCancelDialog(false)}
      />
    </div>
  );
}

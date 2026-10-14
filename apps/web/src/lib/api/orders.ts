import { z } from 'zod';
import { getValidAccessToken } from './auth';

export type PaymentMethod = 'COD' | 'VIETQR' | 'STRIPE';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PAID'
  | 'SHIPPING'
  | 'FULFILLED'
  | 'CANCELLED'
  | 'REFUNDED';

export const customerAddressSchema = z.object({
  fullName: z.string().min(1, 'Vui lòng nhập họ và tên'),
  phone: z.string().min(9, 'Vui lòng nhập số điện thoại hợp lệ'),
  email: z.string().email('Email không đúng định dạng').optional().or(z.literal('')),
  line1: z.string().min(3, 'Vui lòng nhập địa chỉ cụ thể'),
  city: z.string().min(1, 'Vui lòng chọn Tỉnh / Thành phố'),
  district: z.string().optional(),
  ward: z.string().optional(),
  postalCode: z.string().optional(),
  countryCode: z.string().default('VN'),
});

export type CustomerAddress = z.infer<typeof customerAddressSchema>;

export const bankInfoSchema = z.object({
  bankName: z.string(),
  bankAccount: z.string(),
  accountHolder: z.string(),
  transferContent: z.string(),
  amountVnd: z.number(),
});

export type BankInfo = z.infer<typeof bankInfoSchema>;

export const checkoutRequestSchema = z.object({
  cartToken: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  shippingAddress: customerAddressSchema,
  paymentMethod: z.enum(['COD', 'VIETQR', 'STRIPE']),
  customerNote: z.string().optional(),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export const checkoutResponseSchema = z.object({
  orderId: z.string(),
  orderCode: z.string(),
  status: z.string(),
  subtotalCents: z.number(),
  discountCents: z.number(),
  shippingCents: z.number(),
  totalCents: z.number(),
  paymentMethod: z.enum(['COD', 'VIETQR', 'STRIPE']),
  vietQrUrl: z.string().nullable().optional(),
  bankInfo: bankInfoSchema.nullable().optional(),
  stripeUrl: z.string().nullable().optional(),
});

export type CheckoutResponse = z.infer<typeof checkoutResponseSchema>;

export const orderItemSchema = z.object({
  id: z.string(),
  productName: z.string(),
  sku: z.string(),
  unitPriceCents: z.number(),
  qty: z.number(),
  totalPriceCents: z.number(),
  imageUrl: z.string().nullable().optional(),
});

export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderDetailSchema = z.object({
  id: z.string(),
  orderCode: z.string(),
  status: z.string(),
  subtotalCents: z.number(),
  discountCents: z.number(),
  shippingCents: z.number(),
  totalCents: z.number(),
  paymentMethod: z.string(),
  shippingAddress: customerAddressSchema.nullable().optional(),
  customerNote: z.string().nullable().optional(),
  vietQrUrl: z.string().nullable().optional(),
  bankInfo: bankInfoSchema.nullable().optional(),
  items: z.array(orderItemSchema),
  createdAt: z.string(),
});

export type OrderDetail = z.infer<typeof orderDetailSchema>;

export const adminOrderSummarySchema = z.object({
  id: z.string(),
  orderCode: z.string(),
  status: z.string(),
  customerName: z.string(),
  customerPhone: z.string(),
  customerCity: z.string().nullable().optional(),
  totalCents: z.number(),
  itemCount: z.number(),
  paymentMethod: z.string(),
  createdAt: z.string(),
});

export type AdminOrderSummary = z.infer<typeof adminOrderSummarySchema>;

export const pagedAdminOrdersSchema = z.object({
  content: z.array(adminOrderSummarySchema),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
});

export type PagedAdminOrders = z.infer<typeof pagedAdminOrdersSchema>;

export const adminOrderMetricsSchema = z.object({
  totalOrders: z.number(),
  pendingCount: z.number(),
  confirmedCount: z.number(),
  shippingCount: z.number(),
  fulfilledCount: z.number(),
  cancelledCount: z.number(),
  totalRevenueCents: z.number(),
});

export type AdminOrderMetrics = z.infer<typeof adminOrderMetricsSchema>;

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return (
      (window as unknown as { __PUBLIC_API_URL__?: string }).__PUBLIC_API_URL__ ||
      import.meta.env.PUBLIC_API_URL ||
      'http://localhost:8080'
    );
  }
  return import.meta.env.API_URL || import.meta.env.PUBLIC_API_URL || 'http://localhost:8080';
}

/**
 * Public checkout submission.
 */
export async function submitCheckout(
  request: CheckoutRequest,
  idempotencyKey?: string
): Promise<CheckoutResponse> {
  const baseUrl = getApiBaseUrl();
  const token = await getValidAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const res = await fetch(`${baseUrl}/api/v1/checkout`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const message = errorJson?.detail || errorJson?.message || `Checkout failed (${res.status})`;
    throw new Error(message);
  }

  const data = await res.json();
  return checkoutResponseSchema.parse(data);
}

/**
 * Public order detail lookup by ID or human-readable order code.
 */
export async function getOrder(idOrCode: string): Promise<OrderDetail> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/v1/orders/${encodeURIComponent(idOrCode)}`, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Order not found (${res.status})`);
  }

  const data = await res.json();
  return orderDetailSchema.parse(data);
}

/**
 * Public: Cancel order by customer (allowed for PENDING or CONFIRMED orders).
 */
export async function cancelCustomerOrder(idOrCode: string): Promise<OrderDetail> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/v1/orders/${encodeURIComponent(idOrCode)}/cancel`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const message = errorJson?.detail || errorJson?.message || `Không thể hủy đơn hàng (${res.status})`;
    throw new Error(message);
  }

  const data = await res.json();
  return orderDetailSchema.parse(data);
}

/**
 * Admin: List paged orders.
 */
export async function listAdminOrders(params?: {
  page?: number;
  size?: number;
  status?: string;
  search?: string;
}): Promise<PagedAdminOrders> {
  const baseUrl = getApiBaseUrl();
  const token = await getValidAccessToken();
  if (!token) throw new Error('Unauthenticated');

  const query = new URLSearchParams();
  if (params?.page !== undefined) query.set('page', params.page.toString());
  if (params?.size !== undefined) query.set('size', params.size.toString());
  if (params?.status && params.status !== 'ALL') query.set('status', params.status);
  if (params?.search) query.set('search', params.search);

  const res = await fetch(`${baseUrl}/api/v1/admin/orders?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  if (!res.ok) throw new Error(`Failed to list orders (${res.status})`);
  const data = await res.json();
  return pagedAdminOrdersSchema.parse(data);
}

/**
 * Admin: Get order metrics.
 */
export async function getAdminOrderMetrics(): Promise<AdminOrderMetrics> {
  const baseUrl = getApiBaseUrl();
  const token = await getValidAccessToken();
  if (!token) throw new Error('Unauthenticated');

  const res = await fetch(`${baseUrl}/api/v1/admin/orders/metrics`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  if (!res.ok) throw new Error(`Failed to get order metrics (${res.status})`);
  const data = await res.json();
  return adminOrderMetricsSchema.parse(data);
}

/**
 * Admin: Get single order details.
 */
export async function getAdminOrderDetail(id: string): Promise<OrderDetail> {
  const baseUrl = getApiBaseUrl();
  const token = await getValidAccessToken();
  if (!token) throw new Error('Unauthenticated');

  const res = await fetch(`${baseUrl}/api/v1/admin/orders/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  if (!res.ok) throw new Error(`Failed to get order (${res.status})`);
  const data = await res.json();
  return orderDetailSchema.parse(data);
}

/**
 * Admin: Update order status.
 */
export async function updateAdminOrderStatus(
  id: string,
  status: OrderStatus
): Promise<OrderDetail> {
  const baseUrl = getApiBaseUrl();
  const token = await getValidAccessToken();
  if (!token) throw new Error('Unauthenticated');

  const res = await fetch(`${baseUrl}/api/v1/admin/orders/${id}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    throw new Error(errorJson?.detail || `Failed to update order status (${res.status})`);
  }

  const data = await res.json();
  return orderDetailSchema.parse(data);
}

/**
 * Admin: Cancel order and restore inventory.
 */
export async function cancelAdminOrder(id: string): Promise<OrderDetail> {
  const baseUrl = getApiBaseUrl();
  const token = await getValidAccessToken();
  if (!token) throw new Error('Unauthenticated');

  const res = await fetch(`${baseUrl}/api/v1/admin/orders/${id}/cancel`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    throw new Error(errorJson?.detail || `Failed to cancel order (${res.status})`);
  }

  const data = await res.json();
  return orderDetailSchema.parse(data);
}

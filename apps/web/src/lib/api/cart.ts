import { z } from 'zod';

const BASE_URL = import.meta.env.PUBLIC_API_URL;

if (!BASE_URL) {
  throw new Error('PUBLIC_API_URL is not set — copy apps/web/.env.example to .env');
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string | undefined,
    readonly status: number,
  ) {
    super(message);
  }
}

const cartItemSchema = z.object({
  id: z.string().uuid(),
  variantId: z.string().uuid(),
  sku: z.string(),
  productName: z.string(),
  productSlug: z.string(),
  attributes: z.record(z.unknown()).default({}),
  qty: z.number().int().positive(),
  priceAtAddCents: z.number().int(),
  priceCents: z.number().int(),
  lineTotalCents: z.number().int(),
});

export const cartSchema = z.object({
  id: z.string().uuid(),
  items: z.array(cartItemSchema),
  subtotalCents: z.number().int(),
  discountCents: z.number().int(),
  couponCode: z.string().nullish(),
  shippingCents: z.number().int(),
  freeShippingThresholdCents: z.number().int(),
  itemCount: z.number().int(),
});

export type CartItemData = z.infer<typeof cartItemSchema>;
export type CartData = z.infer<typeof cartSchema>;

async function cartRequest(path: string, init?: RequestInit): Promise<CartData> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include', // cart_token cookie — same-site between :4321 and :8080
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let code: string | undefined;
    let message = `Request failed (${res.status})`;
    try {
      const problem: { code?: string; detail?: string } = await res.json();
      code = problem.code;
      message = problem.detail ?? message;
    } catch {
      // not problem+json — keep the generic message
    }
    throw new ApiError(message, code, res.status);
  }
  return cartSchema.parse(await res.json());
}

export function getCart(): Promise<CartData> {
  return cartRequest('/api/v1/cart');
}

export function addToCart(variantId: string, qty = 1): Promise<CartData> {
  return cartRequest('/api/v1/cart/items', {
    method: 'POST',
    body: JSON.stringify({ variantId, qty }),
  });
}

export function setItemQty(itemId: string, qty: number): Promise<CartData> {
  return cartRequest(`/api/v1/cart/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ qty }),
  });
}

export function removeCartItem(itemId: string): Promise<CartData> {
  return cartRequest(`/api/v1/cart/items/${itemId}`, { method: 'DELETE' });
}

export function applyCoupon(code: string): Promise<CartData> {
  return cartRequest('/api/v1/cart/coupon', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function removeCoupon(): Promise<CartData> {
  return cartRequest('/api/v1/cart/coupon', { method: 'DELETE' });
}

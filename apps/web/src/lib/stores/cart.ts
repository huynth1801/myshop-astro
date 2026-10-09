import { atom, computed } from 'nanostores';
import {
  addToCart as apiAdd,
  applyCoupon as apiApplyCoupon,
  getCart,
  removeCartItem as apiRemove,
  removeCoupon as apiRemoveCoupon,
  setItemQty as apiSetQty,
  type CartData,
} from '../api/cart';

/**
 * Cart store mirrors server state (nanostores per PLAN.md §6) — every mutation
 * goes through the Java API and replaces the store with the authoritative cart.
 */
export const cart = atom<CartData | null>(null);
export const cartOpen = atom(false);
export const cartCount = computed(cart, (c) => c?.itemCount ?? 0);

/** Called when the drawer opens or after add — not on page load (bot-safe). */
export async function refreshCart(): Promise<void> {
  cart.set(await getCart());
}

export async function addToCart(variantId: string, qty = 1): Promise<void> {
  cart.set(await apiAdd(variantId, qty));
  cartOpen.set(true);
}

export async function setItemQty(itemId: string, qty: number): Promise<void> {
  cart.set(await apiSetQty(itemId, qty));
}

export async function removeItem(itemId: string): Promise<void> {
  cart.set(await apiRemove(itemId));
}

export async function applyCouponCode(code: string): Promise<void> {
  cart.set(await apiApplyCoupon(code));
}

export async function removeCoupon(): Promise<void> {
  cart.set(await apiRemoveCoupon());
}

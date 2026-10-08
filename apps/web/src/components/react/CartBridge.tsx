import { useEffect } from 'react';
import { addToCart } from '@/lib/stores/cart';

/**
 * One island serves every quick-add button on the page via event delegation —
 * 50 cards, 1 hydration (blueprint: list pages stay ~0 KB JS apart from this).
 */
export function CartBridge() {
  useEffect(() => {
    const handler = async (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLElement>('[data-quick-add]');
      if (!button) return;
      const variantId = button.dataset.quickAdd;
      if (!variantId) return;
      button.setAttribute('aria-busy', 'true');
      try {
        await addToCart(variantId, 1); // opens the drawer as feedback
      } catch {
        button.removeAttribute('aria-busy'); // drawer shows stale state; server is source of truth
      } finally {
        button.removeAttribute('aria-busy');
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);
  return null;
}

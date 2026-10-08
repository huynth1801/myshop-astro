package com.shop.cart;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.shop.cart.dto.CartResponse;
import com.shop.catalog.Product;
import com.shop.catalog.ProductVariant;
import com.shop.catalog.ProductVariantRepository;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CartServiceTest {

    @Mock
    private CartRepository carts;

    @Mock
    private CartItemRepository items;

    @Mock
    private ProductVariantRepository variants;

    @InjectMocks
    private CartService cartService;

    @Test
    void getOrCreateCartReturnsExistingUnexpiredCart() {
        Cart existing = cart("token-1");
        when(carts.findByCartTokenAndExpiresAtAfter(anyString(), any(Instant.class)))
                .thenReturn(Optional.of(existing));

        Cart result = cartService.getOrCreateCart("token-1");

        assertThat(result).isSameAs(existing);
        verify(carts, never()).save(any(Cart.class));
    }

    @Test
    void getOrCreateCartCreatesFreshCartWhenTokenMissingOrExpired() {
        when(carts.findByCartTokenAndExpiresAtAfter(anyString(), any(Instant.class)))
                .thenReturn(Optional.empty());
        when(carts.save(any(Cart.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        Cart created = cartService.getOrCreateCart("stale-token");

        assertThat(created.getCartToken()).isNotEqualTo("stale-token");
        assertThat(created.getExpiresAt()).isAfter(Instant.now());
        verify(carts).save(any(Cart.class));
    }

    @Test
    void addItemStoresItemWithCurrentPriceAndComputesTotals() {
        Cart cart = cart("token-1");
        UUID variantId = UUID.randomUUID();
        ProductVariant variant = variant(variantId, "TEE-CLS-M", 1900, 35);
        CartItem expectedItem = item(cart, variant, 2); // build before stubbing (Mockito)
        when(variants.findByIdWithProduct(variantId)).thenReturn(Optional.of(variant));
        when(items.findByCartIdAndVariantId(cart.getId(), variantId)).thenReturn(Optional.empty());
        when(items.findAllByCartWithDetails(cart.getId())).thenReturn(List.of(expectedItem));

        CartResponse response = cartService.addItem(cart, variantId, 2);

        assertThat(response.itemCount()).isEqualTo(2);
        assertThat(response.subtotalCents()).isEqualTo(3800L);
        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).priceAtAddCents()).isEqualTo(1900L);
        assertThat(response.items().get(0).lineTotalCents()).isEqualTo(3800L);
        assertThat(response.freeShippingThresholdCents()).isEqualTo(7500L);
        verify(items).save(any(CartItem.class));
    }

    @Test
    void addItemMergesQuantityWhenVariantAlreadyInCart() {
        Cart cart = cart("token-1");
        UUID variantId = UUID.randomUUID();
        ProductVariant variant = variant(variantId, "TEE-CLS-M", 1900, 35);
        CartItem existing = item(cart, variant, 1);
        when(variants.findByIdWithProduct(variantId)).thenReturn(Optional.of(variant));
        when(items.findByCartIdAndVariantId(cart.getId(), variantId)).thenReturn(Optional.of(existing));

        cartService.addItem(cart, variantId, 2);

        assertThat(existing.getQty()).isEqualTo(3);
        verify(items, never()).save(any(CartItem.class));
    }

    @Test
    void addItemRejectsQuantityBeyondStock() {
        Cart cart = cart("token-1");
        UUID variantId = UUID.randomUUID();
        ProductVariant variant = variant(variantId, "TEE-CLS-M", 1900, 2);
        when(variants.findByIdWithProduct(variantId)).thenReturn(Optional.of(variant));
        when(items.findByCartIdAndVariantId(cart.getId(), variantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cartService.addItem(cart, variantId, 3))
                .isInstanceOf(OutOfStockException.class)
                .hasMessageContaining("2");
        verify(items, never()).save(any(CartItem.class));
    }

    @Test
    void addItemRejectsUnknownVariant() {
        Cart cart = cart("token-1");
        UUID variantId = UUID.randomUUID();
        when(variants.findByIdWithProduct(variantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cartService.addItem(cart, variantId, 1))
                .isInstanceOf(VariantNotFoundException.class);
    }

    @Test
    void changeQtyUpdatesAndRecomputesTotals() {
        Cart cart = cart("token-1");
        ProductVariant variant = variant(UUID.randomUUID(), "TEE-CLS-M", 1900, 35);
        CartItem existing = item(cart, variant, 1);
        UUID itemId = existing.getId();
        when(items.findByIdAndCartId(itemId, cart.getId())).thenReturn(Optional.of(existing));
        when(items.findAllByCartWithDetails(cart.getId())).thenReturn(List.of(existing));

        CartResponse response = cartService.changeQty(cart, itemId, 3);

        assertThat(existing.getQty()).isEqualTo(3);
        assertThat(response.subtotalCents()).isEqualTo(5700L);
    }

    @Test
    void changeQtyZeroRemovesTheItem() {
        Cart cart = cart("token-1");
        CartItem existing = item(cart, variant(UUID.randomUUID(), "TEE-CLS-M", 1900, 35), 2);
        UUID itemId = existing.getId();
        when(items.findByIdAndCartId(itemId, cart.getId())).thenReturn(Optional.of(existing));
        when(items.findAllByCartWithDetails(cart.getId())).thenReturn(List.of());

        CartResponse response = cartService.changeQty(cart, itemId, 0);

        verify(items).delete(existing);
        assertThat(response.itemCount()).isZero();
    }

    @Test
    void changeQtyRejectsQuantityBeyondStock() {
        Cart cart = cart("token-1");
        ProductVariant variant = variant(UUID.randomUUID(), "TEE-CLS-M", 1900, 5);
        CartItem existing = item(cart, variant, 1);
        UUID itemId = existing.getId();
        when(items.findByIdAndCartId(itemId, cart.getId())).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> cartService.changeQty(cart, itemId, 6))
                .isInstanceOf(OutOfStockException.class);
    }

    @Test
    void changeQtyRejectsItemFromAnotherCart() {
        Cart cart = cart("token-1");
        UUID itemId = UUID.randomUUID();
        when(items.findByIdAndCartId(itemId, cart.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cartService.changeQty(cart, itemId, 1))
                .isInstanceOf(CartItemNotFoundException.class);
    }

    @Test
    void removeItemDeletesAndReturnsEmptyCart() {
        Cart cart = cart("token-1");
        CartItem existing = item(cart, variant(UUID.randomUUID(), "TEE-CLS-M", 1900, 35), 1);
        UUID itemId = existing.getId();
        when(items.findByIdAndCartId(itemId, cart.getId())).thenReturn(Optional.of(existing));
        when(items.findAllByCartWithDetails(cart.getId())).thenReturn(List.of());

        CartResponse response = cartService.removeItem(cart, itemId);

        verify(items).delete(existing);
        assertThat(response.items()).isEmpty();
        assertThat(response.subtotalCents()).isZero();
    }

    private static Cart cart(String token) {
        Cart cart = Cart.newCart(token, Instant.now().plusSeconds(3600));
        return cart;
    }

    private static ProductVariant variant(UUID id, String sku, long priceCents, int stock) {
        ProductVariant variant = mock(ProductVariant.class);
        Product product = mock(Product.class);
        lenient().when(product.getName()).thenReturn("Classic Cotton Tee");
        lenient().when(product.getSlug()).thenReturn("classic-cotton-tee");
        lenient().when(variant.getProduct()).thenReturn(product);
        lenient().when(variant.getId()).thenReturn(id);
        lenient().when(variant.getSku()).thenReturn(sku);
        lenient().when(variant.getPriceCents()).thenReturn(priceCents);
        lenient().when(variant.getStock()).thenReturn(stock);
        lenient().when(variant.getAttributes()).thenReturn(Map.of("size", "M"));
        return variant;
    }

    private static CartItem item(Cart cart, ProductVariant variant, int qty) {
        CartItem item = CartItem.newItem(cart, variant, qty);
        return item;
    }
}

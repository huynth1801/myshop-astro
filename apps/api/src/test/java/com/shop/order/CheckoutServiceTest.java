package com.shop.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.shop.cart.Cart;
import com.shop.cart.CartItem;
import com.shop.cart.CartItemRepository;
import com.shop.cart.CartRepository;
import com.shop.cart.Coupon;
import com.shop.cart.CouponRepository;
import com.shop.cart.OutOfStockException;
import com.shop.catalog.Product;
import com.shop.catalog.ProductStatus;
import com.shop.catalog.ProductVariant;
import com.shop.order.dto.CheckoutRequest;
import com.shop.order.dto.CheckoutResponse;
import com.shop.order.dto.CustomerAddressDto;
import java.lang.reflect.Field;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CheckoutServiceTest {

    @Mock
    private CartRepository cartRepository;

    @Mock
    private CartItemRepository cartItemRepository;

    @Mock
    private CouponRepository couponRepository;

    @Mock
    private OrderRepository orderRepository;

    private VietQrService vietQrService;
    private CheckoutService checkoutService;

    @BeforeEach
    void setUp() {
        vietQrService = new VietQrService("MB", "0987654321", "MYSHOP BOUTIQUE");
        checkoutService = new CheckoutService(
                cartRepository,
                cartItemRepository,
                couponRepository,
                orderRepository,
                vietQrService
        );
    }

    private CustomerAddressDto sampleAddress() {
        return new CustomerAddressDto(
                "Nguyễn Văn A",
                "0912345678",
                "vana@example.com",
                "123 Lê Lợi",
                "Hồ Chí Minh",
                "Quận 1",
                "Bến Nghé",
                "70000",
                "VN"
        );
    }

    private Product createProduct(String name, String slug) {
        Product p = Product.newProduct(name, slug, "Desc", "Short", ProductStatus.ACTIVE, null);
        try {
            Field idField = Product.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(p, UUID.randomUUID());
        } catch (Exception ignored) {}
        return p;
    }

    private ProductVariant createVariant(Product p, String sku, long priceCents, int stock) {
        ProductVariant v = ProductVariant.newVariant(p, sku, priceCents, null, stock, Map.of("Color", "Đen"));
        try {
            Field idField = ProductVariant.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(v, UUID.randomUUID());
        } catch (Exception ignored) {}
        return v;
    }

    @Test
    void checkout_successful_with_cod_and_stock_deduction() {
        String cartToken = "test-cart-token";
        Cart cart = Cart.newCart(cartToken, Instant.now().plusSeconds(3600));

        Product product = createProduct("Áo thun", "ao-thun");
        ProductVariant variant = createVariant(product, "AT-BLACK-M", 200_000_00L, 10); // 200,000 VND

        CartItem item = CartItem.newItem(cart, variant, 2); // 400,000 VND total < 500,000 -> shipping applies
        List<CartItem> items = List.of(item);

        when(cartRepository.findByCartToken(cartToken)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findAllByCartWithDetails(any())).thenReturn(items);
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        CheckoutRequest request = new CheckoutRequest(
                cartToken,
                "vana@example.com",
                "0912345678",
                sampleAddress(),
                PaymentMethod.COD,
                "Giao giờ hành chính"
        );

        CheckoutResponse response = checkoutService.checkout(request, null, null, null);

        assertThat(response).isNotNull();
        assertThat(response.orderCode()).startsWith("MS-");
        assertThat(response.status()).isEqualTo("PENDING");
        assertThat(response.paymentMethod()).isEqualTo(PaymentMethod.COD);
        assertThat(response.subtotalCents()).isEqualTo(400_000_00L);
        assertThat(response.discountCents()).isEqualTo(0L);
        assertThat(response.shippingCents()).isEqualTo(CheckoutService.STANDARD_SHIPPING_CENTS); // 30,000 VND
        assertThat(response.totalCents()).isEqualTo(430_000_00L);
        assertThat(response.vietQrUrl()).isNull();

        // Variant stock should be decremented from 10 to 8
        assertThat(variant.getStock()).isEqualTo(8);

        // Cart items should be deleted
        verify(cartItemRepository).deleteAll(items);
        verify(orderRepository).save(any(Order.class));
    }

    @Test
    void checkout_successful_with_vietqr_and_free_shipping() {
        String cartToken = "vietqr-cart";
        Cart cart = Cart.newCart(cartToken, Instant.now().plusSeconds(3600));

        Product product = createProduct("Váy lụa", "vay-lua");
        ProductVariant variant = createVariant(product, "VL-RED-S", 600_000_00L, 5); // 600,000 VND >= 500,000 -> free shipping
        CartItem item = CartItem.newItem(cart, variant, 1);
        List<CartItem> items = List.of(item);

        when(cartRepository.findByCartToken(cartToken)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findAllByCartWithDetails(any())).thenReturn(items);
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        CheckoutRequest request = new CheckoutRequest(
                cartToken,
                "customer@example.com",
                "0988776655",
                sampleAddress(),
                PaymentMethod.VIETQR,
                null
        );

        CheckoutResponse response = checkoutService.checkout(request, null, null, null);

        assertThat(response).isNotNull();
        assertThat(response.paymentMethod()).isEqualTo(PaymentMethod.VIETQR);
        assertThat(response.shippingCents()).isEqualTo(0L);
        assertThat(response.totalCents()).isEqualTo(600_000_00L);
        assertThat(response.vietQrUrl()).isNotNull();
        assertThat(response.vietQrUrl()).contains("https://img.vietqr.io/image/MB-0987654321-compact2.jpg");
        assertThat(response.bankInfo()).isNotNull();
        assertThat(response.bankInfo().bankName()).isEqualTo("MB");
    }

    @Test
    void checkout_successful_with_coupon_discount() {
        String cartToken = "coupon-cart";
        Cart cart = Cart.newCart(cartToken, Instant.now().plusSeconds(3600));
        UUID couponId = UUID.randomUUID();
        cart.applyCoupon(couponId);

        Product product = createProduct("Đầm hoa", "dam-hoa");
        ProductVariant variant = createVariant(product, "DH-L", 1_000_000_00L, 5); // 1,000,000 VND
        CartItem item = CartItem.newItem(cart, variant, 1);
        List<CartItem> items = List.of(item);

        Coupon coupon = Coupon.newCoupon("VIP10", Coupon.Type.PERCENT, 10, 0L, null); // 10% off -> 100,000 VND discount

        when(cartRepository.findByCartToken(cartToken)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findAllByCartWithDetails(any())).thenReturn(items);
        when(couponRepository.findById(couponId)).thenReturn(Optional.of(coupon));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        CheckoutRequest request = new CheckoutRequest(
                cartToken,
                "vip@example.com",
                "0911223344",
                sampleAddress(),
                PaymentMethod.COD,
                null
        );

        CheckoutResponse response = checkoutService.checkout(request, null, null, null);

        assertThat(response.subtotalCents()).isEqualTo(1_000_000_00L);
        assertThat(response.discountCents()).isEqualTo(100_000_00L);
        assertThat(response.shippingCents()).isEqualTo(0L); // >= 500k free shipping
        assertThat(response.totalCents()).isEqualTo(900_000_00L);
    }

    @Test
    void checkout_fails_when_cart_empty() {
        String cartToken = "empty-cart";
        Cart cart = Cart.newCart(cartToken, Instant.now().plusSeconds(3600));

        when(cartRepository.findByCartToken(cartToken)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findAllByCartWithDetails(any())).thenReturn(List.of());

        CheckoutRequest request = new CheckoutRequest(
                cartToken,
                "user@example.com",
                "0912345678",
                sampleAddress(),
                PaymentMethod.COD,
                null
        );

        assertThatThrownBy(() -> checkoutService.checkout(request, null, null, null))
                .isInstanceOf(EmptyCartException.class);

        verify(orderRepository, never()).save(any());
    }

    @Test
    void checkout_fails_when_stock_insufficient() {
        String cartToken = "stock-cart";
        Cart cart = Cart.newCart(cartToken, Instant.now().plusSeconds(3600));

        Product product = createProduct("Áo khoác", "ao-khoac");
        ProductVariant variant = createVariant(product, "AK-XL", 500_000_00L, 2); // only 2 left

        CartItem item = CartItem.newItem(cart, variant, 5); // requested 5
        List<CartItem> items = List.of(item);

        when(cartRepository.findByCartToken(cartToken)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findAllByCartWithDetails(any())).thenReturn(items);

        CheckoutRequest request = new CheckoutRequest(
                cartToken,
                "user@example.com",
                "0912345678",
                sampleAddress(),
                PaymentMethod.COD,
                null
        );

        assertThatThrownBy(() -> checkoutService.checkout(request, null, null, null))
                .isInstanceOf(OutOfStockException.class);

        verify(orderRepository, never()).save(any());
    }

    @Test
    void checkout_idempotent_returns_existing_order() {
        String key = "idempotency-key-123";
        Order existingOrder = Order.create(
                "MS-261013-EXIST",
                null,
                PaymentMethod.COD,
                200_000_00L,
                0L,
                3_000_000L,
                230_000_00L,
                sampleAddress().toMap(),
                null
        );

        when(orderRepository.findByPaymentIntentId(key)).thenReturn(Optional.of(existingOrder));

        CheckoutRequest request = new CheckoutRequest(
                "any-token",
                "user@example.com",
                "0912345678",
                sampleAddress(),
                PaymentMethod.COD,
                null
        );

        CheckoutResponse response = checkoutService.checkout(request, key, null, null);

        assertThat(response.orderCode()).isEqualTo("MS-261013-EXIST");
        verify(cartRepository, never()).findByCartToken(any());
    }
}

package com.shop.order;

import com.shop.cart.Cart;
import com.shop.cart.CartItem;
import com.shop.cart.CartItemRepository;
import com.shop.cart.CartRepository;
import com.shop.cart.Coupon;
import com.shop.cart.CouponRepository;
import com.shop.cart.OutOfStockException;
import com.shop.catalog.Product;
import com.shop.catalog.ProductImage;
import com.shop.catalog.ProductVariant;
import com.shop.order.dto.BankInfoDto;
import com.shop.order.dto.CheckoutRequest;
import com.shop.order.dto.CheckoutResponse;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CheckoutService {

    private static final Logger log = LoggerFactory.getLogger(CheckoutService.class);

    public static final long FREE_SHIPPING_THRESHOLD_CENTS = 9_900_000L; // 99,000 VND
    public static final long STANDARD_SHIPPING_CENTS = 3_000_000L; // 30,000 VND

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final CouponRepository couponRepository;
    private final OrderRepository orderRepository;
    private final VietQrService vietQrService;
    private final OrderEmailService orderEmailService;

    @org.springframework.beans.factory.annotation.Autowired
    public CheckoutService(
            CartRepository cartRepository,
            CartItemRepository cartItemRepository,
            CouponRepository couponRepository,
            OrderRepository orderRepository,
            VietQrService vietQrService,
            @org.springframework.beans.factory.annotation.Autowired(required = false) OrderEmailService orderEmailService
    ) {
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.couponRepository = couponRepository;
        this.orderRepository = orderRepository;
        this.vietQrService = vietQrService;
        this.orderEmailService = orderEmailService;
    }

    public CheckoutService(
            CartRepository cartRepository,
            CartItemRepository cartItemRepository,
            CouponRepository couponRepository,
            OrderRepository orderRepository,
            VietQrService vietQrService
    ) {
        this(cartRepository, cartItemRepository, couponRepository, orderRepository, vietQrService, null);
    }

    @Transactional
    public CheckoutResponse checkout(
            CheckoutRequest request,
            String idempotencyKey,
            String cartTokenCookie,
            UUID authenticatedUserId
    ) {
        // 1. Check idempotency key if provided
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<Order> existing = orderRepository.findByPaymentIntentId(idempotencyKey);
            if (existing.isPresent()) {
                log.info("Idempotent checkout hit for key {}: returning order {}", idempotencyKey, existing.get().getOrderCode());
                return toCheckoutResponse(existing.get());
            }
        }

        // 2. Resolve cart resiliently (cookie, request token / cart ID, or authenticated user)
        Cart cart = resolveCart(request, cartTokenCookie, authenticatedUserId);

        List<CartItem> cartItems = cartItemRepository.findAllByCartWithDetails(cart.getId());
        if (cartItems.isEmpty()) {
            throw new EmptyCartException();
        }

        // 3. Recalculate subtotal and validate live stock
        long subtotalCents = 0L;
        for (CartItem item : cartItems) {
            ProductVariant variant = item.getVariant();
            if (variant.getStock() < item.getQty()) {
                throw new OutOfStockException(variant.getSku(), variant.getStock());
            }
            subtotalCents += variant.getPriceCents() * item.getQty();
        }

        // 4. Recalculate coupon discount
        long discountCents = 0L;
        if (cart.getCouponId() != null) {
            Coupon coupon = couponRepository.findById(cart.getCouponId())
                    .filter(c -> c.isUsable(Instant.now()))
                    .orElse(null);

            if (coupon != null && subtotalCents >= coupon.getMinOrderCents()) {
                discountCents = switch (coupon.getType()) {
                    case PERCENT -> Math.min(subtotalCents,
                            subtotalCents * Math.min(coupon.getValue(), 100) / 100);
                    case FIXED -> Math.min(coupon.getValue(), subtotalCents);
                };
            }
        }

        // 5. Recalculate shipping
        long shippingCents = subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS
                ? 0L
                : STANDARD_SHIPPING_CENTS;

        long totalCents = Math.max(0L, subtotalCents - discountCents + shippingCents);

        // 6. Generate order code and build Order entity
        String orderCode = OrderCodeGenerator.generate();
        UUID orderUserId = authenticatedUserId != null ? authenticatedUserId : cart.getUserId();

        Order order = Order.create(
                orderCode,
                orderUserId,
                request.paymentMethod(),
                subtotalCents,
                discountCents,
                shippingCents,
                totalCents,
                request.shippingAddress().toMap(),
                request.customerNote()
        );

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            order.setPaymentIntentId(idempotencyKey);
        }

        // 7. Snapshot order items and decrement variant inventory
        for (CartItem cartItem : cartItems) {
            ProductVariant variant = cartItem.getVariant();
            Product product = variant.getProduct();

            String primaryImageUrl = null;
            if (product.getImages() != null && !product.getImages().isEmpty()) {
                primaryImageUrl = product.getImages().stream()
                        .min(Comparator.comparingInt(ProductImage::getPosition))
                        .map(ProductImage::getUrl)
                        .orElse(product.getImages().get(0).getUrl());
            }

            OrderItem orderItem = OrderItem.create(
                    product.getName(),
                    variant.getSku(),
                    variant.getPriceCents(),
                    cartItem.getQty(),
                    primaryImageUrl
            );
            order.addItem(orderItem);

            // Deduct stock
            variant.decrementStock(cartItem.getQty());
        }

        // 8. Save order
        Order savedOrder = orderRepository.save(order);

        // 9. Clear cart items & coupon
        cartItemRepository.deleteAll(cartItems);
        cart.removeCoupon();
        cartRepository.save(cart);

        log.info("Order successfully created: id={}, code={}, totalCents={}, method={}",
                savedOrder.getId(), savedOrder.getOrderCode(), savedOrder.getTotalCents(), savedOrder.getPaymentMethod());

        // 10. Asynchronously send order confirmation email to customer
        if (orderEmailService != null) {
            orderEmailService.sendOrderConfirmationEmail(savedOrder, request.shippingAddress());
        }

        return toCheckoutResponse(savedOrder);
    }

    public CheckoutResponse toCheckoutResponse(Order order) {
        String vietQrUrl = null;
        BankInfoDto bankInfo = null;

        if (order.getPaymentMethod() == PaymentMethod.VIETQR) {
            vietQrUrl = vietQrService.generateQrUrl(order.getTotalCents(), order.getOrderCode());
            bankInfo = vietQrService.getBankInfo(order.getTotalCents(), order.getOrderCode());
        }

        return new CheckoutResponse(
                order.getId(),
                order.getOrderCode(),
                order.getStatus().name(),
                order.getSubtotalCents(),
                order.getDiscountCents(),
                order.getShippingCents(),
                order.getTotalCents(),
                order.getPaymentMethod(),
                vietQrUrl,
                bankInfo,
                null // stripeUrl for future card integration
        );
    }

    private Cart resolveCart(CheckoutRequest request, String cartTokenCookie, UUID authenticatedUserId) {
        // 1. Try finding by cartTokenCookie first if provided
        if (cartTokenCookie != null && !cartTokenCookie.isBlank()) {
            Optional<Cart> byCookie = cartRepository.findByCartToken(cartTokenCookie.trim());
            if (byCookie.isPresent()) {
                Cart c = byCookie.get();
                if (authenticatedUserId == null || c.getUserId() == null || c.getUserId().equals(authenticatedUserId)) {
                    return c;
                }
            }
        }

        // 2. Try request.cartToken() if provided
        if (request.cartToken() != null && !request.cartToken().isBlank()) {
            String token = request.cartToken().trim();
            // Try by cartToken column first
            Optional<Cart> byToken = cartRepository.findByCartToken(token);
            if (byToken.isPresent()) {
                Cart c = byToken.get();
                if (authenticatedUserId == null || c.getUserId() == null || c.getUserId().equals(authenticatedUserId)) {
                    return c;
                }
            }
            // If it is a valid UUID, try by cart primary key id
            try {
                UUID cartId = UUID.fromString(token);
                Optional<Cart> byId = cartRepository.findById(cartId);
                if (byId.isPresent()) {
                    Cart c = byId.get();
                    if (authenticatedUserId == null || c.getUserId() == null || c.getUserId().equals(authenticatedUserId)) {
                        return c;
                    }
                }
            } catch (IllegalArgumentException ignored) {
                // Not a UUID, skip
            }
        }

        // 3. Fallback to authenticated user's active cart
        if (authenticatedUserId != null) {
            Optional<Cart> byUser = cartRepository.findFirstByUserIdAndExpiresAtAfterOrderByCreatedAtDesc(
                    authenticatedUserId, Instant.now());
            if (byUser.isPresent()) {
                return byUser.get();
            }
        }

        throw new EmptyCartException();
    }
}

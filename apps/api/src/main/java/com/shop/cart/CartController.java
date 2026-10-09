package com.shop.cart;

import com.shop.auth.AuthPrincipal;
import com.shop.cart.dto.AddItemRequest;
import com.shop.cart.dto.ApplyCouponRequest;
import com.shop.cart.dto.CartResponse;
import com.shop.cart.dto.UpdateQtyRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/cart")
public class CartController {

    private final CartService cartService;
    private final CartTokens tokens;

    public CartController(CartService cartService, CartTokens tokens) {
        this.cartService = cartService;
        this.tokens = tokens;
    }

    @GetMapping
    public CartResponse getCart(HttpServletRequest request, HttpServletResponse response) {
        Cart cart = readingCart(request, response);
        return cartService.toResponse(cart);
    }

    @PostMapping("/items")
    @ResponseStatus(HttpStatus.CREATED)
    public CartResponse addItem(@Valid @RequestBody AddItemRequest body,
            HttpServletRequest request, HttpServletResponse response) {
        Cart cart = readingCart(request, response);
        return cartService.addItem(cart, body.variantId(), body.qty());
    }

    @PatchMapping("/items/{itemId}")
    public CartResponse changeQty(@PathVariable UUID itemId,
            @Valid @RequestBody UpdateQtyRequest body,
            HttpServletRequest request) {
        Cart cart = mutatingCart(request);
        return cartService.changeQty(cart, itemId, body.qty());
    }

    @DeleteMapping("/items/{itemId}")
    public CartResponse removeItem(@PathVariable UUID itemId, HttpServletRequest request) {
        Cart cart = mutatingCart(request);
        return cartService.removeItem(cart, itemId);
    }

    @PostMapping("/coupon")
    public CartResponse applyCoupon(@Valid @RequestBody ApplyCouponRequest body,
            HttpServletRequest request) {
        Cart cart = mutatingCart(request);
        return cartService.applyCoupon(cart, body.code().trim());
    }

    @DeleteMapping("/coupon")
    public CartResponse removeCoupon(HttpServletRequest request) {
        Cart cart = mutatingCart(request);
        return cartService.removeCoupon(cart);
    }

    /** Read-style endpoints create the cart (and cookie) on first touch. */
    private Cart readingCart(HttpServletRequest request, HttpServletResponse response) {
        String provided = tokens.read(request).orElse(null);
        Cart cart = cartService.getOrCreateCart(currentUserId(), provided);
        if (!cart.getCartToken().equals(provided)) {
            tokens.write(response, cart.getCartToken());
        }
        return cart;
    }

    /** Mutating endpoints require an existing cart — no cookie and no user cart means nothing to change. */
    private Cart mutatingCart(HttpServletRequest request) {
        Optional<Cart> cart = cartService.findActiveCart(currentUserId(), tokens.read(request).orElse(null));
        return cart.orElseThrow(CartNotFoundException::new);
    }

    /** null when the request is unauthenticated (guest). */
    private UUID currentUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthPrincipal principal) {
            return principal.userId();
        }
        return null;
    }
}

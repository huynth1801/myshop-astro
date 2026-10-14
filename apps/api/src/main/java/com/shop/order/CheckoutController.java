package com.shop.order;

import com.shop.auth.AuthPrincipal;
import com.shop.order.dto.CheckoutRequest;
import com.shop.order.dto.CheckoutResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/checkout")
public class CheckoutController {

    private final CheckoutService checkoutService;

    public CheckoutController(CheckoutService checkoutService) {
        this.checkoutService = checkoutService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CheckoutResponse checkout(
            @Valid @RequestBody CheckoutRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @CookieValue(value = "cart_token", required = false) String cartTokenCookie,
            @AuthenticationPrincipal AuthPrincipal principal
    ) {
        UUID authenticatedUserId = principal != null ? principal.userId() : null;
        return checkoutService.checkout(request, idempotencyKey, cartTokenCookie, authenticatedUserId);
    }
}

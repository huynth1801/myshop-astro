package com.shop.auth;

import com.shop.cart.Cart;
import com.shop.cart.CartService;
import com.shop.cart.CartTokens;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import org.springframework.stereotype.Component;

/**
 * The shared "you are now signed in" side effects for password and OAuth
 * logins alike: issue the JWT pair, plant the refresh cookie, and adopt the
 * caller's guest cart (merged if the account already had one).
 */
@Component
public class AuthSessions {

    private final JwtService jwt;
    private final RefreshCookies refreshCookies;
    private final CartService cartService;
    private final CartTokens cartTokens;

    public AuthSessions(JwtService jwt, RefreshCookies refreshCookies, CartService cartService,
            CartTokens cartTokens) {
        this.jwt = jwt;
        this.refreshCookies = refreshCookies;
        this.cartService = cartService;
        this.cartTokens = cartTokens;
    }

    public JwtService.Tokens establish(User user, HttpServletRequest request,
            HttpServletResponse response) {
        JwtService.Tokens tokens =
                jwt.issue(user.getId(), user.getEmail(), user.getName(), user.getRole());
        refreshCookies.write(response, tokens.refreshToken(), Duration.ofDays(7));

        String guestToken = cartTokens.read(request).orElse(null);
        Cart cart = cartService.getOrCreateCart(user.getId(), guestToken);
        if (!cart.getCartToken().equals(guestToken)) {
            cartTokens.write(response, cart.getCartToken());
        }
        return tokens;
    }
}

package com.shop.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.shop.cart.Cart;
import com.shop.cart.CartService;
import com.shop.cart.CartTokens;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AuthSessionsTest {

    @Mock
    private JwtService jwt;

    @Mock
    private RefreshCookies refreshCookies;

    @Mock
    private CartService cartService;

    @Mock
    private CartTokens cartTokens;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @InjectMocks
    private AuthSessions sessions;

    @Test
    void establishIssuesTokensWritesRefreshCookieAndAdoptsGuestCart() {
        UUID userId = UUID.randomUUID();
        User user = mock(User.class);
        when(user.getId()).thenReturn(userId);
        when(user.getEmail()).thenReturn("me@example.com");
        when(user.getName()).thenReturn("Me");
        when(user.getRole()).thenReturn(UserRole.CUSTOMER);
        JwtService.Tokens tokens = new JwtService.Tokens("access-1", "refresh-1", 900);
        when(jwt.issue(userId, "me@example.com", "Me", UserRole.CUSTOMER)).thenReturn(tokens);

        when(cartTokens.read(request)).thenReturn(Optional.of("guest-token"));
        Cart cart = mock(Cart.class);
        when(cart.getCartToken()).thenReturn("guest-token"); // guest cart kept its token
        when(cartService.getOrCreateCart(userId, "guest-token")).thenReturn(cart);

        JwtService.Tokens result = sessions.establish(user, request, response);

        assertThat(result).isSameAs(tokens);
        verify(refreshCookies).write(response, "refresh-1", Duration.ofDays(7));
        verify(cartTokens, never()).write(response, "guest-token"); // unchanged → no re-write
    }

    @Test
    void establishWritesCartTokenWhenANewCartWasCreated() {
        UUID userId = UUID.randomUUID();
        User user = mock(User.class);
        when(user.getId()).thenReturn(userId);
        when(user.getEmail()).thenReturn("me@example.com");
        when(user.getName()).thenReturn("Me");
        when(user.getRole()).thenReturn(UserRole.CUSTOMER);
        when(jwt.issue(userId, "me@example.com", "Me", UserRole.CUSTOMER))
                .thenReturn(new JwtService.Tokens("a", "r", 900));

        when(cartTokens.read(request)).thenReturn(Optional.empty());
        Cart cart = mock(Cart.class);
        when(cart.getCartToken()).thenReturn("fresh-token");
        when(cartService.getOrCreateCart(userId, null)).thenReturn(cart);

        sessions.establish(user, request, response);

        verify(cartTokens).write(response, "fresh-token");
    }
}

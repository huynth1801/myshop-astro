package com.shop.auth;

import com.shop.auth.dto.LoginRequest;
import com.shop.auth.dto.MeResponse;
import com.shop.auth.dto.RegisterRequest;
import com.shop.auth.dto.TokenResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService auth;
    private final AuthSessions sessions;
    private final RefreshCookies refreshCookies;

    public AuthController(AuthService auth, AuthSessions sessions, RefreshCookies refreshCookies) {
        this.auth = auth;
        this.sessions = sessions;
        this.refreshCookies = refreshCookies;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public TokenResponse register(@Valid @RequestBody RegisterRequest body,
            HttpServletRequest request, HttpServletResponse response) {
        User user = auth.register(body.email(), body.password(), body.name());
        return issueAndAttachCart(user, request, response);
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest body,
            HttpServletRequest request, HttpServletResponse response) {
        User user = auth.login(body.email(), body.password());
        return issueAndAttachCart(user, request, response);
    }

    @PostMapping("/refresh")
    public TokenResponse refresh(HttpServletRequest request, HttpServletResponse response) {
        String token = refreshCookies.read(request).orElseThrow(InvalidRefreshTokenException::new);
        JwtService.Tokens tokens = auth.refresh(token);
        refreshCookies.write(response, tokens.refreshToken(), Duration.ofDays(7));
        // refresh keeps claims light; the client refetches /me if it needs profile data
        return new TokenResponse(tokens.accessToken(), tokens.expiresInSeconds(), null, null);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletResponse response) {
        refreshCookies.clear(response);
    }

    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal AuthPrincipal principal) {
        if (principal == null) {
            throw new UnauthenticatedException(); // /auth/** is permitAll, so guard explicitly
        }
        return new MeResponse(principal.email(), principal.name(), principal.role().name());
    }

    /**
     * Issues tokens and adopts the caller's guest cart: a cart created while signed
     * out follows the user into their account (merged if they already had one).
     */
    private TokenResponse issueAndAttachCart(User user, HttpServletRequest request,
            HttpServletResponse response) {
        JwtService.Tokens tokens = sessions.establish(user, request, response);
        return new TokenResponse(tokens.accessToken(), tokens.expiresInSeconds(),
                user.getEmail(), user.getName());
    }
}

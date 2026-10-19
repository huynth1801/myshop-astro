package com.shop.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

/**
 * Google sign-in endpoints (ADR 0004). Both are browser redirects — no JSON,
 * no tokens in URLs. On success the storefront restores the session silently
 * via its existing refresh-cookie bootstrap.
 */
@RestController
@RequestMapping("/api/v1/auth/oauth")
public class OAuthController {

    private final OAuthService auth;
    private final OAuthProperties properties;
    private final OAuthStateCookies stateCookies;
    private final AuthSessions sessions;

    public OAuthController(OAuthService auth, OAuthProperties properties,
            OAuthStateCookies stateCookies, AuthSessions sessions) {
        this.auth = auth;
        this.properties = properties;
        this.stateCookies = stateCookies;
        this.sessions = sessions;
    }

    @GetMapping("/google/authorize")
    public ResponseEntity<Void> authorize(@RequestParam(name = "redirect_uri") String redirectUri,
            HttpServletResponse response) {
        try {
            String target = validatedRedirectOrigin(redirectUri);
            String state = auth.newState();
            stateCookies.write(response, state, target);
            return redirect(auth.buildGoogleAuthorizeUrl(callbackUri(), state));
        } catch (OAuthFlowException e) {
            // A bad redirect_uri cannot be echoed back — fall back to the first allowlisted origin
            return redirect(withError(properties.fallbackRedirectOrigin(), e.errorCode()));
        }
    }

    @GetMapping("/google/callback")
    public ResponseEntity<Void> callback(@RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            HttpServletRequest request, HttpServletResponse response) {
        String target = stateCookies.readRedirect(request).orElse(properties.fallbackRedirectOrigin());
        try {
            stateCookies.clear(response); // one-shot, regardless of outcome
            if (error != null) {
                throw new OAuthFlowException("access_denied");
            }
            String expected = stateCookies.readState(request).orElse("");
            if (code == null || state == null || !MessageDigest.isEqual(
                    expected.getBytes(StandardCharsets.UTF_8),
                    state.getBytes(StandardCharsets.UTF_8))) {
                throw new OAuthFlowException("state_mismatch");
            }
            User user = auth.completeGoogleLogin(code, callbackUri());
            sessions.establish(user, request, response);
            return redirect(target);
        } catch (OAuthFlowException e) {
            return redirect(withError(target, e.errorCode()));
        } catch (RuntimeException e) {
            // e.g. a concurrent first login racing the unique constraints — retry succeeds
            return redirect(withError(target, "oauth_failed"));
        }
    }

    /** Keeps only the allowlisted origin — never an attacker-controlled path or query. */
    private String validatedRedirectOrigin(String redirectUri) {
        try {
            URI uri = URI.create(redirectUri);
            String origin = uri.getScheme() + "://" + uri.getAuthority();
            if (properties.isAllowedRedirectOrigin(origin)) {
                return origin + "/";
            }
        } catch (IllegalArgumentException ignored) {
            // fall through to reject
        }
        throw new OAuthFlowException("bad_redirect");
    }

    /** Derived from the request so Google sees exactly the host the browser used. */
    private static String callbackUri() {
        return ServletUriComponentsBuilder.fromCurrentRequest()
                .replacePath("/api/v1/auth/oauth/google/callback")
                .replaceQuery(null)
                .build()
                .toUriString();
    }

    private static ResponseEntity<Void> redirect(String location) {
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(location)).build();
    }

    /** Codes are fixed strings from our own code — nothing user-controlled in the URL. */
    private static String withError(String target, String errorCode) {
        return target + "?auth_error=" + errorCode;
    }
}

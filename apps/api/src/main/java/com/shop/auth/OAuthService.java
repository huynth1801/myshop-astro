package com.shop.auth;

import com.shop.auth.GoogleOAuthClient.Profile;
import java.security.SecureRandom;
import java.util.Base64;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Google sign-in (ADR 0004): authorization-code flow, stateless afterwards —
 * Google is consulted only at login; the session is our own JWT pair.
 */
@Service
public class OAuthService {

    private static final String AUTHORIZE_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final GoogleOAuthClient google;
    private final UserRepository users;
    private final UserIdentityRepository identities;
    private final OAuthProperties properties;

    public OAuthService(GoogleOAuthClient google, UserRepository users,
            UserIdentityRepository identities, OAuthProperties properties) {
        this.google = google;
        this.users = users;
        this.identities = identities;
        this.properties = properties;
    }

    /** Random state tying the callback to this authorize request (CSRF, ADR 0004). */
    public String newState() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public String buildGoogleAuthorizeUrl(String callbackUri, String state) {
        if (!properties.googleConfigured()) {
            throw new OAuthFlowException("oauth_not_configured");
        }
        return UriComponentsBuilder.fromUriString(AUTHORIZE_ENDPOINT)
                .queryParam("client_id", properties.googleClientId())
                .queryParam("redirect_uri", callbackUri)
                .queryParam("response_type", "code")
                .queryParam("scope", "openid email profile")
                .queryParam("state", state)
                .build()
                .encode()
                .toUriString();
    }

    /**
     * Exchanges the code and resolves the local account: existing identity →
     * its user; verified email already registered → linked to that account;
     * otherwise a new passwordless user is created. Concurrent first logins
     * race on the unique constraints and surface as a generic oauth_failed —
     * the retry succeeds.
     */
    @Transactional
    public User completeGoogleLogin(String authorizationCode, String callbackUri) {
        if (!properties.googleConfigured()) {
            throw new OAuthFlowException("oauth_not_configured");
        }
        Profile profile;
        try {
            profile = google.exchangeCodeForProfile(authorizationCode, callbackUri,
                    properties.googleClientId(), properties.googleClientSecret());
        } catch (OAuthExchangeException e) {
            throw new OAuthFlowException("oauth_failed");
        }
        // Never link an unverified provider email to a local account.
        if (profile.email() == null || profile.email().isBlank()
                || !Boolean.TRUE.equals(profile.emailVerified())) {
            throw new OAuthFlowException("oauth_email");
        }

        return identities.findWithUser(UserIdentity.Provider.GOOGLE, profile.subject())
                .map(UserIdentity::getUser)
                .orElseGet(() -> linkOrCreateUser(profile));
    }

    private User linkOrCreateUser(Profile profile) {
        String email = profile.email().toLowerCase();
        User user = users.findByEmailIgnoreCase(email)
                .orElseGet(() -> users.save(User.oauthUser(email, nameOrDefault(profile))));
        identities.save(UserIdentity.newIdentity(user, UserIdentity.Provider.GOOGLE, profile.subject()));
        return user;
    }

    private static String nameOrDefault(Profile profile) {
        if (profile.name() != null && !profile.name().isBlank()) {
            return profile.name();
        }
        int at = profile.email().indexOf('@');
        return at > 0 ? profile.email().substring(0, at) : profile.email();
    }
}

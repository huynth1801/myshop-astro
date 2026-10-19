package com.shop.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.shop.auth.GoogleOAuthClient.Profile;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OAuthServiceTest {

    private static final String CALLBACK = "http://localhost:8080/api/v1/auth/oauth/google/callback";

    @Mock
    private GoogleOAuthClient google;

    @Mock
    private UserRepository users;

    @Mock
    private UserIdentityRepository identities;

    private OAuthService service;

    @BeforeEach
    void setUp() {
        service = new OAuthService(google, users, identities,
                new OAuthProperties("client-id-1", "client-secret-1", List.of("http://localhost:4321")));
    }

    @Test
    void newStateIsUrlSafeAndNonDeterministic() {
        String first = service.newState();
        String second = service.newState();

        assertThat(first).matches("[A-Za-z0-9_-]{43}"); // 32 bytes base64url, unpadded
        assertThat(first).isNotEqualTo(second);
    }

    @Test
    void buildAuthorizeUrlContainsRequiredParams() {
        String url = service.buildGoogleAuthorizeUrl(CALLBACK, "st-123");

        assertThat(url).startsWith("https://accounts.google.com/o/oauth2/v2/auth?");
        assertThat(url).contains("client_id=client-id-1");
        assertThat(url).contains("response_type=code");
        assertThat(url).contains("scope=openid%20email%20profile");
        assertThat(url).contains("state=st-123");
        assertThat(url).contains("redirect_uri=");
    }

    @Test
    void buildAuthorizeUrlFailsWhenNotConfigured() {
        OAuthService unconfigured = new OAuthService(google, users, identities,
                new OAuthProperties("", "", List.of("http://localhost:4321")));

        assertThatThrownBy(() -> unconfigured.buildGoogleAuthorizeUrl(CALLBACK, "st"))
                .isInstanceOfSatisfying(OAuthFlowException.class,
                        e -> assertThat(e.errorCode()).isEqualTo("oauth_not_configured"));
    }

    @Test
    void completeLoginReturnsKnownIdentityUserWithoutTouchingUsers() {
        User known = User.newUser("me@example.com", "hash", "Me");
        UserIdentity identity = mock(UserIdentity.class);
        when(identity.getUser()).thenReturn(known);
        when(identities.findWithUser(UserIdentity.Provider.GOOGLE, "g-123"))
                .thenReturn(Optional.of(identity));
        when(google.exchangeCodeForProfile("code-1", CALLBACK, "client-id-1", "client-secret-1"))
                .thenReturn(new Profile("g-123", "me@example.com", true, "Me"));

        User result = service.completeGoogleLogin("code-1", CALLBACK);

        assertThat(result).isSameAs(known);
        verify(users, never()).save(any(User.class));
        verify(identities, never()).save(any(UserIdentity.class));
    }

    @Test
    void completeLoginCreatesPasswordlessUserAndIdentityForNewEmail() {
        when(identities.findWithUser(UserIdentity.Provider.GOOGLE, "g-new")).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCase("new@example.com")).thenReturn(Optional.empty());
        when(users.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(google.exchangeCodeForProfile("code-2", CALLBACK, "client-id-1", "client-secret-1"))
                .thenReturn(new Profile("g-new", "New@Example.com", true, "  ")); // blank name → fallback

        User result = service.completeGoogleLogin("code-2", CALLBACK);

        assertThat(result.getEmail()).isEqualTo("new@example.com"); // lowercased
        assertThat(result.getPasswordHash()).isNull();
        assertThat(result.getName()).isEqualTo("New"); // email local part
        assertThat(result.getRole()).isEqualTo(UserRole.CUSTOMER);

        ArgumentCaptor<UserIdentity> identity = ArgumentCaptor.forClass(UserIdentity.class);
        verify(identities).save(identity.capture());
        assertThat(identity.getValue().getUser()).isSameAs(result);
        assertThat(identity.getValue().getProvider()).isEqualTo(UserIdentity.Provider.GOOGLE);
        assertThat(identity.getValue().getProviderUserId()).isEqualTo("g-new");
    }

    @Test
    void completeLoginLinksVerifiedEmailToExistingPasswordAccount() {
        User existing = User.newUser("me@example.com", "$2a$10$hash", "Me");
        when(identities.findWithUser(UserIdentity.Provider.GOOGLE, "g-777")).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCase("me@example.com")).thenReturn(Optional.of(existing));
        when(google.exchangeCodeForProfile("code-3", CALLBACK, "client-id-1", "client-secret-1"))
                .thenReturn(new Profile("g-777", "me@example.com", true, "Me"));

        User result = service.completeGoogleLogin("code-3", CALLBACK);

        assertThat(result).isSameAs(existing);
        verify(users, never()).save(any(User.class));
        verify(identities).save(any(UserIdentity.class));
    }

    @Test
    void completeLoginRejectsUnverifiedEmailWithoutTouchingRepositories() {
        when(google.exchangeCodeForProfile(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(new Profile("g-1", "me@example.com", false, "Me"));

        assertThatThrownBy(() -> service.completeGoogleLogin("code-4", CALLBACK))
                .isInstanceOfSatisfying(OAuthFlowException.class,
                        e -> assertThat(e.errorCode()).isEqualTo("oauth_email"));
        verify(identities, never()).save(any(UserIdentity.class));
        verify(users, never()).save(any(User.class));
    }

    @Test
    void completeLoginRejectsMissingEmail() {
        when(google.exchangeCodeForProfile(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(new Profile("g-1", null, true, "Me"));

        assertThatThrownBy(() -> service.completeGoogleLogin("code-5", CALLBACK))
                .isInstanceOfSatisfying(OAuthFlowException.class,
                        e -> assertThat(e.errorCode()).isEqualTo("oauth_email"));
    }

    @Test
    void completeLoginTranslatesExchangeFailureToGenericError() {
        when(google.exchangeCodeForProfile(anyString(), anyString(), anyString(), anyString()))
                .thenThrow(new OAuthExchangeException());

        assertThatThrownBy(() -> service.completeGoogleLogin("bad-code", CALLBACK))
                .isInstanceOfSatisfying(OAuthFlowException.class,
                        e -> assertThat(e.errorCode()).isEqualTo("oauth_failed"));
    }

    @Test
    void completeLoginFailsFastWhenNotConfigured() {
        OAuthService unconfigured = new OAuthService(google, users, identities,
                new OAuthProperties("id-only", "", List.of("http://localhost:4321")));

        assertThatThrownBy(() -> unconfigured.completeGoogleLogin("code", CALLBACK))
                .isInstanceOfSatisfying(OAuthFlowException.class,
                        e -> assertThat(e.errorCode()).isEqualTo("oauth_not_configured"));
        verify(google, never()).exchangeCodeForProfile(anyString(), anyString(), anyString(), anyString());
    }
}

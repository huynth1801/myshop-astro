package com.shop.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository users;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwt;

    @InjectMocks
    private AuthService authService;

    @Test
    void registerHashesPasswordAndLowercasesEmail() {
        when(users.existsByEmailIgnoreCase("Demo@Example.com")).thenReturn(false);
        when(passwordEncoder.encode("super-secret-123")).thenReturn("$2a$10$hashed");
        when(users.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User user = authService.register("Demo@Example.com", "super-secret-123", "Demo");

        assertThat(user.getEmail()).isEqualTo("demo@example.com");
        assertThat(user.getPasswordHash()).isEqualTo("$2a$10$hashed");
        assertThat(user.getName()).isEqualTo("Demo");
        assertThat(user.getRole()).isEqualTo(UserRole.CUSTOMER);
    }

    @Test
    void registerRejectsDuplicateEmail() {
        when(users.existsByEmailIgnoreCase("demo@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register("demo@example.com", "super-secret-123", "Demo"))
                .isInstanceOf(EmailTakenException.class);
        verify(users, never()).save(any(User.class));
    }

    @Test
    void loginSucceedsWithCorrectPassword() {
        User stored = User.newUser("demo@example.com", "$2a$10$hashed", "Demo");
        when(users.findByEmailIgnoreCase("demo@example.com")).thenReturn(Optional.of(stored));
        when(passwordEncoder.matches("super-secret-123", "$2a$10$hashed")).thenReturn(true);

        User user = authService.login("demo@example.com", "super-secret-123");

        assertThat(user).isSameAs(stored);
    }

    @Test
    void loginRejectsWrongPasswordWithoutLeakingWhichPartFailed() {
        User stored = User.newUser("demo@example.com", "$2a$10$hashed", "Demo");
        when(users.findByEmailIgnoreCase("demo@example.com")).thenReturn(Optional.of(stored));
        when(passwordEncoder.matches("wrong-password-1", "$2a$10$hashed")).thenReturn(false);

        assertThatThrownBy(() -> authService.login("demo@example.com", "wrong-password-1"))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void loginRejectsUnknownEmailWithSameError() {
        when(users.findByEmailIgnoreCase("ghost@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login("ghost@example.com", "whatever-pass"))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void refreshIssuesNewTokenPair() {
        UUID userId = UUID.randomUUID();
        User stored = mock(User.class); // persisted user: id present, hash irrelevant here
        when(stored.getId()).thenReturn(userId);
        when(stored.getEmail()).thenReturn("demo@example.com");
        when(stored.getName()).thenReturn("Demo");
        when(stored.getRole()).thenReturn(UserRole.CUSTOMER);
        when(jwt.parseRefreshToken("valid-refresh")).thenReturn(Optional.of(userId));
        when(users.findById(userId)).thenReturn(Optional.of(stored));
        JwtService.Tokens fresh = new JwtService.Tokens("new-access", "new-refresh", 900);
        when(jwt.issue(userId, "demo@example.com", "Demo", UserRole.CUSTOMER)).thenReturn(fresh);

        JwtService.Tokens result = authService.refresh("valid-refresh");

        assertThat(result).isSameAs(fresh);
    }

    @Test
    void refreshRejectsGarbageToken() {
        when(jwt.parseRefreshToken("garbage")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refresh("garbage"))
                .isInstanceOf(InvalidRefreshTokenException.class);
    }
}

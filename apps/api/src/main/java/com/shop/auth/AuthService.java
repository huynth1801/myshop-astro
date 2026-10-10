package com.shop.auth;

import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwt;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwt) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwt = jwt;
    }

    @Transactional
    public User register(String email, String password, String name) {
        if (users.existsByEmailIgnoreCase(email)) {
            throw new EmailTakenException(email);
        }
        return users.save(User.newUser(email.toLowerCase(), passwordEncoder.encode(password), name));
    }

    @Transactional(readOnly = true)
    public User login(String email, String password) {
        User user = users.findByEmailIgnoreCase(email)
                .orElseThrow(InvalidCredentialsException::new);
        // null hash = OAuth-only account (V7) — same error as a wrong password
        if (user.getPasswordHash() == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }
        return user;
    }

    /** Rotates the refresh cookie: a used refresh token is never reissued as-is. */
    @Transactional(readOnly = true)
    public JwtService.Tokens refresh(String refreshToken) {
        UUID userId = jwt.parseRefreshToken(refreshToken)
                .orElseThrow(InvalidRefreshTokenException::new);
        User user = users.findById(userId).orElseThrow(InvalidRefreshTokenException::new);
        return jwt.issue(user.getId(), user.getEmail(), user.getName(), user.getRole());
    }
}

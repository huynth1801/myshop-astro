package com.shop.auth;

import com.shop.common.uuid.Ids;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;

/**
 * user_identities (V7): links a user to one external OAuth subject. One
 * account may hold several identities (and a password) — see ADR 0004.
 */
@Entity
@Table(name = "user_identities",
        uniqueConstraints = @UniqueConstraint(name = "uq_user_identities_subject",
                columnNames = {"provider", "provider_user_id"}))
public class UserIdentity {

    public enum Provider { GOOGLE }

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Provider provider;

    @Column(name = "provider_user_id", nullable = false)
    private String providerUserId;

    @CreationTimestamp
    @Column(name = "created_at")
    private Instant createdAt;

    static UserIdentity newIdentity(User user, Provider provider, String providerUserId) {
        UserIdentity identity = new UserIdentity();
        identity.user = user;
        identity.provider = provider;
        identity.providerUserId = providerUserId;
        return identity;
    }

    @PrePersist
    void assignId() {
        if (id == null) {
            id = Ids.newId();
        }
    }

    public User getUser() {
        return user;
    }

    public Provider getProvider() {
        return provider;
    }

    public String getProviderUserId() {
        return providerUserId;
    }
}

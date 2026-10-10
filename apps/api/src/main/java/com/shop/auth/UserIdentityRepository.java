package com.shop.auth;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserIdentityRepository extends JpaRepository<UserIdentity, UUID> {

    /** Join-fetches the user so callers can read profile fields after the tx. */
    @Query("""
            select i from UserIdentity i join fetch i.user
            where i.provider = :provider and i.providerUserId = :subject
            """)
    Optional<UserIdentity> findWithUser(@Param("provider") UserIdentity.Provider provider,
            @Param("subject") String subject);
}

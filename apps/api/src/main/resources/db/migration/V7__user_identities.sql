-- V7 — OAuth identities (ADR 0004). A user may sign in with several providers
-- (and password). OAuth-only accounts have no password: password_hash is now
-- nullable and password login simply fails for them.

CREATE TABLE user_identities (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users (id),
    provider         VARCHAR(32)  NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_identities_subject UNIQUE (provider, provider_user_id)
);
CREATE INDEX idx_user_identities_user ON user_identities (user_id);

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

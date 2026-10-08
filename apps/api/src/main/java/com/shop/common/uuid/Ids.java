package com.shop.common.uuid;

import java.security.SecureRandom;
import java.util.UUID;

/**
 * UUIDv7 factory — 48-bit millisecond timestamp + random bits, so primary keys
 * are time-sortable as required by docs/PLAN.md §4. Entities assign these in
 * @PrePersist; the DB default gen_random_uuid() is only a defensive fallback.
 */
public final class Ids {

    private static final SecureRandom RANDOM = new SecureRandom();

    private Ids() {
    }

    public static UUID newId() {
        long timestamp = System.currentTimeMillis();
        long msb = (timestamp << 16) | (0x7L << 12) | RANDOM.nextInt(0x1000);
        long lsb = (RANDOM.nextLong() & 0x3FFFFFFFFFFFFFFFL) | 0x8000000000000000L;
        return new UUID(msb, lsb);
    }
}

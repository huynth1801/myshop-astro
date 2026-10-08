# ADR 0003 — Store currency is VND

Date: 2026-10-08 · Status: accepted

## Context

The storefront targets Vietnamese shoppers (Vietnamese UI, "freeship 500K" promo bar).
Demo seed data was priced in USD. VND is a zero-decimal currency (ISO 4217: 0 minor
units), which collides with the project rule "money is long cents everywhere".

## Decision

- Display currency is **VND** (`₫`, `vi-VN` locale, no decimals).
- Storage convention stays **"cents" = minor units x100**: 450,000₫ is stored as
  `45_000_000` in `price_cents`. This keeps every rule, DTO name, test and JSON-LD
  price computation (`cents / 100`) unchanged — only the display locale changes.
- Free-shipping threshold: 500,000₫ (stored `50_000_000`).
- JSON-LD `priceCurrency: VND`, `price` as the integer đồng amount.

## Consequences

- All amounts are round hundreds of đồng so `/100` always yields an integer; a
  CHECK or formatter guard can be added if fractional prices ever appear.
- Migration V4 re-seeded demo prices; Stripe (deferred, ADR/PLAN) supports VND
  as a zero-decimal currency when checkout resumes.

# ADR 0009: Telegram-Powered Customer Live Chat

- **Status:** Accepted
- **Date:** 2026-10-14
- **Context:** E-commerce Storefront — Real-time Customer Support & Shop Owner Communication

## Context & Problem Statement

Customer inquiries on product sizing, fabric, availability, and delivery time are critical for conversion in boutique fashion e-commerce. However:
1. Self-hosted admin-only live chat systems require the shop owner to keep the admin dashboard open on a desktop computer 24/7, leading to missed chats when away.
2. Third-party SaaS widgets (Intercom, Crisp, Zendesk) are expensive, heavy on page load, track third-party cookies, and introduce recurring monthly subscriptions.
3. Social chat popups (Facebook Messenger / Zalo chat plugins) are clunky, require customer logins, and often get blocked by ad blockers or privacy extensions.

We want an in-house, zero-cost, privacy-first live chat widget on the storefront where:
1. Customers (guest or authenticated) can instantly chat on the website with zero friction.
2. The shop owner receives instant mobile push notifications in **Telegram** and replies simply by using the native "Reply" button on their phone.
3. The reply flows back seamlessly to the customer's chat widget on the storefront.

## Decision

1. **Architecture & Message Flow:**
   - **Customer → Shop Owner:**
     - Storefront renders a lightweight floating chat widget (`ChatWidget.tsx`) in Astro with nanostores/localStorage state.
     - When a customer sends a message (`POST /api/v1/chat/messages`), backend records the conversation and message in PostgreSQL (`chat_conversations`, `chat_messages`).
     - Backend forwards the inquiry to the shop owner's Telegram via Telegram Bot API (`sendMessage`), attaching customer context (guest ID, customer name, phone if provided, and currently viewed product link).
   - **Shop Owner → Customer:**
     - The shop owner receives the message in Telegram with message ID tracked in DB.
     - The owner swipes "Reply" to the message in the Telegram app.
     - Telegram delivers the reply via Webhook (`POST /api/v1/webhooks/telegram`) or via Long Polling in local development.
     - The backend correlates the Telegram `reply_to_message.message_id` with the original conversation, saves the message as `ADMIN`, and makes it available to the customer.
   - **Client Delivery:**
     - Customer widget polls `GET /api/v1/chat/messages` with an `after` timestamp when open (lightweight indexed lookup every 2.5s).

2. **Data Model (`V11__chat_telegram.sql`):**
   - `chat_conversations(id, session_token, user_id, customer_name, customer_phone, last_message_at, created_at, updated_at)`
   - `chat_messages(id, conversation_id, sender_type, content, metadata, telegram_message_id, created_at)`
   - Indexed on `session_token`, `conversation_id`, and `telegram_message_id`.

3. **Dual Mode for Telegram (Development & Production):**
   - **Production:** Webhook mode (`POST /api/v1/webhooks/telegram`) validated via secret token header.
   - **Development:** Automatic background long-polling runner (`TelegramPollingService`) enabled when webhook URL is unset, allowing developers to test two-way Telegram replies on `localhost` without ngrok.
   - **Offline / CI Mock:** When `TELEGRAM_ENABLED=false` or token is empty, the system gracefully falls back to local DB persistence without failing API calls or CI tests.

4. **Security & Privacy:**
   - Customer messages sanitized and length-capped (max 2,000 characters).
   - Rate limiting and session token verification.
   - No external trackers or third-party cookies injected into customer browsers.

## Consequences

- Zero recurring SaaS fees for live customer support.
- Instant mobile responsiveness for the merchant via Telegram app push notifications.
- Storefront remains extremely fast, lightweight, and completely on-brand.

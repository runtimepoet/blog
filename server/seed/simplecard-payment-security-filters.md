---
title: "Defending a payment pipeline: SimpleCard's filter chain"
date: 2026-08-17
tags: [Security, Java]
excerpt: A store that auto-delivers digital goods is a machine that turns HTTP requests into money. Walking through SimpleCard's defensive layers — webhook IP allowlists, token buckets, and why X-Forwarded-For is a lie by default.
---

[SimpleCard](https://github.com/runtimepoet/simplecard) is a self-hosted
platform for selling digital goods: a buyer pays, the system delivers card
keys automatically. Anything that turns web requests into money gets attacked
by default, so the Spring Boot API is built as a chain of explicit defensive
filters. Here's the thinking behind each layer.

## 1. Webhook IP allowlist (first in chain)

Payment webhooks are the crown jewels: a forged "payment confirmed" callback
means free goods. `WebhookIpFilter` runs at `@Order(1)`, *before* everything
else, and restricts webhook endpoints to a configurable IP allowlist — with
an optional domain-based allowlist that DNS-resolves and caches entries for
five minutes. No config, no restriction (self-hosters choose their posture).

## 2. Rate limiting that doesn't trust X-Forwarded-For

`RateLimitFilter` is a token-bucket limiter with a separate, stricter bucket
for login endpoints. The subtle part: it only honors `X-Forwarded-For` from
**configured trusted proxies** (loopback by default). Without that check, any
client could rotate the XFF header and walk straight past per-IP limits —
the most common rate-limit bug in the wild.

## 3. Turnstile on the noisy endpoints

Cloudflare Turnstile guards registration and order placement — the endpoints
bots care about. It's a filter, not controller logic, so it can't be
forgotten when a new route appears.

## 4. JWT auth as a filter, not a convention

`JwtAuthenticationFilter` plus a custom entry point and access-denied
handler: authentication failures get one consistent shape, and no endpoint
accidentally "falls open" because someone skipped an annotation.

## 5. Risk control as data, not code

Order-frequency and device rules live in the database (a dedicated risk
config), so thresholds can be tuned from the admin panel without a redeploy.
The USDT channel adds on-chain txid verification — payment proof checked
against the chain itself, not a screenshot.

## The meta-lesson

None of these layers is exotic. What matters is they're **ordered,
explicit, and default-closed**. Security filters you can list in one breath
are the ones that actually get audited. That listability is a design goal,
not a side effect.

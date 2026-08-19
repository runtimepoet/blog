---
title: "vuln-card #1: an email address walks into your order system"
date: 2026-08-19
tags: [Security, Web]
excerpt: Deep dive on the critical SimpleCard finding — three permitAll endpoints that chain into full card-key theft. Anatomy of a design-level IDOR, and the fix that actually closes it.
---

First deep dive from the [vuln-card](https://github.com/runtimepoet/vuln-card)
audit: the critical one. Three endpoints, each defensible in isolation, that
chain into "know a buyer's email, steal every card key they ever received."

## The chain

**Step 1 — query orders by email, no proof of ownership.**

```http
POST /api/orders/query
{"emails": ["victim@example.com"]}
```

`SecurityConfig` marks `/orders/query` as `permitAll`, and
`DeliverServiceImpl` runs `findByEmailInOrderByCreatedAtDesc(emails)` and
returns the results. No verification code, no password, no token. The email
address *is* the credential — and emails are the most guessable identifier on
the internet.

**Step 2 — trigger delivery, receive plaintext keys.**

```http
POST /api/orders/deliver
{"order_ids": ["<uuid-from-step-1>"]}
```

Also `permitAll`. For any PAID order it assigns card keys and returns them in
the response body. For already-delivered orders there's step 2':
`GET /orders/{id}/export` — a full plaintext `.txt`.

## Why this is worse than a typical IDOR

Classic IDORs leak records. This one leaks **the product itself** — a card
site's inventory is secrets, and the response *is* the goods. It's also a
*design* flaw, not an oversight: the frontend's order-query page
(`order/query/page.tsx`) implements exactly this flow, which means it was
never threat-modeled at all.

And rate limiting doesn't save it. One request per victim is all it takes;
the device-fingerprint limiter is off by default and trivially bypassed when
on ([vuln #04](https://github.com/runtimepoet/vuln-card/blob/main/docs/vulns/04-device-fingerprint-bypass.md)).

## The fix that actually closes it

Convenience features for guests can stay — with proof:

1. `query` takes the email, creates a **6-digit one-time code**, stores its
   hash with a 10-minute TTL, emails it. Returns nothing else.
2. `query/verify` exchanges email + code for a **single-purpose token**
   scoped to those order ids, 15-minute expiry.
3. `deliver` / `export` require that token. Plaintext keys are never served
   without it.
4. Per-email attempt throttling + enumeration alerts as defense in depth.

Full writeup with code references:
[vuln-card/docs/vulns/01](https://github.com/runtimepoet/vuln-card/blob/main/docs/vulns/01-order-query-idor-cardkey-theft.md).
The fix lands in SimpleCard next; that commit will be the follow-up post.

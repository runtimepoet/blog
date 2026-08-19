---
title: "I audited my own payment platform. It didn't go well."
date: 2026-08-19
tags: [Security, Java]
excerpt: A full manual audit of SimpleCard found a zero-cost chain that turns a buyer's email address into every card key they ever received — plus default-config pitfalls. Full writeups live in vuln-card.
---

Attacking your own code is uncomfortable. You wrote the defenses; of course
they hold. Except mine didn't — not all of them. I did a full manual review
of [SimpleCard](https://github.com/runtimepoet/simplecard) (Spring Boot 3 +
Next.js), tracing every unauthenticated endpoint to its data sink, and
published the complete findings in
[vuln-card](https://github.com/runtimepoet/vuln-card). Here's the short
version.

## The critical one: email in, card keys out

SimpleCard lets buyers retrieve orders with just their email — a "guest
order lookup" convenience feature. The audit found the whole chain is
unauthenticated end to end:

1. `POST /orders/query` returns all orders for any email — no mailbox
   verification, ever.
2. `POST /orders/deliver` takes those order UUIDs and returns card keys in
   plaintext.
3. `GET /orders/{id}/export` hands over a full text file for delivered
   orders.

Know someone's email → know everything they bought. One request per victim.
This is the kind of bug that looks like a feature right up until you read it
with an attacker's eyes.

## The defaults pile-up

- `PASSWORD_PLAIN=true` out of the box → every user password stored in clear.
- Seeded `admin / 123456#` → default deploy is one POST away from full
  admin, including editing payment channels.
- A hardcoded default `JWT_SECRET` in the public repo — exploitable only when
  paired with a UUID leak, but a constant signing key should not exist.

And a medium that made me smile grimly: the device-fingerprint rate limiter
keys on a client-supplied header. One random hex per request and every
bucket is empty. A defense that lives only in the architecture diagram.

## What survived

Honest audits cut both ways. The payment chain held: Epay callbacks do MD5
signature + exact amount + **server-side re-query of the gateway** before
marking paid; the USDT path verifies transactions on-chain (confirmed,
exact amount, right contract, right receiver, timestamp after order) with
double-table txid dedup. Uploads are admin-only with triple content checks.
Pricing is fully server-side. No SQLi (JPA parameterized), no stored XSS
(markdown rendered without raw HTML).

## Why publish failures?

Because "we take security seriously" means nothing and a findings table with
repro steps means everything. Every doc in vuln-card has the affected file
and line, the HTTP-level repro, and the fix. If you run SimpleCard, read
[01](https://github.com/runtimepoet/vuln-card/blob/main/docs/vulns/01-order-query-idor-cardkey-theft.md)
today; the fix (mailbox verification codes) is specified there.

The codebase gets the fixes next. Then v2 of the audit — ideally by someone
who didn't write the code.

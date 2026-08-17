---
title: "vuln-bite #2: IDOR — your order history is one loop away"
date: 2026-08-13
tags: [WebSafety]
excerpt: Second writeup — the unauthenticated order endpoint with sequential IDs, exploited with a three-line bash loop, and closed with unguessable per-order tokens.
---

Second writeup from [vuln-bite](https://github.com/runtimepoet/vuln-bite).
This one is the classic I secretly hoped I wouldn't find in my own code: an
**IDOR** (Insecure Direct Object Reference).

## The mistake

After checkout, the confirmation page loads the order's line items:

```ts
// frontend/src/pages/OrderConfirm.tsx
fetch(`/api/entities/collection/order/${orderId}/items?offset=0&limit=100`)
```

No session. No token. And `orderId` is a sequential integer sitting in the
URL. The CMS faithfully serves anyone who asks.

## Exploit

The entire attack fits in three lines of bash:

```bash
for id in $(seq 1 200); do
  curl -s "http://localhost:8080/api/entities/collection/order/$id/items?limit=100"
done
```

Every order's items come back — and the parent records carry the **customer
names and phone numbers** people typed into checkout. Full enumeration, zero
authentication, no rate limit to trip.

## Impact

- Bulk PII leak — real names tied to real phone numbers
- Competitors get your sales volume and bestsellers for free
- In a real deployment this is a reportable data breach

## Fix

Branch: [`fix/02-order-access-tokens`](https://github.com/runtimepoet/vuln-bite/tree/fix/02-order-access-tokens)
([full diff](https://github.com/runtimepoet/vuln-bite/compare/main...fix/02-order-access-tokens))

The sequential ID stops being a *capability*:

1. `POST /api/orders` (from fix #1) now issues a random 128-bit **order token**
   alongside the ID
2. The confirmation URL becomes `/orderConfirm/42?t=9f3b…` — the token travels
   with the legitimate customer
3. A middleware rejects collection reads without a valid token:

```csharp
app.Use(async (ctx, next) =>
{
    if (ctx.Request.Path.StartsWithSegments("/api/entities/collection/order") &&
        !OrderTokens.IsValid(ctx.Request.Query["t"].ToString()))
    {
        ctx.Response.StatusCode = 401;   // sequential scans die here
        return;
    }
    await next();
});
```

Re-run the loop against the fix branch: 200 responses become a wall of 401s.

## Takeaway

**Identifiers are not authorization.** Any object reachable by a guessable key
needs its own access check — "the user wouldn't know the URL" is not a
security model. Unguessable tokens (or proper per-object ACL) turn
enumeration from a loop into a lottery.

Next: [default admin passwords, seeded with love](/post/vuln-bite-03-default-admin-credentials).

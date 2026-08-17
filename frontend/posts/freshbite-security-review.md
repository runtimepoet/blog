---
title: "Self-audit: I pentested my own food-ordering app"
date: 2026-08-13
tags: [WebSafety]
excerpt: Three real vulnerabilities I found in FreshBite by reading my own code like an attacker — hardcoded guest credentials, an IDOR leaking customer phones, and README-documented admin passwords.
---

Security posts usually dissect someone else's code. More useful exercise:
point the same mindset at your own. I spent an hour attacking
[FreshBite](https://github.com/runtimepoet/freshbite), my own demo shop, and it
failed three times. Here's the writeup.

## Finding 1: Guest credentials shipped in the JavaScript bundle

The guest-checkout flow logs in a shared account before inserting the order:

```ts
body: JSON.stringify({ usernameOrEmail: '__guest_', password: 'guest1!' })
```

That string is in the minified frontend bundle, one `Ctrl+F` away. Anyone can
authenticate as the guest account and do whatever that account can do —
insert orders at minimum.

**Impact:** order spam, write-API abuse.
**Fix:** a server-side endpoint that creates orders anonymously with
validation + rate limiting, instead of handing the guest session to the
client. The guest account should never be reachable from a browser.

## Finding 2: IDOR — every customer's name and phone is enumerable

The confirmation page fetches line items like this:

```ts
fetch(`/api/entities/collection/order/${orderId}/items?...`)
```

No session, no token. Order IDs are sequential integers. So:

```bash
for id in $(seq 1 500); do
  curl -s "https://shop.example/api/entities/collection/order/$id/items"
done
```

…harvests every order's contents — and depending on entity visibility, the
customer names and phone numbers attached to them. A textbook **IDOR**
(Insecure Direct Object Reference), and a PII leak in a real deployment.

**Impact:** full order-history enumeration, customer PII exposure.
**Fix:** require authorization on the collection endpoint, and issue
unguessable order tokens (UUIDs) for the confirmation page instead of
sequential IDs.

## Finding 3: Default admin credentials, documented in my own README

`Program.cs` seeds two accounts on first run:

```csharp
await app.EnsureCmsUser("sadmin@cms.com", "Admin1!", [Roles.Sa]);
```

I even documented them in the README "for convenience". Anyone who deploys
this unchanged has a fully working super-admin login published next to the
code. Credential-guessing bots scan for exactly this pattern.

**Impact:** complete CMS takeover — schema, content, users.
**Fix:** seed from environment variables, force a password change on first
login, and never print credentials in a README, even "for demos".

## What held up

Fair's fair — a few things survived the audit: the CMS uses an ORM with
parameterized queries throughout (no obvious SQLi), CORS is scoped to the dev
origin instead of `*`, and the container serves everything same-origin, which
sidesteps a whole class of misconfigurations.

## Takeaway

None of these required tooling — just reading my own code as if I wanted to
break it. The vulnerable variant of this app (fix commits included) is on my
project list as **vuln-bite**: each of these findings will get a branch you
can exploit, then patch.

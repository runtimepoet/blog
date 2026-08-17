---
title: "vuln-bite #1: the credentials hiding in your JS bundle"
date: 2026-08-13
tags: [WebSafety]
excerpt: First writeup from my deliberately-vulnerable shop — how a well-meaning guest login shipped CMS credentials to every visitor, and how moving one endpoint server-side closed it.
---

This is the first writeup from [vuln-bite](https://github.com/runtimepoet/vuln-bite),
my intentionally vulnerable food-ordering app. Every post in this series
follows the same loop: **find it → exploit it → fix it → re-attack it**.

## The mistake

The storefront needs to insert orders into the CMS, and the CMS requires an
authenticated session. The "simple" solution I shipped: a shared guest
account, logged in from the browser right before submitting:

```ts
// frontend/src/api.ts — as deployed to every visitor's browser
body: JSON.stringify({ usernameOrEmail: '__guest_', password: 'guest1!' })
```

Convenient, invisible in the UI, and completely public. Anything shipped to
the client is public — sourcemaps, bundlers and minifiers change nothing.

## Exploit

No tooling required. Grab the bundle and grep:

```bash
curl -s http://localhost:8080/assets/index-*.js | grep -o "guest1!"
```

Or skip the bundle and read the source on GitHub. Either way, thirty seconds
later you hold working CMS credentials:

```bash
curl -i -X POST http://localhost:8080/api/login \
  -H 'Content-Type: application/json' \
  -d '{"usernameOrEmail":"__guest_","password":"guest1!"}'
# → 200 + a valid session cookie
```

That session can insert orders at will — and probe whatever else the guest
role is allowed to touch.

## Fix

Branch: [`fix/01-server-side-orders`](https://github.com/runtimepoet/vuln-bite/tree/fix/01-server-side-orders)
([full diff](https://github.com/runtimepoet/vuln-bite/compare/main...fix/01-server-side-orders))

The trust boundary moves back to the server:

- Frontend posts the bare order to a new `POST /api/orders` — no login at all
- Backend validates `name` / `phone` / `items` (400 on garbage)
- Backend performs the CMS insert with a **service account from env config** —
  the credentials never leave the server

```csharp
app.MapPost("/api/orders", async (HttpRequest req) =>
{
    var order = await req.ReadFromJsonAsync<JsonElement>();
    // validation…
    using var http = new HttpClient { BaseAddress = new Uri("http://localhost:8080") };
    await http.PostAsJsonAsync("/api/login",
        new { usernameOrEmail = svcUser, password = svcPass }); // server-side only
    var res = await http.PostAsJsonAsync("/api/entities/order/insert", order);
    return Results.Content(await res.Content.ReadAsStringAsync(), "application/json");
});
```

Re-run the exploit against the fix branch: the bundle grep finds nothing, and
`__guest_` direct login no longer helps — order writes now funnel through an
endpoint that validates input.

## Takeaway

**If a secret reaches the browser, it's not a secret.** Client-side "logins"
for backend resources are just obfuscated API keys — and obfuscation isn't a
control. Server-side proxying with server-held credentials is the minimal
honest pattern.

Next in the series: [the order-history IDOR](/post/vuln-bite-02-idor-order-enumeration).

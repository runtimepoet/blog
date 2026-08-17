---
title: "Anatomy of FreshBite: wiring a React storefront to a headless CMS"
date: 2026-08-11
tags: [WebDev]
excerpt: The four API calls that run the shop, the guest-login trick behind checkout, and the MapWhen fallback that lets one container serve both SPA and API.
---

[FreshBite](https://github.com/runtimepoet/freshbite) looks like a tiny shop,
but the integration with [FormCMS](https://github.com/runtimepoet/formcms) has a
few details worth writing down. This is the map I wish I had when I started.

## The four calls that run the store

Everything the storefront does reduces to four endpoints:

| Call | Purpose |
| ---- | ------- |
| `GET /api/queries/products` | Product list for the catalog |
| `POST /api/login` | Guest session before ordering |
| `POST /api/entities/order/insert` | Create the order |
| `GET /api/entities/collection/order/{id}/items` | Line items on the confirmation page |

No bespoke controllers — the CMS exposes queries and entity CRUD, and the
frontend consumes them directly. The backend's own code is ~70 lines of
wiring in `Program.cs`.

## Guest checkout without accounts

Customers don't register, but the CMS requires an authenticated session for
inserts. The trick: a shared **guest account** that the frontend logs into
transparently before submitting:

```ts
await loginAsGuest()          // POST /api/login, cookie session
const order = await createOrder(name, phone, items)
```

The session cookie (`credentials: 'include'`) then authorizes the insert.
It's a demo-grade compromise — see my security self-audit post for why this
needs hardening before anything real.

## One container, SPA + API

The neat part of `Program.cs` is the fallback that lets ASP.NET Core serve
both the API and the built React app from `wwwroot`:

```csharp
app.MapWhen(context =>
        !context.Request.Path.StartsWithSegments("/_content") &&
        !context.Request.Path.StartsWithSegments("/api"),
    subApp =>
    {
        subApp.UseRouting();
        subApp.UseEndpoints(endpoints =>
        {
            endpoints.MapFallbackToFile("/", "index.html");
            endpoints.MapFallbackToFile("/{*path:nonfile}", "index.html");
        });
    });
```

API and CMS static assets pass through to their real handlers; everything
else (`/cart`, `/orderConfirm/42`, …) falls back to `index.html`, where
React Router takes over. One `docker run`, no reverse proxy needed.

## Dev loop

In development the Vite server proxies both `/api` and `/files` (product
images) to `localhost:5265`, so the frontend never hard-codes a host. The
same relative URLs then work unchanged in the container.

Takeaway: pick a CMS that exposes clean REST semantics, and a "shop backend"
collapses into configuration. The interesting engineering moves to the edges —
fallback routing, session strategy, and deploy packaging.

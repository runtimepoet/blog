---
title: "Building FreshBite: a food-ordering app in a weekend"
date: 2026-08-05
updated: 2026-08-12
tags: [WebDev]
excerpt: Browse menu → add to cart → guest checkout. Notes from rebuilding a full-stack demo the right way.
---

[FreshBite](https://github.com/runtimepoet/freshbite) is a simple food-ordering
web app: a React 19 + TypeScript storefront backed by ASP.NET Core 9 with
FormCMS as the headless CMS, deployed as a single Docker container.

## What the rebuild fixed

The original codebase worked, but showed its tutorial roots. The rebuild focused on:

- **Design system over inline styles** — CSS custom properties, real components
- **No hard-coded hosts** — image URLs had `http://localhost:5265` baked in;
  now everything is relative and Vite proxies `/api` + `/files` in dev
- **One currency** — the original mixed `£` and `$`; FreshBite is `NT$` throughout
- **Repo hygiene** — `.DS_Store`, `.idea/`, bot-generated update files and
  committed build output all removed, `.gitignore` hardened

## Architecture in one breath

```
Vue/Vite dev :5173 ──proxy──> ASP.NET Core :5265 ──> FormCMS ──> SQLite
```

In production the backend serves the built frontend from `wwwroot` and the
whole thing ships as one image:

```bash
docker build -t freshbite .
docker run -p 80:8080 -v ~/freshbite-data:/app/data freshbite
```

The guest checkout flow was the interesting part: the cart lives in
`localStorage`, and submitting an order logs in a temporary guest account,
posts the order through the CMS entity API, then shows live line items on the
confirmation page.

Next step: a deliberately vulnerable variant for security practice. Stay tuned.

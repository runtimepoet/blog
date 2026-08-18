# 📝 runtimepoet · blog

My full-stack personal blog platform: a **Vue 3 + TypeScript SPA** (public site +
built-in admin) served by a **zero-dependency Node server**, shipped as **one
Docker container**.

![Vue](https://img.shields.io/badge/Vue_3-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![Node](https://img.shields.io/badge/Node.js_24-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

## ✨ Features

- 🖋️ **Markdown posts** — frontmatter metadata, tag categories, live preview
- 🎨 **Glassmorphism UI** — animated local wallpaper carousel, zh/en i18n, dark/light theme
- 🔐 **Built-in admin** (`/admin`) — posts, projects and images, all as friendly forms
- 🖼️ **Self-hosted image bed** — content-addressed storage (SHA-256 names), immutable caching
- ⚡ **Zero-dependency backend** — plain `node:http`; the entire API is one readable file
- 🐳 **Single-container deploy** — frontend build + API + static hosting + SPA fallback

## 📁 Structure

```
├── frontend/          # Vue 3 + TS + Vite SPA
│   ├── src/pages/     # public site (home / posts / projects / post)
│   ├── src/admin/     # the admin app (login / posts / projects / images)
│   └── posts/         # bundled markdown (offline fallback content)
├── server/
│   ├── server.js      # the whole backend: API + static + SPA fallback
│   └── seed/          # first-run seed posts & projects
├── Dockerfile         # multi-stage: vite build → node runtime
└── docker-compose.yml
```

## 🚀 Develop

```bash
# terminal 1 — frontend with HMR on :5173 (proxies /api to :8080)
cd frontend && npm install && npm run dev

# terminal 2 — backend on :8080
cd server && ADMIN_PASSWORD=dev123 node server.js   # needs Node 24 (node:sqlite)
```

## 🐳 Deploy

```bash
docker build -t blog .
docker run -d --name blog -p 80:8080 \
  -v blog-data:/app/data \
  -e ADMIN_PASSWORD="choose-a-strong-one" \
  blog
```

Or with Caddy terminating TLS in front:

```bash
SITE_ADDRESS=blog.example.com ADMIN_PASSWORD="choose-a-strong-one" docker compose up -d --build
```

Compose refuses to start without `ADMIN_PASSWORD` — put it in a `.env` file next
to `docker-compose.yml` to avoid repeating it. `SITE_ADDRESS` defaults to
`localhost` (Caddy issues a local cert); point it at a real domain and Caddy
provisions a Let's Encrypt certificate on its own.

Data (posts, projects, images) lives in the `blog-data` volume — rebuilds never
touch it.

## ⚙️ Configuration

| Variable | Scope | Default | Purpose |
| -------- | ----- | ------- | ------- |
| `ADMIN_PASSWORD` | runtime | `change-me` | admin login — always set this; the default is public knowledge |
| `TRUST_PROXY` | runtime | `0` | set to `1` only behind exactly one reverse proxy you control (the bundled Caddy); login throttling then keys on the **last** `X-Forwarded-For` entry |
| `DATA_DIR` | runtime | `/app/data` | where posts/projects/images live |
| `BUILD_BASE` | build | `/blog/` | URL base; `/` for self-hosting |
| `VITE_LAUNCH_DATE` | build | repo's real launch | uptime counter in the footer |

## 🔒 Admin hardening

The admin panel is a single shared password, so the server backs it up with a
few guardrails: failed logins are throttled per client (8 consecutive misses →
15-minute lockout, keyed on the IPv6 /64 rather than the exact address, plus a
fixed delay per wrong guess), the password is compared in constant time, tokens
expire after 12 hours, and uploaded SVGs are served under a `sandbox` CSP so a
stored image can never run script on the site's origin.

Those bound a single-source attack, not a distributed one — an attacker spread
across many networks still gets a fresh bucket per source. **The password itself
is the real control, so make it long and random.**

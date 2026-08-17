---
title: "This blog runs on zero npm dependencies (server side)"
date: 2026-08-17
tags: [Web, Node]
excerpt: The entire backend of this site is one readable server.js on plain node:http — no Express, no framework. Why I built it that way, and what it costs.
---

This blog's backend is a single `server.js` running on Node 22's built-in
`node:http` and `node:sqlite`. Zero npm dependencies. The whole API — posts,
projects, image bed, admin auth — fits in one file you can read in one sitting.

## Why no framework?

Express is fine. But for a personal blog, a framework is mostly ceremony:
routing tables for ten endpoints, middleware for JSON parsing I could write
in four lines. Going dependency-free means:

- **Nothing to audit.** No supply chain, no `npm audit` noise, no breaking
  major upgrades at 2am.
- **Nothing to build.** The server *is* the source. `node server.js` and it's
  up. Docker image is a `node:22-alpine` base plus one file copy.
- **Everything is visible.** When auth is thirty lines in front of you, you
  actually review it instead of trusting a middleware's README.

## What the "stack" looks like

- **Routing** — a plain `if` ladder on `req.url`. Ten routes, zero regex.
- **Database** — `node:sqlite` (built into Node 22+). Posts and projects live
  in one `blog.db` file; first run seeds from markdown on disk.
- **Auth** — admin login returns a random token held in a `Map` with a 12h
  expiry. No JWT library needed for one user.
- **Images** — uploads get content-addressed names (SHA-256 of the bytes), so
  duplicates are impossible and `Cache-Control: immutable` is always safe.
- **Static + SPA fallback** — serve `wwwroot`, fall back to `index.html` for
  client routes. Twenty lines.

## The honest costs

- Body parsing, range requests, MIME types — you re-implement papercuts that
  frameworks solved years ago.
- It would not scale to ten endpoints becoming a hundred. It doesn't need to.

The result: a backend with **zero install step**, a container that builds in
seconds, and an attack surface I can hold in my head. For a personal site,
that's the right trade.

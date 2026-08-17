---
title: "XSS & SQL injection: a 2026 field guide (fixing the classics)"
date: 2026-08-13
tags: [WebSafety]
excerpt: The classic Chinese XSS/SQLi tutorials taught a generation of developers — but some of their advice is now wrong. An updated walkthrough with working mental models and the corrections.
---

Every web-security tutorial covers XSS and SQL injection — the Chinese
classic by [tugenhua0707](https://www.cnblogs.com/tugenhua0707/p/10909284.html)
taught a lot of us. But rereading it in 2026, parts of the defense advice
have aged into *bugs*. This is the same material, rebuilt: own examples,
current browser reality, and the corrections called out.

## XSS is about execution, not "cross-site"

An XSS attack plants a `<script>` (or equivalent) where a victim's browser
will run it. Three delivery mechanisms:

| Type | Payload lives in | Trigger |
| ---- | ---------------- | ------- |
| Reflected | The URL / request | Server echoes it into the response |
| Stored | The database | Every visitor of the poisoned page |
| DOM-based | Client-side code | JS writes untrusted data into the DOM |

Minimal DOM-based example — one line is all it takes:

```js
// ?url=javascript:alert(document.cookie)
document.body.innerHTML = `<a href="${url}">${url}</a>`;
```

`innerHTML`, `document.write`, `location.href = userInput` — these are the
sinks. The fix is never "filter out the word script" (attackers encode around
blacklists); the fix is **don't parse untrusted data as markup**.

## Correction 1: `X-XSS-Protection` is dead

The classic tutorials recommend the `X-XSS-Protection: 1; mode=block`
header. **Don't.** Chrome removed its XSS auditor back in 2019 (it caused
more vulnerabilities than it stopped), and the header does nothing in any
current browser. The modern layers are:

- **CSP** — `Content-Security-Policy: default-src 'self'` kills inline
  script execution, which defangs most stored/reflected XSS outright.
- **Trusted Types** — makes the browser refuse unsafe DOM assignments unless
  data passes through a sanitizing policy.
- **Framework escaping** — Vue and React escape interpolations by default.
  The danger zones are the explicit escape hatches: `v-html` and
  `dangerouslySetInnerHTML`. (This blog renders Markdown through `v-html` —
  safe only because the content is authored locally, never user-submitted.)

## SQL injection: one rule

The `' OR '1'='1` trick still works anywhere queries are built by string
concatenation. The only reliable defense is **parameter binding** — the
driver sends data and code through separate channels, so a malicious value
can never become SQL:

```csharp
// never: $"SELECT * FROM users WHERE name = '{name}'"
var cmd = new SqlCommand("SELECT * FROM users WHERE name = @name", conn);
cmd.Parameters.AddWithValue("@name", name);
```

An ORM (EF Core, TypeORM, Prisma) gives you this by default — one of the
quiet reasons FreshBite's audit found no SQLi.

## Correction 2: md5 + salt is not password storage

The old tutorials suggest MD5 with a salt. In 2026 that's a footgun: MD5 is
a *fast* hash, and fast hashes fall to GPU brute force by the billions of
guesses per second. Use a deliberately slow, memory-hard function:

- **Argon2id** (first choice)
- **bcrypt** (cost ≥ 12) / **scrypt** — fine
- MD5 / SHA-1 / SHA-256, salted or not — **no**

## Correction 3: cookies gained a third flag

The classics teach `HttpOnly` (blocks `document.cookie` theft) and `Secure`
(HTTPS only). Correct — but incomplete. Since 2020 the third flag matters
just as much:

```
Set-Cookie: session=…; HttpOnly; Secure; SameSite=Lax
```

`SameSite` is the primary browser-level CSRF defense today — it stops the
cookie from riding along on cross-site requests (the `<img src="…/pay">`
trick from those same tutorials).

## The 2026 checklist

1. Treat all client input as hostile; bind parameters, never concatenate.
2. Don't render untrusted data as HTML; if you must, sanitize (DOMPurify).
3. CSP on, `X-XSS-Protection` forgotten.
4. `HttpOnly` + `Secure` + `SameSite` on every session cookie.
5. Passwords: Argon2id/bcrypt, never fast hashes.
6. Important actions: re-authenticate or demand a CSRF token.

*Reference: this post was inspired by and corrects parts of*
*[tugenhua0707's 2019 tutorial](https://www.cnblogs.com/tugenhua0707/p/10909284.html)*
*— worth reading for the historical framing.*

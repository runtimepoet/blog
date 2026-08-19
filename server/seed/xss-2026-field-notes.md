---
title: "XSS in 2026: where it hides when your framework 'handles it'"
date: 2026-08-19
tags: [Security, Web]
excerpt: React escapes by default, CSP is everywhere, and XSS still shows up in audits. Field notes on the three places it actually survives in modern stacks — including a real one from my own audit.
---

Ask a 2026 dev about XSS and you get "React auto-escapes, we're fine." And
yet XSS keeps appearing in audits — just not where 2016 tutorials told you to
look. Field notes from recent testing, including one from my own codebase.

## Hiding spot 1: `dangerouslySetInnerHTML` isn't the only escape hatch

The modern stack's real weakness is **data-into-HTML-context confusion**:
content that's safe in one context becomes live code in another. The trophy
example from the SimpleCard audit
([vuln-card notes](https://github.com/runtimepoet/vuln-card)):

```tsx
<script type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
```

Looks safe — it's `JSON.stringify`, what could go wrong? But `JSON.stringify`
doesn't escape `/`. A product title containing:

```
</script><script>alert(document.domain)</script>
```

closes the JSON-LD block and opens a live script. JSON-safe ≠ script-safe.
The fix is one line: `.replace(/\//g, '\\/')` before interpolation.

## Hiding spot 2: markdown and "rich content" pipelines

Every app eventually needs to render user-ish content as HTML: markdown,
sanitized HTML, email templates. Each step in that pipeline is a trust
decision:

- `react-markdown` **without** `rehype-raw` → raw HTML inert, mostly fine.
- Add `rehype-raw` because "the design needs it" → you're one sloppy
  sanitize away from stored XSS.
- DOMPurify configs get cargo-culted: `ALLOWED_URI_REGEXP` relaxations and
  `ADD_ATTR` wish lists quietly reopen `javascript:` URLs and event handlers.

Rule of thumb: the moment raw HTML is enabled, your markdown renderer stops
being a renderer and becomes a sanitizer — treat the config like firewall
rules.

## Hiding spot 3: the DOM itself

Client-side template injection, `location.hash` written into `innerHTML`,
postMessage handlers without origin checks, DOM clobbering on pages that
still read `document`-level globals. Frameworks don't see these because the
code path is yours, not theirs.

## The second line: CSP that isn't decorative

Most CSPs I test contain `'unsafe-inline'` (defeats the point) or are
report-only forever. A minimal useful CSP for a React SPA:

```
default-src 'self'; script-src 'self'; object-src 'none';
base-uri 'self'; frame-ancestors 'none'
```

`script-src 'self'` alone kills inline breakout payloads like the JSON-LD
one above — that's why it's a second line and not a poster on the wall.

## Takeaway

Frameworks protect the 90% path they own. XSS in 2026 lives in the 10% they
don't: interpolation into non-HTML contexts, rich-text pipelines, and raw DOM
touchpoints. Audit those three, set a real CSP, and the classics finally
stay dead.

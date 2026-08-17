---
title: "Postmortem: I found a signing key committed to a public repo"
date: 2026-08-16
tags: [Security]
excerpt: While auditing my own GitHub account I found a 2.5 KB keystore file sitting in a repository root. It was unused and harmless — this time. What I fixed and the rules I walk away with.
---

During a recent audit of my own repositories I found something no one wants
to see: a keystore file (`*_kt`, ~2.5 KB — the classic size of a Java
signing key store) committed to the root of a **public** repository.

## The good news, verified first

Before touching anything I checked whether it was load-bearing:

- No `signingConfig` referenced it in any `build.gradle.kts`
- No property in `gradle.properties` pointed at it
- Nothing in the codebase read it

It was an orphaned file — probably a local experiment that got swept up in a
careless `git add .`. The app builds and signs without it. So: deletable.

## But "deleted" is not "gone"

Removing the file in a new commit does nothing for history — it stays
recoverable from every previous commit forever. If it *had* been a live
signing key, the correct sequence would have been:

1. **Rotate first.** Assume any secret that touched a public repo is
   compromised. New key, new passwords, revoke where possible.
2. **Purge history.** `git filter-repo` (not a delete-commit) to strip the
   blob from every commit, then force push.
3. **Audit the blast radius.** Check clones, forks, CI caches.

A keystore in a repo is also usually a *symptom*: somewhere nearby there's
often a `storePassword` / `keyPassword` in a properties file or CI log. One
secret found means grep for its friends.

## Rules I'm walking away with

- **`.gitignore` is not a secrets policy.** Add a pre-commit scanner
  (gitleaks or equivalent) — it catches the file *before* the push, which is
  the only moment that matters.
- **Long-lived tokens in chat/config/scripts are the same bug.** During this
  same cleanup I handled a personal access token pasted in plaintext. Treat
  tokens like passwords: minimum scopes, set an expiry, revoke on any
  exposure — even "harmless" ones.
- **Audit your own account like an attacker would.** Commit-author emails,
  orphaned keystores, forgotten bot junk, stale forks — an adversary reads
  your public repos as a map of your habits. Read it first.

The file is deleted, the repo is clean, and the lesson cost me nothing.
That's the cheapest a postmortem gets.

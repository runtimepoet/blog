---
title: "vuln-bite #3: default passwords are a supply-chain problem"
date: 2026-08-13
tags: [WebSafety]
excerpt: Final writeup — super-admin credentials hardcoded in Program.cs and printed in the README. Bots scan for exactly this. The fix: environment-based seeding that fails closed.
---

Last writeup from the [vuln-bite](https://github.com/runtimepoet/vuln-bite)
lab, and the scariest one operationally — because it's the kind of thing that
ships silently inside a "working" deployment.

## The mistake

First-run seeding, straight from `backend/Program.cs`:

```csharp
await app.EnsureCmsUser("sadmin@cms.com", "Admin1!", [Roles.Sa]).Ok();
await app.EnsureCmsUser("admin@cms.com", "Admin1!", [Roles.Admin]).Ok();
```

And to make it worse, the original README printed both accounts "for
convenience". Anyone who deploys the image as-is inherits a super-admin login
that is one GitHub search away.

## Exploit

Credential-stuffing bots try default pairs continuously. Point one at the
login endpoint:

```bash
curl -X POST http://target/api/login \
  -H 'Content-Type: application/json' \
  -d '{"usernameOrEmail":"sadmin@cms.com","password":"Admin1!"}'
```

A hit means the whole CMS admin surface: schemas, content, users, uploads.
This is exactly how "hacked via default credentials" breaches keep happening
in the real world — the software wasn't broken, the *deployment default* was.

## Fix

Branch: [`fix/03-env-seeded-credentials`](https://github.com/runtimepoet/vuln-bite/tree/fix/03-env-seeded-credentials)
([full diff](https://github.com/runtimepoet/vuln-bite/compare/main...fix/03-env-seeded-credentials))

Seed credentials move to configuration, and the app **refuses to boot**
without them:

```csharp
var saPassword = builder.Configuration["SEED_SA_PASSWORD"]
    ?? throw new InvalidOperationException(
        "SEED_SA_PASSWORD must be set (environment variable) on first run.");
```

Fail closed, not open: no env var → no startup → no quiet exposure. Rotation
becomes an ops task (edit the environment), not a code change and redeploy.

## Takeaway

**Nothing secret belongs in source control — not even "temporary" seed
values.** Defaults have a way of reaching production. If setup needs a
secret, demand it at deploy time and crash without it; a deployment that
won't start is infinitely better than one that's wide open.

---

That closes the loop: three vulnerabilities, three writeups, three fix
branches. The lab stays up — try breaking it yourself, then break the fixes.

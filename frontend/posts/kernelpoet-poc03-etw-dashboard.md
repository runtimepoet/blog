---
title: "KernelPoet PoC 03: same process events, zero driver — the ETW path"
date: 2026-08-12
tags: [Kernel, ETW]
excerpt: PoC 01 needed a signed driver and a test VM. PoC 03 gets the same process start/stop stream from user mode via ETW, live into a browser dashboard over SSE. When to pick which.
---

PoC 01 watches process events from kernel space with a driver. PoC 03 in
[KernelPoet](https://github.com/runtimepoet/KernelPoet) gets the **same
events with no driver at all** — and streams them live into a web dashboard:

```
Microsoft-Windows-Kernel-Process (ETW provider)
        │  realtime session
        ▼
poc03.exe  ── SSE broadcast ──►  http://localhost:9180
```

## The mechanism

- **ETW realtime session** via KrabsETW (Microsoft's C++ wrapper, vendored in
  `third_party/`). Arm the kernel process provider, filter to event ID 1
  (start) / 2 (stop), parse `ProcessID` / `ParentID` / `ImageFileName` from
  each record's schema.
- **~80 lines of raw Winsock** as an embedded HTTP server: `GET /` serves the
  dashboard, `GET /events` is an SSE stream. Every ETW event is broadcast to
  each open socket as a `data: {...}\n\n` frame.
- **The dashboard** is one embedded HTML page using `EventSource`. No JS
  framework, no build step — the binary is the whole thing.

## Driver callback vs ETW — the honest table

| | PoC 01 (driver) | PoC 03 (ETW) |
|---|---|---|
| Needs driver / test signing | yes | no |
| Needs admin | driver load | ETW session |
| Event fields | PID + image name (15 chars) | full schema (PID, PPID, name, user, …) |
| Can block/modify behavior | yes (it's code in the kernel) | no (observe only) |
| Stealth vs EDR visibility | driver = loud load event | ETW = what EDRs themselves use |
| Crash risk | your bug bugchecks | none |

## The point of having both

ETW is the *supported* path — it's what monitoring tools and EDRs drink
from, and for pure observation it wins on every axis. But you can't intercept
anything through ETW; the moment you want to *act* (block a create, patch a
flow), you're back in driver territory. PoC 01 teaches the power and the
price; PoC 03 teaches that most people who reach for a driver don't need
one.

Source:
[KernelPoet/poc03-etw-dashboard](https://github.com/runtimepoet/KernelPoet/tree/main/poc03-etw-dashboard).

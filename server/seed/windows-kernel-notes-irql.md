---
title: "Windows kernel notes #1: IRQL"
date: 2025-04-26
tags: [SystemKernel]
excerpt: First in a series of study notes on Windows internals — what IRQL is and why driver code lives and dies by it.
---

These notes track my ongoing deep-dive into the Windows kernel. First up: **IRQL**.

## What it is

IRQL (Interrupt Request Level) is the kernel's priority scheme for masking
interrupts. Code running at a higher IRQL cannot be preempted by code at a
lower one. The levels you'll meet constantly:

| IRQL | Name | What runs here |
| ---- | ---- | -------------- |
| 0 | `PASSIVE_LEVEL` | Normal threads, most driver code |
| 1 | `APC_LEVEL` | Asynchronous procedure calls |
| 2 | `DISPATCH_LEVEL` | Thread scheduler, DPCs |
| 3+ | Device levels | Hardware interrupt service routines |

## Why it matters

Two rules bite every new driver writer:

1. **No page faults above `PASSIVE_LEVEL`.** Touch paged memory at
   `DISPATCH_LEVEL` and you get `IRQL_NOT_LESS_OR_EQUAL` (0xA) — a classic BSOD.
2. **No blocking waits at `DISPATCH_LEVEL` or higher.** The scheduler can't
   run, so nothing can wake your wait. Deadlock city.

```c
// Wrong: this can page fault
VOID BadIdea(VOID) {          // called at DISPATCH_LEVEL
    PAGED_CODE();             // -> bugcheck if IRQL too high
    ...
}
```

`PAGED_CODE()` is your friend — it asserts the IRQL is low enough during
debug builds.

Next in the series: how the I/O manager routes IRPs, and why
`IoCompleteRequest` is where most cleanup bugs hide.

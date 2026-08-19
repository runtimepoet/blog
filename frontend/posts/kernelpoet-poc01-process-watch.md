---
title: "KernelPoet PoC 01: watching every process birth from Ring 0"
date: 2026-08-05
tags: [Kernel, C]
excerpt: PsSetCreateProcessNotifyRoutine, a spin-locked ring buffer, and one IOCTL — the smallest driver that still teaches you something real about kernel-user boundaries.
---

First PoC in [KernelPoet](https://github.com/runtimepoet/KernelPoet): a WDM
driver that watches every process start and exit on the system, live, plus a
tiny user-mode reader that prints the events.

## The shape

```
user mode                       kernel
─────────                       ───────
poc01-reader.exe                poc01.sys
  │ CreateFile(\\.\PocWatch)      │ DriverEntry → IoCreateDevice + symlink
  │ DeviceIoControl(READ) ──────► │ ring buffer  ◄── PsSetCreateProcessNotifyRoutine
  │ print START/STOP lines        │    (256 events, spinlock)
```

## What it actually teaches

**The callback context is not yours.** `PsSetCreateProcessNotifyRoutine`
fires at `PASSIVE_LEVEL` in an *arbitrary* thread context. You get PIDs, not
pointers — so the callback does `PsLookupProcessByProcessId` +
`PsGetProcessImageFileName` to learn the image name (15 chars max — an OS
limit, not mine). Lesson one of kernel work: you are always a guest in
someone else's thread.

**Shared state needs a discipline.** Events land in a 256-slot ring buffer
guarded by a spinlock. When it fills, the oldest event is overwritten — the
reader never blocks the writer, because a stalled process-create callback
stalls the *system*. Drop data, not the OS.

**`METHOD_BUFFERED` is the polite IOCTL.** The I/O manager hands both sides
one shared buffer; the driver copies events out and advances the read cursor.
No `IRP_MJ_READ` boilerplate for a lab — that's a deliberate simplification,
and the README says so.

**Unload cleanly or don't bother.** `DriverUnload` unregisters the callback,
deletes the symlink, deletes the device — in that order. Result: `sc stop` /
`sc start` cycles work without reboots, which is the difference between a
10-second and a 2-minute debug loop.

## WDM, on purpose

KMDF is the correct choice in production. PoC 01 stays WDM because a lab
should expose the machinery: `IoCreateDevice`, symbolic links, IRP
completion — the things KMDF quietly does for you. Learn what's under the
framework before leaning on it.

Full source + build steps:
[KernelPoet/poc01-process-watch](https://github.com/runtimepoet/KernelPoet/tree/main/poc01-process-watch).
Run it on a test VM with test-signing on — kernel bugs bugcheck, that's the
point of a lab.

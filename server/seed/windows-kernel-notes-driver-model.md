---
title: "Windows kernel notes #3: the driver model, IRPs, and minifilters — four PoCs later"
date: 2025-07-26
tags: [SystemKernel]
excerpt: After building process-watch, mem-rw, an ETW dashboard and a minifilter, this is the theory they all encode — the driver model, the IRP lifecycle, and why Filter Manager exists.
---

Four PoCs into [win-kernel-lab](https://github.com/runtimepoet/win-kernel-lab),
the same three ideas kept showing up in different costumes: the **driver
model**, the **IRP**, and **IRQL discipline**. This post is the theory
chapter the code was quietly teaching.

## The driver model in one picture

A driver is a DLL for the kernel with a contract instead of an API:

```
DriverEntry(DriverObject, RegistryPath)
   ├── fills DriverObject->MajorFunction[IRP_MJ_*]   ← your vtable
   ├── IoCreateDevice  →  \Device\X                  ← the thing drivers stack on
   └── IoCreateSymbolicLink → \\.\X                  ← the door user mode knocks on
```

`DriverObject` is your identity; `MajorFunction` is your vtable; the device
object is where IRPs arrive. PoC 01 and 02 are exactly this skeleton plus one
dispatch routine. Everything else in the model (PnP, power, WMI) hangs off
the same three objects.

## IRPs: work orders with carbon copies

I wrote about IRPs in [note #2](/post/windows-kernel-notes-irp). The short
version that matters for everything below:

1. The I/O manager packages every request as an IRP + one
   `IO_STACK_LOCATION` per driver in the stack
2. Your dispatch runs, you either complete (`IoCompleteRequest`) or pass down
   (`IoCallDriver`)
3. Completion unwinds the stack, running completion routines on the way up

PoC 01's `IRP_MJ_DEVICE_CONTROL` handler is the smallest possible honest
example: read the control code, fill the buffer, set `IoStatus`, complete.

## Four I/O paths, one lesson each

| PoC | Path | The lesson |
| --- | ---- | ---------- |
| 01 process-watch | notify routine + IOCTL ring | callbacks run in *someone else's* context — look processes up by PID, never trust "current" |
| 02 mem-rw | `MmCopyVirtualMemory` | cross-process memory has a documented API; attachment hacks are self-inflicted risk |
| 03 etw-dashboard | ETW realtime session | the OS already has a telemetry bus — subscribe before you build |
| 04 minifilter-watch | Filter Manager post-ops | interception without ownership: you see the I/O, fltMgr owns the plumbing |

## Minifilters: the polite interceptor

A legacy filter driver inserts itself into the device stack and owns every
edge case that follows. A **minifilter** instead registers operation
callbacks with the Filter Manager:

```c
const FLT_OPERATION_REGISTRATION callbacks[] = {
    { IRP_MJ_CREATE, 0, NULL, PostCreate },
    { IRP_MJ_WRITE,  0, NULL, PostWrite  },
    { IRP_MJ_OPERATION_END }
};
FltRegisterFilter(driver, &registration, &gFilter);
FltStartFiltering(gFilter);
```

Three design rules that PoC 04 had to respect:

- **Altitudes decide order.** Your inf assigns one; it's your position in the
  filter stack contract, not a detail.
- **Post-op callbacks run at IRQL ≤ DISPATCH_LEVEL.** So file-name queries go
  through the *cached* opened name (`FLT_FILE_NAME_OPENED`), never a
  normalized query that could page. Most minifilter bugchecks are this line
  done wrong.
- **Unload is a first-class path.** `FltUnregisterFilter` in the unload
  callback, or the machine keeps your callbacks after your code is gone.

## IRQL: the recurring boss fight

From [note #1](/post/windows-kernel-notes-irql): page faults only at
`PASSIVE_LEVEL`, no blocking at `DISPATCH_LEVEL`. Every PoC hit it from a
different angle — spinlock instead of mutex in the ring buffer (01, 04),
`MmCopyVirtualMemory` needing `KernelMode` (02), ETW doing its buffering for
you (03). If you internalize one section of this series, make it this one.

## What's next

The lab covers the four big interception surfaces. Natural continuations:
cancellation-safe queues, PnP device trees, and a KMDF rewrite of PoC 01 to
feel the framework difference. When those land, they'll be dated notes like
this one.

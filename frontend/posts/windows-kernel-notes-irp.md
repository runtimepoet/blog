---
title: "Windows kernel notes #2: how IRPs flow through the I/O manager"
date: 2025-05-24
tags: [SystemKernel]
excerpt: Follow-up to the IRQL note — what an IRP actually is, how it travels from NtReadFile down the driver stack, and why IoCompleteRequest is where cleanup bugs hide.
---

In [note #1](/blog/post/windows-kernel-notes-irql) we covered IRQL. This one
follows the object that actually carries I/O through the kernel: the **IRP**
(I/O Request Packet).

## The life of an IRP

Take a user-mode `ReadFile`:

1. The Win32 subsystem calls `NtReadFile`, which traps into the kernel.
2. The **I/O Manager** allocates an IRP: a header plus an array of
   `IO_STACK_LOCATION`s — one per driver in the device stack.
3. Each stack location carries the major function code (`IRP_MJ_READ`),
   parameters, and a pointer to the next location.
4. The top driver's dispatch routine runs (`DriverObject->MajorFunction[IRP_MJ_READ]`).
   It either completes the IRP, or passes it down with `IoCallDriver`.
5. When the lowest driver is done, someone calls `IoCompleteRequest`, and the
   I/O manager unwinds back up, running each driver's `IoCompletion` routine
   on the way.

```c
NTSTATUS MyReadDispatch(PDEVICE_OBJECT Dev, PIRP Irp) {
    PIO_STACK_LOCATION stack = IoGetCurrentIrpStackLocation(Irp);
    // stack->Parameters.Read.Length, stack->Parameters.Read.ByteOffset ...

    if (CantHandleRightNow(Irp)) {
        IoMarkIrpPending(Irp);
        // queue it, return STATUS_PENDING — do NOT touch it here anymore
        return STATUS_PENDING;
    }

    Irp->IoStatus.Status = STATUS_SUCCESS;
    Irp->IoStatus.Information = stack->Parameters.Read.Length;
    IoCompleteRequest(Irp, IO_NO_INCREMENT);
    return STATUS_SUCCESS;
}
```

## Where the bugs hide

`IoCompleteRequest` looks trivial but is the classic crash site:

- **Double completion** — calling it twice on the same IRP corrupts the I/O
  manager's lists. Usually a missing `return` after the first call.
- **Touching the IRP after completing it** — once completed, the memory is
  owned by the originator and may already be freed. Use-after-free BSOD.
- **Pending mismatches** — if you return `STATUS_PENDING`, you *must* have
  called `IoMarkIrpPending`, and whoever eventually completes the IRP must
  run at `IRQL <= DISPATCH_LEVEL`. Forget either and you get hangs or
  `0xA` bugchecks weeks later, under load.

## Mental model

An IRP is a work order with carbon copies: each driver in the stack fills in
its section and hands it down. Completion walks the carbon copies back up.
Most "impossible" driver bugs are just someone writing on a carbon copy that
was already handed back.

Next: `MmMapIoSpace` and why physical-memory mapping is both the best and
worst debugging tool you have.

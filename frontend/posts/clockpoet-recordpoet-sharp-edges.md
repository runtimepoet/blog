---
title: "ClockPoet & RecordPoet: small apps, sharp edges"
date: 2026-06-30
tags: [Android, Kotlin]
excerpt: A clock app and a voice recorder sound trivial — until you meet alarm reliability, audio focus, and Android's background limits. Notes from the two smallest Poet apps.
---

ClockPoet (world clock / alarms / timers) and RecordPoet (voice recorder)
are the two smallest apps in my Poet family. They're also the two where
Android itself fights you hardest.

## ClockPoet: a clock that can't be late

A clock app has one job: fire on time. Android has one hobby: killing apps in
the background. Reconciling those two facts is most of the codebase.

- Alarms need the exact-alarm path, not "sometime soon" scheduling.
- Timers must survive process death — the remaining time has to be
  reconstructible from persisted state, not held in memory.
- Time zones and DST are a permanent source of edge cases in the world clock.
  The fix is never clever: always store instants, render zones only at the
  UI edge.

Once the reliability work is done, the rest is Material Expressive polish —
big digits, calm colors, no visual noise. Apache-2.0.

## RecordPoet: audio is a shared resource

A recorder looks like "press button, save file." In practice:

- **Audio focus is a negotiation.** A phone call or another app can take the
  microphone mid-recording. The app must pause cleanly and never corrupt the
  file it's writing.
- **Recording in the background requires a foreground service** with proper
  notification — and the user must always know the mic is hot.
- **File hygiene matters.** Auto-named files, sensible defaults, and a
  library that doesn't make you hunt for yesterday's recording.

The design borrows the Pixel Recorder's clarity: one big action, waveform
feedback, nothing else on screen. GPL-3.0.

Neither app is technically glamorous. Both taught me the same lesson: on
Android, the difference between a toy and a tool is how you handle the
platform trying to stop you.

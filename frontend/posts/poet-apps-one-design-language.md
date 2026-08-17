---
title: "Six apps, one design language"
date: 2026-08-03
tags: [Android, Design]
excerpt: WeatherPoet, ClockPoet, WatchPoet, RecordPoet, NotesPoet, MindPoet — why I built them as a family with shared design rules instead of six one-off apps.
---

My GitHub now holds six apps that share a naming scheme and, more
importantly, a design language. That wasn't an accident — it was the whole
exercise.

## The family

- 🌦️ **WeatherPoet** — weather, animated backdrops, dynamic color
- 🕛 **ClockPoet** — world clock / alarms / timers
- 🎬 **WatchPoet** — TMDB-powered watchlist for shows & movies
- 🎤 **RecordPoet** — voice recorder, Pixel Recorder-inspired
- 🗒️ **NotesPoet** — notes with rich formatting and export/import
- 🔮 **MindPoet** — a tiny web toy that "reads your mind"

## Why a family instead of six apps

Every app forces the same early decisions: theme system, typography scale,
navigation pattern, empty states, iconography. Making those decisions **once**
and applying them six times is where the compounding lives:

- Each new app started from a working baseline, not a blank project.
- A bug fixed in one place (say, a color-contrast edge case) fixed it
  everywhere.
- Reviewers and users can recognize the style. Consistency reads as quality.

## The rules I held them to

1. Material 3 Expressive components, no custom chrome.
2. Dark and light themes must both look *designed*, not inverted.
3. No tracking, no accounts, no ads. Local-first data.
4. Every app must be fully usable with one hand.

None of these apps will change the world. But as a portfolio they say exactly
what I want them to say: I can take a design system seriously and ship the
same bar of polish six times in a row.

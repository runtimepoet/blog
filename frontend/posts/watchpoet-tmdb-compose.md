---
title: "WatchPoet: a watchlist app is an API-client problem"
date: 2026-07-20
tags: [Android, Kotlin]
excerpt: Building WatchPoet on TMDB taught me that watchlist apps are 20% UI and 80% data wrangling — pagination, rate limits, image sizes, and offline state.
---

WatchPoet tracks what you're watching: TV shows and movies, pulled from
**TMDB**, organized into watching / pending / completed. The Compose UI was
the easy part. The actual work was being a well-behaved API client.

## The 80% nobody screenshots

**Pagination is a state machine.** TMDB pages results; the UI shows one
endless list. Mapping "page 4 of 37" onto a lazy grid, handling the moment
where the user flings to the bottom mid-request, deduping items that shift
between pages — that's the feature.

**Images need a policy.** TMDB serves each poster in a dozen sizes. Pick the
wrong one and you're either blurry or burning megabytes on thumbnails.
WatchPoet loads the small variant for grids, upgrades to the large one only
on the detail screen, and caches aggressively.

**Rate limits are part of the UX.** Search-as-you-type without debouncing is
a self-inflicted DDoS. Keystrokes get debounced, in-flight requests get
cancelled, and the UI treats "429" as a state, not a crash.

**Offline is honest.** Your watchlist is local data. The app works with no
connection — you just can't search new titles. I'd rather show a clear
boundary than a spinner that never resolves.

## The 20% that *is* screenshots

Material 3 Expressive cards, a detail screen that lets the backdrop breathe,
and progress states that don't flash. The goal was an app that feels calm.

Built with Kotlin + Jetpack Compose, GPL-3.0. Organize what you watch —
that's it, that's the app.

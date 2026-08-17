---
title: "WeatherPoet build notes: Material 3 Expressive is real work"
date: 2026-08-10
tags: [Android, Kotlin]
excerpt: Dynamic color, animated weather backdrops and a forecast UI inspired by the Pixel weather app — what it actually took to build WeatherPoet with Kotlin and Jetpack Compose.
---

WeatherPoet started as a simple question: why do most Android weather apps
look like spreadsheets? The Pixel weather app proved the platform could do
better, so I built my own take with **Kotlin + Jetpack Compose** and a
**Material 3 Expressive** design.

## Things that took longer than expected

**Dynamic theming that doesn't fall apart.** Material You's dynamic color is
easy to turn on and hard to get right — every chart, icon and backdrop needs
to survive arbitrary wallpaper-derived palettes. I ended up auditing every
composable for hardcoded colors; there were more than I'd like to admit.

**Animated weather backdrops.** Each condition (rain, snow, haze, clear
night…) has its own layered animation. The trick was keeping them decorative
but cheap: Lottie for the complex scenes, plain Compose animation for the
rest, and a hard rule that nothing animates when the app is backgrounded.

**A forecast UI that stays readable.** Hourly + daily + radar + details is a
lot of data for one screen. The answer was ruthless hierarchy: current
condition huge, hourly glanceable, everything else one scroll away.

## Engineering notes

- GPL-3.0, reproducible-build friendly
- Localization is a first-class feature, not an afterthought
- No tracking, no account, no ads — the app talks to weather APIs and nothing
  else

It's the most polished app I've shipped, and the one that taught me the most
about Compose. The gap between "Material 3 demo" and "Material 3 product" is
exactly where all the interesting bugs live.

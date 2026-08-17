---
title: "MindPoet: the arithmetic behind 'reading your mind'"
date: 2026-07-27
tags: [JavaScript, Web]
excerpt: MindPoet guesses your number every time. No magic — just algebra that always collapses to one answer, wrapped in 300 KB of vanilla JavaScript theater.
---

MindPoet is my smallest project and the most fun to demo: you think of a
number, follow a few steps, and the app reveals your result. Every. Single.
Time.

## The trick

Classic mind-reading tricks are algebra in a trench coat. Pick any number
`x`, then make the victim compute something like:

```
((x * 2) + 10) / 2 - x
```

Expand it: `(2x + 10)/2 - x` = `x + 5 - x` = **5**. The `x` cancels out. It
doesn't matter what you picked — the answer was decided before you played.

Every variant of the trick is the same shape: wrap the unknown in operations,
then unwrap it. The performer's only real job is pacing — enough steps that
the victim loses track of the variable, few enough that nobody reaches for a
calculator.

## The app

The whole point of the implementation was restraint:

- **Vanilla JS, zero dependencies.** No framework for what is literally one
  state machine and some DOM updates.
- **~300 KB total**, most of it the two Roboto font files.
- Hand-rolled CSS with custom properties — the "dramatic reveal" is a couple
  of transitions timed against the tap, not an animation library.
- MIT licensed, works fully offline, opens from a plain `index.html`.

## Why I keep it around

It's a great teaching prop. Show someone the app, then show them the
expansion above, and you can watch a magic trick turn into an algebra lesson
in about thirty seconds. Code did not make the trick — math did. The code
just sells it.

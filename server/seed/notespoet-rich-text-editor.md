---
title: "NotesPoet: rich text editing without the bloat"
date: 2026-07-12
tags: [JavaScript, Android]
excerpt: Bold, lists, headings, colors, export/import — NotesPoet does rich notes in a small JavaScript core. Notes on keeping an editor honest.
---

NotesPoet is my notes app for Android: rich formatting, tags, export/import,
list and grid views. Under the hood the editing core is plain JavaScript —
which made it a useful exercise in doing a lot with a little.

## The formatting bar

The editor supports bold, italic, underline, strikethrough, ordered and
bullet lists, headings, dividers, links, quotes, text color and highlight.
That list looks long until you realize every single action is the same three
steps: get the selection, transform the markup, restore the selection. Once
that pipeline was solid, adding a format was minutes of work.

The bugs, as always, lived in the edges: selections spanning two formats,
backspace at a block boundary, paste bringing in hostile markup. The fix for
most of them was a strict allowlist sanitizer on input — accept a small set
of tags and attributes, drop everything else.

## Data that belongs to the user

Notes are worthless if they're trapped. NotesPoet's rules:

- **Local-first.** Notes live on the device; the app works fully offline.
- **Export & import are features, not settings.** Backup and restore get real
  UI, because data you can't carry out isn't yours.
- **List and grid views** — browsing notes is half the app, so both layouts
  are first-class.

## Why JavaScript for the editor

Text editing is DOM-shaped work. A small, auditable JS core beat pulling in a
heavy editor framework that would have brought its own bugs and ten times the
bundle. Same philosophy as the rest of my projects: own the critical path,
keep it small, keep it readable.

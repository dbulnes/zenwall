# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zenwall is a Manifest V3 Chrome extension that blocks distracting websites and replaces them with calming nature photographs and motivational messages. Zero dependencies, no build step.

## Development

No build system — load directly as an unpacked Chrome extension:

1. Open `chrome://extensions`, enable Developer mode
2. Click "Load unpacked" → select this directory
3. After code changes, click the refresh icon on the extension card

There is no test framework, linter, or package.json.

## Architecture

**Blocking flow:** User adds pattern → `chrome.storage.sync` → `background.js` syncs `declarativeNetRequest` rules → browser redirects matching navigations to `blocked/blocked.html`.

### Core components

- **background.js** — Service worker. Syncs declarativeNetRequest rules on storage changes, tracks block stats via `webNavigation`, handles messaging from popup/options.
- **lib/storage.js** — Abstraction over `chrome.storage.sync` (falls back to `.local`). Stores `blockedPatterns` array and `blockStats` object. Exposes `onPatternsChanged()` for reactive updates.
- **lib/patterns.js** — Converts user-friendly wildcard patterns (e.g. `*.reddit.com`) into regex-based declarativeNetRequest redirect rules.

### UI pages (each has .html/.js/.css)

- **popup/** — Toolbar popup. Shows pattern count, "block this site" button, and stats dashboard.
- **options/** — Full settings page. Add/remove patterns with validation.
- **blocked/** — Redirect target. Random nature background (30 images) + random message (40 total).

### Messaging

Popup/options communicate with background.js via `chrome.runtime.sendMessage` with types: `getPatternCount`, `addPattern`, `getStats`. Storage changes propagate automatically via `chrome.storage.onChanged`.

### Storage schema

- `blockedPatterns`: `[{ id: string, pattern: string, createdAt: number }]` — synced
- `blockStats`: `{ totalBlocks: number, domains: { [domain]: count } }` — local only
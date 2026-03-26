# Zenwall

A Chrome extension that blocks distracting websites and replaces them with calming nature photographs and witty messages.

## Features

- **Wildcard pattern matching** — block `*.reddit.com` (all subdomains), `example.com/*` (all paths), or exact domains
- **Quick-block from toolbar** — block the current site with one click, choose between blocking the entire domain or a specific URL
- **Daily time limits** — optionally allow a site for X minutes per day instead of fully blocking it; the timer counts down in real-time and blocks the site when time runs out, even mid-browse
- **Block stats dashboard** — see total blocks, top blocked domain, and a bar chart of your most-blocked sites in the popup
- **Cross-machine sync** — uses `chrome.storage.sync` to sync your block list across machines via your Chrome profile
- **30 nature photographs** — randomly selected on each block
- **60+ messages** — poetic, sarcastic, clever, and zen tones for both blocks and timer expirations
- **No easy bypass** — managing the block list requires navigating to settings; increasing a timer limit requires multi-step confirmation

## Setup & Install (Local Development)

### Prerequisites

- Google Chrome (or any Chromium-based browser like Brave, Edge, Arc)

### Steps

1. Clone the repo:
   ```bash
   git clone https://github.com/dbulnes/zenwall.git
   cd zenwall
   ```
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the `zenwall` directory
5. The Zenwall icon should appear in your toolbar — pin it for easy access

### Updating

After pulling new changes, go to `chrome://extensions` and click the refresh icon on the Zenwall card.

## Usage

### Blocking a site

1. Navigate to the site you want to block
2. Click the Zenwall icon in your toolbar
3. Click the block button and choose:
   - **Block entire domain** — fully blocks the domain
   - **Block this URL** — blocks the specific path
   - **Set daily time limit** — allows the site for a set number of minutes per day

### Managing sites

Open the settings page via "Manage blocked sites" in the popup. From there you can:
- Add new patterns with optional time limits
- Edit timer durations (with friction for increases)
- Switch between fully blocked and timed modes
- Remove patterns

### Timer behavior

- Timer counts down while you're actively browsing the site
- When time runs out, you're immediately redirected to the block page with a timer-specific message
- Timer resets at midnight each day
- Increasing an expired timer resumes from where you left off

## Project Structure

```
manifest.json          Manifest V3 definition
background.js          Service worker — rules sync, timer engine, message handlers
lib/
  storage.js           chrome.storage abstraction, timer usage tracking
  patterns.js          Wildcard pattern → regex rule converter
  matcher.js           Runtime URL-to-pattern matching
popup/                 Toolbar popup (block button, timer status, stats)
options/               Settings page (pattern management, timer editor)
blocked/               Block page (nature image + message)
images/                30 bundled nature photographs
icons/                 Extension icons
```

## How It Works

Fully blocked sites use `declarativeNetRequest` dynamic rules — Chrome intercepts matching navigations at the browser engine level and redirects to the block page.

Timed sites are excluded from static rules and instead managed dynamically by the background service worker, which tracks active browsing time with 1-second precision and redirects via `chrome.tabs.update` when the limit is reached.

Storage uses `chrome.storage.sync` for patterns (falls back to local), and `chrome.storage.local` for timer usage data.

## Image Credits

Nature photographs sourced from [Unsplash](https://unsplash.com) via [Lorem Picsum](https://picsum.photos). All images are free to use under the [Unsplash License](https://unsplash.com/license).

## License

MIT

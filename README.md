# BlockSite

A Chrome extension that blocks distracting websites and replaces them with calming nature photographs and witty messages.

## Features

- **Wildcard pattern matching** — block `*.reddit.com` (all subdomains), `example.com/*` (all paths), or exact domains
- **Cross-machine sync** — uses `chrome.storage.sync` to sync your block list across machines via your Chrome profile, no login required
- **30 nature photographs** — randomly selected on each block
- **30+ messages** — poetic, sarcastic, clever, and zen, randomly rotated
- **No easy bypass** — the blocked page has no unblock button; managing the list requires navigating to the extension's options page

## Setup & Install (Local Development)

### Prerequisites

- Google Chrome (or any Chromium-based browser like Brave, Edge, Arc)

### Steps

1. Clone the repo:
   ```bash
   git clone https://github.com/YOUR_USERNAME/blocksite-oss.git
   cd blocksite-oss
   ```
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the `blocksite-oss` directory
5. The BlockSite icon should appear in your toolbar — pin it for easy access

### Updating

After pulling new changes, go to `chrome://extensions` and click the refresh icon on the BlockSite card.

## Publishing to the Chrome Web Store

1. **Register as a developer** at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) — there is a one-time $5 registration fee
2. **Create a ZIP** of the extension (exclude `.git` and any dev files):
   ```bash
   zip -r blocksite.zip . -x ".git/*" -x ".claude/*" -x ".gitignore" -x "*.md"
   ```
3. **Upload** — in the Developer Dashboard, click "New Item" and upload `blocksite.zip`
4. **Fill in listing details**:
   - Name, description, category (Productivity)
   - Upload screenshots (at least 1 screenshot at 1280x800 or 640x400)
   - Upload a promotional tile image (440x280)
   - Set the icon (128x128 — already included)
5. **Set privacy practices** — this extension only uses `chrome.storage` and `declarativeNetRequest`, no remote code or user data collection
6. **Submit for review** — Google reviews typically take 1-3 business days
7. Once approved, your extension is live and installable by anyone via the Chrome Web Store

## Usage

1. Click the BlockSite icon in your toolbar
2. Click "Manage blocked sites" to open settings
3. Expand "Add New Pattern" and enter a URL pattern:
   - `*.reddit.com` — blocks reddit and all subdomains
   - `news.ycombinator.com` — blocks the exact domain
   - `example.com/some/path/*` — blocks a specific path prefix
4. Navigate to a blocked site to see it in action

To remove a pattern, open the options page, expand "Manage Blocked Sites", and delete the entry (confirmation required).

## Project Structure

```
manifest.json          Manifest V3 definition
background.js          Service worker — syncs patterns to declarativeNetRequest rules
lib/
  storage.js           chrome.storage.sync/local abstraction
  patterns.js          Wildcard pattern → regex rule converter
popup/                 Toolbar popup (status + link to settings)
options/               Full options page for managing the block list
blocked/               The blocked page (nature image + message)
images/                30 bundled nature photographs
icons/                 Extension icons
```

## How It Works

When you add a pattern, the service worker converts it to a `declarativeNetRequest` dynamic rule with a regex filter. Chrome intercepts matching navigations at the browser engine level and redirects to the bundled blocked page, which picks a random image and message.

Storage uses `chrome.storage.sync` (falls back to `chrome.storage.local` if sync is unavailable), so your block list travels with your Chrome profile.

## Image Credits

Nature photographs sourced from [Unsplash](https://unsplash.com) via [Lorem Picsum](https://picsum.photos). All images are free to use under the [Unsplash License](https://unsplash.com/license).

## License

MIT

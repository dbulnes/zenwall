# Publishing to the Chrome Web Store

1. **Register as a developer** at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) — one-time $5 registration fee
2. **Create a ZIP** of the extension (exclude dev files):
   ```bash
   zip -r blocksite.zip . -x ".git/*" -x ".claude/*" -x ".gitignore" -x "*.md"
   ```
3. **Upload** — in the Developer Dashboard, click "New Item" and upload `blocksite.zip`
4. **Fill in listing details**:
   - Name, description, category (Productivity)
   - Upload screenshots (at least 1 at 1280x800 or 640x400)
   - Upload a promotional tile image (440x280)
   - Set the icon (128x128 — already included)
5. **Set privacy practices** — this extension only uses `chrome.storage` and `declarativeNetRequest`, no remote code or user data collection
6. **Submit for review** — Google reviews typically take 1-3 business days
7. Once approved, your extension is live on the Chrome Web Store

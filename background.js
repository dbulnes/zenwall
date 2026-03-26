import { getBlockedPatterns, addPattern, getStats, recordBlock, onPatternsChanged } from './lib/storage.js';
import { buildAllRules } from './lib/patterns.js';

async function syncRules() {
  const patterns = await getBlockedPatterns();
  const newRules = buildAllRules(patterns);

  // Get current dynamic rules to know what to remove
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existingRules.map((r) => r.id);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules: newRules,
  });
}

// Sync rules on install/update
chrome.runtime.onInstalled.addListener(async () => {
  const patterns = await getBlockedPatterns();
  if (patterns.length === 0) {
    // Initialize storage with empty array if not set
    const storage = chrome.storage.sync || chrome.storage.local;
    try {
      await chrome.storage.sync.get('blockedPatterns');
    } catch {
      // sync not available, will be handled by storage.js
    }
  }
  await syncRules();
});

// Sync rules on browser startup
chrome.runtime.onStartup.addListener(syncRules);

// Track blocks by watching navigations to the blocked page
const blockedPagePath = chrome.runtime.getURL('blocked/blocked.html');
chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId !== 0) return;
  if (!details.url.startsWith(blockedPagePath)) return;
  try {
    const params = new URL(details.url).searchParams;
    const blockedUrl = params.get('url');
    if (blockedUrl) {
      const domain = new URL(blockedUrl).hostname;
      recordBlock(domain);
    }
  } catch { /* ignore parse errors */ }
});

// Re-sync whenever patterns change
onPatternsChanged(async () => {
  await syncRules();
});

// Listen for messages from popup/options
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getPatternCount') {
    getBlockedPatterns().then((patterns) => {
      sendResponse({ count: patterns.length });
    });
    return true;
  }

  if (message.type === 'addPattern') {
    addPattern(message.pattern).then((entry) => {
      sendResponse({ success: true, entry });
    });
    return true;
  }

  if (message.type === 'getStats') {
    getStats().then((stats) => {
      sendResponse(stats);
    });
    return true;
  }
});

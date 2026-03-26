import {
  getBlockedPatterns, getFullyBlockedPatterns, getTimerPatterns,
  addPattern, updatePattern, getStats, recordBlock,
  getTimerUsage, addTimerSeconds, getElapsedSeconds,
  onPatternsChanged,
} from './lib/storage.js';
import { buildAllRules } from './lib/patterns.js';
import { findMatchingPattern } from './lib/matcher.js';

const TICK_SECONDS = 30;
const blockedPageUrl = chrome.runtime.getURL('blocked/blocked.html');

// --- declarativeNetRequest rules (fully blocked sites only) ---

async function syncRules() {
  const patterns = await getFullyBlockedPatterns();
  const newRules = buildAllRules(patterns);
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existingRules.map((r) => r.id);
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules: newRules });
}

// --- Timer engine ---

async function checkTimerExpired(patternEntry) {
  const elapsed = await getElapsedSeconds(patternEntry.id);
  return elapsed >= patternEntry.timerMinutes * 60;
}

async function blockTab(tabId, url, reason) {
  const encoded = encodeURIComponent(url);
  await chrome.tabs.update(tabId, {
    url: `${blockedPageUrl}?url=${encoded}&reason=${reason}`,
  });
}

// Alarm tick: track time on active tab if it matches a timed pattern
async function onTimerTick() {
  let tabs;
  try {
    tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  } catch { return; }

  const tab = tabs[0];
  if (!tab?.url || !tab.url.startsWith('http')) return;

  const timerPatterns = await getTimerPatterns();
  const match = findMatchingPattern(tab.url, timerPatterns);
  if (!match) return;

  const totalElapsed = await addTimerSeconds(match.id, TICK_SECONDS);
  const limitSeconds = match.timerMinutes * 60;

  if (totalElapsed >= limitSeconds) {
    blockTab(tab.id, tab.url, 'timer');
    try {
      const domain = new URL(tab.url).hostname;
      recordBlock(domain);
    } catch {}
  }
}

// Intercept navigation to timed sites that are already expired
async function onNavigation(details) {
  if (details.frameId !== 0) return;
  if (!details.url.startsWith('http')) return;

  const timerPatterns = await getTimerPatterns();
  const match = findMatchingPattern(details.url, timerPatterns);
  if (!match) return;

  const expired = await checkTimerExpired(match);
  if (expired) {
    blockTab(details.tabId, details.url, 'timer');
    try {
      const domain = new URL(details.url).hostname;
      recordBlock(domain);
    } catch {}
  }
}

// --- Lifecycle ---

chrome.runtime.onInstalled.addListener(async () => {
  await syncRules();
  chrome.alarms.create('zenwall-timer-tick', { periodInMinutes: 0.5 });
});

chrome.runtime.onStartup.addListener(async () => {
  await syncRules();
  chrome.alarms.create('zenwall-timer-tick', { periodInMinutes: 0.5 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'zenwall-timer-tick') onTimerTick();
});

chrome.webNavigation.onCommitted.addListener(onNavigation);

// Track blocks by watching navigations to the blocked page
chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId !== 0) return;
  if (!details.url.startsWith(blockedPageUrl)) return;
  try {
    const params = new URL(details.url).searchParams;
    const blockedUrl = params.get('url');
    // Don't double-count timer blocks (already recorded above)
    if (blockedUrl && !params.get('reason')) {
      const domain = new URL(blockedUrl).hostname;
      recordBlock(domain);
    }
  } catch {}
});

// Re-sync whenever patterns change
onPatternsChanged(async () => {
  await syncRules();
});

// --- Message handlers ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getPatternCount') {
    getBlockedPatterns().then((patterns) => {
      sendResponse({ count: patterns.length });
    });
    return true;
  }

  if (message.type === 'addPattern') {
    addPattern(message.pattern, message.timerMinutes || null).then((entry) => {
      sendResponse({ success: true, entry });
    });
    return true;
  }

  if (message.type === 'updatePattern') {
    updatePattern(message.id, message.updates).then((entry) => {
      sendResponse({ success: true, entry });
    });
    return true;
  }

  if (message.type === 'getStats') {
    getStats().then((stats) => sendResponse(stats));
    return true;
  }

  if (message.type === 'getTimerStatus') {
    (async () => {
      const timerPatterns = await getTimerPatterns();
      const match = message.url
        ? findMatchingPattern(message.url, timerPatterns)
        : null;
      if (!match) {
        sendResponse({ active: false });
        return;
      }
      const elapsed = await getElapsedSeconds(match.id);
      const limitSeconds = match.timerMinutes * 60;
      const remaining = Math.max(0, limitSeconds - elapsed);
      sendResponse({
        active: true,
        patternId: match.id,
        pattern: match.pattern,
        timerMinutes: match.timerMinutes,
        elapsedSeconds: elapsed,
        remainingSeconds: remaining,
        expired: remaining <= 0,
      });
    })();
    return true;
  }
});

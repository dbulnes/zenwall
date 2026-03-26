let storageArea = null;

async function getStorageArea() {
  if (storageArea) return storageArea;
  try {
    await chrome.storage.sync.set({ __test: true });
    await chrome.storage.sync.remove('__test');
    storageArea = chrome.storage.sync;
  } catch {
    storageArea = chrome.storage.local;
  }
  return storageArea;
}

export async function getBlockedPatterns() {
  const storage = await getStorageArea();
  const result = await storage.get('blockedPatterns');
  return result.blockedPatterns || [];
}

/** Patterns that are fully blocked (no timer) — used for declarativeNetRequest rules */
export async function getFullyBlockedPatterns() {
  const patterns = await getBlockedPatterns();
  return patterns.filter((p) => !p.timerMinutes);
}

/** Patterns that have a daily timer — managed dynamically by background worker */
export async function getTimerPatterns() {
  const patterns = await getBlockedPatterns();
  return patterns.filter((p) => p.timerMinutes > 0);
}

export async function addPattern(pattern, timerMinutes = null) {
  const patterns = await getBlockedPatterns();
  const entry = {
    id: crypto.randomUUID().slice(0, 8),
    pattern: pattern.trim(),
    createdAt: Date.now(),
  };
  if (timerMinutes > 0) entry.timerMinutes = timerMinutes;
  patterns.push(entry);
  const storage = await getStorageArea();
  await storage.set({ blockedPatterns: patterns });
  return entry;
}

export async function updatePattern(id, updates) {
  const patterns = await getBlockedPatterns();
  const idx = patterns.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  Object.assign(patterns[idx], updates);
  const storage = await getStorageArea();
  await storage.set({ blockedPatterns: patterns });
  return patterns[idx];
}

export async function removePattern(id) {
  const patterns = await getBlockedPatterns();
  const filtered = patterns.filter((p) => p.id !== id);
  const storage = await getStorageArea();
  await storage.set({ blockedPatterns: filtered });
}

export function onPatternsChanged(callback) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (changes.blockedPatterns) {
      callback(changes.blockedPatterns.newValue || []);
    }
  });
}

export async function getStats() {
  const storage = await getStorageArea();
  const result = await storage.get('blockStats');
  return result.blockStats || { totalBlocks: 0, domains: {} };
}

export async function recordBlock(domain) {
  const stats = await getStats();
  stats.totalBlocks++;
  stats.domains[domain] = (stats.domains[domain] || 0) + 1;
  const storage = await getStorageArea();
  await storage.set({ blockStats: stats });
}

// --- Timer usage tracking (stored in chrome.storage.local for performance) ---

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export async function getTimerUsage() {
  const result = await chrome.storage.local.get('timerUsage');
  const usage = result.timerUsage || { date: todayStr(), patterns: {} };
  // Reset if new day
  if (usage.date !== todayStr()) {
    usage.date = todayStr();
    usage.patterns = {};
    await chrome.storage.local.set({ timerUsage: usage });
  }
  return usage;
}

export async function addTimerSeconds(patternId, seconds) {
  const usage = await getTimerUsage();
  if (!usage.patterns[patternId]) {
    usage.patterns[patternId] = { elapsedSeconds: 0 };
  }
  usage.patterns[patternId].elapsedSeconds += seconds;
  await chrome.storage.local.set({ timerUsage: usage });
  return usage.patterns[patternId].elapsedSeconds;
}

export async function getElapsedSeconds(patternId) {
  const usage = await getTimerUsage();
  return usage.patterns[patternId]?.elapsedSeconds || 0;
}

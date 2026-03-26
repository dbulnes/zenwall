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

export async function addPattern(pattern) {
  const patterns = await getBlockedPatterns();
  const entry = {
    id: crypto.randomUUID().slice(0, 8),
    pattern: pattern.trim(),
    createdAt: Date.now(),
  };
  patterns.push(entry);
  const storage = await getStorageArea();
  await storage.set({ blockedPatterns: patterns });
  return entry;
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

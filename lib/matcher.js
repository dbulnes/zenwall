import { patternToRegex } from './patterns.js';

export function findMatchingPattern(url, patterns) {
  for (const entry of patterns) {
    const regex = new RegExp(patternToRegex(entry.pattern));
    if (regex.test(url)) return entry;
  }
  return null;
}

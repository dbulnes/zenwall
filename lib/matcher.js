/**
 * URL-to-pattern matching utility.
 * Reuses the same regex logic as patterns.js but for runtime matching.
 */

const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;

function escapeRegex(str) {
  return str.replace(REGEX_SPECIAL, '\\$&');
}

export function patternToRegex(pattern) {
  let p = pattern.trim();
  p = p.replace(/^https?:\/\//, '');
  p = p.replace(/^\*:\/\//, '');

  if (p.startsWith('*.')) {
    const domain = escapeRegex(p.slice(2).replace(/\/+$/, ''));
    return new RegExp(`^https?://([a-zA-Z0-9\\-]+\\.)*${domain}(/.*)?$`);
  }

  const slashIdx = p.indexOf('/');
  let domain, path;
  if (slashIdx === -1) {
    domain = p;
    path = null;
  } else {
    domain = p.slice(0, slashIdx);
    path = p.slice(slashIdx);
  }

  const escapedDomain = escapeRegex(domain);
  const domainRegex = `(www\\.)?${escapedDomain}`;

  if (path === null || path === '/') {
    return new RegExp(`^https?://${domainRegex}(/.*)?$`);
  }

  if (path === '/*' || path === '/**') {
    return new RegExp(`^https?://${domainRegex}/.*$`);
  }

  const escapedPath = escapeRegex(path).replace(/\\\*/g, '.*');
  return new RegExp(`^https?://${domainRegex}${escapedPath}$`);
}

/**
 * Find the first pattern entry matching a URL.
 * @param {string} url
 * @param {Array<{id: string, pattern: string}>} patterns
 * @returns {object|null} The matching pattern entry or null
 */
export function findMatchingPattern(url, patterns) {
  for (const entry of patterns) {
    const regex = patternToRegex(entry.pattern);
    if (regex.test(url)) return entry;
  }
  return null;
}

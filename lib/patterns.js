/**
 * Convert a user-friendly pattern to a declarativeNetRequest rule.
 *
 * Supported pattern formats:
 *   *.example.com      — blocks all subdomains (and example.com itself)
 *   example.com/*      — blocks all paths on the domain
 *   example.com        — blocks the domain exactly
 *   example.com/path   — blocks a specific path
 *   *://example.com/*  — explicit protocol wildcard (treated same as above)
 */

const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;

function escapeRegex(str) {
  return str.replace(REGEX_SPECIAL, '\\$&');
}

export function patternToRegex(pattern) {
  let p = pattern.trim();

  // Strip protocol prefixes — we always match http(s)
  p = p.replace(/^https?:\/\//, '');
  p = p.replace(/^\*:\/\//, '');

  // Handle leading wildcard subdomain: *.example.com
  if (p.startsWith('*.')) {
    const domain = escapeRegex(p.slice(2).replace(/\/+$/, ''));
    return `^https?://([a-zA-Z0-9\\-]+\\.)*${domain}(/.*)?$`;
  }

  // Split domain from path
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

  // Domain with optional www
  const domainRegex = `(www\\.)?${escapedDomain}`;

  if (path === null || path === '/') {
    // Exact domain — match with or without trailing slash/path
    return `^https?://${domainRegex}(/.*)?$`;
  }

  if (path === '/*' || path === '/**') {
    // All paths
    return `^https?://${domainRegex}/.*$`;
  }

  // Specific path — allow wildcards within
  const escapedPath = escapeRegex(path).replace(/\\\*/g, '.*');
  return `^https?://${domainRegex}${escapedPath}$`;
}

/**
 * Build a declarativeNetRequest rule from a pattern entry.
 * @param {{id: string, pattern: string}} entry
 * @param {number} ruleId - positive integer rule ID
 * @returns {chrome.declarativeNetRequest.Rule}
 */
export function patternToRule(entry, ruleId) {
  const regexFilter = patternToRegex(entry.pattern);
  const blockedPageUrl = chrome.runtime.getURL('blocked/blocked.html');

  return {
    id: ruleId,
    priority: 1,
    action: {
      type: 'redirect',
      redirect: {
        // regexSubstitution replaces the match with the blocked page URL + original URL as param
        regexSubstitution: `${blockedPageUrl}?url=\\0`,
      },
    },
    condition: {
      regexFilter,
      resourceTypes: ['main_frame'],
    },
  };
}

/**
 * Build all rules from an array of pattern entries.
 * Rule IDs are 1-indexed based on array position.
 */
export function buildAllRules(patterns) {
  return patterns.map((entry, idx) => patternToRule(entry, idx + 1));
}

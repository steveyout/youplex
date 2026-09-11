/**
 * VidSrc token URL registry.
 *
 * VidSrc stream CDNs require IP-bound tokens appended to segment URLs.
 * The data.vidsrcme.ru API returns `gen_token_url` — the endpoint that
 * issues tokens valid for the specific CDN hosts in the response.
 *
 * This registry maps CDN origins → token URLs so a stream proxy can fetch
 * tokens from the correct endpoint instead of guessing
 * `${cdnOrigin}/generate.php` (which fails on TLS).
 */

/** @type {Map<string, string>} CDN origin → token URL */
const tokenUrlByOrigin = new Map();

/** @type {Map<string, number>} Per-entry expiry (ms since epoch). */
const expiryByOrigin = new Map();

/** Default TTL: 30 minutes (tokens themselves last ~55 min). */
const DEFAULT_TTL_MS = 30 * 60 * 1000;

/**
 * Register a token URL for one or more CDN origins.
 * Called by the VidSrc extractor after it gets gen_token_url from the API.
 * @param {string[]} origins
 * @param {string} tokenUrl
 * @param {number} [ttlMs]
 */
export function registerTokenUrls(origins, tokenUrl, ttlMs = DEFAULT_TTL_MS) {
  const expiresAt = Date.now() + ttlMs;
  for (const origin of origins) {
    tokenUrlByOrigin.set(origin, tokenUrl);
    expiryByOrigin.set(origin, expiresAt);
  }
}

/**
 * Look up the registered token URL for a CDN origin.
 * Returns undefined if no entry exists or it has expired.
 * @param {string} origin
 * @returns {string|undefined}
 */
export function getTokenUrl(origin) {
  const expiresAt = expiryByOrigin.get(origin);
  if (expiresAt && Date.now() > expiresAt) {
    tokenUrlByOrigin.delete(origin);
    expiryByOrigin.delete(origin);
    return undefined;
  }
  return tokenUrlByOrigin.get(origin);
}

/**
 * Clear all entries (for testing).
 */
export function clearTokenRegistry() {
  tokenUrlByOrigin.clear();
  expiryByOrigin.clear();
}
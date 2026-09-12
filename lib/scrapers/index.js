/**
 * Public entry point for the youplex scraping layer.
 *
 * getSources() orchestrates extraction, caching results briefly so
 * clients don't hammer the upstream scraper services.
 */

import { registry } from './registry';

export * from './services/hdbox';
export * from './services/sflix';
export * from './services/vidsrc';
export * from './services/videasy';
export * from './services/vidcore';
export * from './services/hdtoday';
export * from './services/flixhqz';
export * from './services/multiembed';

export { registry } from './registry';
export { SCRAPER_CONFIG } from './config';
export { browserManager } from './browser-manager';
export { BaseProvider, defineScraper } from './base-provider';
export { getTokenUrl, registerTokenUrls } from './services/vidsrc-token-registry';
export { axiosGet, axiosPost, createLogger, axiosInstance, getTmdbMetadata } from './utils';

// ── Cache ────────────────────────────────────────────────────────────

/** TTL for successful lookups, ms. */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Hard cap on one provider's extraction. Serveless gateways (Vercel/Netlify…)
 * return 502 Bad Gateway when a route outlives the platform function timeout,
 * so every provider is bounded and raced in parallel instead of letting one
 * slow extractor (seed retries, multi-hop iframe chains) block the whole call.
 */
const PROVIDER_TIMEOUT_MS = 12000;

const cache = new Map();

function cacheKey(request, provider) {
  return [provider, request.mediaType, request.tmdbId, request.season, request.episode].join(':');
}

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function cacheSet(key, value, ttlMs = CACHE_TTL_MS) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  if (cache.size > 500) {
    const now = Date.now();
    for (const [k, e] of cache) {
      if (now > e.expiresAt) cache.delete(k);
    }
  }
}

export function clearCache() {
  cache.clear();
}

// ── Orchestration ────────────────────────────────────────────────────

/**
 * Bound `provider.extract(request)` so a slow extractor can't outlive the
 * platform's function timeout (which would surface to the client as a 502).
 * Resolves with a failure-shaped result instead of throwing.
 * @param {Promise<import('./types').ExtractionResult>} promise
 * @param {string} providerName
 * @returns {Promise<import('./types').ExtractionResult>}
 */
async function withTimeout(promise, providerName) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(
      () =>
        resolve({
          success: false,
          sources: [],
          subtitles: [],
          provider: providerName,
          error: `Provider "${providerName}" timed out after ${PROVIDER_TIMEOUT_MS}ms`,
        }),
      PROVIDER_TIMEOUT_MS
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function runProviderPhase(provider, phase, request) {
  if (typeof provider[phase] === 'function') {
    return provider[phase](request);
  }
  return provider.extract(request);
}

/**
 * Extract stream sources for a title.
 *
 * @param {import('./types').ExtractionRequest} request
 *   { tmdbId, mediaType, season?, episode? }
 * @param {Object} [options]
 * @param {string} [options.provider]
 *   Optional: force a single provider by id (e.g. 'videasy', 'hdbox').
 *   Default: run all enabled providers in parallel and return the first match.
 * @param {boolean} [options.useCache] Default true.
 * @returns {Promise<import('./types').ExtractionResult>}
 */
export async function getSources(request, options = {}) {
  const { provider: providerId, useCache = true } = options;

  const providers = registry.getEnabledProviders(request.mediaType);
  if (!providers.length) {
    return {
      success: false,
      sources: [],
      subtitles: [],
      provider: 'none',
      error: 'No enabled providers support this media type',
    };
  }

  const candidates = providerId
    ? providers.filter((p) => p.name === providerId)
    : providers;
  if (!candidates.length) {
    return {
      success: false,
      sources: [],
      subtitles: [],
      provider: providerId || 'none',
      error: `Provider "${providerId}" not found or not enabled`,
    };
  }

  // Serve from cache before doing any network I/O.
  for (const provider of candidates) {
    const cached = useCache ? cacheGet(cacheKey(request, provider.name)) : undefined;
    if (cached) return cached;
  }

  const axiosResults = await Promise.all(
    candidates.map(async (provider) => {
      const result = await withTimeout(runProviderPhase(provider, 'extractAxiosPhase', request), provider.name);
      return { provider, result };
    })
  );

  const axiosSuccessful = axiosResults
    .filter((r) => r.result.success && r.result.sources.length > 0)
    .sort((a, b) => a.provider.priority - b.provider.priority);

  if (axiosSuccessful.length > 0) {
    const winner = axiosSuccessful[0].result;
    if (useCache) cacheSet(cacheKey(request, winner.provider), winner);
    return winner;
  }

  const playwrightResults = await Promise.all(
    candidates.map(async (provider) => ({
      provider,
      result: await withTimeout(
        runProviderPhase(provider, 'extractPlaywrightPhase', request),
        provider.name
      ),
    }))
  );

  const successful = playwrightResults
    .filter((r) => r.result.success && r.result.sources.length > 0)
    .sort((a, b) => a.provider.priority - b.provider.priority);

  if (successful.length > 0) {
    const winner = successful[0].result;
    if (useCache) cacheSet(cacheKey(request, winner.provider), winner);
    return winner;
  }

  // If none succeeded, return the best priority failure error.
  const sortedFailures = [...playwrightResults].sort((a, b) => a.provider.priority - b.provider.priority);
  const bestFailure = sortedFailures[0]?.result;

  return {
    success: false,
    sources: [],
    subtitles: [],
    provider: bestFailure?.provider || candidates[0]?.name || 'none',
    error: bestFailure?.error || 'All extraction providers failed',
  };
}

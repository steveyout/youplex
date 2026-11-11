/**
 * Vyla Entertainment SDK Provider & Fallback Integration
 * Documentation: https://vyla.cc/sdk
 * Repository: https://gitlab.com/vyla-entertainment/sdk
 *
 * Provides high-speed direct access to 60+ stream resolvers and subtitle providers.
 */

import { getProviderFriendlyName, unwrapProxyUrl, isUrlAlreadyProxied } from './index.js';

let vylaInstance = null;

/**
 * Lazily loads and instantiates the VylaSDK client on the server side only
 */
export async function getVylaSDK() {
  if (typeof window !== 'undefined') return null;
  if (vylaInstance) return vylaInstance;

  try {
    const pkgName = '@vyla-entertainment/sdk';
    const { default: VylaSDK } = await import(/* webpackIgnore: true */ pkgName);

    // Extract TMDB API key if available from bearer token or env
    let tmdbApiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
    if (!tmdbApiKey && process.env.NEXT_PUBLIC_TMDB_TOKEN) {
      try {
        const parts = process.env.NEXT_PUBLIC_TMDB_TOKEN.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          if (payload?.aud) tmdbApiKey = payload.aud;
        }
      } catch (e) {}
    }

    vylaInstance = new VylaSDK({
      tmdbApiKey: tmdbApiKey || 'addfba41d0cb5aba2ebaae12ac92b671',
    });
    return vylaInstance;
  } catch (err) {
    console.warn('[VylaSDK] Failed to initialize VylaSDK:', err?.message || err);
    return null;
  }
}

/**
 * Preferred top-tier high-speed sources in Vyla SDK
 */
export const VYLA_PREFERRED_SOURCES = [
  'streamrip',
  'vidlink',
  'moviebox',
  'vidapi',
  'chillflix',
  'vixsrc',
  '3eyedraven',
  'hyper',
  'vidzee',
  'vidbolt',
  'movy',
  'netplayz',
  'anv',
  'vidup',
  'hexa',
  'hdhub',
  'vidcore',
  'castle',
  'kickassanime',
  'lookmovie',
];

/**
 * Normalizes Vyla stream results into the standard Youplex / Vidstack format
 */
export function normalizeVylaStreamResult(streamResult, sourceKey) {
  if (!streamResult) return [];

  const rawList = Array.isArray(streamResult.allUrls)
    ? streamResult.allUrls
    : streamResult.url
    ? [streamResult]
    : [];

  const sources = [];

  for (const item of rawList) {
    if (!item?.url) continue;

    const rawUrl = item.url;
    const isProxied = isUrlAlreadyProxied(rawUrl);
    let url = rawUrl;
    let headers = item.headers || streamResult.headers || {};

    if (!isProxied) {
      const unwrapped = unwrapProxyUrl(rawUrl, headers);
      url = unwrapped.url;
      headers = unwrapped.headers;
    }

    const type =
      item.type ||
      streamResult.type ||
      (url.includes('.m3u8') ? 'hls' : 'mp4');

    sources.push({
      url,
      type: type === 'hls' ? 'hls' : 'mp4',
      quality: item.quality || streamResult.quality || 'auto',
      server: item.server || sourceKey,
      headers: headers || {},
      preferredHeaders: headers || {},
      flags: ['cors-allowed'],
      thumbnailTrack: null,
      alreadyProxied: isProxied,
    });
  }

  return sources;
}

/**
 * Fetches subtitles via Vyla SDK
 */
export async function fetchVylaSubtitles(vyla, id, season, episode) {
  try {
    const rawSubs =
      season != null && episode != null
        ? await vyla.getSubtitles(id, season, episode)
        : await vyla.getSubtitles(id);

    if (!Array.isArray(rawSubs)) return [];

    return rawSubs
      .filter((s) => Boolean(s?.file))
      .map((s, idx) => ({
        id: `vyla-sub-${idx}-${s.source || 'v1'}`,
        language: s.label?.toLowerCase()?.slice(0, 2) || 'en',
        label: s.label || 'English',
        url: s.file,
        type: s.type || 'vtt',
        hasCorsRestrictions: false,
      }));
  } catch (err) {
    return [];
  }
}

/**
 * Fallback scraper that queries Vyla's active stream resolvers
 *
 * @param {Object} params
 * @param {'movie'|'tv'} params.type
 * @param {string|number} params.id - TMDB ID
 * @param {number} [params.season]
 * @param {number} [params.episode]
 * @param {string} [params.specificSource] - Optional single Vyla source key
 * @param {string[]} [params.exclude] - Sources to skip
 * @param {Function} [params.onProgress] - Progress callback
 */
export async function scrapeVylaFallback({
  type = 'movie',
  id,
  season,
  episode,
  specificSource,
  exclude = [],
  onProgress,
}) {
  const vyla = await getVylaSDK();
  if (!vyla) {
    return { success: false, error: 'Vyla SDK unavailable' };
  }

  const isTv = type === 'tv';
  const sNum = isTv ? Number(season) || 1 : null;
  const eNum = isTv ? Number(episode) || 1 : null;

  const excludeSet = new Set(Array.isArray(exclude) ? exclude : []);

  let sourcesToTry = [];
  if (specificSource) {
    sourcesToTry = [specificSource.replace('vyla-', '')];
  } else {
    const allVylaSources = vyla.getSources(true).map((s) => s.key);
    // Combine preferred sources first, then remaining active sources
    const combined = [
      ...VYLA_PREFERRED_SOURCES.filter((k) => allVylaSources.includes(k)),
      ...allVylaSources.filter((k) => !VYLA_PREFERRED_SOURCES.includes(k)),
    ];
    sourcesToTry = combined.filter((k) => !excludeSet.has(k) && !excludeSet.has(`vyla-${k}`));
  }

  const attemptedSources = [];
  let foundSources = [];
  let successfulSourceKey = null;

  for (let i = 0; i < sourcesToTry.length; i++) {
    const sourceKey = sourcesToTry[i];
    const prefixedId = `vyla-${sourceKey}`;
    attemptedSources.push(prefixedId);

    const friendlyName = `${getProviderFriendlyName(sourceKey)} (Vyla)`;

    onProgress?.({
      type: 'start',
      provider: prefixedId,
      label: friendlyName,
      providerLabel: friendlyName,
      message: `Connecting to ${friendlyName}...`,
      index: i + 1,
      total: sourcesToTry.length,
    });

    try {
      const streamPromise = isTv
        ? vyla.getStream(sourceKey, id, sNum, eNum)
        : vyla.getStream(sourceKey, id);

      // Race with timeout per source to maintain fast playback
      const result = await Promise.race([
        streamPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Source timeout')), 5500)
        ),
      ]);

      const normalized = normalizeVylaStreamResult(result, sourceKey);
      if (normalized.length > 0) {
        foundSources = normalized;
        successfulSourceKey = prefixedId;
        break;
      }
    } catch (err) {
      // Continue to next fallback source
    }
  }

  if (foundSources.length > 0) {
    // Collect subtitles in parallel
    const subtitles = await fetchVylaSubtitles(vyla, id, sNum, eNum);

    return {
      success: true,
      provider: successfulSourceKey,
      providerLabel: getProviderFriendlyName(successfulSourceKey.replace('vyla-', '')),
      sources: foundSources,
      subtitles,
      thumbnailTrack: null,
      attemptedProviders: attemptedSources,
    };
  }

  return {
    success: false,
    error: 'All Vyla fallback sources failed or timed out',
    sources: [],
    subtitles: [],
    attemptedProviders: attemptedSources,
  };
}

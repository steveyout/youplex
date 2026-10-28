import {
  targets,
  makeProviders,
  setM3U8ProxyUrl,
  makeStandardFetcher,
  makeSimpleProxyFetcher,
} from '@p-stream/providers';

// Prioritize IPv4 over IPv6 in Node.js on Windows to prevent undici connect timeouts
if (typeof window === 'undefined') {
  import('node:dns')
    .then((dns) => {
      dns.setDefaultResultOrder?.('ipv4first');
    })
    .catch(() => {});
}

// ----------------------------------------------------------------------
// Load-balanced Proxy and Token Management (mirrors streamwatch)
// ----------------------------------------------------------------------

let apiToken = null;

export function setApiToken(newToken) {
  apiToken = newToken;
}

function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonStr =
        typeof atob === 'function'
          ? atob(base64)
          : typeof Buffer !== 'undefined'
          ? Buffer.from(base64, 'base64').toString('utf8')
          : null;
      return jsonStr ? JSON.parse(jsonStr) : null;
    }
  } catch (e) {}
  return null;
}

function getTokenIfValid() {
  if (!apiToken) return null;
  try {
    const payload = decodeJwtPayload(apiToken);
    if (!payload || !payload.exp) return `jwt|${apiToken}`;
    if (Date.now() / 1000 < payload.exp) return `jwt|${apiToken}`;
    return null;
  } catch (err) {
    return null;
  }
}

export async function getApiToken() {
  return getTokenIfValid();
}

export function getProxyUrls() {
  const raw =
    (typeof process !== 'undefined' && process.env?.CORS_PROXY_URL) ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_CORS_PROXY_URL) ||
    'https://simple-proxy-2.youtsteve1.workers.dev';
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

export function getM3U8ProxyUrls() {
  const raw =
    (typeof process !== 'undefined' && process.env?.M3U8_PROXY_URL) ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_M3U8_PROXY_URL) ||
    '';
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

function makeLoadbalancedList(getter) {
  let listIndex = -1;
  return () => {
    const fetchers = getter();
    if (!fetchers || fetchers.length === 0) return '';
    if (listIndex === -1 || listIndex >= fetchers.length) {
      listIndex = Math.floor(Math.random() * fetchers.length);
    }
    const proxyUrl = fetchers[listIndex];
    listIndex = (listIndex + 1) % fetchers.length;
    return proxyUrl;
  };
}

export const getLoadbalancedProxyUrl = makeLoadbalancedList(getProxyUrls);
export const getLoadbalancedM3U8ProxyUrl = makeLoadbalancedList(getM3U8ProxyUrls);

async function fetchButWithApiTokens(input, init) {
  const token = await getApiToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set('X-Token', token);
  const response = await fetch(
    input,
    init
      ? {
          ...init,
          headers,
        }
      : undefined
  );
  const newApiToken = response.headers.get('X-Token');
  if (newApiToken) setApiToken(newApiToken);
  return response;
}

export function setupM3U8Proxy() {
  const proxyUrl = getLoadbalancedM3U8ProxyUrl();
  if (proxyUrl) {
    try {
      setM3U8ProxyUrl(proxyUrl);
    } catch (e) {
      // Ignored if already initialized
    }
  }
}

export function makeLoadBalancedSimpleProxyFetcher() {
  const fetcher = async (a, b) => {
    const proxyUrl = getLoadbalancedProxyUrl() || 'https://simple-proxy-2.youtsteve1.workers.dev';
    const currentFetcher = makeSimpleProxyFetcher(proxyUrl, fetchButWithApiTokens);
    return currentFetcher(a, b);
  };
  return fetcher;
}

// Initialize M3U8 proxy on module load (same as streamwatch setupM3U8Proxy)
setupM3U8Proxy();

let providersInstance = null;

export function getProviders() {
  if (!providersInstance) {
    setupM3U8Proxy();

    providersInstance = makeProviders({
      fetcher: makeStandardFetcher(fetch),
      proxiedFetcher: makeLoadBalancedSimpleProxyFetcher(),
      target: targets.BROWSER,
      consistentIpForRequests: true,
    });
  }
  return providersInstance;
}

export function listAvailableSources() {
  try {
    return getProviders().listSources();
  } catch (e) {
    return [];
  }
}

const FRIENDLY_NAME_MAP = {
  // Anonymous Sci-Fi / Celestial aliases for YouPlex suite matching streamwatch
  icefy: 'Frost',
  'yp-dexter-1': 'Phantom',
  'yp-dexter-2': 'Apex',
  'yp-arrowtv-1': 'Nova',
  'yp-arrowtv-2': 'Zenith',
  'yp-pressplayz-1': 'Midnight',
  'yp-pressplayz-2': 'Quantum',
  'yp-rivestream-1': 'Nebula',
  'yp-rivestream-2': 'Arcane',
  'yp-sevenmovies-1': 'Horizon',
  'yp-sevenmovies-2': 'Solaris',
  tugaflix: 'Solstice',
  'yp-flixhq-1': 'Vortex',
  'yp-flixhq-2': 'Aether',
  fsonline: 'Aurora',
  hdrezka: 'Drift',
  animeflv: 'Vega',
  cuevana3: 'Atlas',
  fullhdfilmizle: 'Quasar',
};

const ANONYMOUS_NAMES = [
  'Phantom', 'Apex', 'Nova', 'Zenith', 'Midnight', 'Quantum',
  'Nebula', 'Arcane', 'Horizon', 'Solaris', 'Vortex', 'Aether',
  'Frost', 'Aurora', 'Solstice', 'Drift', 'Vega', 'Atlas', 'Quasar',
];

export function getProviderFriendlyName(id) {
  if (!id) return 'Native Player';
  if (FRIENDLY_NAME_MAP[id]) return FRIENDLY_NAME_MAP[id];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return ANONYMOUS_NAMES[Math.abs(hash) % ANONYMOUS_NAMES.length];
}

/**
 * Checks if a URL is already using an internal HLS/CORS proxy service
 */
export function isUrlAlreadyProxied(url) {
  if (!url || typeof url !== 'string') return false;
  if (
    url.startsWith('/api/hls') ||
    url.startsWith('/api/subtitles')
  ) {
    return true;
  }
  const proxyUrls = getM3U8ProxyUrls();
  if (proxyUrls.length === 0) return false;
  return proxyUrls.some((p) => url.startsWith(p));
}

/**
 * Unwrap external proxy URL wrappers (e.g. api.youplex.site/proxy, proxy.youplex.site)
 * and extract the true target URL and its embedded headers.
 */
export function unwrapProxyUrl(rawUrl, existingHeaders = {}) {
  if (!rawUrl || typeof rawUrl !== 'string') return { url: '', headers: existingHeaders };
  if (
    rawUrl.includes('api.youplex.site/proxy') ||
    rawUrl.includes('proxy.youplex.site') ||
    (rawUrl.startsWith('http') && (rawUrl.includes('/m3u8-proxy?') || rawUrl.includes('/proxy?')))
  ) {
    try {
      const parsed = new URL(rawUrl);
      const inner =
        parsed.searchParams.get('url') ||
        parsed.searchParams.get('destination') ||
        parsed.searchParams.get('src');
      if (inner) {
        const headers = { ...existingHeaders };
        if (parsed.searchParams.get('referer')) headers.referer = parsed.searchParams.get('referer');
        if (parsed.searchParams.get('origin')) headers.origin = parsed.searchParams.get('origin');
        if (parsed.searchParams.get('ua')) headers['user-agent'] = parsed.searchParams.get('ua');
        return { url: inner, headers };
      }
    } catch {}
  }
  return { url: rawUrl, headers: existingHeaders };
}

/**
 * Converts @p-stream/providers RunOutput / stream output into Vidstack-compatible sources and subtitles.
 * Implementation mirrors streamwatch/src/components/player/utils/convertRunoutputToSource.ts
 */
export function convertRunoutputToSource(out) {
  if (!out) return { sources: [], subtitles: [], thumbnailTrack: null };

  const rawStream = out.stream !== undefined ? out.stream : out;
  const streamList = Array.isArray(rawStream) ? rawStream : [rawStream];
  const sources = [];

  for (const item of streamList) {
    if (!item) continue;
    if (item.type === 'hls' || item.playlist) {
      const rawPlaylistUrl = item.playlist || item.url;
      const { url: playlistUrl, headers: unwrappedHeaders } = unwrapProxyUrl(
        rawPlaylistUrl,
        item.headers || {}
      );
      sources.push({
        url: playlistUrl,
        type: 'hls',
        quality: item.quality || 'auto',
        headers: unwrappedHeaders,
        preferredHeaders: item.preferredHeaders || {},
        flags: item.flags || ['cors-allowed'],
        thumbnailTrack: item.thumbnailTrack || null,
        alreadyProxied: false,
      });
    } else if (item.type === 'file' && item.qualities) {
      Object.entries(item.qualities).forEach(([quality, fileStream]) => {
        if (fileStream?.url) {
          const { url: fileUrl, headers: unwrappedHeaders } = unwrapProxyUrl(
            fileStream.url,
            item.headers || {}
          );
          sources.push({
            url: fileUrl,
            type: fileStream.type || 'mp4',
            quality: quality === 'unknown' ? 'auto' : quality,
            headers: unwrappedHeaders,
            preferredHeaders: item.preferredHeaders || {},
            flags: item.flags || ['cors-allowed'],
            thumbnailTrack: item.thumbnailTrack || null,
            alreadyProxied: false,
          });
        }
      });
    } else if (item.url) {
      const { url: directUrl, headers: unwrappedHeaders } = unwrapProxyUrl(
        item.url,
        item.headers || {}
      );
      sources.push({
        url: directUrl,
        type: item.type || (directUrl.includes('.m3u8') ? 'hls' : 'mp4'),
        quality: item.quality || 'auto',
        headers: unwrappedHeaders,
        preferredHeaders: item.preferredHeaders || {},
        flags: item.flags || ['cors-allowed'],
        thumbnailTrack: item.thumbnailTrack || null,
        alreadyProxied: false,
      });
    }
  }

  // Collect subtitles
  const rawCaptions = [
    ...(Array.isArray(out.captions) ? out.captions : []),
    ...(Array.isArray(rawStream?.captions) ? rawStream.captions : []),
    ...streamList.flatMap((s) => (Array.isArray(s?.captions) ? s.captions : [])),
  ];

  const subtitles = [];
  const seenUrls = new Set();
  for (const c of rawCaptions) {
    if (c?.url && !seenUrls.has(c.url)) {
      seenUrls.add(c.url);
      subtitles.push({
        id: c.id || c.url,
        language: c.language || c.lang || 'en',
        label: c.label || c.display || c.language || 'English',
        url: c.url,
        type: c.type || 'vtt',
        hasCorsRestrictions: !!c.hasCorsRestrictions,
      });
    }
  }

  return {
    sources,
    subtitles,
    thumbnailTrack: rawStream?.thumbnailTrack || streamList[0]?.thumbnailTrack || null,
  };
}

/**
 * Scrapes media using @p-stream/providers only, matching streamwatch's implementation.
 *
 * @param {Object} options
 * @param {'movie'|'tv'} options.type
 * @param {string|number} options.id - TMDB ID
 * @param {string} [options.title]
 * @param {string|number} [options.releaseYear]
 * @param {number} [options.season]
 * @param {number} [options.episode]
 * @param {string} [options.seasonTmdbId]
 * @param {string} [options.episodeTmdbId]
 * @param {string} [options.imdbId]
 * @param {string} [options.provider] - Optional specific provider ID
 * @param {string} [options.startFrom] - Optional provider ID to start after for auto-switching
 * @param {string[]} [options.exclude] - Optional list of failed provider IDs to skip
 * @param {Function} [options.onProgress] - SSE progress callback
 */
export async function scrapeMedia({
  type = 'movie',
  id,
  title,
  releaseYear,
  season,
  episode,
  seasonTmdbId,
  episodeTmdbId,
  imdbId,
  provider,
  startFrom,
  exclude = [],
  onProgress,
}) {
  const providers = getProviders();

  const isTv = type === 'tv';
  const media = isTv
    ? {
        type: 'show',
        title: title || 'Unknown',
        releaseYear: Number(releaseYear) || new Date().getFullYear(),
        tmdbId: String(id),
        imdbId: imdbId ? String(imdbId) : undefined,
        season: {
          number: Number(season) || 1,
          tmdbId: seasonTmdbId ? String(seasonTmdbId) : '',
        },
        episode: {
          number: Number(episode) || 1,
          tmdbId: episodeTmdbId ? String(episodeTmdbId) : '',
        },
      }
    : {
        type: 'movie',
        title: title || 'Unknown',
        releaseYear: Number(releaseYear) || new Date().getFullYear(),
        tmdbId: String(id),
        imdbId: imdbId ? String(imdbId) : undefined,
      };

  try {
    // Determine source order
    let targetSourceOrder;

    if (provider) {
      targetSourceOrder = [provider];
    } else {
      const allSources = providers.listSources();
      const allSourceIds = allSources.map((source) => source.id);
      const excludeSet = new Set(Array.isArray(exclude) ? exclude : []);

      let baseSourceOrder = allSourceIds;

      // When auto-switching after an extractor fails, rotate the full list around startFrom
      // BEFORE filtering by excludeSet, so startFrom is reliably found even if excluded
      if (startFrom) {
        const startIndex = allSourceIds.indexOf(startFrom);
        if (startIndex !== -1) {
          baseSourceOrder = [
            ...allSourceIds.slice(startIndex + 1),
            ...allSourceIds.slice(0, startIndex),
          ];
        }
      }

      targetSourceOrder = baseSourceOrder.filter((sourceId) => !excludeSet.has(sourceId));
    }

    if (targetSourceOrder.length === 0) {
      return {
        success: false,
        error: 'No available providers remaining to scrape',
        sources: [],
        subtitles: [],
        attemptedProviders: [],
      };
    }

    const attemptedSources = [];
    let attemptedCount = 0;
    const runResult = await providers.runAll({
      media,
      sourceOrder: targetSourceOrder,
      events: {
        init: (evt) => {
          onProgress?.({
            type: 'init',
            sourceIds: evt.sourceIds,
            message: 'Searching active streaming providers...',
          });
        },
        start: (sourceId) => {
          attemptedCount += 1;
          const targetId = typeof sourceId === 'string' ? sourceId : sourceId?.id || sourceId?.sourceId;
          if (targetId && !attemptedSources.includes(targetId)) {
            attemptedSources.push(targetId);
          }
          const friendlyName = getProviderFriendlyName(targetId);
          onProgress?.({
            type: 'start',
            provider: targetId,
            label: friendlyName,
            providerLabel: friendlyName,
            message: `Connecting to ${friendlyName}...`,
            index: attemptedCount,
            total: targetSourceOrder.length,
          });
        },
        update: (evt) => {
          const targetId = typeof evt.sourceId === 'string' ? evt.sourceId : evt.sourceId?.id || evt.id;
          const friendlyName = getProviderFriendlyName(targetId);
          onProgress?.({
            type: 'update',
            provider: targetId,
            label: friendlyName,
            providerLabel: friendlyName,
            status: evt.status,
            percentage: evt.percentage,
            message: `Resolving stream on ${friendlyName}...`,
          });
        },
        discoverEmbeds: (evt) => {
          onProgress?.({
            type: 'discoverEmbeds',
            sourceId: evt.sourceId,
            embeds: evt.embeds,
          });
        },
      },
    });

    if (runResult && runResult.stream) {
      const parsed = convertRunoutputToSource(runResult);
      if (parsed.sources.length > 0) {
        const cleanProvider = runResult.sourceId || provider || 'providers';
        return {
          success: true,
          provider: cleanProvider,
          providerLabel: getProviderFriendlyName(cleanProvider),
          sources: parsed.sources,
          subtitles: parsed.subtitles,
          thumbnailTrack: parsed.thumbnailTrack,
          attemptedProviders: attemptedSources,
        };
      }
    }

    return {
      success: false,
      error: 'No working stream found across enabled providers',
      sources: [],
      subtitles: [],
      attemptedProviders: attemptedSources,
    };
  } catch (error) {
    console.warn('Scraping error:', error);
    return {
      success: false,
      error: error?.message || 'Scrape execution failed',
      sources: [],
      subtitles: [],
      attemptedProviders: [],
    };
  }
}

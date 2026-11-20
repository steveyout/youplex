import {
  signScraperRequest,
  decryptScraperPayload,
  getScraperAuthHeaders,
} from '@/lib/scrapers/scraper-security';
import {
  unwrapProxyUrl,
  PROVIDER_CONFIG,
  SCRAPER_API_BASE,
  getM3U8ProxyUrls,
  isUrlAlreadyProxied,
  getProviderFriendlyName,
  getCachedScraperProviders,
  fetchActiveScraperProviders,
} from '@/lib/scrapers/provider-config';

export {
  unwrapProxyUrl,
  getM3U8ProxyUrls,
  isUrlAlreadyProxied,
  getProviderFriendlyName,
};

// Prioritize IPv4 over IPv6 in Node.js on Windows to prevent undici connect timeouts
if (typeof window === 'undefined') {
  import('node:dns')
    .then((dns) => {
      dns.setDefaultResultOrder?.('ipv4first');
    })
    .catch(() => {});
}

// ----------------------------------------------------------------------
// Proxy URL helpers (preserved for compatibility with Vyla fallback & player)
// ----------------------------------------------------------------------

export function getProxyUrls() {
  const raw =
    (typeof process !== 'undefined' && process.env?.CORS_PROXY_URL) ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_CORS_PROXY_URL) ||
    (typeof process !== 'undefined' && process.env?.CF_WORKER_PROXIES) ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_CF_WORKER_PROXIES) ||
    'https://simple-proxy-2.youtsteve1.workers.dev,https://simple-proxy.lyonmbithi.workers.dev,https://simple-proxy-3.youtsteve3.workers.dev';
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

// ----------------------------------------------------------------------
// Active provider metadata & lookup (backed by movies-scrapper /providers)
// ----------------------------------------------------------------------

let runtimeProvidersMap = new Map(PROVIDER_CONFIG.map((p) => [p.id, p]));

function syncProvidersCache(list) {
  if (!Array.isArray(list) || list.length === 0) return;
  const next = new Map(runtimeProvidersMap);
  list.forEach((item) => {
    if (item?.id) {
      next.set(item.id, {
        ...item,
        label: item.label || item.name || item.id,
        name: item.providerName || item.name || item.id,
      });
    }
  });
  runtimeProvidersMap = next;
}

export async function refreshAvailableSources() {
  const list = await fetchActiveScraperProviders({ forceRefresh: true });
  syncProvidersCache(list);
  return list;
}

export function listAvailableSources() {
  const cached = getCachedScraperProviders();
  syncProvidersCache(cached);
  return cached;
}

export function listAvailableEmbeds() {
  return [];
}

/**
 * Normalizes a movies-scrapper JSON/SSE payload into Vidstack-compatible sources and subtitles.
 */
export function normalizeScraperSources(apiResponse) {
  if (!apiResponse) return { sources: [], subtitles: [], thumbnailTrack: null };

  const rawSources = Array.isArray(apiResponse.sources) && apiResponse.sources.length > 0
    ? apiResponse.sources
    : apiResponse.url || apiResponse.stream
    ? [
        {
          url: apiResponse.url || apiResponse.stream,
          rawUrl: apiResponse.rawUrl,
          proxyUrl: apiResponse.proxyUrl,
          quality: apiResponse.quality || 'auto',
          server: apiResponse.server,
          name: apiResponse.providerLabel || apiResponse.providerName || apiResponse.provider,
          headers: apiResponse.headers || {},
          client: apiResponse.client ?? true,
          directClient: Boolean(apiResponse.directClient),
        },
      ]
    : [];

  const sources = rawSources
    .filter((s) => Boolean(s?.url))
    .map((s) => {
      const streamUrl = s.url;
      const isHls =
        s.type === 'hls' ||
        Boolean(s.isM3U8) ||
        streamUrl.includes('.m3u8') ||
        (s.rawUrl && s.rawUrl.includes('.m3u8'));
      const clientFlag = s.client !== undefined ? Boolean(s.client) : true;
      const directClient = Boolean(s.directClient);

      return {
        id: s.id,
        name: s.name,
        server: s.server,
        url: streamUrl,
        rawUrl: s.rawUrl || streamUrl,
        proxyUrl: s.proxyUrl || streamUrl,
        client: clientFlag,
        directClient,
        type: s.type || (isHls ? 'hls' : 'mp4'),
        quality: s.quality || 'auto',
        headers: s.headers || apiResponse.headers || {},
        preferredHeaders: s.preferredHeaders || {},
        flags: s.flags || ['cors-allowed'],
        thumbnailTrack: s.thumbnailTrack || null,
        alreadyProxied: Boolean(clientFlag || s.alreadyProxied || isUrlAlreadyProxied(streamUrl)),
      };
    })
    .sort((a, b) => {
      const scoreA = (a.directClient ? 2 : 0) + (a.client ? 1 : 0);
      const scoreB = (b.directClient ? 2 : 0) + (b.client ? 1 : 0);
      return scoreB - scoreA;
    });

  const rawCaptions = [
    ...(Array.isArray(apiResponse.subtitles) ? apiResponse.subtitles : []),
    ...(Array.isArray(apiResponse.captions) ? apiResponse.captions : []),
  ];

  const subtitles = [];
  const seenUrls = new Set();
  rawCaptions.forEach((c) => {
    const subUrl = c?.url || c?.file;
    if (subUrl && !seenUrls.has(subUrl)) {
      seenUrls.add(subUrl);
      const label = c.label || c.display || c.lang || c.language || 'English';
      subtitles.push({
        id: c.id || subUrl,
        language: c.language || c.lang || 'en',
        lang: c.lang || label,
        label,
        url: subUrl,
        type: c.type || (subUrl.toLowerCase().includes('.srt') ? 'srt' : 'vtt'),
        hasCorsRestrictions: Boolean(c.hasCorsRestrictions),
        client: c.client !== undefined ? Boolean(c.client) : true,
      });
    }
  });

  return {
    sources,
    subtitles,
    thumbnailTrack: apiResponse.thumbnailTrack || null,
  };
}

/**
 * Backward-compatible alias for legacy callers passing RunOutput-like objects.
 */
export function convertRunoutputToSource(out) {
  return normalizeScraperSources(out);
}

// ----------------------------------------------------------------------
// Direct movies-scrapper API Scraper (SSE + JSON)
// ----------------------------------------------------------------------

function buildScraperParams({
  type,
  id,
  title,
  releaseYear,
  season,
  episode,
  imdbId,
  provider,
  startFrom,
  exclude,
  sourceOrder,
}) {
  const isTv = type === 'tv' || type === 'show' || type === 'series';
  const mediaType = isTv ? 'tv' : 'movie';
  const { ts, sig } = signScraperRequest(mediaType, String(id));
  const params = new URLSearchParams({
    type: mediaType,
    id: String(id),
    _ts: ts,
    _sig: sig,
    _enc: '1',
  });

  if (isTv) {
    const s = String(Number(season) || 1);
    const e = String(Number(episode) || 1);
    params.set('season', s);
    params.set('episode', e);
    params.set('s', s);
    params.set('e', e);
  }
  if (title) params.set('title', String(title));
  if (releaseYear) params.set('year', String(releaseYear));
  if (imdbId) params.set('imdb_id', String(imdbId));
  if (provider) params.set('provider', String(provider));
  if (startFrom) params.set('startFrom', String(startFrom));
  if (Array.isArray(exclude) && exclude.length > 0) {
    params.set('exclude', exclude.join(','));
  }
  if (Array.isArray(sourceOrder) && sourceOrder.length > 0) {
    params.set('sourceOrder', sourceOrder.join(','));
  }

  return params;
}

function buildSuccessResult(payload, fallbackProvider) {
  const normalized = normalizeScraperSources(payload);
  if (normalized.sources.length === 0) return null;

  const cleanProvider = payload.provider || payload.sourceId || fallbackProvider || 'movies-scrapper';
  const friendlyLabel = payload.providerLabel || payload.label || getProviderFriendlyName(cleanProvider);

  return {
    success: true,
    client: payload.client !== undefined ? Boolean(payload.client) : true,
    provider: cleanProvider,
    providerName: payload.providerName || friendlyLabel,
    providerLabel: friendlyLabel,
    sources: normalized.sources,
    subtitles: normalized.subtitles,
    thumbnailTrack: normalized.thumbnailTrack,
    attemptedProviders: Array.isArray(payload.attemptedProviders) ? payload.attemptedProviders : [],
  };
}

async function scrapeViaSse(params, onProgress, authHeaders = {}) {
  const sseParams = new URLSearchParams(params);
  sseParams.set('stream', 'true');

  const response = await fetch(`${SCRAPER_API_BASE}/scrape?${sseParams.toString()}`, {
    headers: {
      Accept: 'text/event-stream',
      ...authHeaders,
    },
  });

  if (!response.ok || !response.body) {
    throw new Error(`Scraper SSE HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalEvent = null;

  const processLines = (lines) => {
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) return;
      try {
        const rawEvt = JSON.parse(trimmed.slice(5).trim());
        const evt = rawEvt?.type === 'success' ? decryptScraperPayload(rawEvt) : rawEvt;
        if (evt.type === 'init' && Array.isArray(evt.providers)) {
          syncProvidersCache(evt.providers);
        }
        onProgress?.(evt);

        if (evt.type === 'success') {
          finalEvent = evt;
        } else if (evt.type === 'failure' && (!finalEvent || finalEvent.type !== 'success')) {
          finalEvent = evt;
        }
      } catch {
        // Ignore malformed SSE lines
      }
    });
  };

  const pump = async () => {
    const { done, value } = await reader.read();
    if (done) {
      if (buffer.trim()) {
        processLines([buffer]);
      }
      return;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    processLines(lines);

    await pump();
  };

  await pump();
  return finalEvent;
}

async function scrapeViaJson(params, authHeaders = {}) {
  const jsonParams = new URLSearchParams(params);
  jsonParams.delete('stream');

  const response = await fetch(`${SCRAPER_API_BASE}/scrape?${jsonParams.toString()}`, {
    headers: {
      Accept: 'application/json',
      ...authHeaders,
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok && !data) {
    throw new Error(`Scraper JSON HTTP ${response.status}`);
  }
  return data && data.encrypted ? decryptScraperPayload(data) : data;
}

/**
 * Scrapes media directly from the movies-scrapper API (api.youplex.site)
 * with real-time SSE progress events and Vyla server-side fallback.
 */
export async function scrapeMedia({
  type = 'movie',
  id,
  title,
  releaseYear,
  season,
  episode,
  imdbId,
  provider,
  startFrom,
  exclude = [],
  sourceOrder,
  onProgress,
}) {
  // Keep active providers metadata warm in background
  fetchActiveScraperProviders()
    .then(syncProvidersCache)
    .catch(() => {});

  // If specific Vyla provider requested, route directly to Vyla SDK
  if (provider && provider.startsWith('vyla-')) {
    const { scrapeVylaFallback } = await import('./vyla-fallback');
    return scrapeVylaFallback({
      type,
      id,
      season,
      episode,
      specificSource: provider,
      exclude,
      onProgress,
    });
  }

  const params = buildScraperParams({
    type,
    id,
    title,
    releaseYear,
    season,
    episode,
    imdbId,
    provider,
    startFrom,
    exclude,
    sourceOrder,
  });

  const mediaType =
    type === 'tv' || type === 'show' || type === 'series' ? 'tv' : 'movie';
  const authHeaders = getScraperAuthHeaders(mediaType, String(id));
  let attemptedProviders = [];

  try {
    if (typeof onProgress === 'function') {
      try {
        const sseResult = await scrapeViaSse(params, onProgress, authHeaders);
        const sseAttempted = sseResult?.attemptedProviders;
        if (Array.isArray(sseAttempted)) {
          attemptedProviders = sseAttempted;
        }
        if (sseResult?.type === 'success') {
          const formatted = buildSuccessResult(sseResult, provider);
          if (formatted) return formatted;
        }
        if (sseResult?.type === 'failure' && provider) {
          return {
            success: false,
            error: sseResult.error || 'Provider failed to return a stream',
            sources: [],
            subtitles: [],
            attemptedProviders,
          };
        }
      } catch (sseErr) {
        console.warn('[Providers] SSE scrape failed, falling back to JSON endpoint:', sseErr?.message);
      }
    }

    // Standard JSON fallback (or direct JSON mode when no onProgress callback)
    const jsonResult = await scrapeViaJson(params, authHeaders);
    const jsonAttempted = jsonResult?.attemptedProviders;
    if (Array.isArray(jsonAttempted)) {
      attemptedProviders = jsonAttempted;
    }
    if (jsonResult?.success) {
      const formatted = buildSuccessResult(jsonResult, provider);
      if (formatted) return formatted;
    }

    // If primary API providers fail and no single specific provider was enforced, trigger Vyla fallback (server-side)
    if (!provider) {
      onProgress?.({
        type: 'init',
        message: 'Primary providers failed. Connecting to fallback resolvers...',
      });
      const { scrapeVylaFallback } = await import('./vyla-fallback');
      const vylaFallback = await scrapeVylaFallback({
        type,
        id,
        season,
        episode,
        exclude,
        onProgress,
      });
      if (vylaFallback.success && vylaFallback.sources?.length > 0) {
        return {
          ...vylaFallback,
          attemptedProviders: [...new Set([...attemptedProviders, ...(vylaFallback.attemptedProviders || [])])],
        };
      }
    }

    return {
      success: false,
      error: jsonResult?.error || 'No working stream found across active providers',
      sources: [],
      subtitles: [],
      attemptedProviders,
    };
  } catch (error) {
    console.warn('Scraping error:', error);
    return {
      success: false,
      error: error?.message || 'Scrape execution failed',
      sources: [],
      subtitles: [],
      attemptedProviders,
    };
  }
}

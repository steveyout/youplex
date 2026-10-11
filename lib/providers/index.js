import dns from 'node:dns';
import {
  targets,
  makeProviders,
  setM3U8ProxyUrl,
  makeStandardFetcher,
  makeSimpleProxyFetcher,
} from '@p-stream/providers';

// Prioritize IPv4 over IPv6 in Node.js on Windows to prevent undici connect timeouts
try {
  dns.setDefaultResultOrder?.('ipv4first');
} catch (e) {
  // Ignored in environments where not supported
}

// ----------------------------------------------------------------------

const M3U8_PROXY_URL =
  process.env.M3U8_PROXY_URL ||
  process.env.NEXT_PUBLIC_M3U8_PROXY_URL ||
  'https://proxy.youplex.site';

const CORS_PROXY_URL =
  process.env.CORS_PROXY_URL ||
  process.env.NEXT_PUBLIC_CORS_PROXY_URL ||
  'https://simple-proxy-2.youtsteve1.workers.dev';

// Configure M3U8 proxy URL on module load (same as streamwatch setupM3U8Proxy)
try {
  setM3U8ProxyUrl(M3U8_PROXY_URL);
} catch (e) {
  // Ignored if already initialized
}

let providersInstance = null;

export function getProviders() {
  if (!providersInstance) {
    try {
      dns.setDefaultResultOrder?.('ipv4first');
    } catch (e) {}

    try {
      setM3U8ProxyUrl(M3U8_PROXY_URL);
    } catch (e) {
      // Ignored if already initialized
    }

    providersInstance = makeProviders({
      fetcher: makeStandardFetcher(fetch),
      proxiedFetcher: makeSimpleProxyFetcher(CORS_PROXY_URL, fetch),
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
      sources.push({
        url: item.playlist || item.url,
        type: 'hls',
        quality: item.quality || 'auto',
        headers: item.headers || {},
        preferredHeaders: item.preferredHeaders || {},
        flags: item.flags || ['cors-allowed'],
        thumbnailTrack: item.thumbnailTrack || null,
      });
    } else if (item.type === 'file' && item.qualities) {
      Object.entries(item.qualities).forEach(([quality, fileStream]) => {
        if (fileStream?.url) {
          sources.push({
            url: fileStream.url,
            type: fileStream.type || 'mp4',
            quality: quality === 'unknown' ? 'auto' : quality,
            headers: item.headers || {},
            preferredHeaders: item.preferredHeaders || {},
            flags: item.flags || ['cors-allowed'],
            thumbnailTrack: item.thumbnailTrack || null,
          });
        }
      });
    } else if (item.url) {
      sources.push({
        url: item.url,
        type: item.type || (item.url.includes('.m3u8') ? 'hls' : 'mp4'),
        quality: item.quality || 'auto',
        headers: item.headers || {},
        preferredHeaders: item.preferredHeaders || {},
        flags: item.flags || ['cors-allowed'],
        thumbnailTrack: item.thumbnailTrack || null,
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
  try {
    dns.setDefaultResultOrder?.('ipv4first');
  } catch (e) {}

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
      const excludeSet = new Set(Array.isArray(exclude) ? exclude : []);

      let baseSourceOrder = allSources
        .filter((source) => !excludeSet.has(source.id))
        .map((source) => source.id);

      if (startFrom) {
        const startIndex = baseSourceOrder.indexOf(startFrom);
        if (startIndex !== -1) {
          baseSourceOrder = baseSourceOrder.slice(startIndex + 1);
        }
      }

      targetSourceOrder = baseSourceOrder;
    }

    if (targetSourceOrder.length === 0) {
      return {
        success: false,
        error: 'No available providers remaining to scrape',
        sources: [],
        subtitles: [],
      };
    }

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
        };
      }
    }

    return {
      success: false,
      error: 'No working stream found across enabled providers',
      sources: [],
      subtitles: [],
    };
  } catch (error) {
    console.warn('Scraping error:', error);
    return {
      success: false,
      error: error?.message || 'Scrape execution failed',
      sources: [],
      subtitles: [],
    };
  }
}

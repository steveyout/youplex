import {
  makeProviders,
  makeStandardFetcher,
  makeSimpleProxyFetcher,
  targets,
  setM3U8ProxyUrl,
} from '@p-stream/providers';

// ----------------------------------------------------------------------

const M3U8_PROXY_URL =
  process.env.M3U8_PROXY_URL ||
  process.env.NEXT_PUBLIC_M3U8_PROXY_URL ||
  'https://proxy.youplex.site';

const CORS_PROXY_URL =
  process.env.CORS_PROXY_URL ||
  process.env.NEXT_PUBLIC_CORS_PROXY_URL ||
  'https://simple-proxy-2.youtsteve1.workers.dev';

// Configure M3U8 proxy URL on module load
try {
  setM3U8ProxyUrl(M3U8_PROXY_URL);
} catch (e) {
  // Ignored if already initialized
}

let providersInstance = null;

export function getProviders() {
  if (!providersInstance) {
    try {
      setM3U8ProxyUrl(M3U8_PROXY_URL);
    } catch (e) {}

    // Initialized using makeProviders - @p-stream/providers automatically filters disabled: true scrapers
    providersInstance = makeProviders({
      fetcher: makeStandardFetcher(fetch),
      proxiedFetcher: makeSimpleProxyFetcher(CORS_PROXY_URL, fetch),
      target: targets.ANY,
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
  'yp-flixhq-1': 'Quantum',
  'yp-flixhq-2': 'Quantum 2',
  vidlink: 'VidLink',
  'yp-vidcore-1': 'Arcane',
  'yp-vidcore-2': 'Arcane 2',
  'yp-hdbox-1': 'Phantom',
  'yp-hdbox-2': 'Phantom 2',
  'yp-moviebox-1': 'Nebula',
  'yp-moviebox-2': 'Nebula 2',
  rgshows: 'Nova',
  fsharetv: 'Apex',
  movies4f: 'Titan',
  kissasian: 'Zenith',
  viewvault: 'Aether',
  icefy: 'Frost',
  ridomovies: 'Echo',
  vidsrc: 'Alpha',
};

export function getProviderFriendlyName(id) {
  if (!id) return 'Default Provider';
  if (FRIENDLY_NAME_MAP[id]) return FRIENDLY_NAME_MAP[id];

  try {
    const found = getProviders().listSources().find((s) => s.id === id);
    if (found?.name) {
      return found.name
        .replace(/\s*\([^)]*\)/g, '')
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
        .trim();
    }
  } catch (e) {}

  return String(id)
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/^yp-/, '')
    .replace(/-\d+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/**
 * Scrapes media using @p-stream/providers.
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
    let result = null;

    if (provider) {
      // Scrape from a specific provider
      const friendlyName = getProviderFriendlyName(provider);
      onProgress?.({
        type: 'progress',
        provider,
        label: friendlyName,
        providerLabel: friendlyName,
        message: `Querying ${friendlyName}...`,
      });

      result = await providers.runSourceScraper({
        id: provider,
        media,
      });

      if (!result) {
        onProgress?.({
          type: 'failure',
          provider,
          label: friendlyName,
          providerLabel: friendlyName,
          error: `Provider ${friendlyName} did not return a stream`,
        });
        return {
          success: false,
          error: `Provider ${friendlyName} did not return a stream`,
          sources: [],
          subtitles: [],
        };
      }

      result = {
        sourceId: provider,
        stream: result,
      };
    } else {
      // Auto-fallback scrape across all active sources configured in @p-stream/providers
      const allSources = providers.listSources();
      let attemptedCount = 0;

      result = await providers.runAll({
        media,
        sourceOrder: allSources.map((s) => s.id),
        events: {
          init: () => {
            onProgress?.({
              type: 'init',
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
              total: allSources.length,
            });
          },
          update: (evt) => {
            const targetId = typeof evt === 'string' ? evt : evt?.id || evt?.sourceId;
            const friendlyName = getProviderFriendlyName(targetId);
            const percent = evt?.percentage || 0;
            onProgress?.({
              type: 'progress',
              provider: targetId,
              label: friendlyName,
              providerLabel: friendlyName,
              percentage: percent,
              message: `Scraping ${friendlyName} (${percent}%)...`,
            });
          },
        },
      });
    }

    if (!result || !result.stream) {
      onProgress?.({
        type: 'failure',
        error: 'No active streams found across available providers.',
      });
      return {
        success: false,
        error: 'No direct stream found across providers',
        sources: [],
        subtitles: [],
      };
    }

    const { stream, sourceId } = result;

    // Normalize direct stream sources into Vidstack-compatible format
    let sources = [];
    if (stream.type === 'hls') {
      sources.push({
        url: stream.playlist,
        quality: 'auto',
        type: 'hls',
        isM3U8: true,
      });
    } else if (stream.type === 'file' && stream.qualities) {
      sources = Object.entries(stream.qualities).map(([quality, fileData]) => ({
        url: fileData.url,
        quality: quality === 'unknown' ? 'auto' : quality,
        type: 'mp4',
        isM3U8: false,
      }));
    }

    // Normalize subtitles
    const subtitles = (stream.captions || []).map((caption, idx) => {
      const lang = caption.language || caption.lang || 'en';
      let label = caption.label || caption.name || caption.lang || caption.language || `Subtitle ${idx + 1}`;
      if (caption.url) {
        if (/\.sdh\./i.test(caption.url) && !label.includes('[SDH]')) {
          label += ' [SDH]';
        } else {
          const numMatch = caption.url.match(/\.(\d+)\.vtt/i);
          if (numMatch && !label.includes(`(${numMatch[1]})`)) {
            label += ` (${numMatch[1]})`;
          }
        }
      }
      return {
        id: caption.id || caption.url || `sub-${idx}`,
        url: caption.url,
        language: lang,
        label,
        type: caption.type || 'vtt',
        hasCorsRestrictions: caption.hasCorsRestrictions || false,
      };
    });

    const friendlyName = getProviderFriendlyName(sourceId);

    onProgress?.({
      type: 'success',
      provider: sourceId,
      label: friendlyName,
      providerLabel: friendlyName,
      message: `Ready on ${friendlyName}!`,
      sources,
      subtitles,
      headers: stream.headers || {},
    });

    return {
      success: true,
      provider: sourceId,
      providerLabel: friendlyName,
      sources,
      subtitles,
      headers: stream.headers || {},
    };
  } catch (err) {
    onProgress?.({
      type: 'failure',
      error: err?.message || 'Scraping process encountered an error',
    });
    return {
      success: false,
      error: err?.message || 'Internal scraping failure',
      sources: [],
      subtitles: [],
    };
  }
}

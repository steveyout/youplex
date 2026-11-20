/**
 * Client-safe provider configuration and live provider discovery backed by movies-scrapper API.
 * Initial/fallback list mirrors the active providers in movies-scrapper; calling
 * `fetchActiveScraperProviders()` keeps the list synchronized with api.youplex.site/providers.
 */

import { getScraperAuthHeaders } from '@/lib/scrapers/scraper-security';

export const SCRAPER_API_BASE = (
  process.env.NEXT_PUBLIC_SCRAPER_API_URL ||
  process.env.SCRAPER_API_URL ||
  'https://api.youplex.site'
).replace(/\/+$/, '');

export const PROVIDER_CONFIG = [
  {
    id: 'movi47',
    label: '🎬 Movi47',
    name: 'Movi47',
    priority: 0,
    rank: 500,
    supportedContent: ['movie', 'tv'],
    client: true,
  },
  {
    id: 'oneshows',
    label: '💫 Nova',
    name: 'OneShows',
    priority: 1,
    rank: 490,
    supportedContent: ['movie', 'tv'],
    client: true,
  },
  {
    id: 'arrowtv',
    label: '🏹 Apex',
    name: 'ArrowTV',
    priority: 2,
    rank: 480,
    supportedContent: ['movie', 'tv'],
    client: true,
  },
  {
    id: 'zoechip',
    label: '💎 Zoechip',
    name: 'Zoechip',
    priority: 3,
    rank: 475,
    supportedContent: ['movie', 'tv'],
    client: true,
  },
  {
    id: 'rivestream',
    label: '🌊 Nebula',
    name: 'RiveStream',
    priority: 4,
    rank: 470,
    supportedContent: ['movie', 'tv'],
    client: true,
  },
  {
    id: 'vidcore',
    label: '🔋 Quasar',
    name: 'VidCore',
    priority: 5,
    rank: 465,
    supportedContent: ['movie', 'tv'],
    client: true,
  },
  {
    id: 'bingebang',
    label: '💥 BingeBang',
    name: 'BingeBang',
    priority: 6,
    rank: 460,
    supportedContent: ['movie', 'tv'],
    client: true,
  },
  {
    id: 'taroflix',
    label: '⭐ Starkio',
    name: 'TaroFlix',
    priority: 7,
    rank: 455,
    supportedContent: ['movie', 'tv'],
    client: true,
  },
  {
    id: 'cinemaos',
    label: '📽️ Screenscape',
    name: 'CinemaOS',
    priority: 8,
    rank: 450,
    supportedContent: ['movie', 'tv'],
    client: true,
  },
  {
    id: 'aether',
    label: '⚡ Aether',
    name: 'Aether',
    priority: 9,
    rank: 445,
    supportedContent: ['movie', 'tv'],
    client: true,
  },
  {
    id: 'vidlink',
    label: '🔗 VidLink',
    name: 'VidLink',
    priority: 10,
    rank: 440,
    supportedContent: ['movie', 'tv'],
    client: true,
  },
  {
    id: 'cno',
    label: '🪐 Titan',
    name: 'Cno',
    priority: 11,
    rank: 435,
    supportedContent: ['movie', 'tv'],
    client: true,
  },
  {
    id: 'cinejoy',
    label: '🎆 Aurora',
    name: 'Cinejoy',
    priority: 12,
    rank: 430,
    supportedContent: ['movie', 'tv'],
    client: true,
  },
  {
    id: 'cinecat',
    label: '🐱 Shadow',
    name: 'Cinecat',
    priority: 13,
    rank: 425,
    supportedContent: ['movie', 'tv'],
    client: true,
  },
  {
    id: 'zetmoon',
    label: '🌙 Eclipse',
    name: 'ZetMoon',
    priority: 14,
    rank: 420,
    supportedContent: ['movie', 'tv'],
    client: true,
  },
  {
    id: 'pressplayz',
    label: '▶️ Midnight',
    name: 'PressPlayZ',
    priority: 15,
    rank: 415,
    supportedContent: ['movie', 'tv'],
    client: true,
  },
  {
    id: 'kaizoku',
    label: '🏴‍☠️ Vortex',
    name: 'Kaizoku',
    priority: 16,
    rank: 410,
    supportedContent: ['movie', 'tv'],
    client: true,
  },
  {
    id: 'chillflix',
    label: '❄️ Frost',
    name: 'Chillflix',
    priority: 17,
    rank: 405,
    supportedContent: ['movie', 'tv'],
    client: true,
  },
];

export const CLIENT_SCRAPER_CONFIG = PROVIDER_CONFIG.map(
  ({ id, label, name, priority, rank, supportedContent, client }) => ({
    id,
    label,
    name,
    priority,
    rank,
    supportedContent,
    client,
  })
);

let cachedProviders = null;
let cachedAt = 0;
let inflightProvidersPromise = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export function getCachedScraperProviders() {
  return cachedProviders || CLIENT_SCRAPER_CONFIG;
}

const ANONYMOUS_NAMES = [
  'Phantom',
  'Apex',
  'Nova',
  'Zenith',
  'Midnight',
  'Quantum',
  'Nebula',
  'Arcane',
  'Horizon',
  'Solaris',
  'Vortex',
  'Aether',
  'Frost',
  'Aurora',
  'Solstice',
  'Drift',
  'Vega',
  'Atlas',
  'Quasar',
];

export function getM3U8ProxyUrls() {
  const raw =
    (typeof process !== 'undefined' && process.env?.M3U8_PROXY_URL) ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_M3U8_PROXY_URL) ||
    'https://proxy.youplex.site,https://api.youplex.site/proxy';
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

export function getProviderFriendlyName(id) {
  if (!id) return 'Native Player';
  const cleanId = String(id).trim().toLowerCase().replace(/^yp-/, '').replace(/-\d+$/, '');
  const list = getCachedScraperProviders();
  const matched = list.find((p) => p.id === id || p.id === cleanId);
  if (matched?.label || matched?.name) {
    return matched.label || matched.name;
  }

  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i); // eslint-disable-line no-bitwise
    hash |= 0; // eslint-disable-line no-bitwise
  }
  return ANONYMOUS_NAMES[Math.abs(hash) % ANONYMOUS_NAMES.length];
}

export function isUrlAlreadyProxied(url) {
  if (!url || typeof url !== 'string') return false;
  if (
    url.startsWith('/api/hls') ||
    url.startsWith('/api/subtitles') ||
    url.includes('api.youplex.site/proxy') ||
    url.includes('proxy.youplex.site') ||
    url.includes('/m3u8-proxy?') ||
    url.includes('/proxy?url=')
  ) {
    return true;
  }
  const proxyUrls = getM3U8ProxyUrls();
  if (proxyUrls.length === 0) return false;
  return proxyUrls.some((p) => url.startsWith(p));
}

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
        if (parsed.searchParams.get('ref')) headers.referer = parsed.searchParams.get('ref');
        if (parsed.searchParams.get('origin')) headers.origin = parsed.searchParams.get('origin');
        if (parsed.searchParams.get('ua')) headers['user-agent'] = parsed.searchParams.get('ua');
        return { url: inner, headers };
      }
    } catch {
      // Ignore malformed URLs
    }
  }
  return { url: rawUrl, headers: existingHeaders };
}

export async function fetchActiveScraperProviders({ forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && cachedProviders && now - cachedAt < CACHE_TTL_MS) {
    return cachedProviders;
  }

  if (!forceRefresh && inflightProvidersPromise) {
    return inflightProvidersPromise;
  }

  inflightProvidersPromise = (async () => {
    try {
      const response = await fetch(`${SCRAPER_API_BASE}/providers`, {
        headers: {
          Accept: 'application/json',
          ...getScraperAuthHeaders('providers', 'list'),
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const rawList = Array.isArray(data?.providers) ? data.providers : [];
      if (rawList.length > 0) {
        cachedProviders = rawList.map((p, index) => ({
          id: p.id,
          label: p.label || p.name || p.id,
          name: p.providerName || p.name || p.id,
          priority: p.priority ?? index,
          rank: p.rank ?? Math.max(100, 500 - index * 10),
          supportedContent: Array.isArray(p.supportedContent)
            ? p.supportedContent
            : ['movie', 'tv'],
          client: p.client !== undefined ? Boolean(p.client) : true,
        }));
        cachedAt = Date.now();
        return cachedProviders;
      }
    } catch (err) {
      console.warn('[ScraperConfig] Failed to fetch active providers, using fallback list:', err?.message);
    } finally {
      inflightProvidersPromise = null;
    }
    return cachedProviders || CLIENT_SCRAPER_CONFIG;
  })();

  return inflightProvidersPromise;
}

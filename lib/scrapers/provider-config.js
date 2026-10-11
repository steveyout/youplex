/**
 * Client-safe provider metadata for native player extractors.
 * Exposes all active enabled scrapers from @p-stream/providers in priority order.
 * Uses anonymous sci-fi/celestial aliases so internal scraper names are completely private.
 */

export const PROVIDER_CONFIG = [
  {
    id: 'icefy',
    label: 'Frost',
    priority: 0,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-dexter-1',
    label: 'Phantom',
    priority: 1,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-dexter-2',
    label: 'Apex',
    priority: 2,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-arrowtv-1',
    label: 'Nova',
    priority: 3,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-arrowtv-2',
    label: 'Zenith',
    priority: 4,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-pressplayz-1',
    label: 'Midnight',
    priority: 5,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-pressplayz-2',
    label: 'Quantum',
    priority: 6,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-rivestream-1',
    label: 'Nebula',
    priority: 7,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-rivestream-2',
    label: 'Arcane',
    priority: 8,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-sevenmovies-1',
    label: 'Horizon',
    priority: 9,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-sevenmovies-2',
    label: 'Solaris',
    priority: 10,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'tugaflix',
    label: 'Solstice',
    priority: 11,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-flixhq-1',
    label: 'Vortex',
    priority: 12,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-flixhq-2',
    label: 'Aether',
    priority: 13,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'fsonline',
    label: 'Aurora',
    priority: 14,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'hdrezka',
    label: 'Drift',
    priority: 15,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'animeflv',
    label: 'Vega',
    priority: 16,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'cuevana3',
    label: 'Atlas',
    priority: 17,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'fullhdfilmizle',
    label: 'Quasar',
    priority: 18,
    supportedContent: ['movie'],
  },
];

export const CLIENT_SCRAPER_CONFIG = PROVIDER_CONFIG.map(({ id, label, supportedContent }) => ({
  id,
  label,
  supportedContent,
}));

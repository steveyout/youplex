/**
 * Client-safe provider metadata for native player extractors.
 * Exposes all active enabled scrapers from @p-stream/providers in priority order.
 * Uses anonymous sci-fi/celestial aliases so internal scraper names are completely private.
 */

export const PROVIDER_CONFIG = [
  // YouPlex High-Performance Suite
  {
    id: 'yp-dexter-1',
    label: 'Phantom',
    priority: 0,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-dexter-2',
    label: 'Apex',
    priority: 1,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-arrowtv-1',
    label: 'Nova',
    priority: 2,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-arrowtv-2',
    label: 'Zenith',
    priority: 3,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-pressplayz-1',
    label: 'Midnight',
    priority: 4,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-pressplayz-2',
    label: 'Quantum',
    priority: 5,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-rivestream-1',
    label: 'Nebula',
    priority: 6,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-rivestream-2',
    label: 'Arcane',
    priority: 7,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-sevenmovies-1',
    label: 'Horizon',
    priority: 8,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-sevenmovies-2',
    label: 'Solaris',
    priority: 9,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-flixhq-1',
    label: 'Vortex',
    priority: 10,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-flixhq-2',
    label: 'Aether',
    priority: 11,
    supportedContent: ['movie', 'tv'],
  },
  // Universal Multi-Source Providers
  {
    id: 'vidlink',
    label: 'Nexus',
    priority: 12,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'icefy',
    label: 'Frost',
    priority: 13,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'fsharetv',
    label: 'Pulsar',
    priority: 14,
    supportedContent: ['movie'],
  },
  {
    id: 'ee3',
    label: 'Orbit',
    priority: 15,
    supportedContent: ['movie'],
  },
  {
    id: 'rgshows',
    label: 'Meridian',
    priority: 16,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'lookmovie',
    label: 'Polaris',
    priority: 17,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'tugaflix',
    label: 'Solstice',
    priority: 18,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'movies4f',
    label: 'Titan',
    priority: 19,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'fsonline',
    label: 'Aurora',
    priority: 20,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'zunime',
    label: 'Comet',
    priority: 21,
    supportedContent: ['tv'],
  },
  {
    id: 'animetsu',
    label: 'Eclipse',
    priority: 22,
    supportedContent: ['tv'],
  },
  {
    id: 'hdrezka',
    label: 'Drift',
    priority: 23,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'animeflv',
    label: 'Vega',
    priority: 24,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'cuevana3',
    label: 'Atlas',
    priority: 25,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'pelisplushd',
    label: 'Phoenix',
    priority: 26,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'fullhdfilmizle',
    label: 'Quasar',
    priority: 27,
    supportedContent: ['movie'],
  },
  {
    id: 'cinehdplus',
    label: 'Chronos',
    priority: 28,
    supportedContent: ['tv'],
  },
  {
    id: 'wecima',
    label: 'Mirage',
    priority: 29,
    supportedContent: ['movie', 'tv'],
  },
];

export const CLIENT_SCRAPER_CONFIG = PROVIDER_CONFIG.map(({ id, label, supportedContent }) => ({
  id,
  label,
  supportedContent,
}));

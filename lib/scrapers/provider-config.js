/**
 * Client-safe provider metadata for native player extractors.
 * Exposes all active enabled scrapers from @p-stream/providers in priority order.
 * Uses anonymous sci-fi/celestial aliases so internal scraper names are completely private.
 */

export const PROVIDER_CONFIG = [
  {
    id: 'yp-taroflix-1',
    label: 'Starkio',
    priority: 0,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-taroflix-2',
    label: 'Cipher',
    priority: 1,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-cinemaos-1',
    label: 'Screenscape',
    priority: 2,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-cinemaos-2',
    label: 'MovieBox',
    priority: 3,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-cno-1',
    label: 'Titan',
    priority: 4,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-cno-2',
    label: 'Aether',
    priority: 5,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-cinejoy-1',
    label: 'Aurora',
    priority: 6,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-cinejoy-2',
    label: 'Celestial',
    priority: 7,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-oneshows-1',
    label: 'Nova',
    priority: 8,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-oneshows-2',
    label: 'Zenith',
    priority: 9,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-cinecat-1',
    label: 'Shadow',
    priority: 10,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-cinecat-2',
    label: 'Lynx',
    priority: 11,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-pressplayz-1',
    label: 'Midnight',
    priority: 12,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-pressplayz-2',
    label: 'Quantum',
    priority: 13,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-arrowtv-1',
    label: 'Apex',
    priority: 14,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-arrowtv-2',
    label: 'Valkyrie',
    priority: 15,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-rivestream-1',
    label: 'Nebula',
    priority: 16,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-rivestream-2',
    label: 'Arcane',
    priority: 17,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-kaizoku-1',
    label: 'Vortex',
    priority: 18,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-kaizoku-2',
    label: 'Ronin',
    priority: 19,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-chillflix-1',
    label: 'Frost',
    priority: 20,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-chillflix-2',
    label: 'Solstice',
    priority: 21,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-zetmoon-1',
    label: 'Eclipse',
    priority: 22,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-zetmoon-2',
    label: 'Lunar',
    priority: 23,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-vidcore-1',
    label: 'Quasar',
    priority: 24,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-vidcore-2',
    label: 'Hyperion',
    priority: 25,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'fsonline',
    label: 'Horizon',
    priority: 26,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'hdrezka',
    label: 'Drift',
    priority: 27,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'animeflv',
    label: 'Vega',
    priority: 28,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'cuevana3',
    label: 'Atlas',
    priority: 29,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'fullhdfilmizle',
    label: 'Solaris',
    priority: 30,
    supportedContent: ['movie'],
  },
];

export const CLIENT_SCRAPER_CONFIG = PROVIDER_CONFIG.map(({ id, label, supportedContent }) => ({
  id,
  label,
  supportedContent,
}));

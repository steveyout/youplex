/**
 * Client-safe provider metadata for native player extractors.
 */

export const PROVIDER_CONFIG = [
  {
    id: 'yp-flixhq-1',
    label: 'Quantum',
    priority: 0,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'vidlink',
    label: 'VidLink',
    priority: 1,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-vidcore-1',
    label: 'Arcane',
    priority: 2,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-hdbox-1',
    label: 'Phantom',
    priority: 3,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-moviebox-1',
    label: 'Nebula',
    priority: 4,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'rgshows',
    label: 'Nova',
    priority: 5,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'icefy',
    label: 'Frost',
    priority: 6,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'movies4f',
    label: 'Titan',
    priority: 7,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'fsharetv',
    label: 'Apex',
    priority: 8,
    supportedContent: ['movie'],
  },
];

export const CLIENT_SCRAPER_CONFIG = PROVIDER_CONFIG.map(({ id, label }) => ({ id, label }));

/**
 * Client-safe provider metadata.
 *
 * Keep extractor implementations out of this module so browser bundles do
 * not include the server-only scraper and Playwright dependencies.
 */

export const PROVIDER_CONFIG = [
  {
    id: 'vidcore',
    label: 'VidCore',
    priority: 0,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'moviebox',
    label: 'MovieBox',
    priority: 2,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'flixhq',
    label: 'FlixHQ',
    priority: 5,
    supportedContent: ['movie', 'tv'],
  },
];

export const CLIENT_SCRAPER_CONFIG = PROVIDER_CONFIG.map(({ id, label }) => ({ id, label }));

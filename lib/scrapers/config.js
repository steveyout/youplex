/**
 * Scraper configuration.
 *
 * To add a new extractor:
 *   1. Create the function in services/myextractor.js
 *      Signature: (tmdbId, mediaType, season?, episode?) => {sources, subtitles}
 *   2. Import it here and add an entry to SCRAPER_CONFIG
 *
 * Priority: lower = tried first.
 * Set enabled: false to temporarily disable a provider.
 * supportedContent: which media types this provider handles.
 */

import { extractVidSrc } from './services/vidsrc';
import { extractVideasy } from './services/videasy';
import { extractVidCore } from './services/vidcore';
import { extractMultiEmbed } from './services/multiembed';

export const SCRAPER_CONFIG = [
  {
    id: 'videasy',
    label: 'Videasy',
    extractor: extractVideasy,
    priority: 0,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'multiembed',
    label: '2embed',
    extractor: extractMultiEmbed,
    priority: 10,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'vidsrc',
    label: 'VidSrc',
    extractor: extractVidSrc,
    priority: 20,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'vidcore',
    label: 'VidCore',
    extractor: extractVidCore,
    priority: 30,
    supportedContent: ['movie', 'tv'],
  },
];
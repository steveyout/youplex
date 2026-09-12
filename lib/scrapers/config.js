/**
 * Scraper configuration.
 *
 * Priority: lower = tried first.
 * Set enabled: false to temporarily disable a provider.
 * supportedContent: which media types this provider handles.
 */

import { extractVidSrc } from './services/vidsrc';
import { extractHdBox } from './services/hdbox';
import { extractSFlix } from './services/sflix';
import { extractHDToday } from './services/hdtoday';
import { extractVideasy } from './services/videasy';
import { extractVidCore } from './services/vidcore';
import { extractFlixHQz } from './services/flixhqz';
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
    id: 'hdbox',
    label: 'HdBox (MovieBox)',
    extractor: extractHdBox,
    priority: 2,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'flixhqz',
    label: 'FlixHQ',
    extractor: extractFlixHQz,
    priority: 5,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'hdtoday',
    label: 'HDToday',
    extractor: extractHDToday,
    priority: 7,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'sflix',
    label: 'SFlix',
    extractor: extractSFlix,
    priority: 9,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'multiembed',
    label: '2embed',
    extractor: extractMultiEmbed,
    priority: 15,
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

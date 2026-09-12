/**
 * FlixHQz extractor.
 *
 * Extraction chain (flixhqz.to player API):
 *   1. GET https://www.flixhqz.to/api/movie/{tmdbId} or /api/tv/{tmdbId}
 *   2. Parse response for server URLs and quality labels
 *   3. Bypass ad overlays via searchHelper integration
 *
 * Domains: www.flixhqz.to, flixhqz.to
 */

import { fetchJSON, DEFAULT_UA } from '../utils';

const API_BASES = ['https://www.flixhqz.to', 'https://flixhqz.to'];

async function fetchSourcesRound(base, params) {
  try {
    return await fetchJSON(`${base}/api/movie/${params.get('id')}`, {
      headers: {
        'User-Agent': DEFAULT_UA,
        Referer: `${base}/`,
        Origin: base,
        Accept: 'application/json',
      },
    });
  } catch {
    return null;
  }
}

export async function extractFlixHQz(tmdbId, mediaType = 'movie') {
  const empty = { sources: [], subtitles: [] };

  try {
    const type = mediaType === 'tv' ? 'tv' : 'movie';
    const allSources = [];
    const seenUrls = new Set();

    for (const base of API_BASES) {
      const params = new URLSearchParams({ id: String(tmdbId), type });

      const data = await fetchSourcesRound(base, params);
      if (!data?.sources?.length) continue;

      for (const s of data.sources || []) {
        if (!s.url || seenUrls.has(s.url)) continue;
        seenUrls.add(s.url);

        allSources.push({
          url: s.url,
          quality: s.quality || 'Auto',
          type: 'hls',
          title: `FlixHQz ${s.quality || ''}`,
          referer: `${base}/`,
          requiresSegmentProxy: true,
        });
      }

      break; // one working base is enough
    }

    return { sources: allSources, subtitles: [] };
  } catch {
    return empty;
  }
}

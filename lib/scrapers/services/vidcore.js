/**
 * VidCore extractor.
 *
 * Reverse-engineered extraction chain (vidcore.org player API):
 *   1. GET https://www.vidcore.org/api/sources?id={tmdb}&type=movie|tv
 *      → parallel-first-fastest provider race; returns nested sources
 *   2. Optional follow-up with skip={labels} to collect more servers
 *   3. Map nested data.sources[] → StreamSource (+ headers/referer)
 *
 * Domains: www.vidcore.org, vidcore.org
 */

import { fetchJSON, DEFAULT_UA } from '../utils';

// ── Constants ────────────────────────────────────────────────

const API_BASES = ['https://www.vidcore.org', 'https://vidcore.org'];

/** How many skip-rounds to collect additional servers beyond the fastest. */
const MAX_ROUNDS = 4;

// ── Helpers ──────────────────────────────────────────────────

function mapType(type, url) {
  const t = (type || '').toLowerCase();
  if (t === 'dash' || t === 'mpd' || (url || '').includes('.mpd')) return 'dash';
  if (t === 'mp4' || (url || '').includes('.mp4')) return 'mp4';
  return 'hls';
}

function flattenSources(outer, apiBase) {
  /** @type {import('../types').StreamSource[]} */
  const sources = [];
  /** @type {import('../types').SubtitleTrack[]} */
  const subtitles = [];
  const labels = [];
  const seenUrl = new Set();
  const seenSub = new Set();

  for (const o of outer || []) {
    if (o.label) labels.push(o.label);

    const inners =
      o.data?.sources ||
      o.sources ||
      (o.url ? [{ url: o.url, type: o.type, quality: o.quality, headers: o.headers }] : []);

    const label = o.label || o.provider || o.server || 'VidCore';

    for (const s of inners) {
      if (!s.url || seenUrl.has(s.url)) continue;
      seenUrl.add(s.url);

      const headers = s.headers || o.headers || {};
      const referer = headers.Referer || headers.referer || `${apiBase}/`;

      sources.push({
        url: s.url,
        quality: s.quality || o.quality || 'Auto',
        type: mapType(s.type || o.type, s.url),
        title: `VidCore ${label}${s.quality ? ` · ${s.quality}` : ''}`,
        referer,
        origin: headers.Origin || headers.origin,
        userAgent: headers['User-Agent'] || headers['user-agent'],
        requiresSegmentProxy: s.direct === false,
      });
    }

    const subs = o.data?.subtitles || [];
    for (const sub of subs) {
      const url = sub.url || sub.file;
      if (!url || seenSub.has(url)) continue;
      seenSub.add(url);
      subtitles.push({
        url,
        language: sub.lang || sub.language || 'und',
        label: sub.label || sub.language || sub.lang || 'Unknown',
      });
    }
  }

  return { sources, subtitles, labels };
}

async function fetchSourcesRound(base, params) {
  try {
    return await fetchJSON(`${base}/api/sources?${params}`, {
      headers: {
        'User-Agent': DEFAULT_UA,
        Referer: `${base}/embed/movie/${params.get('id') || ''}`,
        Origin: base,
        Accept: 'application/json',
      },
    });
  } catch {
    return null;
  }
}

// ── Main Extractor ───────────────────────────────────────────

/**
 * @param {number} tmdbId
 * @param {string} [mediaType]
 * @param {number} [season]
 * @param {number} [episode]
 * @returns {Promise<{sources: import('../types').StreamSource[], subtitles: import('../types').SubtitleTrack[]}>}
 */
export async function extractVidCore(tmdbId, mediaType = 'movie', season, episode) {
  const empty = { sources: [], subtitles: [] };

  try {
    const type = mediaType === 'tv' ? 'tv' : 'movie';
    /** @type {import('../types').StreamSource[]} */
    const allSources = [];
    /** @type {import('../types').SubtitleTrack[]} */
    const allSubtitles = [];
    const seenUrls = new Set();
    const seenSubs = new Set();
    const skipped = new Set();

    for (const base of API_BASES) {
      const params = new URLSearchParams({ id: String(tmdbId), type });
      if (type === 'tv') {
        if (season !== undefined) params.set('season', String(season));
        if (episode !== undefined) params.set('episode', String(episode));
      }

      const data = await fetchSourcesRound(base, params);
      if (!data?.sources?.length) continue;

      const flat = flattenSources(data.sources, base);
      for (const s of flat.sources) {
        if (seenUrls.has(s.url)) continue;
        seenUrls.add(s.url);
        allSources.push(s);
      }
      for (const sub of flat.subtitles) {
        if (seenSubs.has(sub.url)) continue;
        seenSubs.add(sub.url);
        allSubtitles.push(sub);
      }
      for (const l of flat.labels) skipped.add(l);

      // Collect more servers via skip rounds (API is parallel-first-fastest)
      for (let round = 1; round < MAX_ROUNDS && skipped.size < 12; round++) {
        const p2 = new URLSearchParams({ id: String(tmdbId), type });
        if (type === 'tv') {
          if (season !== undefined) p2.set('season', String(season));
          if (episode !== undefined) p2.set('episode', String(episode));
        }
        if (skipped.size) p2.set('skip', Array.from(skipped).join(','));

        const more = await fetchSourcesRound(base, p2);
        if (!more?.sources?.length) break;

        const f2 = flattenSources(more.sources, base);
        let added = 0;
        for (const s of f2.sources) {
          if (seenUrls.has(s.url)) continue;
          seenUrls.add(s.url);
          allSources.push(s);
          added++;
        }
        for (const sub of f2.subtitles) {
          if (seenSubs.has(sub.url)) continue;
          seenSubs.add(sub.url);
          allSubtitles.push(sub);
        }
        for (const l of f2.labels) skipped.add(l);
        if (added === 0) break;
      }

      break; // one working base is enough
    }

    // Fallback: try RSC token path on vidcore.net (legacy 2embed VCR host)
    if (!allSources.length) {
      const netSources = await tryVidcoreNet(tmdbId, mediaType, season, episode);
      allSources.push(...netSources);
    }

    return { sources: allSources, subtitles: allSubtitles };
  } catch {
    return empty;
  }
}

/**
 * Legacy fallback: grab RSC player config from vidcore.net.
 * Stream API is obfuscated in the player bundle; currently returns empty
 * unless m3u8 appears in the page (rare).
 * @param {number} tmdbId
 * @param {string} mediaType
 * @param {number} [season]
 * @param {number} [episode]
 * @returns {Promise<import('../types').StreamSource[]>}
 */
async function tryVidcoreNet(tmdbId, mediaType, season, episode) {
  const BASE = 'https://vidcore.net';
  const path =
    mediaType === 'tv'
      ? `/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}`
      : `/movie/${tmdbId}`;
  const query = mediaType === 'movie' ? '?autoplay=true' : '';

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(`${BASE}${path}${query}`, {
      headers: {
        'User-Agent': DEFAULT_UA,
        RSC: '1',
        Accept: 'text/x-component',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const text = await res.text();

    const m3u8 = text.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/g);
    if (m3u8?.length) {
      return m3u8.map((url) => ({
        url,
        quality: 'Auto',
        type: 'hls',
        title: 'VidCore.net',
        referer: `${BASE}/`,
      }));
    }
  } catch {
    // ignore
  }
  return [];
}
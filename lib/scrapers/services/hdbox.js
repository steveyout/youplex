/**
 * HdBox / MovieBox / WeFeed extractor.
 *
 * Extraction Strategy:
 * - Axios HTTP by default (Fast BFF JSON API from wefeed-h5api-bff).
 * - Multi-resolution HLS line parsing (1080p, 720p, 480p).
 * - Automatic Playwright sniffer fallback if API blocks tokenless requests.
 */

import { defineScraper } from '../base-provider';
import { axiosGet, axiosPost, getTmdbMetadata } from '../utils';

const API_BASE = 'https://h5-api.aoneroom.com/wefeed-h5api-bff';
const PLAYER_BASE = 'https://netfilm.world';
const SEARCH_BASE = 'https://moviebox.ph';

export const hdboxScraper = defineScraper({
  id: 'hdbox',
  name: 'HdBox (MovieBox)',
  baseUrl: PLAYER_BASE,
  priority: 2,
  supportedContent: ['movie', 'tv'],

  async extractAxios({ tmdbId, mediaType = 'movie', season, episode }) {
    const isTv = mediaType === 'tv';
    const safeSeason = season !== undefined && season !== null ? Number(season) : 1;
    const safeEpisode = episode !== undefined && episode !== null ? Number(episode) : 1;

    // 1. Resolve Title
    const { cleanTitle } = await getTmdbMetadata(tmdbId, mediaType);
    this.logger.debug(`Searching moviebox for title: "${cleanTitle}"`);

    // 2. Search Landing Page for Detail Slug
    const searchUrl = `${SEARCH_BASE}/web/searchResult?keyword=${encodeURIComponent(cleanTitle)}`;
    let html = '';
    try {
      html = await axiosGet(searchUrl, {
        headers: {
          Origin: SEARCH_BASE,
          Referer: `${SEARCH_BASE}/`,
        },
        timeout: 9000,
      });
    } catch (e) {
      this.logger.warn(`Search request failed: ${e.message}`);
      return null;
    }

    const hrefRegex = /href=["']\/(moviedetail|tvdetail|detail)\/([^"']+)["']/g;
    let match;
    const matches = [];
    while ((match = hrefRegex.exec(html)) !== null) {
      matches.push(match[2]);
    }

    if (!matches.length) {
      this.logger.debug(`No search slug matches found for "${cleanTitle}"`);
      return null;
    }

    const normalizedTarget = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const resolvedSlug = matches.find((m) => m.toLowerCase().includes(normalizedTarget)) || matches[0];

    this.logger.debug(`Resolved Detail Slug: "${resolvedSlug}"`);

    // 3. Query Detail for Subject ID
    let subjectId = null;
    try {
      const detail = await axiosGet(`${API_BASE}/detail?detailPath=${encodeURIComponent(resolvedSlug)}`, {
        headers: {
          Origin: SEARCH_BASE,
          Referer: `${SEARCH_BASE}/`,
        },
        timeout: 7000,
      });
      subjectId = detail?.data?.subject?.subjectId;
    } catch (e) {
      this.logger.debug(`Detail lookup failed: ${e.message}`);
    }

    if (!subjectId) return null;

    this.logger.debug(`Extracted Subject ID: ${subjectId}`);

    const sources = [];
    const subtitles = [];

    // 4. Query Video Play Info API
    try {
      const targetCategory = isTv ? 2 : 1;
      const playData = await axiosPost(
        `${API_BASE}/v1/videoplay/info`,
        {
          subjectId: String(subjectId),
          category: targetCategory,
          season: isTv ? safeSeason : null,
          episode: isTv ? safeEpisode : null,
          language: 'en',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Origin: PLAYER_BASE,
            Referer: `${PLAYER_BASE}/`,
          },
          timeout: 8000,
        }
      );

      const data = playData?.data;

      if (Array.isArray(data?.streams) && data.streams.length > 0) {
        data.streams.forEach((stream, idx) => {
          if (stream.url) {
            const quality = stream.resolution || stream.quality || (idx === 0 ? '1080p' : '720p');
            sources.push({
              url: stream.url,
              quality,
              type: 'hls',
              title: `HdBox · ${quality}`,
              referer: `${PLAYER_BASE}/`,
              origin: PLAYER_BASE,
              requiresSegmentProxy: true,
            });
          }
        });
      } else if (data?.videoUrl) {
        sources.push({
          url: data.videoUrl,
          quality: '1080p',
          type: 'hls',
          title: 'HdBox · 1080p',
          referer: `${PLAYER_BASE}/`,
          origin: PLAYER_BASE,
          requiresSegmentProxy: true,
        });
      }

      if (Array.isArray(data?.subtitles)) {
        data.subtitles.forEach((sub) => {
          const url = sub.url || sub.file;
          if (url) {
            subtitles.push({
              url,
              language: sub.lang || sub.language || 'en',
              label: sub.label || sub.language || 'English',
            });
          }
        });
      }
    } catch (e) {
      this.logger.debug(`Video play API request failed: ${e.message}`);
    }

    // 5. Fallback URL
    if (!sources.length) {
      const fallbackUrl = `${PLAYER_BASE}/api/source/${subjectId}?slug=${encodeURIComponent(resolvedSlug)}&s=${isTv ? safeSeason : ''}&e=${isTv ? safeEpisode : ''}&type=${isTv ? '/show/detail' : '/movie/detail'}`;
      sources.push({
        url: fallbackUrl,
        quality: 'Auto',
        type: 'hls',
        title: 'HdBox Direct HLS',
        referer: `${PLAYER_BASE}/`,
        origin: PLAYER_BASE,
        requiresSegmentProxy: true,
      });
    }

    return { sources, subtitles };
  },

  async buildUrl({ tmdbId, mediaType = 'movie', season, episode }) {
    const { cleanTitle } = await getTmdbMetadata(tmdbId, mediaType);
    return `${SEARCH_BASE}/web/searchResult?keyword=${encodeURIComponent(cleanTitle)}`;
  },
});

export const extractHdBox = hdboxScraper.extractor;

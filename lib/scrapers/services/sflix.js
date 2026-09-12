/**
 * SFlix extractor.
 *
 * Extraction Strategy:
 * - Axios HTTP by default (Searches sflix.ps / sflix2.to AJAX endpoints).
 * - Automatic Playwright sniffer fallback if AJAX handshake requires browser evaluation.
 */

import { defineScraper } from '../base-provider';
import { axiosGet, getTmdbMetadata } from '../utils';

const DOMAINS = ['https://sflix.ps', 'https://sflix2.to'];

export const sflixScraper = defineScraper({
  id: 'sflix',
  name: 'SFlix',
  baseUrl: 'https://sflix.ps',
  priority: 9,
  supportedContent: ['movie', 'tv'],

  async extractAxios({ tmdbId, mediaType = 'movie', season, episode }) {
    const { cleanTitle } = await getTmdbMetadata(tmdbId, mediaType);
    const isTv = mediaType === 'tv';

    for (const base of DOMAINS) {
      try {
        const searchSlug = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const searchUrl = `${base}/search/${encodeURIComponent(searchSlug)}`;

        this.logger.debug(`Searching ${base} for "${searchSlug}"`);
        const searchHtml = await axiosGet(searchUrl, {
          headers: { Referer: `${base}/` },
          timeout: 7000,
        });

        const itemRegex = new RegExp(`href="\\/(${isTv ? 'tv' : 'movie'}\\/watch-[^"]+)"`, 'i');
        const match = searchHtml.match(itemRegex);
        if (!match) continue;

        const watchPath = match[1];
        const watchUrl = `${base}/${watchPath}`;
        const watchHtml = await axiosGet(watchUrl, {
          headers: { Referer: `${base}/` },
          timeout: 7000,
        });

        const idMatch = watchHtml.match(/data-id="(\d+)"/i) || watchPath.match(/-(\d+)$/);
        if (!idMatch) continue;
        const mediaId = idMatch[1];

        const epData = await axiosGet(`${base}/ajax/episode/list/${mediaId}`, {
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            Referer: watchUrl,
          },
          timeout: 7000,
        });

        if (!epData?.html) continue;

        let targetEpId = null;
        if (isTv && episode) {
          const epRegex = new RegExp(`data-number="${episode}"[^>]*data-id="(\\d+)"`, 'i');
          const epMatch = epData.html.match(epRegex) || epData.html.match(/data-id="(\d+)"/);
          targetEpId = epMatch ? epMatch[1] : null;
        } else {
          const firstEpMatch = epData.html.match(/data-id="(\d+)"/);
          targetEpId = firstEpMatch ? firstEpMatch[1] : null;
        }

        if (!targetEpId) continue;

        const serverData = await axiosGet(`${base}/ajax/episode/servers/${targetEpId}`, {
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            Referer: watchUrl,
          },
          timeout: 7000,
        });

        if (!serverData?.html) continue;

        const serverIds = Array.from(serverData.html.matchAll(/data-id="(\d+)"/g), (m) => m[1]);
        const sources = [];

        for (const sId of serverIds.slice(0, 3)) {
          try {
            const srcData = await axiosGet(`${base}/ajax/episode/sources/${sId}`, {
              headers: {
                'X-Requested-With': 'XMLHttpRequest',
                Referer: watchUrl,
              },
              timeout: 6000,
            });

            if (srcData?.link) {
              sources.push({
                url: srcData.link,
                quality: 'Auto',
                type: srcData.link.includes('.mp4') ? 'mp4' : 'hls',
                title: 'SFlix Stream',
                referer: `${base}/`,
                origin: base,
                requiresSegmentProxy: true,
              });
            }
          } catch {
            // continue
          }
        }

        if (sources.length > 0) {
          return { sources, subtitles: [] };
        }
      } catch (err) {
        this.logger.debug(`Domain ${base} error: ${err.message}`);
      }
    }

    return null;
  },

  async buildUrl({ tmdbId, mediaType = 'movie' }) {
    const { cleanTitle } = await getTmdbMetadata(tmdbId, mediaType);
    const searchSlug = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `https://sflix.ps/search/${encodeURIComponent(searchSlug)}`;
  },

  async customLogic(page) {
    try {
      await page.waitForSelector('video, .jw-video', { timeout: 12000 }).catch(() => {});
      await page.mouse.click(640, 360).catch(() => {});
      await page.waitForTimeout(5000);
    } catch {
      // ignore
    }
  },
});

export const extractSFlix = sflixScraper.extractor;

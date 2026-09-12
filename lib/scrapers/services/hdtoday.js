/**
 * HDToday extractor.
 *
 * Extraction Strategy:
 * - Axios HTTP by default (Searches hdtodayz.to / hdtoday.tv AJAX endpoints).
 * - Automatic Playwright sniffer fallback if Cloudflare / CAPTCHA is triggered.
 */

import { defineScraper } from '../base-provider';
import { axiosGet, getTmdbMetadata } from '../utils';

const DOMAINS = ['https://hdtodayz.to', 'https://hdtoday.tv'];

export const hdtodayScraper = defineScraper({
  id: 'hdtoday',
  name: 'HDToday',
  baseUrl: 'https://hdtodayz.to',
  priority: 7,
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
                title: 'HDToday Stream',
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
        this.logger.debug(`Domain ${base} search error: ${err.message}`);
      }
    }

    return null;
  },

  async buildUrl({ tmdbId, mediaType = 'movie' }) {
    const { cleanTitle } = await getTmdbMetadata(tmdbId, mediaType);
    const searchSlug = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `https://hdtodayz.to/search/${encodeURIComponent(searchSlug)}`;
  },

  async customLogic(page, sniffer, { mediaType = 'movie', episode }) {
    try {
      await page.waitForSelector('.btn-play', { timeout: 10000 });
      await page.click('.btn-play');

      if (mediaType === 'tv' && episode) {
        await page.waitForSelector(`.episode-item[data-number="${episode}"]`, { timeout: 5000 }).catch(() => {});
        await page.click(`.episode-item[data-number="${episode}"]`).catch(() => {});
      }
      await page.waitForTimeout(4000);
    } catch {
      // ignore
    }
  },
});

export const extractHDToday = hdtodayScraper.extractor;

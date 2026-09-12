/**
 * Example Template for Adding New Scrapers to Youplex.
 *
 * How to add a new scraper in 3 steps:
 * 1. Copy this file into `lib/scrapers/services/myservice.js`
 * 2. Implement `extractAxios` (for fast REST API / HTML parsing)
 *    and/or `extractPlaywright` (for browser sniffing / JS execution).
 * 3. Register your scraper in `lib/scrapers/config.js`.
 */

import { getTmdbMetadata } from '../utils';
import { defineScraper } from '../base-provider';

export const myNewScraper = defineScraper({
  // Unique identifier
  id: 'myservice',

  // Human-readable name (displayed in player and server switcher)
  name: 'My Service',

  // Base URL of the provider
  baseUrl: 'https://example.com',

  // Priority (lower = tried earlier in cascade)
  priority: 10,

  // Supported media types
  supportedContent: ['movie', 'tv'],

  /**
   * STEP 1: Fast Axios HTTP Extraction (Tried First)
   * Return `{ sources: [...], subtitles: [...] }` or `null` to trigger Playwright fallback.
   */
  async extractAxios({ tmdbId, mediaType = 'movie', season, episode }) {
    // 1. Get clean title & year from TMDB
    const { cleanTitle, year, imdbId } = await getTmdbMetadata(tmdbId, mediaType);
    this.logger.debug(`Searching for ${cleanTitle} (${year})`);

    // 2. Perform Axios GET / POST requests
    // const data = await axiosGet(`https://api.example.com/search?q=${encodeURIComponent(cleanTitle)}`);

    // 3. Return stream sources & subtitles
    return {
      sources: [
        /*
        {
          url: 'https://example-cdn.com/master.m3u8',
          quality: '1080p',
          type: 'hls', // 'hls' | 'mp4' | 'dash'
          title: 'My Service 1080p',
          referer: 'https://example.com/',
          requiresSegmentProxy: true,
        }
        */
      ],
      subtitles: [
        /*
        {
          url: 'https://example.com/subs/en.vtt',
          label: 'English',
          language: 'en',
        }
        */
      ],
    };
  },

  /**
   * STEP 2: Optional Playwright Navigation & Sniffer (Fallback)
   * Automatically triggered if Axios finds no streams and Playwright is available.
   */
  async buildUrl({ tmdbId, mediaType = 'movie', season, episode }) {
    const { cleanTitle } = await getTmdbMetadata(tmdbId, mediaType);
    const slug = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `https://example.com/watch/${slug}`;
  },

  /**
   * Optional custom click / DOM interaction before sniffing
   */
  async customLogic(page, sniffer, { mediaType, season, episode }) {
    // e.g. click play button or choose server
    // await page.click('.play-button').catch(() => {});
  },
});

export const extractMyService = myNewScraper.extractor;

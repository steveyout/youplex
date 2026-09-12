/**
 * Base Scraper Provider Framework.
 *
 * Architecture:
 * - Axios HTTP by default for lightning-fast serverless/Node extraction.
 * - Automatic graceful fallback to Playwright headless sniffer when HTTP fails or streams are JS-obfuscated.
 * - Unified logging, debugging, timing, and error diagnostic metrics.
 * - Simple extensible API for easily creating new scrapers.
 */

import { browserManager } from './browser-manager';
import { createLogger, getTmdbMetadata } from './utils';

export class BaseProvider {
  /**
   * @param {Object} options
   * @param {string} options.id Unique ID (e.g. 'hdbox')
   * @param {string} options.name Display name (e.g. 'HdBox')
   * @param {string} [options.baseUrl] Primary site URL
   * @param {number} [options.priority] Priority order (lower = tried first)
   * @param {Array<'movie'|'tv'>} [options.supportedContent]
   * @param {(request: import('./types').ExtractionRequest) => Promise<any>} [options.extractAxios]
   * @param {(request: import('./types').ExtractionRequest) => Promise<any>} [options.extractPlaywright]
   * @param {(request: import('./types').ExtractionRequest) => Promise<string|null>} [options.buildUrl]
   * @param {(page: any, sniffer: any, request: any) => Promise<void>} [options.customLogic]
   */
  constructor(options) {
    this.id = options.id;
    this.name = options.name;
    this.baseUrl = options.baseUrl || '';
    this.priority = options.priority !== undefined ? options.priority : 10;
    this.supportedContent = options.supportedContent || ['movie', 'tv'];
    this.customAxiosHandler = options.extractAxios;
    this.customPlaywrightHandler = options.extractPlaywright;
    this.customUrlBuilder = options.buildUrl;
    this.customLogicHandler = options.customLogic;
    this.logger = createLogger(this.name);
  }

  /**
   * Main entry point called by the scraper runner.
   * Executes Axios HTTP first, then falls back to Playwright if needed.
   *
   * @param {import('./types').ExtractionRequest} request
   * @returns {Promise<import('./types').ExtractionResult>}
   */
  async extract(request) {
    const startTime = Date.now();
    const { tmdbId, mediaType = 'movie', season, episode } = request;

    this.logger.info(`Extracting ${mediaType.toUpperCase()} (TMDB: ${tmdbId}${mediaType === 'tv' ? ` S${season || 1}E${episode || 1}` : ''})`);

    const axiosResult = await this.extractAxiosPhase(request);
    if (axiosResult.success) return axiosResult;

    const playwrightResult = await this.extractPlaywrightPhase(request, startTime);
    if (playwrightResult.success) return playwrightResult;

    return playwrightResult.error ? playwrightResult : axiosResult;
  }

  /**
   * Run only the fast HTTP/Axios phase.
   *
   * @param {import('./types').ExtractionRequest} request
   * @returns {Promise<import('./types').ExtractionResult>}
   */
  async extractAxiosPhase(request) {
    const startTime = Date.now();
    try {
      this.logger.debug('Attempting fast Axios HTTP extraction...');
      const axiosResult = await this.extractAxios(request);

      if (axiosResult?.sources?.length) {
        return this.successResult(axiosResult, startTime, 'Axios');
      }
      this.logger.debug('Axios extraction returned 0 streams.');
    } catch (axiosErr) {
      this.logger.warn(`Axios extraction error: ${axiosErr.message}`);
    }

    return {
      success: false,
      sources: [],
      subtitles: [],
      provider: this.id,
      error: `No Axios stream found for ${this.name}`,
      timing: Date.now() - startTime,
    };
  }

  /**
   * Run only the Playwright fallback phase.
   *
   * @param {import('./types').ExtractionRequest} request
   * @param {number} [startedAt]
   * @returns {Promise<import('./types').ExtractionResult>}
   */
  async extractPlaywrightPhase(request, startedAt = Date.now()) {
    if (!browserManager.hasPlaywright()) {
      this.logger.debug('Playwright is not available in this environment; skipping browser fallback.');
      return {
        success: false,
        sources: [],
        subtitles: [],
        provider: this.id,
        error: `No playable stream found for ${this.name}`,
        timing: Date.now() - startedAt,
      };
    }

    try {
      this.logger.info('🚀 Shifting to Playwright headless browser sniffer fallback...');
      const pwResult = await this.extractPlaywright(request);

      if (pwResult?.sources?.length) {
        return this.successResult(pwResult, startedAt, 'Playwright');
      }
    } catch (pwErr) {
      this.logger.warn(`Playwright extraction error: ${pwErr.message}`);
    }

    return {
      success: false,
      sources: [],
      subtitles: [],
      provider: this.id,
      error: `No playable stream found for ${this.name}`,
      timing: Date.now() - startedAt,
    };
  }

  successResult(result, startedAt, method) {
    const timing = Date.now() - startedAt;
    this.logger.info(`✅ ${method} extraction successful with ${result.sources.length} source(s) in ${timing}ms`);

    for (const source of result.sources) {
      this.logger.streamFound(source.url, source.quality);
    }

    return {
      success: true,
      sources: this.normalizeSources(result.sources),
      subtitles: result.subtitles || [],
      provider: this.id,
      timing,
    };
  }

  /**
   * Fast HTTP / Axios extraction logic.
   * @param {import('./types').ExtractionRequest} request
   * @returns {Promise<{sources: import('./types').StreamSource[], subtitles?: import('./types').SubtitleTrack[]}|null>}
   */
  async extractAxios(request) {
    if (this.customAxiosHandler) {
      return this.customAxiosHandler.call(this, request);
    }
    this.logger.debug('No custom Axios extraction handler implemented.');
    return null;
  }

  /**
   * Playwright sniffing extraction logic.
   * By default, builds a URL via this.buildUrl() and sniffs for stream requests.
   * @param {import('./types').ExtractionRequest} request
   * @returns {Promise<{sources: import('./types').StreamSource[], subtitles?: import('./types').SubtitleTrack[]}|null>}
   */
  async extractPlaywright(request) {
    if (this.customPlaywrightHandler) {
      return this.customPlaywrightHandler.call(this, request);
    }

    const targetUrl = await this.buildUrl(request);
    if (!targetUrl) return null;

    this.logger.debug(`Navigating Playwright to: ${targetUrl}`);

    const result = await browserManager.sniffStream({
      targetUrl,
      providerName: this.name,
      timeoutMs: 25000,
      customLogic: this.customLogicHandler
        ? (page, sniffer) => this.customLogicHandler.call(this, page, sniffer, request)
        : undefined,
    });

    if (!result?.url) return null;

    const sources = [
      {
        url: result.url,
        quality: 'Auto',
        type: result.url.includes('.mp4') ? 'mp4' : 'hls',
        title: `${this.name} Stream`,
        referer: result.headers.Referer || this.baseUrl,
        origin: result.headers.Origin,
        requiresSegmentProxy: true,
      },
    ];

    const subtitles = (result.subtitles || []).map((s) => ({
      url: s.url,
      label: s.label || 'CC',
      language: 'en',
    }));

    return { sources, subtitles };
  }

  /**
   * Build target URL for Playwright navigation.
   * @param {import('./types').ExtractionRequest} request
   * @returns {Promise<string|null>}
   */
  async buildUrl(request) {
    if (this.customUrlBuilder) {
      return this.customUrlBuilder.call(this, request);
    }
    if (!this.baseUrl) return null;
    const { cleanTitle } = await getTmdbMetadata(request.tmdbId, request.mediaType);
    const slug = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (request.mediaType === 'tv') {
      return `${this.baseUrl}/tv/watch-${slug}-${request.season || 1}-${request.episode || 1}`;
    }
    return `${this.baseUrl}/movie/watch-${slug}`;
  }

  /**
   * Ensure all stream sources have required default properties.
   * @param {import('./types').StreamSource[]} sources
   * @returns {import('./types').StreamSource[]}
   */
  normalizeSources(sources) {
    return sources.map((s) => ({
      ...s,
      quality: s.quality || 'Auto',
      type: s.type || (s.url.includes('.mp4') ? 'mp4' : 'hls'),
      title: s.title || `${this.name} Stream`,
      requiresSegmentProxy: s.requiresSegmentProxy !== false,
      referer: s.referer || (this.baseUrl ? `${this.baseUrl}/` : undefined),
    }));
  }
}

/**
 * Functional helper to define a new scraper quickly.
 *
 * @example
 * export const myScraper = defineScraper({
 *   id: 'mysource',
 *   name: 'MySource',
 *   priority: 5,
 *   extractAxios: async function(req) {
 *     // custom Axios logic
 *     return { sources: [...], subtitles: [...] };
 *   },
 * });
 */
export function defineScraper(config) {
  const instance = new BaseProvider(config);
  const extractor = (tmdbId, mediaType, season, episode) =>
    instance.extract({ tmdbId, mediaType, season, episode });

  extractor.extractAxiosPhase = (request) => instance.extractAxiosPhase(request);
  extractor.extractPlaywrightPhase = (request) => instance.extractPlaywrightPhase(request);

  return {
    ...config,
    providerInstance: instance,
    extractor,
  };
}

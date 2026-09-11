/**
 * Provider factory — one function that turns a config entry into a full
 * provider object (mirrors Flyx's BaseProvider contract).
 */

/**
 * Wrap a config entry (see config.js) into an extractable provider.
 * @param {{id:string, extractor:Function, priority?:number, supportedContent?:Array, enabledFn?:()=>boolean}} entry
 */
export function createProvider(entry) {
  /** @type {import('./types').ContentCategory[]} */
  const supportedContent = entry.supportedContent || ['movie', 'tv'];

  return {
    /** @type {string} */
    name: entry.id,
    /** @type {number} Lower = tried first. */
    priority: entry.priority ?? 100,
    /** @type {boolean} */
    enabled: typeof entry.enabled === 'function' ? entry.enabled() : entry.enabled !== false,
    supportedContent,
    /** @type {Function} The raw extractor service: (tmdbId, mediaType, season, episode) => {sources, subtitles} */
    extractor: entry.extractor,

    /**
     * Run extraction, normalising the result to the Flyx ExtractionResult shape.
     * @param {import('./types').ExtractionRequest} request
     * @returns {Promise<import('./types').ExtractionResult>}
     */
    async extract(request) {
      const started = Date.now();
      try {
        const result = await entry.extractor(
          request.tmdbId,
          request.mediaType,
          request.season,
          request.episode,
        );
        const sources = Array.isArray(result?.sources) ? result.sources : [];
        const subtitles = Array.isArray(result?.subtitles) ? result.subtitles : [];
        return {
          success: sources.length > 0,
          sources,
          subtitles,
          provider: entry.id,
          timing: Date.now() - started,
        };
      } catch (e) {
        return {
          success: false,
          sources: [],
          subtitles: [],
          provider: entry.id,
          error: e?.message || 'Unknown error',
          timing: Date.now() - started,
        };
      }
    },

    /**
     * @param {string} mediaType
     * @returns {boolean}
     */
    supportsContent(mediaType) {
      return this.supportedContent.includes(mediaType);
    },
  };
}
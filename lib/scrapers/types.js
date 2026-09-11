/**
 * Shared types for the youplex scraping layer.
 *
 * These mirror Flyx's `@flyx/core` provider types so every extractor and
 * provider agrees on one shape. Editing a shape here updates everywhere.
 */

/**
 * @typedef {Object} StreamSource
 * @property {string} url Direct or proxied stream URL (HLS .m3u8 or MPEG-DASH .mpd).
 * @property {string} quality Display quality label (e.g. "1080p", "4K", "Auto").
 * @property {'hls'|'dash'|'mp4'} type Stream container type.
 * @property {string} [title] Display title for the source (e.g. "Server 1").
 * @property {string} [language] Language for dubbed/subtitled streams.
 * @property {boolean} [requiresSegmentProxy] Whether segments need proxying.
 * @property {string} [tokenUrl] URL to fetch IP-bound tokens from (VidSrc).
 * @property {string} [referer] Referer header required by the CDN.
 * @property {string} [origin] Origin header required by the CDN.
 * @property {string} [userAgent] User-agent override for this source.
 * @property {number} [status] HTTP status of the source URL when last checked.
 * @property {{start:number,end:number}} [skipIntro] Intro skip range in seconds.
 * @property {{start:number,end:number}} [skipOutro] Outro skip range in seconds.
 * @property {boolean} [isHevc] Whether this source is HEVC encoded.
 */

/**
 * @typedef {Object} SubtitleTrack
 * @property {string} label Display label (e.g. "English", "Spanish [CC]").
 * @property {string} url URL to the subtitle file (.vtt or .srt).
 * @property {string} language ISO 639-1 language code.
 * @property {boolean} [isCC] Whether these are closed captions.
 */

/**
 * @typedef {Object} ExtractionRequest
 * @property {number} tmdbId TMDB ID for movies and TV shows.
 * @property {'movie'|'tv'} mediaType Content media type.
 * @property {number} [season] Season number (TV only).
 * @property {number} [episode] Episode number (TV only).
 * @property {number} [malId] MyAnimeList ID (anime only).
 * @property {string} [title] Title for provider-specific lookups.
 */

/**
 * @typedef {Object} ExtractionResult
 * @property {boolean} success Whether extraction succeeded and sources were found.
 * @property {StreamSource[]} sources Available stream sources (empty on failure).
 * @property {SubtitleTrack[]} subtitles Available subtitle tracks (empty if none).
 * @property {string} provider The provider/scraper that generated this result.
 * @property {string} [error] Error message if extraction failed.
 * @property {number} [timing] Extraction duration in milliseconds.
 * @property {string} [hexData] Raw hex data (for client-side decryption).
 * @property {boolean} [needsClientDecrypt] Whether the client must decrypt.
 */

/** @typedef {'movie'|'tv'|'anime'|'manga'|'live-tv'|'live-sports'|'ppv'|'iptv'} ContentCategory */

export {};
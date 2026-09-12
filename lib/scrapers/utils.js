/**
 * Shared HTTP, Axios, and metadata helpers for the youplex scraping layer.
 */

import axios from 'axios';

export const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const TMDB_PROXY = 'https://db.speedracelight.com/3';

// ----------------------------------------------------------------------

/**
 * Standard Axios instance preconfigured with browser headers and timeout.
 */
export const axiosInstance = axios.create({
  timeout: 12000,
  headers: {
    'User-Agent': DEFAULT_UA,
    Accept: 'application/json, text/html, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  },
  validateStatus: (status) => status >= 200 && status < 400,
});

/**
 * Perform a GET request using Axios with error handling and custom options.
 * @template T
 * @param {string} url
 * @param {import('axios').AxiosRequestConfig} [config]
 * @returns {Promise<T>}
 */
export async function axiosGet(url, config = {}) {
  const res = await axiosInstance.get(url, config);
  return res.data;
}

/**
 * Perform a POST request using Axios with error handling and custom options.
 * @template T
 * @param {string} url
 * @param {any} [data]
 * @param {import('axios').AxiosRequestConfig} [config]
 * @returns {Promise<T>}
 */
export async function axiosPost(url, data, config = {}) {
  const res = await axiosInstance.post(url, data, config);
  return res.data;
}

/**
 * Fetch a URL and return its text body.
 * @param {string} url
 * @param {RequestInit} [opts]
 * @param {number} [timeoutMs]
 * @returns {Promise<string>}
 */
export async function fetchText(url, opts = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch a URL and return parsed JSON.
 * @template T
 * @param {string} url
 * @param {RequestInit} [opts]
 * @param {number} [timeoutMs]
 * @returns {Promise<T>}
 */
export async function fetchJSON(url, opts = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Sleep helper for rate-limit backoff.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Structured debug logger for scrapers.
 * Logs if DEBUG_SCRAPERS=true or process.env.NODE_ENV !== 'production'.
 * @param {string} providerName
 */
export function createLogger(providerName) {
  const isDebug =
    process.env.DEBUG_SCRAPERS === 'true' ||
    process.env.NEXT_PUBLIC_DEBUG_SCRAPERS === 'true' ||
    process.env.NODE_ENV !== 'production';

  const prefix = `[Scraper:${providerName}]`;

  return {
    info: (msg, ...args) => {
      if (isDebug) console.log(`${prefix} ℹ️ ${msg}`, ...args);
    },
    debug: (msg, ...args) => {
      if (isDebug) console.log(`${prefix} 🔍 ${msg}`, ...args);
    },
    streamFound: (url, quality = 'Auto') => {
      if (isDebug) {
        console.log(`${prefix} 🎬 Stream Found [${quality}]: ${url.substring(0, 80)}...`);
      }
    },
    warn: (msg, ...args) => {
      console.warn(`${prefix} ⚠️ ${msg}`, ...args);
    },
    error: (msg, ...args) => {
      console.error(`${prefix} ❌ ${msg}`, ...args);
    },
  };
}

/**
 * Fetch TMDB title & release year from TMDB ID.
 * @param {number|string} tmdbId
 * @param {string} [mediaType] 'movie' | 'tv'
 * @returns {Promise<{title: string, year?: number, cleanTitle: string, imdbId?: string}>}
 */
export async function getTmdbMetadata(tmdbId, mediaType = 'movie') {
  try {
    const isTv = mediaType === 'tv';
    const path = isTv
      ? `/tv/${tmdbId}?append_to_response=external_ids`
      : `/movie/${tmdbId}?append_to_response=external_ids`;

    const data = await fetchJSON(
      `${TMDB_PROXY}${path}`,
      { headers: { 'User-Agent': DEFAULT_UA } },
      8000
    );

    const title =
      data.title ||
      data.name ||
      data.original_title ||
      data.original_name ||
      String(tmdbId);

    const cleanTitle = title
      .replace(/[\s\-_](S|s)undefined.*/, '')
      .replace(/[\s\-_](E|e)undefined.*/, '')
      .split(/ S\d+| E\d+/i)[0]
      .trim();

    const dateStr = data.release_date || data.first_air_date || '';
    const year = dateStr ? parseInt(dateStr.slice(0, 4), 10) : undefined;
    const imdbId = data.imdb_id || data.external_ids?.imdb_id;

    return { title, cleanTitle, year, imdbId };
  } catch {
    const s = String(tmdbId);
    return { title: s, cleanTitle: s };
  }
}

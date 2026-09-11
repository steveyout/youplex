/**
 * VidSrc / VSEmbed extractor.
 *
 * Extraction chain (2026 — rewritten after cloudorchestranova dropped /rcp/):
 *   1. data.vidsrcme.ru/api.php?type={movie|tv}&tmdb={id}&stream_urls
 *   2. Response has encrypted `stream_urls` (base64 ChaCha20 nonce||ciphertext)
 *      + `vs` decryptor: { w: <window>, wasm_url: "<url>" }
 *   3. Fetch WASM module, instantiate → alloc(size) + decrypt(ptr, len)
 *   4. Decrypted output = stream URLs (newline-separated .m3u8 / .mp4)
 *
 * Some streams require IP-bound tokens (gen_token_url) — unsupported
 * server-side without a proxy layer.
 */

import { DEFAULT_UA } from '../utils';
import { registerTokenUrls } from './vidsrc-token-registry';

// ── Constants ────────────────────────────────────────────────

const API_BASE = 'https://data.vidsrcme.ru';
const REFERER = 'https://cloudorchestranova.com/';

/** Cached WASM modules keyed by the per-window integer `w`. */
const wasmCache = new Map();

async function getWasmModule(vs) {
  const cached = wasmCache.get(vs.w);
  if (cached) return cached;

  const p = (async () => {
    let buffer;

    if (vs.wasm_url) {
      const r = await fetch(vs.wasm_url, {
        headers: { 'User-Agent': DEFAULT_UA, Referer: REFERER },
      });
      if (!r.ok) throw new Error(`WASM fetch HTTP ${r.status}`);
      buffer = await r.arrayBuffer();
    } else if (vs.wasm) {
      const buf = Buffer.from(vs.wasm, 'base64');
      const slice = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      buffer = slice;
    } else {
      throw new Error('No WASM source in vs decryptor');
    }

    return WebAssembly.compile(buffer);
  })();

  wasmCache.set(vs.w, p);
  return p;
}

// ── ChaCha20 decryption ──────────────────────────────────────

/**
 * Decrypt the encrypted `stream_urls` string using the WASM ChaCha20 module.
 * Encryption scheme (from vsdec.js):
 *   1. Base64-decode the ciphertext
 *   2. Allocate WASM memory, copy ciphertext
 *   3. Call decrypt(ptr, len) → returns plaintext length
 *   4. Plaintext starts at ptr + 12 (12-byte nonce is prepended)
 *
 * @param {string} encB64
 * @param {{w:number,wasm_url?:string,wasm?:string}} vs
 * @returns {Promise<string[]>}
 */
async function decryptStreamUrls(encB64, vs) {
  const mod = await getWasmModule(vs);

  const instance = await WebAssembly.instantiate(mod, {});
  const exports = instance.exports;

  if (!exports.alloc || !exports.decrypt || !exports.memory) {
    throw new Error('WASM module missing expected exports (alloc, decrypt, memory)');
  }

  // Base64 decode the encrypted blob
  const enc = Buffer.from(encB64, 'base64');

  // Allocate WASM memory and copy in the encrypted data
  const ptr = exports.alloc(enc.length);
  const mem = new Uint8Array(exports.memory.buffer, ptr, enc.length);
  mem.set(enc);

  // Decrypt — returns plaintext length
  const outLen = exports.decrypt(ptr, enc.length);

  // Plaintext starts at ptr + 12 (ChaCha20 nonce is 12 bytes)
  const decrypted = new TextDecoder().decode(
    new Uint8Array(exports.memory.buffer, ptr + 12, outLen),
  );

  return decrypted
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// ── Public API ───────────────────────────────────────────────

const empty = () => ({ sources: [], subtitles: [] });

/**
 * @param {number} tmdbId
 * @param {string} [mediaType]
 * @param {number} [season]
 * @param {number} [episode]
 * @returns {Promise<{sources: import('../types').StreamSource[], subtitles: import('../types').SubtitleTrack[]}>}
 */
export async function extractVidSrc(tmdbId, mediaType = 'movie', season, episode) {
  if (!tmdbId) return empty();

  try {
    // 1. Build API URL with stream_urls flag
    const params = new URLSearchParams({
      type: mediaType,
      tmdb: String(tmdbId),
      stream_urls: '',
    });
    if (mediaType === 'tv') {
      if (season !== undefined) params.set('season', String(season));
      if (episode !== undefined) params.set('episode', String(episode));
    }
    const apiUrl = `${API_BASE}/api.php?${params.toString()}`;

    // 2. Fetch the stream-data API
    const r = await fetch(apiUrl, {
      headers: { 'User-Agent': DEFAULT_UA, Referer: REFERER, Accept: 'application/json' },
    });

    if (!r.ok) {
      console.warn(`[VidSrc] API HTTP ${r.status} for ${mediaType}/${tmdbId}`);
      return empty();
    }

    const json = await r.json();

    if (json.status_code !== '200' || !json.data) {
      console.warn(`[VidSrc] API returned status ${json.status_code}`);
      return empty();
    }

    // 3. Extract stream URLs (decrypt if necessary)
    let streamUrls;

    if (Array.isArray(json.data.stream_urls)) {
      streamUrls = json.data.stream_urls;
    } else if (
      typeof json.data.stream_urls === 'string' &&
      json.data.stream_urls.length > 0 &&
      json.vs
    ) {
      streamUrls = await decryptStreamUrls(json.data.stream_urls, json.vs);
    } else {
      console.warn('[VidSrc] No stream_urls in API response');
      return empty();
    }

    if (!streamUrls.length) {
      console.warn('[VidSrc] Decrypted stream URLs array is empty');
      return empty();
    }

    // 4. Build stream sources and register token URLs for the stream proxy.
    const tokenUrl = json.data.gen_token_url || undefined;

    if (tokenUrl) {
      const origins = new Set();
      for (const url of streamUrls) {
        try {
          origins.add(new URL(url.trim()).origin);
        } catch {
          /* skip malformed */
        }
      }
      if (origins.size > 0) {
        registerTokenUrls(Array.from(origins), tokenUrl);
      }
    }

    const resolution = json.data.file_name?.match(/\[(\d+p)\]/)?.[1];
    /** @type {import('../types').StreamSource[]} */
    const sources = streamUrls.map((url, i) => {
      const trimmed = url.trim();
      const isHls = trimmed.includes('.m3u8');

      return {
        url: trimmed,
        quality: isHls ? 'Auto' : resolution ?? 'Auto',
        type: isHls ? 'hls' : 'mp4',
        title: streamUrls.length > 1 ? `VidSrc ${i + 1}` : 'VidSrc',
        referer: REFERER,
        origin: 'https://cloudorchestranova.com',
        requiresSegmentProxy: true,
        tokenUrl,
      };
    });

    console.log(`[VidSrc] Extracted ${sources.length} source(s) for ${mediaType}/${tmdbId}`);
    return { sources, subtitles: [] };
  } catch (e) {
    console.warn(`[VidSrc] Extraction failed for ${mediaType}/${tmdbId}:`, e.message);
    return empty();
  }
}
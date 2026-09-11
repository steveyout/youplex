/**
 * Videasy extractor.
 *
 * Reverse-engineered extraction chain:
 *   1. GET db.speedracelight.com/3/movie|tv/{id} → TMDB metadata
 *   2. GET api.speedracelight.com/seed?mediaId={tmdbId} → short-lived seed
 *   3. GET api.speedracelight.com/{provider}/sources-with-title?...&enc=2&seed=
 *      → base64 payload encrypted with custom PRNG (magic "mvm1")
 *   4. XOR-decrypt payload → JSON { sources, subtitles }
 *
 * Providers (Valorant-themed in player UI):
 *   cdn, neon2, m4uhd, meine, lamovie, hdmovie, superflix
 */

import { sleep, fetchText, fetchJSON, DEFAULT_UA } from '../utils';

// ── Constants ────────────────────────────────────────────────

const TMDB_PROXY = 'https://db.speedracelight.com/3';
const API_BASE = 'https://api.speedracelight.com';

/**
 * Provider path suffixes under api.speedracelight.com.
 * Ordered by reliability (from live probes). Keep list short — seed API rate-limits.
 */
const PROVIDERS = [
  { path: '/cdn/sources-with-title', label: 'Yoru' },
  { path: '/neon2/sources-with-title', label: 'Neon' },
  { path: '/m4uhd/sources-with-title', label: 'Breach' },
  { path: '/meine/sources-with-title', label: 'Killjoy' },
  { path: '/lamovie/sources-with-title', label: 'Omen' },
];

/** Stop after this many sources to avoid burning seeds. */
const MAX_SOURCES = 8;

// Decrypt tables from player chunk 8351
const F = [
  1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993,
  2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987,
  1925078388, 2162078206, 2614888103, 3248222580,
];
const MAGIC = [109, 118, 109, 49]; // "mvm1"

// ── Crypto helpers (ported from player chunk 8351) ───────────

const isEvenTri = (e) => ((e * (e + 1)) & 1) === 0;
const isOddTri = (e) => ((e * (e + 1)) & 1) === 1;

function mix(e) {
  e >>>= 0;
  e ^= e >>> 16;
  e = Math.imul(e, 2246822507) >>> 0;
  e ^= e >>> 13;
  e = Math.imul(e, 3266489909) >>> 0;
  return (e ^= e >>> 16) >>> 0;
}

function rotl(e, t) {
  e >>>= 0;
  t &= 31;
  if (t === 0) return e >>> 0;
  return ((e << t) | (e >>> (32 - t))) >>> 0;
}

function fnv1a(e) {
  let t = 2166136261;
  for (let s = 0; s < e.length; s++) {
    t = Math.imul(t ^ e.charCodeAt(s), 16777619) >>> 0;
  }
  return mix(t);
}

function accSeed(e) {
  let t = 1732584193;
  for (let s = 0; s < e.length; s++) {
    t = rotl((t ^ Math.imul(e.charCodeAt(s), F[15 & s])) >>> 0, 5);
  }
  return mix(t);
}

function rc4Sbox(e) {
  const t = Array.from({ length: 256 }, (_, i) => i);
  let s = 0;
  for (let a = 0; a < 256; a++) {
    s = (s + t[a] + e.charCodeAt(a % e.length)) & 255;
    const r = t[a];
    t[a] = t[s];
    t[s] = r;
  }
  return t;
}

function buildState(seed, mediaId) {
  if (isOddTri(seed.length)) {
    return { S: rc4Sbox(seed), acc: accSeed(seed) };
  }
  const s = new Array(61);
  let a = mix(fnv1a(seed) ^ mix((mediaId >>> 0) ^ 2654435769)) >>> 0;
  for (let e = 0; e < 8; e++) {
    if (isEvenTri(e)) {
      const t = a % 61;
      a = rotl((a + 2654435769) >>> 0, 7 + (7 & e));
      s[t] = (a ^ mix(a)) >>> 0;
      a = mix((a + t) >>> 0);
    } else {
      s[e] = F[15 & e];
    }
  }
  return { S: s, acc: mix(2779096485 ^ a) >>> 0 };
}

function nextWord(state, counter) {
  const r = state.S;
  let acc = state.acc;
  const n = acc % 61;
  // `n in r` → Number(true)=1 → 0-1 = -1 (all bits set for & mask)
  const i = 0 - Number(n in r);
  const l = (r[n] ?? 0) >>> 0;
  const a = (l ^ (Math.imul(2654435769, counter + 1) >>> 0)) >>> 0;
  let d = ((acc ^ a) >>> 0) | ((acc & a & i) >>> 0);
  d = (rotl((d + acc) >>> 0, 31 & n) ^ rotl(acc, 31 & Math.imul(n, 7))) >>> 0;
  acc = mix((d + 2654435769) >>> 0);
  r[n] = acc >>> 0;
  state.acc = acc;
  return acc >>> 0;
}

function keystream(seed, mediaId, len) {
  const state = buildState(seed, mediaId);
  const out = new Uint8Array(len);
  let counter = 0;
  for (let e = 0; e < len; ) {
    const t = nextWord(state, counter++);
    out[e++] = 255 & t;
    if (e < len) out[e++] = (t >>> 8) & 255;
    if (e < len) out[e++] = (t >>> 16) & 255;
    if (e < len) out[e++] = (t >>> 24) & 255;
  }
  return out;
}

function b64ToBytes(e) {
  const t = e
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(4 * Math.ceil(e.length / 4), '=');
  const bin = atob(t);
  const s = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) s[i] = bin.charCodeAt(i);
  return s;
}

function decryptPayload(payload, seed, mediaId) {
  const r = b64ToBytes(payload);
  const o = keystream(seed, mediaId, r.length);
  for (let e = 0; e < r.length; e++) r[e] ^= o[e];
  for (let e = 0; e < MAGIC.length; e++) {
    if (r[e] !== MAGIC[e]) {
      throw new Error('Videasy decrypt failed: bad seed or tampered payload');
    }
  }
  return new TextDecoder('utf-8').decode(r.subarray(MAGIC.length));
}

// ── HTTP helpers ─────────────────────────────────────────────

const defaultHeaders = {
  'User-Agent': DEFAULT_UA,
  Referer: 'https://player.videasy.to/',
  Origin: 'https://player.videasy.to',
  Accept: 'application/json, text/plain, */*',
};

// ── Seed + encrypted source fetch ────────────────────────────

const seedCache = new Map();
const seedInflight = new Map();

async function getSeed(mediaId, force = false) {
  const key = `${API_BASE}|${mediaId}`;
  const now = Date.now();
  if (!force) {
    const cached = seedCache.get(key);
    if (cached && cached.expiresAt - 5000 > now) return cached.seed;
    const inflight = seedInflight.get(key);
    if (inflight) return inflight;
  }

  const promise = (async () => {
    let lastErr = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        const res = await fetch(`${API_BASE}/seed?mediaId=${mediaId}`, {
          headers: defaultHeaders,
          signal: controller.signal,
        });
        clearTimeout(timer);
        const data = await res.json();
        if (res.status === 429 || data.error === 'rate_limited') {
          lastErr = new Error('seed rate_limited');
          await sleep(800 * (attempt + 1) + Math.random() * 400);
          continue;
        }
        if (!res.ok || !data.seed) {
          throw new Error(`seed HTTP ${res.status}`);
        }
        const ttl = data.ttlMs ?? 30000;
        seedCache.set(key, { seed: data.seed, expiresAt: Date.now() + ttl });
        return data.seed;
      } catch (e) {
        lastErr = e;
        await sleep(400 * (attempt + 1));
      }
    }
    throw lastErr ?? new Error('seed failed');
  })();

  seedInflight.set(key, promise);
  try {
    return await promise;
  } finally {
    seedInflight.delete(key);
  }
}

async function fetchProvider(path, mediaId, params, seed) {
  const buildQs = (s) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === '') continue;
      qs.set(k, String(v));
    }
    qs.set('enc', '2');
    qs.set('seed', s);
    return qs;
  };

  const attempt = async (s) => {
    const text = await fetchText(`${API_BASE}${path}?${buildQs(s).toString()}`, {
      headers: defaultHeaders,
    }, 20000);
    let payload = text.trim();
    if (payload.startsWith('"') && payload.endsWith('"')) {
      payload = JSON.parse(payload);
    }
    if (payload.startsWith('{')) {
      try {
        const err = JSON.parse(payload);
        if (err.error) {
          if (String(err.error).includes('SEED') || String(err.error).includes('seed')) {
            throw new Error('SEED_INVALID');
          }
          return null;
        }
      } catch (e) {
        if (e.message === 'SEED_INVALID') throw e;
        // not JSON error — fall through to decrypt
      }
    }
    const decoded = decryptPayload(payload, s, mediaId);
    return JSON.parse(decoded);
  };

  try {
    return await attempt(seed);
  } catch (e) {
    if (e.message === 'SEED_INVALID') {
      try {
        seedCache.delete(`${API_BASE}|${mediaId}`);
        const fresh = await getSeed(mediaId, true);
        return await attempt(fresh);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * @param {Array<{url?:string,file?:string,quality?:string,type?:string}>} raw
 * @param {string} label
 * @returns {import('../types').StreamSource[]}
 */
function mapSources(raw, label) {
  const out = [];
  for (const s of raw) {
    const url = s.url || s.file;
    if (!url || typeof url !== 'string') continue;
    if (!/^https?:\/\//i.test(url)) continue;

    out.push({
      url,
      quality: String(s.quality || 'Auto'),
      type: s.type === 'dash' || s.type === 'mpd' || url.includes('.mpd') ? 'dash' : 'hls',
      title: `Videasy ${label}${s.quality ? ` · ${s.quality}` : ''}`,
      referer: 'https://player.videasy.to/',
    });
  }
  return out;
}

/**
 * @param {Array<{url?:string,file?:string,language?:string,lang?:string,label?:string}>} raw
 * @returns {import('../types').SubtitleTrack[]}
 */
function mapSubtitles(raw) {
  if (!raw?.length) return [];
  const out = [];
  for (const s of raw) {
    const url = s.url || s.file;
    if (!url) continue;
    out.push({
      url,
      language: s.lang || s.language || 'und',
      label: s.label || s.language || s.lang || 'Unknown',
    });
  }
  return out;
}

// ── Main Extractor ───────────────────────────────────────────

/**
 * @param {number} tmdbId
 * @param {string} [mediaType]
 * @param {number} [season]
 * @param {number} [episode]
 * @returns {Promise<{sources: import('../types').StreamSource[], subtitles: import('../types').SubtitleTrack[]}>}
 */
export async function extractVideasy(tmdbId, mediaType = 'movie', season, episode) {
  const empty = { sources: [], subtitles: [] };

  try {
    // ── Step 1: TMDB metadata via proxy ────────────────────
    const isTv = mediaType === 'tv' && season !== undefined && episode !== undefined;
    const path = isTv
      ? `/tv/${tmdbId}?append_to_response=external_ids`
      : `/movie/${tmdbId}?append_to_response=external_ids`;

    const tmdb = await fetchJSON(`${TMDB_PROXY}${path}`, { headers: defaultHeaders });

    const title =
      tmdb.title ||
      tmdb.name ||
      tmdb.original_title ||
      tmdb.original_name ||
      String(tmdbId);
    const yearStr = (tmdb.release_date || tmdb.first_air_date || '').slice(0, 4);
    const year = yearStr ? parseInt(yearStr, 10) : undefined;
    const imdbId = tmdb.imdb_id || tmdb.external_ids?.imdb_id || '';

    const params = {
      title: encodeURIComponent(title),
      mediaType: isTv ? 'tv' : 'movie',
      year: year || undefined,
      tmdbId,
      imdbId,
      totalSeasons: isTv ? tmdb.number_of_seasons : undefined,
      seasonId: isTv ? season : undefined,
      episodeId: isTv ? episode : undefined,
    };

    // ── Step 2: One seed, sequential providers (avoids rate limits) ─
    let seed;
    try {
      seed = await getSeed(tmdbId);
    } catch {
      return empty;
    }

    /** @type {import('../types').StreamSource[]} */
    const sources = [];
    /** @type {import('../types').SubtitleTrack[]} */
    const subtitles = [];
    const seenUrls = new Set();
    const seenSubs = new Set();

    for (const p of PROVIDERS) {
      if (sources.length >= MAX_SOURCES) break;
      const data = await fetchProvider(p.path, tmdbId, params, seed);
      const cached = seedCache.get(`${API_BASE}|${tmdbId}`);
      if (cached) seed = cached.seed;

      if (!data?.sources?.length) continue;
      for (const s of mapSources(data.sources, p.label)) {
        if (seenUrls.has(s.url)) continue;
        seenUrls.add(s.url);
        sources.push(s);
      }
      for (const sub of mapSubtitles(data.subtitles)) {
        if (seenSubs.has(sub.url)) continue;
        seenSubs.add(sub.url);
        subtitles.push(sub);
      }
      // Small gap between provider hits
      await sleep(150);
    }

    return { sources, subtitles };
  } catch {
    return empty;
  }
}
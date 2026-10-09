/**
 * HLS / segment streaming proxy.
 *
 * Scraper-sourced CDNs (videasy, multiembed, vidsrc, vidcore, hdbox, hdtoday, sflix, ...)
 * reject cross-origin browser fetches (401 / 403 / no Access-Control-Allow-Origin), so
 * native playback fails while a plain curl or direct embed succeeds.
 *
 * This route relays every HLS/DASH/MP4 request through the server, which:
 *   1. Fetches upstream with the source's required Referer/Origin/User-Agent/Sec-Fetch headers.
 *   2. Rewrites all .m3u8 playlist URIs (variants, segments, EXT-X-KEY/MAP/MEDIA/PRELOAD)
 *      to point back at this proxy, so every segment and decryption key also flows through it.
 *   3. Decodes steganographic TS segments disguised inside PNG/WebP images (e.g. DLHD / TikTok CDN).
 *   4. Pipes binary segments (supporting Range requests for MP4/HLS seeking).
 *   5. Adds CORS headers so the browser can stream the responses.
 */

import { gunzipSync, inflateSync } from 'zlib';
import { DEFAULT_UA } from '@/lib/scrapers/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ----------------------------------------------------------------------

/** Regex to match URI attributes in HLS tags (e.g. #EXT-X-KEY, #EXT-X-MAP, #EXT-X-MEDIA). */
const URI_ATTR_QUOTED_RE = /(URI=")([^"]+)(")/g;
const URI_ATTR_UNQUOTED_RE = /(URI=)([^,\s]+)/g;

/** Short-lived cache for resolved tokens to avoid hammering token generators on every segment. */
const tokenCache = new Map();

/** Steganography signature markers used by live TV streams (DLHD / dembed / TikTok CDN). */
const TSGZ = [84, 73, 75, 84, 73, 75, 84, 83, 71, 90];
const TRAW = [84, 73, 75, 84, 73, 75, 82, 65, 87];
const TPIX = [84, 73, 75, 84, 73, 75, 80, 88];

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function webpExifTS(bytes) {
  if (bytes.length < 16) return null;
  const ascii = (i, n) => String.fromCharCode(...bytes.subarray(i, i + n));
  if (ascii(0, 4) !== 'RIFF' || ascii(8, 4) !== 'WEBP') return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let off = 12;
  while (off + 8 <= bytes.length) {
    const tag = ascii(off, 4);
    const n = dv.getUint32(off + 4, true);
    off += 8;
    if (n < 0 || off + n > bytes.length) return null;
    if (tag === 'EXIF') {
      const data = bytes.subarray(off, off + n);
      if (data.length >= 188 && data[0] === 0x47 && data[188] === 0x47) return data;
      return null;
    }
    off += n + (n & 1);
  }
  return null;
}

function pngIendTS(bytes) {
  if (bytes.length < 16 || bytes[0] !== 0x89 || bytes[1] !== 0x50) return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let off = 8;
  while (off + 8 <= bytes.length) {
    const len = dv.getUint32(off);
    if (len > bytes.length - off - 12) return null;
    const type = String.fromCharCode(bytes[off + 4], bytes[off + 5], bytes[off + 6], bytes[off + 7]);
    off += 8 + len + 4;
    if (type === 'IEND') {
      if (off < bytes.length && bytes[off] === 0x47 && off + 188 < bytes.length && bytes[off + 188] === 0x47) {
        return bytes.subarray(off);
      }
      return null;
    }
  }
  return null;
}

function pngRGB(bytes) {
  if (bytes.length < 8 || bytes[0] !== 0x89 || bytes[1] !== 0x50) return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let off = 8;
  let w = 0;
  let h = 0;
  let depth = 0;
  let ctype = 0;
  let interlace = 0;
  const idats = [];
  while (off + 8 <= bytes.length) {
    const len = dv.getUint32(off);
    if (len > bytes.length - off - 12) return null;
    const type = String.fromCharCode(bytes[off + 4], bytes[off + 5], bytes[off + 6], bytes[off + 7]);
    const data = bytes.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      const hd = new DataView(data.buffer, data.byteOffset, data.byteLength);
      w = hd.getUint32(0);
      h = hd.getUint32(4);
      depth = data[8];
      ctype = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idats.push(data);
    } else if (type === 'IEND') {
      break;
    }
    off += 12 + len;
  }
  if (!w || !h || depth !== 8 || interlace || (ctype !== 2 && ctype !== 6)) return null;
  let zlen = 0;
  for (const p of idats) zlen += p.length;
  const zbuf = new Uint8Array(zlen);
  let zoff = 0;
  for (const p of idats) {
    zbuf.set(p, zoff);
    zoff += p.length;
  }
  let raw;
  try {
    raw = inflateSync(zbuf);
  } catch {
    return null;
  }
  const bpp = ctype === 6 ? 4 : 3;
  const stride = w * bpp;
  const rgb = new Uint8Array(w * h * 3);
  let src = 0;
  let dst = 0;
  let prev = new Uint8Array(stride);
  for (let y = 0; y < h; y += 1) {
    if (src + 1 + stride > raw.length) return null;
    const filter = raw[src];
    src += 1;
    const recon = new Uint8Array(stride);
    for (let i = 0; i < stride; i += 1) {
      const a = i >= bpp ? recon[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = raw[src + i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) v += paeth(a, b, c);
      else if (filter !== 0) return null;
      recon[i] = v & 255;
    }
    src += stride;
    if (ctype === 2) {
      rgb.set(recon, dst);
      dst += stride;
    } else {
      for (let i = 0; i < stride; i += 4) {
        rgb[dst] = recon[i];
        rgb[dst + 1] = recon[i + 1];
        rgb[dst + 2] = recon[i + 2];
        dst += 3;
      }
    }
    prev = recon;
  }
  return rgb;
}

function unwrapPixels(bytes) {
  const rgb = pngRGB(bytes);
  if (!rgb || rgb.length < 12) return null;
  for (let k = 0; k < 8; k += 1) if (rgb[k] !== TPIX[k]) return null;
  const n = new DataView(rgb.buffer, rgb.byteOffset + 8, 4).getUint32(0);
  if (n <= 0 || 12 + n > rgb.length) return null;
  const gz = rgb.subarray(12, 12 + n);
  if (gz.length < 2 || gz[0] !== 0x1f || gz[1] !== 0x8b) return null;
  let ts;
  try {
    ts = new Uint8Array(gunzipSync(gz));
  } catch {
    return null;
  }
  if (!ts.length || ts[0] !== 0x47) return null;
  return ts;
}

function unwrapStegoTs(bytes) {
  if (!bytes || bytes.length < 16) return null;
  if (bytes[0] === 0x47 && (bytes.length < 188 || bytes[188] === 0x47)) return null;

  try {
    const fromWebp = webpExifTS(bytes);
    if (fromWebp) return fromWebp;
  } catch {
    // ignore
  }

  try {
    const fromGoat = pngIendTS(bytes);
    if (fromGoat) return fromGoat;
  } catch {
    // ignore
  }

  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50) {
    try {
      const px = unwrapPixels(bytes);
      if (px) return px;
    } catch {
    // ignore
  }
    return null;
  }

  try {
    for (let i = 0; i + TRAW.length < bytes.length; i += 1) {
      let hit = true;
      for (let j = 0; j < TRAW.length; j += 1) {
        if (bytes[i + j] !== TRAW[j]) {
          hit = false;
          break;
        }
      }
      if (hit) {
        const ts = bytes.subarray(i + TRAW.length);
        if (ts.length && ts[0] === 0x47) return ts;
      }
    }
  } catch {
    // ignore
  }

  try {
    for (let i = 0; i + TSGZ.length < bytes.length; i += 1) {
      let hit = true;
      for (let j = 0; j < TSGZ.length; j += 1) {
        if (bytes[i + j] !== TSGZ[j]) {
          hit = false;
          break;
        }
      }
      if (hit) {
        return new Uint8Array(gunzipSync(bytes.subarray(i + TSGZ.length)));
      }
    }
  } catch {
    // ignore
  }

  try {
    for (let i = 0; i + 188 < bytes.length; i += 1) {
      if (bytes[i] === 0x47 && bytes[i + 188] === 0x47) return bytes.subarray(i);
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Build a proxy URL that, when fetched, relays `target` with the same
 * upstream headers (referer/origin/ua/tokenUrl) applied.
 * @param {string} target Absolute URL to fetch upstream.
 * @param {{referer?:string,origin?:string,ua?:string,tokenUrl?:string}} params
 * @returns {string} Relative proxy path.
 */
function buildProxyUrl(target, params) {
  const q = new URLSearchParams({ url: target });
  if (params.referer) q.set('referer', params.referer);
  if (params.origin) q.set('origin', params.origin);
  if (params.ua) q.set('ua', params.ua);
  if (params.tokenUrl) q.set('tokenUrl', params.tokenUrl);
  return `/api/hls?${q.toString()}`;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Type',
};

const RETRYABLE_UPSTREAM_STATUSES = new Set([502, 503, 504]);

function buildUpstreamHeaders({ ua, referer, origin, range, isPlaylist, profile = 'full' }) {
  const headers = {
    'User-Agent': ua,
    Accept: isPlaylist ? 'application/vnd.apple.mpegurl, application/x-mpegURL, */*' : '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  };

  if (profile !== 'minimal') {
    headers['Sec-Fetch-Mode'] = 'cors';
    headers['Sec-Fetch-Site'] = 'cross-site';
    headers['Sec-Fetch-Dest'] = 'empty';
  }
  if (profile === 'full' && referer) headers.Referer = referer;
  if (profile === 'full' && origin) headers.Origin = origin;
  if (profile === 'referer' && referer) headers.Referer = referer;
  if (range) headers.Range = range;

  return headers;
}

async function fetchUpstream(url, options, timeoutMs = 20000) {
  let lastResponse;
  let lastError;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      lastResponse = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }

    if (!lastResponse || !RETRYABLE_UPSTREAM_STATUSES.has(lastResponse.status) || attempt === 2) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }

  if (lastError && !lastResponse) throw lastError;
  return lastResponse;
}

/**
 * Best-effort: resolve a VidSrc / VSEmbed token URL to the signed CDN manifest URL.
 * @param {string} target
 * @param {string} [tokenUrl]
 * @param {string} [referer]
 * @param {string} [origin]
 * @param {string} [ua]
 * @returns {Promise<string>}
 */
async function resolveTokenTarget(target, tokenUrl, referer, origin, ua) {
  if (!tokenUrl) return target;

  const cacheKey = `${tokenUrl}|${target}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  try {
    const res = await fetch(tokenUrl, {
      headers: {
        'User-Agent': ua || DEFAULT_UA,
        ...(referer ? { Referer: referer } : {}),
        ...(origin ? { Origin: origin } : {}),
        Accept: 'application/json, text/plain, */*',
      },
      redirect: 'follow',
    });

    if (!res.ok) return target;
    const text = await res.text();

    let candidate = null;
    try {
      const json = JSON.parse(text);
      candidate =
        (json && typeof json === 'object' && typeof json.url === 'string' && json.url.startsWith('http') && json.url) ||
        (json && typeof json === 'object' && typeof json.playback_url === 'string' && json.playback_url.startsWith('http') && json.playback_url) ||
        (json && typeof json === 'object' && typeof json.stream === 'string' && json.stream.startsWith('http') && json.stream);
    } catch {
      // not json
    }

    if (!candidate && text.trim().startsWith('http')) {
      candidate = text.trim();
    }
    if (!candidate) {
      const m = text.match(/https?:\/\/[^\s"'<>]+/);
      if (m) candidate = m[0];
    }

    const resolved = candidate || target;
    tokenCache.set(cacheKey, { url: resolved, expiresAt: Date.now() + 60000 });
    return resolved;
  } catch {
    return target;
  }
}

/**
 * Rewrite an HLS/DASH playlist so every referenced URI flows through the proxy.
 * @param {string} body
 * @param {string} baseUrl URL the playlist was fetched from (for relative URIs).
 * @param {{referer?:string,origin?:string,ua?:string,tokenUrl?:string}} params
 * @returns {string}
 */
function rewritePlaylist(body, baseUrl, params) {
  return body
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('#')) {
        // Rewrite URI="..." in tags like #EXT-X-KEY, #EXT-X-MAP, #EXT-X-MEDIA
        let rewrittenLine = line;

        if (rewrittenLine.includes('URI=')) {
          // 1. Quoted URI="..."
          rewrittenLine = rewrittenLine.replace(URI_ATTR_QUOTED_RE, (match, p1, p2, p3) => {
            try {
              const abs = new URL(p2, baseUrl).href;
              return `${p1}${buildProxyUrl(abs, params)}${p3}`;
            } catch {
              return match;
            }
          });

          // 2. Unquoted URI=...
          if (!rewrittenLine.includes('/api/hls?')) {
            rewrittenLine = rewrittenLine.replace(URI_ATTR_UNQUOTED_RE, (match, p1, p2) => {
              if (p2.startsWith('"') || p2.startsWith("'")) return match;
              try {
                const abs = new URL(p2, baseUrl).href;
                return `${p1}"${buildProxyUrl(abs, params)}"`;
              } catch {
                return match;
              }
            });
          }
        }

        return rewrittenLine;
      }

      if (trimmed === '') return line;

      try {
        const abs = new URL(trimmed, baseUrl).href;
        return buildProxyUrl(abs, params);
      } catch {
        return line;
      }
    })
    .join('\n');
}

// ----------------------------------------------------------------------

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('url');

  if (!target) {
    return new Response('Missing "url" query parameter', { status: 400, headers: CORS_HEADERS });
  }

  const rawReferer = searchParams.get('referer');
  const rawOrigin = searchParams.get('origin');
  const ua = searchParams.get('ua') || DEFAULT_UA;
  const tokenUrl = searchParams.get('tokenUrl') || undefined;

  // Derive origin from referer or vice versa if either is missing
  let derivedOrigin = rawOrigin;
  let derivedReferer = rawReferer;

  if (!derivedOrigin && rawReferer) {
    try {
      derivedOrigin = new URL(rawReferer).origin;
    } catch {
      // ignore
    }
  }
  if (!derivedReferer && rawOrigin) {
    derivedReferer = rawOrigin.endsWith('/') ? rawOrigin : `${rawOrigin}/`;
  }
  if (!derivedReferer && !derivedOrigin) {
    try {
      const targetOrigin = new URL(target).origin;
      derivedReferer = `${targetOrigin}/`;
      derivedOrigin = targetOrigin;
    } catch {
      // ignore
    }
  }

  const fetchTarget = await resolveTokenTarget(target, tokenUrl, derivedReferer, derivedOrigin, ua);

  const range = req.headers.get('range');
  const isRequestedPlaylist = /\.m3u8?$/i.test(new URL(fetchTarget).pathname);

  let upstream;
  try {
    upstream = await fetchUpstream(fetchTarget, {
      headers: buildUpstreamHeaders({
        ua,
        referer: derivedReferer,
        origin: derivedOrigin,
        range,
        isPlaylist: isRequestedPlaylist,
      }),
      redirect: 'follow',
    });
  } catch (e) {
    return new Response(`Upstream fetch failed: ${e.message}`, { status: 502, headers: CORS_HEADERS });
  }

  // Retry with less restrictive header profiles for CDNs that reject Origin or
  // fetch metadata headers even though the signed URL itself is valid.
  if ((upstream.status === 401 || upstream.status === 403 || RETRYABLE_UPSTREAM_STATUSES.has(upstream.status)) && (derivedReferer || derivedOrigin)) {
    try {
      const fallbackRes = await fetchUpstream(fetchTarget, {
        headers: buildUpstreamHeaders({
          ua,
          referer: derivedReferer,
          range,
          isPlaylist: isRequestedPlaylist,
          profile: 'referer',
        }),
        redirect: 'follow',
      });
      if (fallbackRes.ok || fallbackRes.status === 206) {
        upstream = fallbackRes;
      } else if (RETRYABLE_UPSTREAM_STATUSES.has(fallbackRes.status)) {
        const minimalRes = await fetchUpstream(fetchTarget, {
          headers: buildUpstreamHeaders({
            ua,
            range,
            isPlaylist: isRequestedPlaylist,
            profile: 'minimal',
          }),
          redirect: 'follow',
        });
        if (minimalRes.ok || minimalRes.status === 206) upstream = minimalRes;
      }
    } catch {
      // ignore fallback error
    }
  }

  if (!upstream.ok && upstream.status !== 206) {
    return new Response(`Upstream HTTP ${upstream.status} for ${new URL(fetchTarget).hostname}`, {
      status: upstream.status,
      headers: CORS_HEADERS,
    });
  }

  // ── Playlists: rewrite HLS URIs so segments and keys go through the proxy too. ──
  const upstreamUrl = new URL(fetchTarget);
  const isM3u8 =
    /\.m3u8?$/i.test(upstreamUrl.pathname) ||
    /mpegurl/i.test(upstream.headers.get('content-type') || '');
  const isMpd =
    /\.mpd$/i.test(upstreamUrl.pathname) ||
    /dashxml/i.test(upstream.headers.get('content-type') || '');

  if (isM3u8) {
    let body;
    try {
      body = await upstream.text();
    } catch (e) {
      return new Response(`Playlist read failed: ${e.message}`, { status: 502, headers: CORS_HEADERS });
    }

    const rewritten = rewritePlaylist(body, fetchTarget, {
      referer: derivedReferer,
      origin: derivedOrigin,
      ua,
      tokenUrl,
    });

    const headers = new Headers(CORS_HEADERS);
    headers.set('Content-Type', 'application/vnd.apple.mpegurl');
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return new Response(rewritten, { headers });
  }

  if (isMpd) {
    const headers = new Headers(CORS_HEADERS);
    headers.set('Content-Type', 'application/dash+xml');
    const body = await upstream.text();
    return new Response(body, { headers });
  }

  // ── Binary: decode steganographic TS segments or stream MP4/HLS segments ──
  const upstreamContentType = upstream.headers.get('content-type') || '';
  const isImageOrStego =
    upstreamContentType.startsWith('image/') ||
    upstreamContentType.includes('octet-stream') ||
    !upstreamContentType ||
    /\.(image|png|webp|bin)($|\?)/i.test(fetchTarget) ||
    /tiktokcdn/i.test(fetchTarget);

  if (isImageOrStego) {
    try {
      const arrayBuffer = await upstream.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const unwrapped = unwrapStegoTs(bytes);
      if (unwrapped) {
        const outHeaders = new Headers(CORS_HEADERS);
        outHeaders.set('Content-Type', 'video/mp2t');
        outHeaders.set('Content-Length', String(unwrapped.byteLength));
        outHeaders.set('Accept-Ranges', 'bytes');
        outHeaders.set('Cache-Control', 'public, max-age=300');
        return new Response(Buffer.from(unwrapped.buffer, unwrapped.byteOffset, unwrapped.byteLength), {
          status: 200,
          headers: outHeaders,
        });
      }

      // If not stego TS, return the original buffer
      const outHeaders = new Headers(CORS_HEADERS);
      if (upstreamContentType) outHeaders.set('Content-Type', upstreamContentType);
      outHeaders.set('Content-Length', String(bytes.byteLength));
      return new Response(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength), {
        status: upstream.status,
        headers: outHeaders,
      });
    } catch {
      // Fall through to regular streaming
    }
  }

  const headers = new Headers(CORS_HEADERS);
  if (upstreamContentType) headers.set('Content-Type', upstreamContentType);

  const contentLength = upstream.headers.get('content-length');
  if (contentLength) headers.set('Content-Length', contentLength);

  const contentRange = upstream.headers.get('content-range');
  if (contentRange) headers.set('Content-Range', contentRange);

  headers.set('Accept-Ranges', 'bytes');
  if (range) headers.set('Cache-Control', 'private, max-age=300');
  else headers.set('Cache-Control', 'public, max-age=300');

  return new Response(upstream.body, { status: upstream.status, headers });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

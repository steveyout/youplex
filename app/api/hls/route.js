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
 *   3. Pipes binary segments (supporting Range requests for MP4/HLS seeking).
 *   4. Adds CORS headers so the browser can stream the responses.
 */

import { DEFAULT_UA } from '@/lib/scrapers/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ----------------------------------------------------------------------

/** Regex to match URI attributes in HLS tags (e.g. #EXT-X-KEY, #EXT-X-MAP, #EXT-X-MEDIA). */
const URI_ATTR_QUOTED_RE = /(URI=")([^"]+)(")/g;
const URI_ATTR_UNQUOTED_RE = /(URI=)([^,\s]+)/g;

/** Short-lived cache for resolved tokens to avoid hammering token generators on every segment. */
const tokenCache = new Map();

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
    .split('\n')
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

  // ── Binary: stream segments / MP4 files, preserving Range semantics. ──
  const headers = new Headers(CORS_HEADERS);

  const upstreamContentType = upstream.headers.get('content-type');
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

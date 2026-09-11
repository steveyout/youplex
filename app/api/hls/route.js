/**
 * HLS / segment streaming proxy.
 *
 * Scraper-sourced CDNs (videasy, multiembed, vidsrc, vidcore, ...) reject
 * cross-origin browser fetches (403 / no Access-Control-Allow-Origin), so
 * native playback fails while a plain curl (no Origin header) succeeds.
 *
 * This route relays every HLS/DASH/MP4 request through the server, which:
 *   1. Fetches upstream with the source's required Referer/Origin/User-Agent.
 *   2. Rewrites all .m3u8 playlist URIs (variants, segments, EXT-X-KEY/MAP/MEDIA)
 *      to point back at this proxy, so every segment also flows through it.
 *   3. Pipes binary segments (supporting Range requests for MP4 seeking).
 *   4. Adds CORS headers so the browser can stream the responses.
 *
 * VidSrc IP-bound tokens work here because the token is issued to (and every
 * subsequent request comes from) the same server IP.
 */

import { DEFAULT_UA } from '@/lib/scrapers/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ----------------------------------------------------------------------

/** Rewrite attribute URIs inside HLS directives: #EXT-X-KEY/MAP/MEDIA. */
const URI_ATTR_RE = /^(#EXT-X-(?:KEY|MAP|MEDIA):.*?\bURI=")([^"]*)(".*)$/;

/**
 * Build a proxy URL that, when fetched, relays `target` with the same
 * upstream headers (referer/origin/ua/tokenUrl) applied.
 * @param {string} target Absolute URL to fetch upstream.
 * @param {{referer?:string,origin?:string,ua?:string,tokenUrl?:string}} params
 * @returns {string} Relative proxy path (resolved by the browser against this origin).
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
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
};

/**
 * Best-effort: resolve a VidSrc `gen_token_url` to the signed CDN manifest URL.
 * The endpoint returns an IP-bound signed URL (JSON `{url}` or a bare URL
 * string); on any failure we fall back to the original target.
 * @param {string} target
 * @param {string} [tokenUrl]
 * @returns {Promise<string>}
 */
async function resolveTokenTarget(target, tokenUrl) {
  if (!tokenUrl) return target;
  try {
    const res = await fetch(tokenUrl, {
      headers: { 'User-Agent': DEFAULT_UA },
      redirect: 'follow',
    });
    if (!res.ok) return target;
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      const candidate =
        (json && typeof json === 'object' && typeof json.url === 'string' && json.url.startsWith('http') && json.url) ||
        (json && typeof json === 'object' && typeof json.playback_url === 'string' && json.playback_url.startsWith('http') && json.playback_url) ||
        (text.trim().startsWith('http') && text.trim());
      if (candidate) return candidate;
    } catch {
      /* not JSON — fall through to URL extraction */
    }
    const m = text.match(/https?:\/\/[^\s"'<>]+/);
    return m ? m[0] : target;
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
        const attr = line.match(URI_ATTR_RE);
        if (attr) {
          const abs = new URL(attr[2], baseUrl).href;
          return `${attr[1]}${buildProxyUrl(abs, params)}${attr[3]}`;
        }
        return line;
      }

      if (trimmed === '') return line;

      const abs = new URL(trimmed, baseUrl).href;
      return buildProxyUrl(abs, params);
    })
    .join('\n');
}

// ----------------------------------------------------------------------

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('url');

  if (!target) {
    return new Response('Missing "url" query parameter', { status: 400 });
  }

  const referer = searchParams.get('referer') || undefined;
  const origin = searchParams.get('origin') || undefined;
  const ua = searchParams.get('ua') || DEFAULT_UA;
  const tokenUrl = searchParams.get('tokenUrl') || undefined;

  const fetchTarget = await resolveTokenTarget(target, tokenUrl);

  const upstreamHeaders = { 'User-Agent': ua };
  if (referer) upstreamHeaders.Referer = referer;
  if (origin) upstreamHeaders.Origin = origin;

  const range = req.headers.get('range');
  if (range) upstreamHeaders.Range = range;

  let upstream;
  try {
    // Bound the upstream request: a CDN that never responds would otherwise
    // outlive the serverless function and surface as a gateway 502.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      upstream = await fetch(fetchTarget, {
        headers: upstreamHeaders,
        redirect: 'follow',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    return new Response(`Upstream fetch failed: ${e.message}`, { status: 502 });
  }

  if (!upstream.ok && upstream.status !== 206) {
    return new Response(`Upstream HTTP ${upstream.status}`, { status: upstream.status });
  }

  // ── Playlists: rewrite HLS URIs so segments go through the proxy too. ──
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
      return new Response(`Playlist read failed: ${e.message}`, { status: 502 });
    }

    const rewritten = rewritePlaylist(body, fetchTarget, { referer, origin, ua, tokenUrl });

    const headers = new Headers(CORS_HEADERS);
    headers.set('Content-Type', 'application/vnd.apple.mpegurl');
    headers.set('Cache-Control', 'no-store');
    return new Response(rewritten, { headers });
  }

  if (isMpd) {
    // DASH manifests are not rewritten (no current scraper emits them);
    // pass through with CORS so a DASH player can consume them.
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

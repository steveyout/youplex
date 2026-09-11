/**
 * MultiEmbed / 2embed extractor.
 *
 * Reverse-engineered extraction chain:
 *   1. api.2embed.cc/movie?tmdb_id={id}        → IMDB ID + metadata
 *   2. www.2embed.cc/embed/{imdb_id}            → server list (HTML dropdown)
 *   3. streamsrcs.2embed.cc/xps?imdb={imdb_id}  → JS redirect
 *   4. play.xpass.top/e/movie/{imdb_id}         → JWPlayer + playlist URLs
 *   5. play.xpass.top/mdata/{id}/.../playlist.json → m3u8 sources
 *
 * Security: PHP session cookie, sandbox detection, referer checks.
 * XPS provides auth_token cookie (24h expiry) with JWPlayer.
 */

import { fetchText, fetchJSON, DEFAULT_UA } from '../utils';

// ── Constants ────────────────────────────────────────────────

const API_BASE = 'https://api.2embed.cc';
const EMBED_BASE = 'https://www.2embed.cc';

// ── Step 1: Get IMDB ID from API ─────────────────────────────

async function getImdbId(tmdbId, mediaType) {
  try {
    const endpoint = mediaType === 'movie' ? 'movie' : 'tv';
    const data = await fetchJSON(`${API_BASE}/${endpoint}?tmdb_id=${tmdbId}`, {
      headers: { 'User-Agent': DEFAULT_UA },
    });
    return data?.imdb_id ?? null;
  } catch {
    return null;
  }
}

// ── Step 2: Parse server list from embed page ────────────────

function parseServersFromEmbed(html) {
  const servers = [];

  // Extract onclick handlers from the dropdown
  const onclickRegex = /onclick="go\('(https:\/\/streamsrcs\.2embed\.cc\/([^?]+)\?([^']*))'\)"/g;
  let match;
  while ((match = onclickRegex.exec(html)) !== null) {
    const url = match[1];
    const path = match[2];

    let type;
    if (path.startsWith('swish')) type = 'swish';
    else if (path.startsWith('xps')) type = 'xps';
    else if (path.startsWith('vesy')) type = 'vesy';
    else if (path.startsWith('vcr')) type = 'vcr';
    else continue;

    servers.push({ name: type === 'swish' ? '2embed' : capitalize(type), url, type });
  }

  // Also check data-src on the iframe (default server)
  const datasrcMatch = html.match(/data-src="([^"]+)"/);
  if (datasrcMatch?.[1] && !servers.some((s) => s.url === datasrcMatch[1])) {
    const url = datasrcMatch[1];
    let type = 'swish';
    if (url.includes('/xps')) type = 'xps';
    else if (url.includes('/vesy')) type = 'vesy';
    else if (url.includes('/vcr')) type = 'vcr';

    servers.unshift({ name: type === 'swish' ? '2embed' : capitalize(type), url, type });
  }

  return servers;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Step 3: Resolve streamsrc URL to final player URL ────────

function resolveStreamSrcUrl(server, mediaType = 'movie') {
  const url = new URL(server.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const contentPath = mediaType === 'tv' ? 'tv' : 'movie';

  switch (server.type) {
    case 'swish': {
      const hash = params.id || url.pathname.split('/').pop();
      return `https://2vcdn.skin/e/${hash}`;
    }
    case 'xps': {
      const imdb = params.imdb || '';
      const tmdb = params.tmdb || '';
      if (mediaType === 'tv') {
        const s = params.s || '1';
        const e = params.e || '1';
        return `https://play.xpass.top/e/tv/${tmdb}/${s}/${e}?autostart=true`;
      }
      const autostart = imdb ? '?autostart=true' : '';
      return `https://play.xpass.top/e/movie/${imdb}${autostart}`;
    }
    case 'vesy': {
      const tmdb = params.tmdb || '';
      return `https://player.videasy.to/${contentPath}/${tmdb}?color=FFFFFF`;
    }
    case 'vcr': {
      const tmdb = params.tmdb || '';
      return `https://vidcore.net/${contentPath}/${tmdb}?autoplay=true`;
    }
    default:
      return server.url;
  }
}

// ── Step 4: Extract backup servers & playlist URLs from XPS ───

/** Extract a balanced JSON array/object starting at `openIdx` (must point at [ or {). */
function extractBalancedJson(html, openIdx) {
  const open = html[openIdx];
  if (open !== '[' && open !== '{') return null;
  const close = open === '[' ? ']' : '}';
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = openIdx; i < html.length; i++) {
    const ch = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return html.slice(openIdx, i + 1);
    }
  }
  return null;
}

function parseXpsPage(html) {
  let backups = [];
  const backupsKey = html.indexOf('var backups=');
  if (backupsKey >= 0) {
    const arrStart = html.indexOf('[', backupsKey);
    const json = arrStart >= 0 ? extractBalancedJson(html, arrStart) : null;
    if (json) {
      try {
        backups = JSON.parse(json);
      } catch {
        /* ignore */
      }
    }
  }

  let primaryPlaylist = '';
  const dataKey = html.indexOf('var data=');
  if (dataKey >= 0) {
    const objStart = html.indexOf('{', dataKey);
    const json = objStart >= 0 ? extractBalancedJson(html, objStart) : null;
    if (json) {
      try {
        const data = JSON.parse(json);
        if (typeof data.playlist === 'string') primaryPlaylist = data.playlist;
      } catch {
        /* ignore */
      }
    }
  }

  const dataUrlMatch = html.match(/var dataUrl="([^"]+)"/);
  const dataUrl = dataUrlMatch?.[1] ?? '';

  const subUrlMatch = html.match(/var suburl="([^"]+)"/);
  const subUrl = subUrlMatch?.[1] ?? '';

  return { backups, dataUrl, subUrl, primaryPlaylist };
}

// ── Step 5: Fetch playlist.json and extract sources ──────────

async function fetchPlaylistSources(playlistUrl, baseUrl, referer) {
  const fullUrl = playlistUrl.startsWith('http')
    ? playlistUrl
    : `${baseUrl.replace(/\/$/, '')}${playlistUrl.startsWith('/') ? '' : '/'}${playlistUrl}`;

  try {
    const data = await fetchJSON(fullUrl, {
      headers: {
        'User-Agent': DEFAULT_UA,
        Referer: referer,
        Origin: baseUrl,
        Accept: 'application/json,*/*',
      },
    });

    /** @type {import('../types').StreamSource[]} */
    const sources = [];
    const items = Array.isArray(data.playlist) ? data.playlist : [];
    for (const item of items) {
      const srcList = Array.isArray(item?.sources) ? item.sources : [];
      for (const source of srcList) {
        if (!source?.file) continue;
        if (source.file.includes('/video/error') || source.file.includes('/error')) continue;
        if (!source.file.startsWith('http') && !source.file.startsWith('/')) continue;
        sources.push({
          url: source.file,
          quality: source.label || 'Auto',
          type: source.type === 'hls' || source.file.includes('.m3u8') ? 'hls' : 'mp4',
          title: `2embed ${source.label || source.id || ''}`.trim(),
        });
      }
    }
    return sources;
  } catch {
    return [];
  }
}

// ── Step 6: Extract subtitles ─────────────────────────────────

async function fetchSubtitles(subUrl) {
  if (!subUrl) return [];

  try {
    const data = await fetchJSON(subUrl, { headers: { 'User-Agent': DEFAULT_UA } });

    /** @type {import('../types').SubtitleTrack[]} */
    const tracks = [];
    if (Array.isArray(data)) {
      for (const sub of data) {
        tracks.push({
          url: sub.file || sub.url || '',
          label: sub.label || sub.language || sub.lang || '',
          language: sub.lang || sub.language || 'en',
        });
      }
    } else if (data?.subtitles) {
      for (const sub of data.subtitles) {
        tracks.push({
          url: sub.file || sub.url || '',
          label: sub.label || sub.language || sub.lang || '',
          language: sub.lang || sub.language || 'en',
        });
      }
    }
    return tracks;
  } catch {
    return [];
  }
}

// ── Main Extractor ───────────────────────────────────────────

/**
 * @param {number} tmdbId
 * @param {string} [mediaType]
 * @param {number} [season]
 * @param {number} [episode]
 * @returns {Promise<{sources: import('../types').StreamSource[], subtitles: import('../types').SubtitleTrack[]}>}
 */
export async function extractMultiEmbed(tmdbId, mediaType = 'movie', season, episode) {
  const empty = { sources: [], subtitles: [] };
  const h = { 'User-Agent': DEFAULT_UA };

  try {
    // ── Step 1: Build embed URL ───────────────────────────
    let embedPath;
    if (mediaType === 'movie') {
      const imdbId = await getImdbId(tmdbId, mediaType);
      embedPath = imdbId ? `/embed/${imdbId}` : `/embed/${tmdbId}`;
    } else {
      const s = season ?? 1;
      const e = episode ?? 1;
      embedPath = `/embedtv/${tmdbId}&s=${s}&e=${e}`;
    }

    const embedHtml = await fetchText(`${EMBED_BASE}${embedPath}`, {
      headers: { ...h, Referer: `${EMBED_BASE}/` },
    });

    const servers = parseServersFromEmbed(embedHtml);
    if (!servers.length) return empty;

    // ── Step 2: Try XPS first (most backends), fall back to others ──
    const priorityOrder = ['xps', 'swish', 'vesy', 'vcr'];
    /** @type {import('../types').StreamSource[]} */
    const allSources = [];
    /** @type {import('../types').SubtitleTrack[]} */
    let allSubtitles = [];

    for (const preferredType of priorityOrder) {
      const server = servers.find((s) => s.type === preferredType);
      if (!server) continue;

      try {
        if (server.type === 'xps') {
          const xpsUrl = resolveStreamSrcUrl(server, mediaType);
          const result = await followXpsChain(xpsUrl, 'https://streamsrcs.2embed.cc/', h);

          if (result.subtitles.length) allSubtitles = result.subtitles;
          if (result.sources.length) {
            allSources.push(...result.sources);
            break;
          }
        } else {
          const finalUrl = resolveStreamSrcUrl(server, mediaType);

          try {
            const playerHtml = await fetchText(finalUrl, {
              headers: { ...h, Referer: 'https://streamsrcs.2embed.cc/' },
            });

            // Try to find m3u8 URLs directly in the page
            const m3u8Matches = playerHtml.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/g);
            if (m3u8Matches) {
              for (const m3u8Url of m3u8Matches) {
                allSources.push({
                  url: m3u8Url,
                  quality: server.name,
                  type: 'hls',
                  title: `2embed ${server.name}`,
                  referer: new URL(finalUrl).origin,
                });
              }
            }

            // Also try to find playlist.json patterns
            const playlistMatches = playerHtml.match(/\/[^"'\s]*playlist\.json[^"'\s]*/g);
            if (playlistMatches) {
              for (const plPath of playlistMatches) {
                try {
                  const plBase = new URL(finalUrl).origin;
                  const sources = await fetchPlaylistSources(plPath, plBase, finalUrl);
                  allSources.push(...sources);
                } catch {
                  /* continue */
                }
              }
            }
          } catch {
            // If we can't extract from this server, try next
            continue;
          }

          if (allSources.length) break;
        }
      } catch {
        // Try next server type
        continue;
      }
    }

    // ── Deduplicate and sanitize sources ──
    const seen = new Set();
    const deduped = allSources
      .filter((s) => {
        const key = s.url;
        if (!key || seen.has(key)) return false;
        if (!/^https?:\/\//i.test(s.url)) return false;
        if (/\/video\/error|\/error\b/i.test(s.url)) return false;
        seen.add(key);
        return true;
      })
      .map((s) => {
        if (!s.referer) {
          return { ...s, referer: 'https://play.xpass.top/' };
        }
        return s;
      });

    return { sources: deduped, subtitles: allSubtitles };
  } catch {
    return empty;
  }
}

/**
 * Follow through the full XPS chain from an embed page,
 * extracting actual m3u8 sources from playlist.json backends.
 */
async function followXpsChain(xpsUrl, refererSrc, h) {
  const xpsBase = new URL(xpsUrl).origin;

  const xpsHtml = await fetchText(xpsUrl, {
    headers: { ...h, Referer: refererSrc },
  });

  const { backups, subUrl, primaryPlaylist } = parseXpsPage(xpsHtml);

  /** @type {import('../types').SubtitleTrack[]} */
  const subtitles = [];
  if (subUrl) {
    const subs = await fetchSubtitles(subUrl);
    if (subs.length) subtitles.push(...subs);
  }

  /** @type {import('../types').StreamSource[]} */
  const sources = [];
  const seenUrls = new Set();

  const tryPlaylist = async (playlistPath, label) => {
    if (!playlistPath) return;
    const playlistSources = await fetchPlaylistSources(playlistPath, xpsBase, xpsUrl);
    for (const s of playlistSources) {
      if (seenUrls.has(s.url)) continue;
      seenUrls.add(s.url);
      sources.push({
        ...s,
        title: s.title || (label ? `2embed ${label}` : '2embed'),
        quality: s.quality || label || 'Auto',
        referer: 'https://play.xpass.top/',
      });
    }
  };

  // Primary JWPlayer playlist first (usually best)
  await tryPlaylist(primaryPlaylist, 'Primary');

  // Then backup CDNs (cap to avoid slow extraction)
  const maxBackups = Math.min(backups.length, 8);
  for (let i = 0; i < maxBackups; i++) {
    const backup = backups[i];
    if (!backup.url) continue;
    await tryPlaylist(backup.url, backup.name || `Server ${i + 1}`);
    if (sources.length >= 6) break;
  }

  // If no playlist sources found, try direct m3u8 in the page
  if (!sources.length) {
    const m3u8Matches = xpsHtml.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/g);
    if (m3u8Matches) {
      for (const url of m3u8Matches) {
        if (seenUrls.has(url)) continue;
        seenUrls.add(url);
        sources.push({
          url,
          quality: 'Auto',
          type: 'hls',
          title: '2embed',
          referer: 'https://play.xpass.top/',
        });
      }
    }
  }

  return { sources, subtitles };
}
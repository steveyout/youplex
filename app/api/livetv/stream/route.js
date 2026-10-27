import { fetchWithDns, getBaseUrls } from '@/lib/livetv/fetch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function findLegacyPlaylist(html) {
  const encoded = [...html.matchAll(/(?:window\.)?atob\s*\(\s*['"]([^'"]+)['"]\s*\)/g)];
  for (const match of encoded) {
    try {
      const value = Buffer.from(match[1], 'base64').toString('utf8');
      if (value.startsWith('http') && value.includes('.m3u8')) return value;
    } catch {}
  }
  return html.match(/https?:\/\/[^"'\\\s]+\.m3u8[^"'\\\s]*/i)?.[0] || null;
}

export async function GET(request) {
  const channel = new URL(request.url).searchParams.get('channel');
  if (!channel) {
    return Response.json({ success: false, error: 'Missing channel parameter' }, { status: 400 });
  }

  const baseUrls = getBaseUrls();
  let streamHtml = '';
  let successfulBase = '';
  let lastError = null;

  // 1. Fetch channel stream page across configured mirrors
  for (const base of baseUrls) {
    try {
      const streamPage = `${base}/stream/stream-${encodeURIComponent(channel)}.php`;
      const res = await fetchWithDns(streamPage, {
        headers: {
          Referer: `${base}/`,
          Accept: 'text/html,*/*',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        streamHtml = await res.text();
        successfulBase = base;
        break;
      }
    } catch (e) {
      lastError = e;
    }
  }

  if (!streamHtml) {
    return Response.json(
      { success: false, error: lastError?.message || 'Channel stream page unavailable from any mirror' },
      { status: 502 }
    );
  }

  try {
    // 2. Extract embedded player iframe
    const iframeValue = streamHtml.match(/<iframe[^>]+src=['"]([^'"]+)['"]/i)?.[1];
    const iframe = iframeValue
      ? iframeValue.startsWith('http')
        ? iframeValue
        : new URL(iframeValue, successfulBase).href
      : null;

    let iframeHtml = '';
    if (iframe) {
      const iframeRes = await fetchWithDns(iframe, {
        headers: {
          Referer: `${successfulBase}/`,
          Accept: 'text/html,*/*',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (iframeRes.ok) {
        iframeHtml = await iframeRes.text();
      }
    }

    // 3. Check for new edge token architecture (dembed.st / edge.*.sbs)
    const content = iframeHtml || streamHtml;
    const edgeMatch = content.match(/const\s+EDGE\s*=\s*["']([^"']+)["']/i);
    const channelMatch = content.match(/const\s+CHANNEL\s*=\s*["']([^"']+)["']/i);
    const srcMatch = content.match(/const\s+SRC\s*=\s*["']([^"']+)["']/i);

    let playlistUrl = null;
    let tokenUrl = null;
    const iframeUrl = iframe || `${successfulBase}/`;
    const origin = iframe ? new URL(iframe).origin : 'https://dembed.st';
    const referer = iframe || `${origin}/`;

    if (edgeMatch && channelMatch) {
      const edge = edgeMatch[1].replace(/\/+$/, '');
      const channelSlug = channelMatch[1];
      tokenUrl = `${edge}/api/playlist-token?slug=${encodeURIComponent(channelSlug)}`;

      // Fetch the initial token
      let token = '';
      try {
        const tokenRes = await fetchWithDns(tokenUrl, {
          headers: {
            Referer: iframeUrl,
            Origin: origin,
            Accept: 'application/json, text/plain, */*',
          },
          signal: AbortSignal.timeout(8000),
        });
        if (tokenRes.ok) {
          const tokenJson = await tokenRes.json();
          if (tokenJson && tokenJson.token) {
            token = tokenJson.token;
          }
        }
      } catch (e) {
        console.warn('[Live TV] Token pre-fetch failed, proxy will resolve on demand:', e.message);
      }

      const rawSrc = srcMatch ? srcMatch[1] : `${edge}/${channelSlug}/index.m3u8`;
      playlistUrl = token ? `${rawSrc}?t=${encodeURIComponent(token)}` : rawSrc;
    } else {
      // Legacy fallback
      const legacyPlaylist = findLegacyPlaylist(iframeHtml) || findLegacyPlaylist(streamHtml);
      if (legacyPlaylist) {
        playlistUrl = new URL(legacyPlaylist, iframe || successfulBase).href;
      }
    }

    if (!playlistUrl) {
      throw new Error('No HLS playlist found for this channel');
    }

    const q = new URLSearchParams({
      url: playlistUrl,
      origin,
      referer,
    });
    if (tokenUrl) {
      q.set('tokenUrl', tokenUrl);
    }
    const proxyUrl = `/api/hls?${q.toString()}`;

    return Response.json({
      success: true,
      streamUrl: proxyUrl,
      channel,
      source: {
        url: proxyUrl,
        type: 'hls',
        referer,
        origin,
      },
    });
  } catch (error) {
    console.error('[Live TV stream error]', error);
    return Response.json({ success: false, error: error.message || 'Stream unavailable' }, { status: 502 });
  }
}

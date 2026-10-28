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
  let officialStreamPage = '';

  // 1. Fetch channel stream page across configured mirrors
  for (const base of baseUrls) {
    try {
      const streamPage = `${base}/stream/stream-${encodeURIComponent(channel)}.php`;
      const res = await fetchWithDns(streamPage, {
        headers: {
          Referer: `${base}/`,
          Accept: 'text/html,*/*',
        },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const text = await res.text();
        const hasIframe = text.includes('<iframe');
        const hasM3u8 = text.includes('.m3u8');
        if (text && text.length > 500 && (hasIframe || hasM3u8)) {
          streamHtml = text;
          successfulBase = base;
          officialStreamPage = streamPage;
          break;
        }
      }
    } catch {}
  }

  // 1b. Fallback: try watch.php endpoint if direct stream page was not found
  if (!streamHtml) {
    for (const base of baseUrls) {
      try {
        const watchPage = `${base}/watch.php?id=${encodeURIComponent(channel)}`;
        const res = await fetchWithDns(watchPage, {
          headers: {
            Referer: `${base}/`,
            Accept: 'text/html,*/*',
          },
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok) {
          const text = await res.text();
          const hasIframe = text.includes('<iframe');
          if (text && text.length > 500 && hasIframe) {
            streamHtml = text;
            successfulBase = base;
            officialStreamPage = watchPage;
            break;
          }
        }
      } catch {}
    }
  }

  // 2. Extract embedded player iframe if available
  const iframeValue = streamHtml ? streamHtml.match(/<iframe[^>]+src=['"]([^'"]+)['"]/i)?.[1] : null;

  // If no working stream or iframe was found across any mirror, the event has ended or is offline
  if (!streamHtml || (!iframeValue && !findLegacyPlaylist(streamHtml))) {
    return Response.json(
      {
        success: false,
        error: 'This live stream or event broadcast has ended or is currently offline.',
      },
      { status: 404 }
    );
  }

  const targetIframeUrl = iframeValue
    ? iframeValue.startsWith('http')
      ? iframeValue
      : new URL(iframeValue, successfulBase || 'https://thedaddy.pk').href
    : officialStreamPage;

  // 3. Check if an explicit legacy HLS playlist (.m3u8) is directly available
  const legacyPlaylist = findLegacyPlaylist(streamHtml);
  if (legacyPlaylist && !legacyPlaylist.includes('.sbs') && !legacyPlaylist.includes('dembed.st')) {
    const origin = successfulBase || 'https://thedaddy.pk';
    const referer = `${origin}/`;
    const q = new URLSearchParams({
      url: legacyPlaylist,
      origin,
      referer,
    });
    const proxyUrl = `/api/hls?${q.toString()}`;

    return Response.json({
      success: true,
      streamUrl: proxyUrl,
      channel,
      isIframe: false,
      source: {
        url: proxyUrl,
        type: 'hls',
        referer,
        origin,
      },
    });
  }

  // 4. Default & primary DaddyLive path: deliver clean, direct iframe stream
  return Response.json({
    success: true,
    channel,
    streamUrl: targetIframeUrl,
    isIframe: true,
    source: {
      url: targetIframeUrl,
      type: 'iframe',
      iframeUrl: targetIframeUrl,
      officialUrl: officialStreamPage,
      referer: successfulBase ? `${successfulBase}/` : 'https://thedaddy.pk/',
      origin: 'https://dembed.st',
    },
  });
}

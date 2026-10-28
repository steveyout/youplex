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

  const defaultDembedUrl = `https://dembed.st/premiumtv/daddy.php?id=${encodeURIComponent(channel)}`;
  const baseUrls = getBaseUrls();
  let streamHtml = '';
  let successfulBase = '';

  // 1. Fetch channel stream page across configured mirrors
  for (const base of baseUrls) {
    try {
      const streamPage = `${base}/stream/stream-${encodeURIComponent(channel)}.php`;
      const res = await fetchWithDns(streamPage, {
        headers: {
          Referer: `${base}/`,
          Accept: 'text/html,*/*',
        },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 500) {
          streamHtml = text;
          successfulBase = base;
          break;
        }
      }
    } catch {}
  }

  // 2. Extract embedded player iframe if available
  const iframeValue = streamHtml ? streamHtml.match(/<iframe[^>]+src=['"]([^'"]+)['"]/i)?.[1] : null;
  const iframe = iframeValue
    ? iframeValue.startsWith('http')
      ? iframeValue
      : new URL(iframeValue, successfulBase || 'https://thedaddy.pk').href
    : defaultDembedUrl;

  const targetIframeUrl = iframe || defaultDembedUrl;

  // 3. Check if an explicit legacy HLS playlist (.m3u8) is directly available
  let directPlaylistUrl = null;
  if (streamHtml) {
    const legacyPlaylist = findLegacyPlaylist(streamHtml);
    if (legacyPlaylist) {
      directPlaylistUrl = legacyPlaylist;
    }
  }

  // If a direct, standard m3u8 playlist is found (not stego dembed edge), route through proxy
  if (directPlaylistUrl && !directPlaylistUrl.includes('.sbs') && !directPlaylistUrl.includes('dembed.st')) {
    const origin = successfulBase || 'https://thedaddy.pk';
    const referer = `${origin}/`;
    const q = new URLSearchParams({
      url: directPlaylistUrl,
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
  // dembed.st contains custom JWPlayer + LiveLoader stego TS decoding that runs in browser
  return Response.json({
    success: true,
    channel,
    streamUrl: targetIframeUrl,
    isIframe: true,
    source: {
      url: targetIframeUrl,
      type: 'iframe',
      iframeUrl: targetIframeUrl,
      referer: successfulBase ? `${successfulBase}/` : 'https://thedaddy.pk/',
      origin: 'https://dembed.st',
    },
  });
}

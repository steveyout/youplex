import { fetchWithDns, getBaseUrls } from '@/lib/livetv/fetch';
import fastChannelsData from '@/lib/data/fast-channels.json';

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
  const url = new URL(request.url);
  const channel = url.searchParams.get('channel');
  const requestedMirror = url.searchParams.get('mirror');
  if (!channel) {
    return Response.json({ success: false, error: 'Missing channel parameter' }, { status: 400 });
  }

  // Check if channel is from our FAST (Pluto TV) or IPTV-org native catalog
  const fastChannel = (fastChannelsData?.channels || []).find(
    (c) => String(c.id) === String(channel) || String(c.originalId) === String(channel)
  );

  if (fastChannel && fastChannel.streamUrl) {
    const q = new URLSearchParams({
      url: fastChannel.streamUrl,
    });
    const proxyUrl = `/api/hls?${q.toString()}`;

    return Response.json({
      success: true,
      channel,
      streamUrl: proxyUrl,
      isIframe: false,
      source: {
        url: proxyUrl,
        type: 'hls',
        isIframe: false,
        name: fastChannel.name,
        logo: fastChannel.logo,
        category: fastChannel.category,
        provider: fastChannel.provider,
        isLive: true,
      },
    });
  }

  const allBases = getBaseUrls();
  const baseUrls = requestedMirror
    ? [
        ...allBases.filter((b) => b.includes(requestedMirror)),
        ...allBases.filter((b) => !b.includes(requestedMirror)),
      ]
    : allBases;
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

  // NOTE: dembed.st inspects Referer headers and Sec-Fetch-Dest: iframe.
  // Direct client embedding of dembed.st returns HTTP 403 Forbidden ("Not allowed to stream").
  // Framing the mirror stream page (e.g. thedaddy.pk or thedaddy.li) allows it to frame dembed.st
  // with its own authorized domain Referer, playing the live stream seamlessly.
  const targetIframeUrl = officialStreamPage || (
    iframeValue
      ? iframeValue.startsWith('http')
        ? iframeValue
        : new URL(iframeValue, successfulBase || 'https://thedaddy.li').href
      : `${successfulBase || 'https://thedaddy.li'}/stream/stream-${encodeURIComponent(channel)}.php`
  );

  // 3. Check if an explicit legacy HLS playlist (.m3u8) is directly available
  const legacyPlaylist = findLegacyPlaylist(streamHtml);
  if (legacyPlaylist && !legacyPlaylist.includes('.sbs') && !legacyPlaylist.includes('dembed.st')) {
    const origin = successfulBase || 'https://thedaddy.li';
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

  const mirrors = allBases.map((base, idx) => ({
    id: new URL(base).hostname,
    name: `Server ${idx + 1} (${new URL(base).hostname})`,
    url: `${base}/stream/stream-${encodeURIComponent(channel)}.php`,
    isCurrent: base === successfulBase,
  }));

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
      mirrors,
      currentMirror: successfulBase ? new URL(successfulBase).hostname : null,
      referer: successfulBase ? `${successfulBase}/` : 'https://thedaddy.li/',
      origin: successfulBase || 'https://thedaddy.li',
    },
  });
}

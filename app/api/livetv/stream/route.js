const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function findPlaylist(html) {
  const encoded = [...html.matchAll(/(?:window\.)?atob\s*\(\s*['"]([^'"]+)['"]\s*\)/g)];
  for (const match of encoded) {
    try {
      const value = Buffer.from(match[1], 'base64').toString('utf8');
      if (value.startsWith('http') && value.includes('.m3u8')) return value;
    } catch {}
  }
  return html.match(/https?:\/\/[^"'\\\s]+\.m3u8[^"'\\\s]*/i)?.[0] || null;
}

async function getText(url, referer) {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Referer: referer, Accept: 'text/html,*/*' },
    signal: AbortSignal.timeout(12000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Upstream request failed: ${response.status}`);
  return response.text();
}

export async function GET(request) {
  const channel = new URL(request.url).searchParams.get('channel');
  if (!channel) return Response.json({ success: false, error: 'Missing channel parameter' }, { status: 400 });

  try {
    const streamPage = `https://dlhd.st/stream/stream-${encodeURIComponent(channel)}.php`;
    const streamHtml = await getText(streamPage, `https://dlhd.st/watch.php?id=${channel}`);
    const iframeValue = streamHtml.match(/<iframe[^>]+src=['"]([^'"]+)['"]/i)?.[1];
    const iframe = iframeValue ? new URL(iframeValue, streamPage).href : null;
    const iframeHtml = iframe ? await getText(iframe, streamPage) : streamHtml;
    const playlist = findPlaylist(iframeHtml) || findPlaylist(streamHtml);
    if (!playlist) throw new Error('No HLS playlist found for this channel');

    const playlistUrl = new URL(playlist, iframe || streamPage).href;
    // DLHD's CDN validates the player origin rather than accepting the CDN
    // origin as a browser referer.
    const origin = 'https://hamis.romponalis.st';
    return Response.json({
      success: true,
      streamUrl: playlistUrl,
      channel,
      source: {
        url: playlistUrl,
        type: 'hls',
        referer: origin + '/',
        origin,
      },
    });
  } catch (error) {
    console.error('[Live TV stream]', error);
    return Response.json({ success: false, error: error.message || 'Stream unavailable' }, { status: 502 });
  }
}

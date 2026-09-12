import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const OPEN_SUBTITLES_URL = 'https://api.opensubtitles.com/api/v1';

function toWebVtt(content) {
  if (/^\s*WEBVTT/i.test(content)) return content;

  const normalized = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');

  return `WEBVTT\n\n${normalized}`;
}

function toTrack(file, subtitle, downloadUrl) {
  if (!downloadUrl) return null;

  const language = subtitle.language || file.iso639 || 'en';
  const label = subtitle.feature_details?.movie_name
    ? `${language.toUpperCase()} · ${subtitle.feature_details.movie_name}`
    : language.toUpperCase();

  return {
    label,
    language,
    url: `/api/subtitles/file?url=${encodeURIComponent(downloadUrl)}`,
    isCC: Boolean(subtitle.hearing_impaired),
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const subtitleFileUrl = searchParams.get('url');

  if (subtitleFileUrl) {
    try {
      const target = new URL(subtitleFileUrl);
      if (!['dl.opensubtitles.com', 'www.opensubtitles.com', 'opensubtitles.com'].includes(target.hostname)) {
        return new NextResponse('Invalid subtitle host.', { status: 400 });
      }

      const response = await fetch(target, {
        signal: AbortSignal.timeout(20000),
        cache: 'no-store',
      });
      if (!response.ok) return new NextResponse('Subtitle file unavailable.', { status: response.status });

      const content = await response.text();
      return new NextResponse(toWebVtt(content), {
        headers: {
          'Content-Type': 'text/vtt; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (error) {
      return new NextResponse(error?.message || 'Subtitle file request failed.', { status: 502 });
    }
  }

  const tmdbId = Number(searchParams.get('id'));
  const type = searchParams.get('type') || 'movie';
  const season = Number(searchParams.get('season'));
  const episode = Number(searchParams.get('episode'));
  const apiKey = process.env.OPENSUBTITLES_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ success: false, subtitles: [], error: 'OpenSubtitles is not configured.' }, { status: 503 });
  }

  if (!Number.isFinite(tmdbId) || tmdbId <= 0 || !['movie', 'tv'].includes(type)) {
    return NextResponse.json({ success: false, subtitles: [], error: 'Invalid subtitle request.' }, { status: 400 });
  }

  const params = new URLSearchParams({
    tmdb_id: String(tmdbId),
    type,
    languages: 'en',
  });
  if (type === 'tv' && Number.isFinite(season)) params.set('season_number', String(season));
  if (type === 'tv' && Number.isFinite(episode)) params.set('episode_number', String(episode));

  try {
    const response = await fetch(`${OPEN_SUBTITLES_URL}/subtitles?${params.toString()}`, {
      headers: {
        'Api-Key': apiKey,
        'User-Agent': process.env.OPENSUBTITLES_USER_AGENT || 'Youplex v1.0',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(20000),
      cache: 'no-store',
    });
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, subtitles: [], error: data?.message || 'OpenSubtitles search failed.' },
        { status: response.status }
      );
    }

    const subtitles = (data.data || [])
      .slice(0, 6)
      .map(async (item) => {
        const attributes = item.attributes || {};
        const file = attributes.files?.[0];
        if (!file) return null;

        let downloadUrl = file.download_url;
        if (!downloadUrl && file.file_id) {
          const downloadResponse = await fetch(`${OPEN_SUBTITLES_URL}/download`, {
            method: 'POST',
            headers: {
              'Api-Key': apiKey,
              'User-Agent': process.env.OPENSUBTITLES_USER_AGENT || 'Youplex v1.0',
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ file_id: file.file_id }),
            signal: AbortSignal.timeout(15000),
          });
          const downloadData = await downloadResponse.json();
          if (downloadResponse.ok) downloadUrl = downloadData?.link;
        }

        return toTrack(file, attributes, downloadUrl);
      });

    const resolvedSubtitles = (await Promise.all(subtitles))
      .filter(Boolean);

    return NextResponse.json({ success: true, subtitles: resolvedSubtitles });
  } catch (error) {
    return NextResponse.json(
      { success: false, subtitles: [], error: error?.message || 'OpenSubtitles request failed.' },
      { status: 502 }
    );
  }
}

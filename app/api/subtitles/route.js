import zlib from 'zlib';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const OPEN_SUBTITLES_URL = 'https://api.opensubtitles.com/api/v1';

const LANGUAGE_NAMES = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  ar: 'Arabic',
  hi: 'Hindi',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  tr: 'Turkish',
  nl: 'Dutch',
  pl: 'Polish',
  id: 'Indonesian',
  sv: 'Swedish',
  da: 'Danish',
  fi: 'Finnish',
  no: 'Norwegian',
  cs: 'Czech',
  el: 'Greek',
  he: 'Hebrew',
  ro: 'Romanian',
  th: 'Thai',
  vi: 'Vietnamese',
  uk: 'Ukrainian',
  hu: 'Hungarian',
  fa: 'Persian',
};

const DEFAULT_LANGUAGES =
  'en,es,fr,de,it,pt,ru,ar,hi,ja,ko,zh,tr,nl,pl,id,sv,da,fi,no,cs,el,he,ro,th,vi,uk,hu,fa';

function extractSrtFromZip(buffer) {
  let offset = 0;
  while (offset < buffer.length - 30) {
    if (buffer.readUInt32LE(offset) === 0x04034b50) {
      const compMethod = buffer.readUInt16LE(offset + 8);
      const compSize = buffer.readUInt32LE(offset + 18);
      const fileNameLen = buffer.readUInt16LE(offset + 26);
      const extraLen = buffer.readUInt16LE(offset + 28);
      const fileName = buffer.toString('utf8', offset + 30, offset + 30 + fileNameLen);
      const dataOffset = offset + 30 + fileNameLen + extraLen;

      if (fileName.endsWith('.srt') || fileName.endsWith('.vtt')) {
        const compressedData = buffer.subarray(dataOffset, dataOffset + compSize);
        if (compMethod === 8) {
          try {
            return zlib.inflateRawSync(compressedData).toString('utf8');
          } catch {
            return null;
          }
        } else if (compMethod === 0) {
          return compressedData.toString('utf8');
        }
      }
      offset = dataOffset + compSize;
    } else {
      offset += 1;
    }
  }
  return null;
}

function toWebVtt(content) {
  if (!content) return 'WEBVTT\n\n';
  if (/^\s*WEBVTT/i.test(content)) return content;

  const normalized = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, (match, p1, p2) => `${p1}.${p2}`);

  return `WEBVTT\n\n${normalized}`;
}

function toTrack(file, subtitle, downloadUrl) {
  if (!downloadUrl) return null;

  const langCode = (subtitle.language || file?.iso639 || 'en').toLowerCase();
  const langName = LANGUAGE_NAMES[langCode] || langCode.toUpperCase();
  const isCC = Boolean(subtitle.hearing_impaired);
  const releaseName = subtitle.release || subtitle.feature_details?.movie_name;
  const label = isCC
    ? `${langName} [CC]`
    : releaseName && releaseName !== langName
    ? `${langName} (${releaseName.slice(0, 24)})`
    : langName;

  return {
    label,
    language: langCode,
    url: `/api/subtitles?url=${encodeURIComponent(downloadUrl)}`,
    isCC,
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const subtitleFileUrl = searchParams.get('url');

  // Subtitle File Proxy: Fetches external SRT, VTT, or Zip from OpenSubtitles, converts to WebVTT, and serves with CORS
  if (subtitleFileUrl) {
    try {
      const target = new URL(subtitleFileUrl);
      if (!['http:', 'https:'].includes(target.protocol)) {
        return new NextResponse('Invalid subtitle URL protocol.', { status: 400 });
      }

      const response = await fetch(target, {
        headers: {
          'User-Agent':
            process.env.OPENSUBTITLES_USER_AGENT ||
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: '*/*',
        },
        signal: AbortSignal.timeout(20000),
        cache: 'no-store',
      });

      if (!response.ok) {
        return new NextResponse('Subtitle file unavailable.', { status: response.status });
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      let textContent = '';
      const isZip =
        buffer.length > 4 &&
        buffer.readUInt32LE(0) === 0x04034b50;

      if (isZip || subtitleFileUrl.includes('download/sub')) {
        textContent = extractSrtFromZip(buffer) || '';
      }

      if (!textContent) {
        textContent = buffer.toString('utf8');
      }

      return new NextResponse(toWebVtt(textContent), {
        headers: {
          'Content-Type': 'text/vtt; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        },
      });
    } catch (error) {
      return new NextResponse(error?.message || 'Subtitle file request failed.', { status: 502 });
    }
  }

  const rawId = searchParams.get('tmdb_id') || searchParams.get('id');
  const tmdbId = Number(rawId);
  const type = searchParams.get('type') || 'movie';
  const season = Number(searchParams.get('season'));
  const episode = Number(searchParams.get('episode'));
  const userLanguages = searchParams.get('languages') || DEFAULT_LANGUAGES;
  const apiKey = process.env.OPENSUBTITLES_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { success: false, subtitles: [], error: 'OpenSubtitles is not configured.' },
      { status: 503 }
    );
  }

  if (!Number.isFinite(tmdbId) || tmdbId <= 0 || !['movie', 'tv'].includes(type)) {
    return NextResponse.json(
      { success: false, subtitles: [], error: 'Invalid subtitle request.' },
      { status: 400 }
    );
  }

  try {
    const fetchSubtitles = async (paramsObj) => {
      const response = await fetch(`${OPEN_SUBTITLES_URL}/subtitles?${new URLSearchParams(paramsObj).toString()}`, {
        headers: {
          'Api-Key': apiKey,
          'User-Agent': process.env.OPENSUBTITLES_USER_AGENT || 'Youplex v1.0',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(20000),
        cache: 'no-store',
      });
      if (!response.ok) return [];
      const json = await response.json();
      return json.data || [];
    };

    let items = [];
    if (type === 'tv') {
      const tvParams = {
        parent_tmdb_id: String(tmdbId),
        languages: userLanguages,
      };
      if (Number.isFinite(season)) tvParams.season_number = String(season);
      if (Number.isFinite(episode)) tvParams.episode_number = String(episode);

      items = await fetchSubtitles(tvParams);

      // If parent_tmdb_id yields no results, fallback to tmdb_id
      if (items.length === 0) {
        delete tvParams.parent_tmdb_id;
        tvParams.tmdb_id = String(tmdbId);
        items = await fetchSubtitles(tvParams);
      }
    } else {
      items = await fetchSubtitles({
        tmdb_id: String(tmdbId),
        type: 'movie',
        languages: userLanguages,
      });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ success: true, subtitles: [] });
    }

    // Group items by language code so every language has representation
    const byLanguage = {};
    for (const item of items) {
      const attributes = item.attributes || {};
      const file = attributes.files?.[0];
      const lang = (attributes.language || file?.iso639 || 'en').toLowerCase();
      if (!byLanguage[lang]) byLanguage[lang] = [];
      byLanguage[lang].push(item);
    }

    const selectedTracks = [];

    for (const [lang, langItems] of Object.entries(byLanguage)) {
      // Pick 1 standard and 1 hearing impaired (CC) if available, or up to 2 top items
      const standard = langItems.find((it) => !it.attributes?.hearing_impaired);
      const cc = langItems.find((it) => it.attributes?.hearing_impaired);

      const toAdd = [];
      if (standard) toAdd.push(standard);
      if (cc && cc !== standard) toAdd.push(cc);
      if (toAdd.length === 0 && langItems[0]) toAdd.push(langItems[0]);

      for (const item of toAdd) {
        const attributes = item.attributes || {};
        const file = attributes.files?.[0];
        const legacyId = attributes.legacy_subtitle_id;

        // Unlimited direct download via dl.opensubtitles.org with zero quota usage
        let downloadUrl = legacyId ? `https://dl.opensubtitles.org/en/download/sub/${legacyId}` : file?.download_url;

        if (!downloadUrl && file?.file_id) {
          try {
            const dlRes = await fetch(`${OPEN_SUBTITLES_URL}/download`, {
              method: 'POST',
              headers: {
                'Api-Key': apiKey,
                'User-Agent': process.env.OPENSUBTITLES_USER_AGENT || 'Youplex v1.0',
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ file_id: file.file_id }),
              signal: AbortSignal.timeout(10000),
            });
            if (dlRes.ok) {
              const dlData = await dlRes.json();
              downloadUrl = dlData?.link;
            }
          } catch {
            // Ignore download token errors
          }
        }

        if (downloadUrl) {
          const track = toTrack(file, attributes, downloadUrl);
          if (track) selectedTracks.push(track);
        }
      }
    }

    // Sort: English first, then alphabetical by language name
    selectedTracks.sort((a, b) => {
      if (a.language === 'en' && b.language !== 'en') return -1;
      if (b.language === 'en' && a.language !== 'en') return 1;
      return a.label.localeCompare(b.label);
    });

    // Deduplicate by language + label
    const seen = new Set();
    const uniqueSubtitles = [];
    for (const sub of selectedTracks) {
      const key = `${sub.language}-${sub.label}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueSubtitles.push(sub);
      }
    }

    return NextResponse.json({ success: true, subtitles: uniqueSubtitles });
  } catch (error) {
    return NextResponse.json(
      { success: false, subtitles: [], error: error?.message || 'OpenSubtitles request failed.' },
      { status: 502 }
    );
  }
}

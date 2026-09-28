import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const INTRO_DB_BASE_URL = 'https://api.theintrodb.org/v3/media';
const INTRO_DB_SUBMIT_URL = 'https://api.theintrodb.org/v3/submit';

// Simple in-memory cache to respect rate limits and speed up repeat queries
const cache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const SEGMENT_METADATA = {
  intro: {
    label: 'Intro',
    color: '#E5A00D', // Amber / Gold
    borderColor: '#FDE047',
    icon: 'solar:play-bold',
  },
  recap: {
    label: 'Recap',
    color: '#00B8D9', // Cyan / Teal
    borderColor: '#67E8F9',
    icon: 'solar:history-bold',
  },
  credits: {
    label: 'Credits',
    color: '#8E33FF', // Royal Purple
    borderColor: '#C084FC',
    icon: 'solar:clapperboard-play-bold',
  },
  preview: {
    label: 'Preview',
    color: '#22C55E', // Emerald Green
    borderColor: '#86EFAC',
    icon: 'solar:eye-bold',
  },
};

/**
 * Normalizes raw Intro DB payload into clean, chronological video segments in seconds.
 */
function normalizeSegments(data, durationSec = null) {
  if (!data) return [];

  const segments = [];

  const categoryKeys = ['recap', 'intro', 'preview', 'credits'];

  for (const cat of categoryKeys) {
    const list = data[cat];
    if (Array.isArray(list)) {
      list.forEach((item, index) => {
        const startSec = item.start_ms != null ? Math.max(0, item.start_ms / 1000) : 0;
        const endSec = item.end_ms != null ? Math.max(0, item.end_ms / 1000) : durationSec;

        const meta = SEGMENT_METADATA[cat] || {
          label: cat.charAt(0).toUpperCase() + cat.slice(1),
          color: '#E5A00D',
          borderColor: '#FDE047',
          icon: 'solar:play-bold',
        };

        segments.push({
          id: `${cat}-${index}-${startSec}`,
          type: cat,
          label: meta.label,
          color: meta.color,
          borderColor: meta.borderColor,
          icon: meta.icon,
          start: startSec,
          end: endSec,
          startMs: item.start_ms,
          endMs: item.end_ms,
        });
      });
    }
  }

  // Sort segments chronologically
  segments.sort((a, b) => a.start - b.start);

  return segments;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const tmdbId = searchParams.get('tmdb_id');
  const imdbId = searchParams.get('imdb_id');
  const tvdbId = searchParams.get('tvdb_id');
  const type = searchParams.get('type') || 'movie';
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');
  const durationMs = searchParams.get('duration_ms');

  if (!tmdbId && !imdbId && !tvdbId) {
    return NextResponse.json(
      { success: false, error: 'One of tmdb_id, imdb_id, or tvdb_id is required' },
      { status: 400 }
    );
  }

  const isTv = type === 'tv' || type === 'show' || Boolean(season);
  const cacheKey = [
    tmdbId || imdbId || tvdbId,
    isTv ? 'tv' : 'movie',
    season || '1',
    episode || '1',
    durationMs || 'none',
  ].join(':');

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    const url = new URL(INTRO_DB_BASE_URL);
    if (tmdbId) url.searchParams.set('tmdb_id', tmdbId);
    if (imdbId) url.searchParams.set('imdb_id', imdbId);
    if (tvdbId) url.searchParams.set('tvdb_id', tvdbId);

    if (isTv) {
      url.searchParams.set('season', season || '1');
      url.searchParams.set('episode', episode || '1');
    }

    if (durationMs && Number(durationMs) > 0) {
      url.searchParams.set('duration_ms', String(Math.round(Number(durationMs))));
    }

    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
      next: { revalidate: 86400 }, // 24-hour Next.js fetch cache
    });

    if (!res.ok) {
      if (res.status === 404) {
        const notFoundData = {
          success: false,
          segments: [],
          message: 'No intro/credits timestamps available for this title',
        };
        cache.set(cacheKey, { data: notFoundData, timestamp: Date.now() });
        return NextResponse.json(notFoundData);
      }

      const errorText = await res.text();
      return NextResponse.json(
        { success: false, segments: [], error: `Intro DB returned status ${res.status}: ${errorText}` },
        { status: 200 }
      );
    }

    const data = await res.json();
    const durationSec = durationMs ? Math.round(Number(durationMs) / 1000) : null;
    const segments = normalizeSegments(data, durationSec);

    const result = {
      success: true,
      tmdb_id: data.tmdb_id,
      type: data.type || (isTv ? 'tv' : 'movie'),
      season: data.season,
      episode: data.episode,
      segments,
      raw: data,
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        segments: [],
        error: err?.message || 'Failed to fetch timestamps from Intro DB',
      },
      { status: 200 }
    );
  }
}

/**
 * Handle submissions to TheIntroDB /v3/submit
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      tmdb_id,
      imdb_id,
      tvdb_id,
      type = 'movie',
      season,
      episode,
      segment,
      video_duration_ms,
      start_ms,
      end_ms,
    } = body;

    if (!tmdb_id && !imdb_id && !tvdb_id) {
      return NextResponse.json(
        { success: false, error: 'One of tmdb_id, imdb_id, or tvdb_id is required' },
        { status: 400 }
      );
    }

    if (!segment || start_ms == null || end_ms == null) {
      return NextResponse.json(
        { success: false, error: 'segment, start_ms, and end_ms are required' },
        { status: 400 }
      );
    }

    const payload = {
      ...(tmdb_id ? { tmdb_id: Number(tmdb_id) } : {}),
      ...(imdb_id ? { imdb_id } : {}),
      ...(tvdb_id ? { tvdb_id: Number(tvdb_id) } : {}),
      type: type === 'show' ? 'tv' : type,
      segment,
      start_ms: Number(start_ms),
      end_ms: Number(end_ms),
      ...(video_duration_ms != null ? { video_duration_ms: Number(video_duration_ms) } : {}),
      ...(type === 'tv' || season ? { season: Number(season || 1), episode: Number(episode || 1) } : {}),
    };

    const res = await fetch(INTRO_DB_SUBMIT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data?.message || 'Failed to submit timestamp to TheIntroDB' },
        { status: res.status }
      );
    }

    // In v3, response.submissions is an array (instead of old v2 response.submission)
    const submissions = Array.isArray(data.submissions)
      ? data.submissions
      : data.submission
      ? [data.submission]
      : [];

    return NextResponse.json({
      success: true,
      submissions,
      raw: data,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Submit request failed' },
      { status: 500 }
    );
  }
}

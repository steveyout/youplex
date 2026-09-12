import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const SCRAPER_API_URL = process.env.SCRAPER_API_URL || 'https://api.youplex.site';
const SCRAPER_TIMEOUT_MS = 90000;
const DEFAULT_PROVIDER = 'vidcore';

const PROVIDERS = [
  { id: 'vidcore', label: 'VidCore' },
  { id: 'moviebox', label: 'MovieBox' },
  { id: 'flixhq', label: 'FlixHQ' },
];

/**
 * GET /api/scrape?type=movie|tv&id={tmdbId}[&season=..&episode=..][&provider=..]
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const type = searchParams.get('type') || 'movie';
  const id = Number(searchParams.get('id'));
  const seasonParam = searchParams.get('season');
  const episodeParam = searchParams.get('episode');
  const provider = searchParams.get('provider') || DEFAULT_PROVIDER;

  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json(
      { error: 'Missing or invalid "id" query param (TMDB id)' },
      { status: 400 }
    );
  }

  if (type !== 'movie' && type !== 'tv') {
    return NextResponse.json(
      { error: '"type" must be "movie" or "tv"' },
      { status: 400 }
    );
  }

  const season = type === 'tv' ? Number(seasonParam) : undefined;
  const episode = type === 'tv' ? Number(episodeParam) : undefined;

  if (type === 'tv' && !Number.isFinite(season) && !Number.isFinite(episode)) {
    return NextResponse.json(
      { error: 'TV requests require "season" and "episode" query params' },
      { status: 400 }
    );
  }

  try {
    const params = new URLSearchParams({
      id: String(id),
      type,
    });
    if (Number.isFinite(season)) params.set('s', String(season));
    if (Number.isFinite(episode)) params.set('e', String(episode));
    if (provider) params.set('provider', provider);

    const response = await fetch(`${SCRAPER_API_URL}/scrape?${params.toString()}`, {
      signal: AbortSignal.timeout(SCRAPER_TIMEOUT_MS),
      cache: 'no-store',
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      return NextResponse.json(
        { success: false, sources: [], subtitles: [], provider: provider || data.provider || 'none', error: data.error || 'All providers failed' },
        { status: response.status || 502 }
      );
    }

    const resolvedProvider = provider || (
      String(data.provider || '').toLowerCase().includes('flixhq') ? 'flixhq' :
      String(data.provider || '').toLowerCase().includes('moviebox') ? 'moviebox' :
      String(data.provider || '').toLowerCase().includes('vidcore') ? 'vidcore' :
      data.provider || 'none'
    );

    const sources = Array.isArray(data.sources)
      ? data.sources
      : data.url
        ? [{ url: data.url, type: 'hls', title: data.provider, alreadyProxied: true }]
        : [];

    return NextResponse.json({
      ...data,
      success: true,
      provider: resolvedProvider,
      sources: sources.map((source) => ({ ...source, alreadyProxied: true })),
      subtitles: Array.isArray(data.subtitles) ? data.subtitles : [],
    });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || 'Extraction failed' },
      { status: 500 }
    );
  }
}

/** Report configured scrapers (used by the player for server labels). */
export async function listScrapers() {
  return PROVIDERS;
}
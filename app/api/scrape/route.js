import { NextResponse } from 'next/server';
import { getSources , SCRAPER_CONFIG } from '@/lib/scrapers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/scrape?type=movie|tv&id={tmdbId}[&season=..&episode=..][&provider=..]
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const type = searchParams.get('type') || 'movie';
  const id = Number(searchParams.get('id'));
  const seasonParam = searchParams.get('season');
  const episodeParam = searchParams.get('episode');
  const provider = searchParams.get('provider') || undefined;

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
    const result = await getSources(
      {
        tmdbId: id,
        mediaType: type,
        season: Number.isFinite(season) ? season : undefined,
        episode: Number.isFinite(episode) ? episode : undefined,
      },
      { provider }
    );

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || 'Extraction failed' },
      { status: 500 }
    );
  }
}

/** Report configured scrapers (used by the player for server labels). */
export async function listScrapers() {
  return SCRAPER_CONFIG.map(({ id, label }) => ({ id, label }));
}
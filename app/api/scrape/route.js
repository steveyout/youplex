import { NextResponse } from 'next/server';
import { scrapeMedia, getProviderFriendlyName } from '@/lib/providers';

export const dynamic = 'force-dynamic';

const SCRAPER_API_URL = process.env.SCRAPER_API_URL || 'https://api.youplex.site';
const SCRAPER_TIMEOUT_MS = 60000;
const DEFAULT_PROVIDER = null;

const TMDB_BASE_URL = process.env.NEXT_PUBLIC_TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const TMDB_TOKEN = process.env.NEXT_PUBLIC_TMDB_TOKEN;

async function getTmdbMetadata(type, id, season, episode) {
  if (!TMDB_TOKEN) return {};
  const headers = {
    Authorization: `Bearer ${TMDB_TOKEN}`,
    accept: 'application/json',
  };

  try {
    const isTv = type === 'tv' || type === 'show';
    const mainRes = await fetch(`${TMDB_BASE_URL}/${isTv ? 'tv' : 'movie'}/${id}`, {
      headers,
      next: { revalidate: 3600 },
    });
    if (!mainRes.ok) return {};
    const mainData = await mainRes.json();

    const title = mainData.title || mainData.name;
    const releaseDate = mainData.release_date || mainData.first_air_date;
    const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : null;
    const imdbId = mainData.imdb_id;

    let seasonTmdbId = null;
    let episodeTmdbId = null;

    if (isTv && season) {
      const seasonRes = await fetch(`${TMDB_BASE_URL}/tv/${id}/season/${season}`, {
        headers,
        next: { revalidate: 3600 },
      });
      if (seasonRes.ok) {
        const seasonData = await seasonRes.json();
        seasonTmdbId = seasonData.id;
        if (episode && Array.isArray(seasonData.episodes)) {
          const matchedEp = seasonData.episodes.find(
            (ep) => ep.episode_number === Number(episode)
          );
          if (matchedEp) episodeTmdbId = matchedEp.id;
        }
      }
    }

    return {
      title,
      releaseYear,
      imdbId,
      seasonTmdbId,
      episodeTmdbId,
    };
  } catch (err) {
    console.warn('TMDB metadata lookup fallback failed:', err);
    return {};
  }
}

/**
 * GET /api/scrape?type=movie|tv&id={tmdbId}[&season=..&episode=..][&provider=..][&title=..][&year=..][&stream=true]
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const type = searchParams.get('type') || 'movie';
  const id = Number(searchParams.get('id'));
  const seasonParam = searchParams.get('season');
  const episodeParam = searchParams.get('episode');
  const provider = searchParams.get('provider') || DEFAULT_PROVIDER;

  const passedTitle = searchParams.get('title');
  const passedYear = searchParams.get('year');
  const passedSeasonTmdbId = searchParams.get('seasonId');
  const passedEpisodeTmdbId = searchParams.get('episodeId');
  const passedImdbId = searchParams.get('imdbId');

  const wantsStream =
    searchParams.get('stream') === 'true' ||
    request.headers.get('accept')?.includes('text/event-stream');

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

  // --- Real-time Streaming Handler (SSE) ---
  if (wantsStream) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function emit(data) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch (e) {}
        }

        try {
          let title = passedTitle;
          let releaseYear = passedYear;
          let seasonTmdbId = passedSeasonTmdbId;
          let episodeTmdbId = passedEpisodeTmdbId;
          let imdbId = passedImdbId;

          emit({ type: 'status', message: 'Resolving title information...' });

          if (!title || !releaseYear || (type === 'tv' && (!seasonTmdbId || !episodeTmdbId))) {
            const meta = await getTmdbMetadata(type, id, season, episode);
            title = title || meta.title;
            releaseYear = releaseYear || meta.releaseYear;
            seasonTmdbId = seasonTmdbId || meta.seasonTmdbId;
            episodeTmdbId = episodeTmdbId || meta.episodeTmdbId;
            imdbId = imdbId || meta.imdbId;
          }

          const providerResult = await scrapeMedia({
            type,
            id,
            title,
            releaseYear,
            season,
            episode,
            seasonTmdbId,
            episodeTmdbId,
            imdbId,
            provider,
            onProgress: (evt) => {
              emit(evt);
            },
          });

          if (!providerResult?.success) {
            emit({
              type: 'failure',
              provider: provider || 'none',
              error: providerResult?.error || 'All providers failed',
            });
          }
        } catch (err) {
          emit({ type: 'failure', error: err?.message || 'Scrape failed' });
        } finally {
          try {
            controller.close();
          } catch (e) {}
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  }

  // --- Standard JSON Handler ---
  // 1. Primary: Use @p-stream/providers directly
  try {
    let title = passedTitle;
    let releaseYear = passedYear;
    let seasonTmdbId = passedSeasonTmdbId;
    let episodeTmdbId = passedEpisodeTmdbId;
    let imdbId = passedImdbId;

    if (!title || !releaseYear || (type === 'tv' && (!seasonTmdbId || !episodeTmdbId))) {
      const meta = await getTmdbMetadata(type, id, season, episode);
      title = title || meta.title;
      releaseYear = releaseYear || meta.releaseYear;
      seasonTmdbId = seasonTmdbId || meta.seasonTmdbId;
      episodeTmdbId = episodeTmdbId || meta.episodeTmdbId;
      imdbId = imdbId || meta.imdbId;
    }

    const providerResult = await scrapeMedia({
      type,
      id,
      title,
      releaseYear,
      season,
      episode,
      seasonTmdbId,
      episodeTmdbId,
      imdbId,
      provider,
    });

    if (providerResult?.success && providerResult.sources?.length > 0) {
      return NextResponse.json({
        success: true,
        provider: providerResult.provider || provider || 'providers',
        providerLabel: getProviderFriendlyName(providerResult.provider || provider),
        sources: providerResult.sources.map((source) => ({
          ...source,
          alreadyProxied: true,
        })),
        subtitles: providerResult.subtitles || [],
      });
    }
  } catch (providerError) {
    console.warn('@p-stream/providers scrape encountered error:', providerError?.message);
  }

  // 2. Secondary fallback: Attempt remote scraper API if available
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
        {
          success: false,
          sources: [],
          subtitles: [],
          provider: provider || data?.provider || 'none',
          error: data?.error || 'All providers failed',
        },
        { status: response.status || 502 }
      );
    }

    const resolvedProvider =
      provider ||
      (String(data.provider || '').toLowerCase().includes('flixhq')
        ? 'yp-flixhq-1'
        : String(data.provider || '').toLowerCase().includes('moviebox')
          ? 'yp-moviebox-1'
          : String(data.provider || '').toLowerCase().includes('vidcore')
            ? 'yp-vidcore-1'
            : data.provider || 'none');

    const sources = Array.isArray(data.sources)
      ? data.sources
      : data.url
        ? [{ url: data.url, type: 'hls', title: data.provider, alreadyProxied: true }]
        : [];

    return NextResponse.json({
      ...data,
      success: true,
      provider: resolvedProvider,
      providerLabel: getProviderFriendlyName(resolvedProvider),
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

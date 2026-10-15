import dns from 'node:dns';
import { NextResponse } from 'next/server';
import { scrapeMedia, getProviderFriendlyName } from '@/lib/providers';
import { isContentDmcaBlocked } from '@/lib/dmca';

// Prioritize IPv4 over IPv6 in Node.js on Windows
try {
  dns.setDefaultResultOrder?.('ipv4first');
} catch (e) {
  // Ignored in environments where not supported
}

export const dynamic = 'force-dynamic';

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
 * GET /api/scrape?type=movie|tv&id={tmdbId}[&season=..&episode=..][&provider=..][&startFrom=..][&exclude=..][&stream=true]
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const type = searchParams.get('type') || 'movie';
  const id = Number(searchParams.get('id'));
  const seasonParam = searchParams.get('season');
  const episodeParam = searchParams.get('episode');
  const provider = searchParams.get('provider') || DEFAULT_PROVIDER;
  const startFrom = searchParams.get('startFrom') || null;
  const excludeParam = searchParams.get('exclude') || '';
  const exclude = excludeParam ? excludeParam.split(',').map((s) => s.trim()) : [];

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

  // Enforce DMCA blocked items immediately
  if (
    isContentDmcaBlocked({
      id,
      title: passedTitle,
      type,
    })
  ) {
    return new NextResponse('Gone - Content removed pursuant to DMCA', {
      status: 410,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
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
            startFrom,
            exclude,
            onProgress: (evt) => {
              emit(evt);
            },
          });

          if (providerResult?.success && providerResult.sources?.length > 0) {
            const cleanProvider = providerResult.provider || provider || 'providers';
            emit({
              type: 'success',
              provider: cleanProvider,
              providerLabel: getProviderFriendlyName(cleanProvider),
              sources: providerResult.sources.map((source) => ({
                ...source,
                alreadyProxied: true,
              })),
              thumbnailTrack: providerResult.thumbnailTrack || providerResult.sources?.[0]?.thumbnailTrack || null,
              subtitles: providerResult.subtitles || [],
              attemptedProviders: providerResult.attemptedProviders || [],
            });
          } else {
            emit({
              type: 'failure',
              provider: provider || 'none',
              error: providerResult?.error || 'All providers failed',
              attemptedProviders: providerResult?.attemptedProviders || [],
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

  // --- Standard JSON Handler (Strictly using @p-stream/providers) ---
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
      startFrom,
      exclude,
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
        thumbnailTrack: providerResult.thumbnailTrack || providerResult.sources?.[0]?.thumbnailTrack || null,
        subtitles: providerResult.subtitles || [],
        attemptedProviders: providerResult.attemptedProviders || [],
      });
    }

    // Return HTTP 200 with success: false instead of HTTP 404 to prevent BunkerWeb / Cloudflare
    // from intercepting the response and replacing it with an HTML error page in production
    return NextResponse.json(
      {
        success: false,
        sources: [],
        subtitles: [],
        provider: provider || 'none',
        error: providerResult?.error || 'All providers failed',
        attemptedProviders: providerResult?.attemptedProviders || [],
      },
      { status: 200 }
    );
  } catch (providerError) {
    console.warn('@p-stream/providers scrape encountered error:', providerError?.message);
    return NextResponse.json(
      {
        success: false,
        sources: [],
        subtitles: [],
        error: providerError?.message || 'Scrape failed',
        attemptedProviders: [],
      },
      { status: 200 }
    );
  }
}

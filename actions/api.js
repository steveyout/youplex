// ----------------------------------------------------------------------

import axios, { endpoints } from '@/utils/axios';
import { providers, getEmbedUrl, DEFAULT_PROVIDER_ID } from '@/config/providers';

// ----------------------------------------------------------------------

/**
 * Fetch Movies / Shows (by category or custom endpoint)
 * @param {string} endpoint - The TMDB endpoint path
 * @param {number} page - Default 1
 */
export async function getMovies(endpointOrCategory = 'popular', page = 1) {
  const url =
    typeof endpointOrCategory === 'string' && endpointOrCategory.startsWith('/')
      ? endpointOrCategory
      : endpoints.tmdb.movie(endpointOrCategory || 'popular');
  const res = await axios.get(url, {
    params: { page },
  });

  return res.data;
}

// ----------------------------------------------------------------------

/**
 * Fetch TV Shows (by category or custom endpoint)
 * @param {string} endpointOrCategory - 'popular', 'top_rated', etc. or TMDB endpoint
 * @param {number} page - Default 1
 */
export async function getTvShows(endpointOrCategory = 'popular', page = 1) {
  const url =
    typeof endpointOrCategory === 'string' && endpointOrCategory.startsWith('/')
      ? endpointOrCategory
      : endpoints.tmdb.tv(endpointOrCategory || 'popular');
  const res = await axios.get(url, {
    params: { page },
  });

  return res.data;
}

// ----------------------------------------------------------------------

/**
 * Fetch Trending Content
 * @param {string} type - 'all', 'movie', 'tv', 'person'
 * @param {string} timeWindow - 'day' or 'week'
 */
export async function getTrending(type = 'all', timeWindow = 'day') {
  const res = await axios.get(endpoints.tmdb.trending(type, timeWindow));

  return res.data;
}

// ----------------------------------------------------------------------

/**
 * Fetch Movie / Show by ID (for Watch page)
 * @param {string} type - 'movie' or 'tv'
 * @param {string|number} id - TMDB ID
 */
export async function getMovieOrShow(type, id) {
  if (!id) return null;

  try {
    const isTv = type === 'tv';
    const mainEndpoint = isTv ? `/tv/${id}` : `/movie/${id}`;

    const res = await axios.get(mainEndpoint, {
      params: {
        append_to_response: 'credits,videos,recommendations,similar',
      },
    });

    const data = res.data;
    if (!data) return null;

    const servers = providers
      .filter((provider) => provider.enabled)
      .map((provider) => ({
        id: provider.id,
        name: provider.name,
        url: getEmbedUrl(provider.id, type, id),
      }));

    return {
      ...data,
      id: data.id,
      title: data.title || data.name,
      overview: data.overview,
      poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
      backdrop: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null,
      releaseDate: data.release_date || data.first_air_date,
      rating: data.vote_average,
      voteCount: data.vote_count,
      genres: data.genres || [],
      cast: data.credits?.cast || [],
      crew: data.credits?.crew || [],
      recommendations: data.recommendations?.results || [],
      similar: data.similar?.results || [],
      runtime: data.runtime || (data.episode_run_time ? data.episode_run_time[0] : null),
      numberOfSeasons: data.number_of_seasons || null,
      numberOfEpisodes: data.number_of_episodes || null,
      seasons: data.seasons || [],
      videoUrl: getEmbedUrl(DEFAULT_PROVIDER_ID, type, id),
      servers,
    };
  } catch (error) {
    console.error('Failed to fetch media details:', error);
    return null;
  }
}

// ----------------------------------------------------------------------

/**
 * Fetch Play Sources (HLS/Dash streams) with real-time SSE progress streaming support
 * @param {string} type - 'movie' or 'tv'
 * @param {string|number} id - TMDB ID
 * @param {Object} opts - Additional options (season, episode, provider)
 * @param {Function} [onProgress] - Optional real-time progress callback: (event) => void
 */
export async function getPlaySources(type, id, opts = {}, onProgress = null) {
  if (!id) return { sources: [], subtitles: [] };

  const params = new URLSearchParams({
    type,
    id: String(id),
    ...(opts.season ? { season: String(opts.season) } : {}),
    ...(opts.episode ? { episode: String(opts.episode) } : {}),
    ...(opts.provider ? { provider: opts.provider } : {}),
  });

  // If onProgress callback is provided, request SSE stream for real-time provider events
  if (typeof onProgress === 'function' && typeof window !== 'undefined') {
    params.set('stream', 'true');
    try {
      const response = await fetch(`/api/scrape?${params.toString()}`, {
        headers: {
          Accept: 'text/event-stream',
        },
      });

      if (!response.ok || !response.body) {
        throw new Error(`SSE request failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          try {
            const dataStr = trimmed.slice(5).trim();
            const evt = JSON.parse(dataStr);
            onProgress(evt);

            if (evt.type === 'success' || evt.type === 'failure') {
              finalResult = evt;
            }
          } catch (e) {
            // ignore malformed event lines
          }
        }
      }

      if (finalResult?.type === 'success') {
        const cleanLabel = (finalResult.providerLabel || finalResult.label || finalResult.provider || '')
          .replace(/\s*\([^)]*\)/g, '')
          .trim();
        return {
          success: (finalResult.sources || []).length > 0,
          sources: finalResult.sources || [],
          subtitles: finalResult.subtitles || [],
          provider: finalResult.provider || null,
          providerLabel: cleanLabel,
        };
      }

      // If finished without success, return empty or fallback
      if (finalResult?.type === 'failure') {
        return {
          success: false,
          sources: [],
          subtitles: [],
          error: finalResult.error || 'No active streams found',
        };
      }
    } catch (sseErr) {
      console.warn('SSE stream failed, falling back to standard JSON fetch:', sseErr);
      // Fall through to regular fetch below
      params.delete('stream');
    }
  }

  try {
    const res = await fetch(`/api/scrape?${params.toString()}`);
    if (!res.ok) {
      return { sources: [], subtitles: [] };
    }
    const data = await res.json();
    const cleanLabel = (data.providerLabel || data.provider || '')
      .replace(/\s*\([^)]*\)/g, '')
      .trim();
    return {
      success: Boolean(data.success && data.sources?.length > 0),
      sources: data.sources || [],
      subtitles: data.subtitles || [],
      provider: data.provider || null,
      providerLabel: cleanLabel,
    };
  } catch (error) {
    console.error('Failed to fetch play sources:', error);
    return { sources: [], subtitles: [] };
  }
}

// ----------------------------------------------------------------------

/**
 * Fetch Subtitles
 * Supports both signatures:
 *   getSubtitles(tmdbId, opts)
 *   getSubtitles(type, tmdbId, opts)
 */
export async function getSubtitles(arg1, arg2 = {}, arg3 = {}) {
  let type = 'movie';
  let tmdbId = arg1;
  let opts = arg2;

  if (typeof arg1 === 'string' && (arg1 === 'movie' || arg1 === 'tv' || arg1 === 'show')) {
    type = arg1 === 'show' ? 'tv' : arg1;
    tmdbId = arg2;
    opts = arg3 || {};
  } else if (opts?.type) {
    type = opts.type === 'show' ? 'tv' : opts.type;
  }

  // Ensure tmdbId is numeric or a valid non-type string
  if (!tmdbId || tmdbId === 'movie' || tmdbId === 'tv' || isNaN(Number(tmdbId))) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      tmdb_id: String(tmdbId),
      type,
      ...(type === 'tv' && opts?.season ? { season: String(opts.season) } : {}),
      ...(type === 'tv' && opts?.episode ? { episode: String(opts.episode) } : {}),
    });

    const res = await fetch(`/api/subtitles?${params.toString()}`);
    if (!res.ok) return [];

    const data = await res.json();
    return data.subtitles || [];
  } catch (error) {
    console.error('Failed to fetch subtitles:', error);
    return [];
  }
}


// ----------------------------------------------------------------------

/**
 * Search Movies and TV Shows
 * @param {string} query - Search term
 * @param {number} page - Default 1
 */
export async function searchMedia(query, page = 1) {
  if (!query) return { results: [] };

  const res = await axios.get(endpoints.tmdb.search, {
    params: { query, page },
  });

  return res.data;
}

// ----------------------------------------------------------------------

/**
 * Fetch details for a specific Movie or TV show
 * @param {string} type - 'movie' or 'tv'
 * @param {string|number} id - TMDB ID
 */
export async function getMediaDetails(type, id) {
  if (!id) return null;

  const endpoint = endpoints.tmdb.details ? endpoints.tmdb.details(type, id) : `/${type}/${id}`;

  const res = await axios.get(endpoint, {
    params: {
      append_to_response: 'credits,videos,recommendations,similar',
    },
  });

  return res.data;
}

// ----------------------------------------------------------------------

/**
 * Fetch episode list for a TV show season
 * @param {string|number} tvId - TMDB TV Show ID
 * @param {number} seasonNumber - Season number (1-based)
 */
export async function getSeasonDetails(tvId, seasonNumber) {
  if (!tvId) return null;

  const endpoint = endpoints.tmdb.seasonDetails
    ? endpoints.tmdb.seasonDetails(tvId, seasonNumber)
    : `/tv/${tvId}/season/${seasonNumber}`;

  try {
    const res = await axios.get(endpoint);
    return res.data;
  } catch (error) {
    console.warn(`Failed to fetch season ${seasonNumber} details:`, error);
    return null;
  }
}

// ----------------------------------------------------------------------

/**
 * Fetch recommendations for a movie or TV show
 * @param {string} type - 'movie' or 'tv'
 * @param {string|number} id - TMDB ID
 */
export async function getRecommendations(type, id) {
  if (!id) return [];

  const endpoint = endpoints.tmdb.recommendations
    ? endpoints.tmdb.recommendations(type, id)
    : `/${type}/${id}/recommendations`;

  const res = await axios.get(endpoint);

  return res.data.results || [];
}

// ----------------------------------------------------------------------

/**
 * Fetch Credits (Cast & Crew)
 * @param {string} type - 'movie' or 'tv'
 * @param {string|number} id - TMDB ID
 */
export async function getCredits(type, id) {
  const url = id ? endpoints.tmdb.credits(type, id) : '';
  if (!url) return null;

  const res = await axios.get(url);
  return res.data;
}

// ----------------------------------------------------------------------

/**
 * Fetch Intro/Recap/Credits/Preview timestamps from Intro DB
 * @param {Object} params
 * @param {string|number} params.tmdbId - TMDB ID
 * @param {string} [params.imdbId] - Optional IMDB ID
 * @param {'movie'|'tv'} [params.type='movie'] - Media type
 * @param {number|string} [params.season] - TV Season number
 * @param {number|string} [params.episode] - TV Episode number
 * @param {number|string} [params.durationMs] - Video duration in ms
 */
export async function getIntroTimestamps({ tmdbId, imdbId, type = 'movie', season, episode, durationMs } = {}) {
  if (!tmdbId && !imdbId) return { success: false, segments: [] };

  try {
    const params = new URLSearchParams();
    if (tmdbId) params.set('tmdb_id', String(tmdbId));
    if (imdbId) params.set('imdb_id', String(imdbId));
    if (type) params.set('type', type);
    if (type === 'tv') {
      if (season) params.set('season', String(season));
      if (episode) params.set('episode', String(episode));
    }
    if (durationMs) params.set('duration_ms', String(durationMs));

    const res = await fetch(`/api/timestamps?${params.toString()}`);
    if (!res.ok) return { success: false, segments: [] };

    const data = await res.json();
    return data;
  } catch (error) {
    console.warn('Failed to fetch Intro DB timestamps:', error);
    return { success: false, segments: [] };
  }
}

/**
 * Submit timestamps to TheIntroDB (/v3/submit)
 * @param {Object} payload
 */
export async function submitIntroTimestamp(payload) {
  try {
    const res = await fetch('/api/timestamps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tmdb_id: payload.tmdbId,
        imdb_id: payload.imdbId,
        tvdb_id: payload.tvdbId,
        type: payload.type || 'movie',
        season: payload.season,
        episode: payload.episode,
        segment: payload.segment,
        video_duration_ms: payload.videoDurationMs,
        start_ms: payload.startMs,
        end_ms: payload.endMs,
      }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.warn('Failed to submit Intro DB timestamp:', error);
    return { success: false, error: error?.message || 'Network error' };
  }
}

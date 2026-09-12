import axios, { endpoints } from '@/utils/axios';
import { providers, getEmbedUrl, DEFAULT_PROVIDER_ID } from '@/config/providers';

// ----------------------------------------------------------------------

/**
 * Scrape direct stream sources from the server-side scraper layer.
 * @param {string} type - 'movie' or 'tv'
 * @param {string|number} id - TMDB ID
 * @param {{season?:number, episode?:number, provider?:string}} [opts]
 * @returns {Promise<{success:boolean, sources:Array, subtitles:Array, provider?:string, error?:string}>}
 */
export async function getPlaySources(type, id, opts = {}) {
  const params = new URLSearchParams({ type, id: String(id) });
  if (opts.provider) params.set('provider', opts.provider);
  if (type === 'tv') {
    if (opts.season !== undefined) params.set('season', String(opts.season));
    if (opts.episode !== undefined) params.set('episode', String(opts.episode));
  }

  let lastError;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await fetch(`/api/scrape?${params.toString()}`, {
        signal: AbortSignal.timeout(90000),
      });
      const data = await res.json();

      if (res.ok) return data;

      lastError = new Error(data?.error || 'Scrape failed');
    } catch (error) {
      lastError = error;
    }

    if (attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }

  throw lastError || new Error('Scrape failed');
}

// ----------------------------------------------------------------------

/**
 * Fetch Movie or Show details plus playable servers
 * @param {string} type - 'movie' or 'tv'
 * @param {string|number} id - TMDB ID
 */
export async function getMovieOrShow(type, id) {
  const details = await getMediaDetails(type, id);

  if (!details) return null;

  const servers = providers
    .filter((provider) => provider.enabled)
    .map((provider) => ({
      id: provider.id,
      name: provider.name,
      url: getEmbedUrl(provider.id, type, id),
    }));

  return {
    ...details,
    title: details.title || details.name,
    videoUrl: getEmbedUrl(DEFAULT_PROVIDER_ID, type, id),
    servers,
  };
}

// ----------------------------------------------------------------------

/**
 * Fetch Movies by category
 * @param {string} category - 'popular', 'top_rated', 'upcoming', 'now_playing'
 * @param {number} page - Default 1
 */
export async function getMovies(category = 'popular', page = 1) {
  const res = await axios.get(endpoints.tmdb.movie(category), {
    params: { page },
  });

  return res.data;
}

// ----------------------------------------------------------------------

/**
 * Fetch TV Shows by category
 * @param {string} category - 'popular', 'top_rated', 'on_the_air', 'airing_today'
 * @param {number} page - Default 1
 */
export async function getTvShows(category = 'popular', page = 1) {
  const res = await axios.get(endpoints.tmdb.tv(category), {
    params: { page },
  });

  return res.data;
}

// ----------------------------------------------------------------------

/**
 * Fetch Details for a specific Movie or TV Show
 * @param {string} type - 'watch' or 'tv'
 * @param {string|number} id - TMDB ID
 */
export async function getMediaDetails(type, id) {
  const url = id ? endpoints.tmdb.details(type, id) : '';

  if (!url) return null;

  const res = await axios.get(url, {
    params: {
      append_to_response: 'credits',
    },
  });

  return res.data;
}

// ----------------------------------------------------------------------

/**
 * Fetch Trending Content
 * @param {string} type - 'all', 'watch', 'tv', 'person'
 * @param {string} timeWindow - 'day' or 'week'
 */
export async function getTrending(type = 'all', timeWindow = 'day') {
  const res = await axios.get(endpoints.tmdb.trending(type, timeWindow));

  return res.data;
}

// ----------------------------------------------------------------------

/**
 * Search Movies and TV Shows
 * @param {string} query - The search term
 * @param {number} page - Default 1
 */
export async function searchMedia(query, page = 1) {
  const res = await axios.get(endpoints.tmdb.search, {
    params: { query, page },
  });

  return res.data;
}

// ----------------------------------------------------------------------

/**
 * Fetch Recommendations
 * @param {string} type - 'watch' or 'tv'
 * @param {string|number} id - TMDB ID
 */
export async function getRecommendations(type, id) {
  const url = id ? endpoints.tmdb.recommendations(type, id) : '';

  if (!url) return null;

  const res = await axios.get(url);

  return res.data;
}

// ----------------------------------------------------------------------

/**
 * Fetch Credits (Cast & Crew)
 * @param {string} type - 'watch' or 'tv'
 * @param {string|number} id - TMDB ID
 */
export async function getCredits(type, id) {
  const url = id ? endpoints.tmdb.credits(type, id) : '';

  if (!url) return null;

  const res = await axios.get(url);

  return res.data;
}

import { CONFIG } from '@/config-global';
import { getMovies, getTvShows } from '@/actions/api';

// ----------------------------------------------------------------------

export default async function sitemap() {
  const baseUrl = CONFIG.site.serverUrl || 'https://youplex.site';

  // 1. Static Routes
  const staticRoutes = [
    '',
    '/movies',
    '/tv',
    // '/faqs',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily',
    priority: 1.0,
  }));

  // 2. Dynamic Movie Routes (Fetching Trending/Popular)
  let movieRoutes = [];
  try {
    const popularMovies = await getMovies('popular');
    movieRoutes = (popularMovies?.results || []).map((movie) => ({
      url: `${baseUrl}/watch/movie/${encodeURIComponent(movie.title.replace(/\s+/g, '-').toLowerCase())}?id=${movie.id}`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));
  } catch (error) {
    console.error('Sitemap Movie Error:', error);
  }

  // 3. Dynamic TV Routes
  let tvRoutes = [];
  try {
    const popularTv = await getTvShows('popular');
    tvRoutes = (popularTv?.results || []).map((tv) => ({
      url: `${baseUrl}/watch/tv/${encodeURIComponent(tv.name.replace(/\s+/g, '-').toLowerCase())}?id=${tv.id}`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));
  } catch (error) {
    console.error('Sitemap TV Error:', error);
  }

  return [...staticRoutes, ...movieRoutes, ...tvRoutes];
}

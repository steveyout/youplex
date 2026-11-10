import { headers } from 'next/headers';
import { CONFIG } from '@/config-global';
import { getMovies, getTvShows } from '@/actions/api';

// ----------------------------------------------------------------------

export default async function sitemap() {
  let host = '';
  try {
    const headerList = await headers();
    host = (headerList.get('x-forwarded-host') || headerList.get('host') || '').toLowerCase();
  } catch {
    // fallback
  }

  const isVidSrc = host.includes('vidsrc');
  const baseUrl = isVidSrc
    ? 'https://vidsrc.work'
    : host
      ? `https://${host}`
      : CONFIG.site.serverUrl || 'https://youplex.site';

  if (isVidSrc) {
    const staticRoutes = [
      '',
      '/embed',
      '/embed/movie',
      '/embed/tv',
      '/movie',
      '/tv',
    ].map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'always',
      priority: route === '' ? 1.0 : 0.9,
    }));

    let movieRoutes = [];
    try {
      const popularMovies = await getMovies('popular');
      movieRoutes = (popularMovies?.results || []).slice(0, 50).map((movie) => ({
        url: `${baseUrl}/embed/movie/${movie.id}`,
        lastModified: new Date().toISOString(),
        changeFrequency: 'daily',
        priority: 0.8,
      }));
    } catch (e) {
      // fallback
    }

    let tvRoutes = [];
    try {
      const popularTv = await getTvShows('popular');
      tvRoutes = (popularTv?.results || []).slice(0, 50).map((tv) => ({
        url: `${baseUrl}/embed/tv/${tv.id}/1/1`,
        lastModified: new Date().toISOString(),
        changeFrequency: 'daily',
        priority: 0.8,
      }));
    } catch (e) {
      // fallback
    }

    return [...staticRoutes, ...movieRoutes, ...tvRoutes];
  }

  // Default routes for youplex
  const staticRoutes = [
    '',
    '/movies',
    '/tv',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily',
    priority: 1.0,
  }));

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

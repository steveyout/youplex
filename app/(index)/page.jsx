import { CONFIG } from '@/config-global';
import { PostListHomeView } from '@/sections/movies/view';
import { getMovies, getTvShows, getTrending } from '@/actions/api';

// ----------------------------------------------------------------------

export const metadata = {
  title: `Explore Movies & TV Shows - ${CONFIG.site.name}`,
  description: `Browse the latest trending movies, top-rated TV shows, and upcoming releases on ${CONFIG.site.name}. Stream your favorite content in high quality.`,
  keywords: 'streaming, movies, tv shows, online cinema, trending movies, vidsrc, youplex',
  openGraph: {
    title: `Explore Movies & TV Shows - ${CONFIG.site.name}`,
    description: `Discover the best of entertainment on ${CONFIG.site.name}.`,
    type: 'website',
  },
};

export default async function Page() {
  // Fetch multiple categories in parallel for speed
  const [
    trendingData,
    popularMoviesData,
    topRatedTvData,
    upcomingMoviesData,
  ] = await Promise.all([
    getTrending('all', 'day'),
    getMovies('popular'),
    getTvShows('top_rated'),
    getMovies('upcoming'),
  ]);

  // Clean data results
  const data = {
    trending: trendingData?.results || [],
    popularMovies: popularMoviesData?.results || [],
    topRatedTv: topRatedTvData?.results || [],
    upcoming: upcomingMoviesData?.results || [],
  };

  return <PostListHomeView categories={data} />;
}

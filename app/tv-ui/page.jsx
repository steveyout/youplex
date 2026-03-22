import { CONFIG } from '@/config-global';
import { TvHomeView } from '@/sections/tv/tv-home-view';
import { getMovies, getTvShows, getTrending } from '@/actions/api';

// ----------------------------------------------------------------------

export const metadata = {
  title: `TV Mode - ${CONFIG.site.name}`,
  description: `Browse movies and TV shows on your big screen with ${CONFIG.site.name}.`,
};

export default async function TvPage() {
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

  const data = {
    trending: trendingData?.results || [],
    popularMovies: popularMoviesData?.results || [],
    topRatedTv: topRatedTvData?.results || [],
    upcoming: upcomingMoviesData?.results || [],
  };

  return <TvHomeView categories={data} />;
}

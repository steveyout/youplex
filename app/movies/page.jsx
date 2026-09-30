import { CONFIG } from '@/config-global';
import { getMovies, getTrending } from '@/actions/api';
import { PostListHomeView } from '@/sections/movies/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: `Watch Movies Online - ${CONFIG.site.name}`,
  description: `Stream the latest movies, top-rated cinema classics, and upcoming releases on ${CONFIG.site.name}. High-quality streaming for all your favorite films.`,
  keywords: 'watch movies, stream cinema, popular movies, action movies, new movie releases, recommended movies',
  openGraph: {
    title: `Explore the Best Movies - ${CONFIG.site.name}`,
    description: `Browse our massive library of movies on ${CONFIG.site.name}.`,
    type: 'website',
  },
};

export default async function Page() {
  // Fetch movie-specific categories in parallel for speed
  const [
    trendingData,
    popularData,
    topRatedData,
    nowPlayingData,
    upcomingData,
  ] = await Promise.all([
    getTrending('movie', 'day'),
    getMovies('popular'),
    getMovies('top_rated'),
    getMovies('now_playing'),
    getMovies('upcoming'),
  ]);

  // Organizing data specifically for Movies view with curated recommendations
  const data = {
    trending: trendingData?.results || [],
    recommended: topRatedData?.results?.slice(0, 12) || [],
    nowPlaying: nowPlayingData?.results || [],
    popular: popularData?.results || [],
    topRated: topRatedData?.results || [],
    upcoming: upcomingData?.results || [],
  };

  return <PostListHomeView categories={data} pageType="movies" />;
}

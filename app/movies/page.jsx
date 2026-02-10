import { CONFIG } from '@/config-global';
import { getMovies } from '@/actions/api';
import { PostListHomeView } from '@/sections/movies/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: `Watch Movies Online - ${CONFIG.site.name}`,
  description: `Stream the latest movies, top-rated cinema classics, and upcoming releases on ${CONFIG.site.name}. High-quality streaming for all your favorite films.`,
  keywords: 'watch movies, stream cinema, popular movies, action movies, new movie releases',
  openGraph: {
    title: `Explore the Best Movies - ${CONFIG.site.name}`,
    description: `Browse our massive library of movies on ${CONFIG.site.name}.`,
    type: 'website',
  },
};

export default async function Page() {
  // Fetch movie-specific categories in parallel
  const [
    popularData,
    topRatedData,
    upcomingData,
    nowPlayingData,
  ] = await Promise.all([
    getMovies('popular'),
    getMovies('top_rated'),
    getMovies('upcoming'),
    getMovies('now_playing'),
  ]);

  // Organizing data specifically for Movie views
  const data = {
    popular: popularData?.results || [],
    topRated: topRatedData?.results || [],
    upcoming: upcomingData?.results || [],
    nowPlaying: nowPlayingData?.results || [],
  };

  return <PostListHomeView categories={data} />;
}

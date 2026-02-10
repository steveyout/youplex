import { CONFIG } from '@/config-global';
import { getTvShows } from '@/actions/api';
import { PostListHomeView } from '@/sections/movies/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: `Watch TV Series Online - ${CONFIG.site.name}`,
  description: `Stream your favorite TV shows, binge-watch top-rated series, and discover new episodes airing today on ${CONFIG.site.name}.`,
  keywords: 'watch tv shows, stream series online, binge watch, top rated tv series, tv shows online',
  openGraph: {
    title: `Explore Top TV Series - ${CONFIG.site.name}`,
    description: `Browse our massive library of TV series on ${CONFIG.site.name}.`,
    type: 'website',
  },
};

export default async function Page() {
  // Fetch TV-specific categories in parallel
  const [
    popularData,
    topRatedData,
    onTheAirData,
    airingTodayData,
  ] = await Promise.all([
    getTvShows('popular'),
    getTvShows('top_rated'),
    getTvShows('on_the_air'),
    getTvShows('airing_today'),
  ]);

  // Organizing data for the dynamic PostListHomeView
  // The keys here will be formatted as titles: "Popular", "Top Rated", etc.
  const data = {
    airingToday: airingTodayData?.results || [],
    onTheAir: onTheAirData?.results || [],
    popular: popularData?.results || [],
    topRated: topRatedData?.results || [],
  };

  return <PostListHomeView categories={data} />;
}

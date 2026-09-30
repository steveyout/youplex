import { CONFIG } from '@/config-global';
import { getTvShows, getTrending } from '@/actions/api';
import { PostListHomeView } from '@/sections/movies/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: `Watch TV Series Online - ${CONFIG.site.name}`,
  description: `Stream your favorite TV shows, binge-watch top-rated series, and discover new episodes airing today on ${CONFIG.site.name}.`,
  keywords: 'watch tv shows, stream series online, binge watch, top rated tv series, tv shows online, recommended series',
  openGraph: {
    title: `Explore Top TV Series - ${CONFIG.site.name}`,
    description: `Browse our massive library of TV series on ${CONFIG.site.name}.`,
    type: 'website',
  },
};

export default async function Page() {
  // Fetch TV-specific categories in parallel for speed
  const [
    trendingData,
    popularData,
    topRatedData,
    onTheAirData,
    airingTodayData,
  ] = await Promise.all([
    getTrending('tv', 'day'),
    getTvShows('popular'),
    getTvShows('top_rated'),
    getTvShows('on_the_air'),
    getTvShows('airing_today'),
  ]);

  // Organizing data specifically for TV Series view with recommendations
  const data = {
    trending: trendingData?.results || [],
    recommended: topRatedData?.results?.slice(0, 12) || [],
    airingToday: airingTodayData?.results || [],
    onTheAir: onTheAirData?.results || [],
    popular: popularData?.results || [],
    topRated: topRatedData?.results || [],
  };

  return <PostListHomeView categories={data} pageType="tv" />;
}

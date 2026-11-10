import dlhdChannelsData from '@/lib/data/dlhd-channels.json';
import fastChannelsData from '@/lib/data/fast-channels.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const labels = {
  sports: ['Sports', '⚽'],
  entertainment: ['Entertainment', '🎬'],
  movies: ['Movies', '🎥'],
  news: ['News', '📰'],
  kids: ['Kids', '🧸'],
  documentary: ['Documentary', '🌍'],
  music: ['Music', '🎵'],
  animation: ['Animation', '🎨'],
};

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const category = params.get('category');
  const country = params.get('country');
  const search = params.get('search')?.toLowerCase();
  const provider = params.get('provider') || params.get('source') || 'all';

  const fastList = (fastChannelsData?.channels || []).map((ch) => ({
    ...ch,
    isNative: true,
    provider: ch.provider || 'fast',
  }));

  const dlhdList = (dlhdChannelsData?.channels || []).map((ch) => ({
    ...ch,
    isNative: false,
    provider: 'dlhd',
  }));

  let sourcePool = [];
  if (provider === 'fast' || provider === 'native') {
    sourcePool = fastList;
  } else if (provider === 'dlhd') {
    sourcePool = dlhdList;
  } else {
    // 'all': FAST channels (native HLS) first, followed by DLHD
    sourcePool = [...fastList, ...dlhdList];
  }

  const uniqueChannels = Array.from(
    new Map(sourcePool.map((channel) => [String(channel.id), channel])).values()
  );

  const channels = uniqueChannels.filter((channel) => (
    (!category || category === 'all' || channel.category === category)
    && (!country || country === 'all' || channel.country === country)
    && (!search || channel.name.toLowerCase().includes(search))
  ));

  const stats = uniqueChannels.reduce((result, channel) => {
    const cat = channel.category || 'entertainment';
    const ctry = channel.country || 'international';
    result.categories[cat] = (result.categories[cat] || 0) + 1;
    result.countries[ctry] = (result.countries[ctry] || 0) + 1;
    return result;
  }, { categories: {}, countries: {} });

  const providers = [
    { id: 'all', name: 'All Channels', icon: '📺', count: fastList.length + dlhdList.length },
    { id: 'fast', name: 'FAST & Open (No Ads)', icon: '⚡', count: fastList.length },
    { id: 'dlhd', name: 'DaddyLive (Sports/Cable)', icon: '📡', count: dlhdList.length },
  ];

  return Response.json({
    success: true,
    channels,
    providers,
    categories: Object.entries(stats.categories)
      .map(([id, count]) => ({ id, name: labels[id]?.[0] || id, icon: labels[id]?.[1] || '📺', count }))
      .sort((a, b) => b.count - a.count),
    countries: Object.entries(stats.countries)
      .map(([id, count]) => ({ id, name: id, count }))
      .sort((a, b) => b.count - a.count),
    totalChannels: uniqueChannels.length,
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}

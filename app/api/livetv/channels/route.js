import channelsData from '@/lib/data/dlhd-channels.json';

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
};

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const category = params.get('category');
  const country = params.get('country');
  const search = params.get('search')?.toLowerCase();

  const uniqueChannels = Array.from(
    new Map(channelsData.channels.map((channel) => [channel.id, channel])).values()
  );

  const channels = uniqueChannels.filter((channel) => (
    (!category || category === 'all' || channel.category === category)
    && (!country || country === 'all' || channel.country === country)
    && (!search || channel.name.toLowerCase().includes(search))
  ));

  const stats = uniqueChannels.reduce((result, channel) => {
    result.categories[channel.category] = (result.categories[channel.category] || 0) + 1;
    result.countries[channel.country] = (result.countries[channel.country] || 0) + 1;
    return result;
  }, { categories: {}, countries: {} });

  return Response.json({
    success: true,
    channels,
    categories: Object.entries(stats.categories)
      .map(([id, count]) => ({ id, name: labels[id]?.[0] || id, icon: labels[id]?.[1] || '📺', count }))
      .sort((a, b) => b.count - a.count),
    countries: Object.entries(stats.countries)
      .map(([id, count]) => ({ id, name: id, count }))
      .sort((a, b) => b.count - a.count),
    totalChannels: channelsData.totalChannels,
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}

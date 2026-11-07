import { headers } from 'next/headers';
import axios from '@/utils/axios';
import { getMovieOrShow } from '@/actions/api';

async function resolveMediaId(rawId) {
  if (!rawId) return null;
  const strId = String(rawId).trim();
  if (strId.startsWith('tt')) {
    try {
      const res = await axios.get(`/find/${strId}`, {
        params: { external_source: 'imdb_id' },
      });
      const results = res.data?.tv_results;
      if (results && results.length > 0) {
        return results[0].id;
      }
    } catch {
      // ignore
    }
  }
  return strId;
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const rawId = resolvedParams?.id;
  const season = resolvedParams?.season;
  const episode = resolvedParams?.episode;

  const headerList = await headers();
  const host = (headerList.get('x-forwarded-host') || headerList.get('host') || '').toLowerCase();
  const isVidSrc = host.includes('vidsrc');
  const brand = isVidSrc ? 'VidSrc' : 'Youplex';

  let media = null;
  try {
    const numericId = await resolveMediaId(rawId);
    if (numericId) {
      media = await getMovieOrShow('tv', numericId, {
        season: season || 1,
        episode: episode || 1,
      });
    }
  } catch {
    // fallback
  }

  const showTitle = media?.title || media?.name;
  let formattedTitle = `Watch TV Show Online Free - ${brand}`;

  if (showTitle) {
    if (season && episode) {
      formattedTitle = `${showTitle} S${season}:E${episode} - Watch Free on ${brand}`;
    } else {
      const releaseYear = (media?.release_date || media?.first_air_date)?.slice(0, 4);
      formattedTitle = `${showTitle}${releaseYear ? ` (${releaseYear})` : ''} - Watch Free on ${brand}`;
    }
  }

  const description = media?.overview
    ? `${media.overview.slice(0, 160)}...`
    : `Stream full TV show episodes in HD on ${brand} with multi-language subtitles and adaptive streaming.`;

  return {
    title: formattedTitle,
    description,
    openGraph: {
      title: formattedTitle,
      description,
      siteName: brand,
      ...(media?.poster ? { images: [{ url: media.poster }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: formattedTitle,
      description,
      ...(media?.poster ? { images: [media.poster] } : {}),
    },
  };
}

export default function TvEmbedLayout({ children }) {
  return children;
}

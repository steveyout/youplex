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
      const results = res.data?.movie_results;
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
  const headerList = await headers();
  const host = (headerList.get('x-forwarded-host') || headerList.get('host') || '').toLowerCase();
  const isVidSrc = host.includes('vidsrc');
  const brand = isVidSrc ? 'VidSrc' : 'Youplex';

  let media = null;
  try {
    const numericId = await resolveMediaId(rawId);
    if (numericId) {
      media = await getMovieOrShow('movie', numericId);
    }
  } catch {
    // fallback
  }

  const movieTitle = media?.title || media?.name;
  const releaseYear = (media?.release_date || media?.first_air_date)?.slice(0, 4);
  const formattedTitle = movieTitle
    ? `${movieTitle}${releaseYear ? ` (${releaseYear})` : ''} - Watch Free on ${brand}`
    : `Watch Movie Online Free - ${brand}`;

  const description = media?.overview
    ? `${media.overview.slice(0, 160)}...`
    : `Watch full movie in HD on ${brand} with multi-language subtitles and adaptive fast streaming.`;

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

export default function MovieEmbedLayout({ children }) {
  return children;
}

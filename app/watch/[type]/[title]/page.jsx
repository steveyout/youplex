import { CONFIG } from '@/config-global';
import { PostDetailsHomeView } from '@/sections/movies/view';
import { getMediaDetails, getRecommendations } from '@/actions/api';

// ----------------------------------------------------------------------

export async function generateMetadata({ params, searchParams }) {
  const { type } = params;
  const { id, sn, ep } = searchParams;

  const data = await getMediaDetails(type, id);

  if (!data) return { title: `Watch - ${CONFIG.site.name}` };

  const isTv = type === 'tv';
  const displayTitle = data.title || data.name;
  const year = new Date(data.release_date || data.first_air_date).getFullYear();

  // Custom SEO Title: "Watch Movie Title (Year) Online - SiteName"
  const seoTitle = isTv
    ? `Watch ${displayTitle} Season ${sn || 1} Episode ${ep || 1} Online - ${CONFIG.site.name}`
    : `Watch ${displayTitle} (${year}) Full Movie Online - ${CONFIG.site.name}`;

  const description = data.overview?.slice(0, 160);
  const imageUrl = `${process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL}/original${data.backdrop_path}`;

  return {
    title: seoTitle,
    description,
    keywords: `${displayTitle}, watch ${displayTitle} online, stream ${displayTitle}, ${type} streaming`,
    openGraph: {
      title: seoTitle,
      description,
      type: 'video.movie',
      url: `${CONFIG.site.serverUrl}/watch/${type}/${params.title}?id=${id}`,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: displayTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: seoTitle,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: `${CONFIG.site.serverUrl}/watch/${type}/${params.title}?id=${id}`,
    },
  };
}

// ----------------------------------------------------------------------

export default async function Page({ params, searchParams }) {
  const { type } = params;
  const { id, sn, ep } = searchParams;

  const [mediaData, recommendationsData] = await Promise.all([
    getMediaDetails(type, id),
    getRecommendations(type, id),
  ]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': type === 'movie' ? 'Movie' : 'TVSeries',
    name: mediaData?.title || mediaData?.name,
    description: mediaData?.overview,
    image: `${process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL}/w500${mediaData?.poster_path}`,
    datePublished: mediaData?.release_date || mediaData?.first_air_date,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: mediaData?.vote_average,
      bestRating: '10',
      ratingCount: mediaData?.vote_count,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PostDetailsHomeView
        post={mediaData}
        latestPosts={recommendationsData?.results || []}
        videoParams={{
          type,
          id,
          season: parseInt(sn, 10) || 1,
          episode: parseInt(ep, 10) || 1,
        }}
      />
    </>
  );
}

// ----------------------------------------------------------------------

const dynamic = CONFIG.isStaticExport ? 'auto' : 'force-dynamic';
export { dynamic };

export async function generateStaticParams() {
  return [];
}

import Script from 'next/script';
import { headers } from 'next/headers';
import { isPlayerAdsEnabled } from '@/components/ads/ad-config';

export async function generateMetadata() {
  const headerList = await headers();
  const host = (headerList.get('x-forwarded-host') || headerList.get('host') || '').toLowerCase();
  const isVidSrc = host.includes('vidsrc');

  if (isVidSrc) {
    return {
      metadataBase: new URL('https://vidsrc.work'),
      title: 'VidSrc — Free Movie & TV Embed API & Player | Official VidSrc Alternative',
      description:
        'Embed and stream full movies and TV series effortlessly with VidSrc (vidsrc.work). The ultra-fast, high-availability alternative to vidsrc.to, vidsrc.me, and vidsrc.xyz with 1080p/4K streams, TMDB & IMDb ID support, automatic multi-source failover, and multi-language subtitles.',
      keywords: [
        'vidsrc',
        'vidsrc.to',
        'vidsrc.me',
        'vidsrc.xyz',
        'vidsrc.in',
        'vidsrc.pm',
        'vidsrc.net',
        'vidsrc alternative',
        'vidsrc embed',
        'vidsrc api',
        'vidsrc player',
        'free movie streaming api',
        'tmdb embed player',
        'imdb embed api',
        'embed movies free',
        'tv show embed player',
        'fast iframe stream',
        'html5 video embed api',
      ],
      alternates: {
        canonical: 'https://vidsrc.work',
      },
      openGraph: {
        title: 'VidSrc — Free Movie & TV Embed API & Player | Official VidSrc Alternative',
        description:
          'Embed and stream full movies and TV series effortlessly with VidSrc (vidsrc.work). Fast API, adaptive 4K streams, auto-failover, and multi-language subtitles.',
        url: 'https://vidsrc.work',
        siteName: 'VidSrc',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: 'VidSrc — Free Movie & TV Embed API & Player | Official VidSrc Alternative',
        description:
          'Embed and stream full movies and TV series effortlessly with VidSrc (vidsrc.work). Fast API, adaptive 4K streams, and auto-failover.',
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
    };
  }

  return {
    metadataBase: new URL('https://youplex.site'),
    title: 'Youplex Embed API — Next-Gen Video Embedding & Streaming API',
    description:
      'Embed high-quality movies and TV shows on your website effortlessly with our RESTful streaming API.',
    keywords: [
      'youplex',
      'youplex embed',
      'video streaming api',
      'embed player',
      'stream movies',
      'free streaming api',
    ],
    alternates: {
      canonical: 'https://youplex.site/embed',
    },
    openGraph: {
      title: 'Youplex Embed API — Next-Gen Video Embedding & Streaming API',
      description:
        'Embed high-quality movies and TV shows on your website effortlessly with our RESTful streaming API.',
      url: 'https://youplex.site/embed',
      siteName: 'Youplex',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Youplex Embed API — Next-Gen Video Embedding & Streaming API',
      description:
        'Embed high-quality movies and TV shows on your website effortlessly with our RESTful streaming API.',
    },
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default async function EmbedLayout({ children }) {
  const showPlayerAds = isPlayerAdsEnabled();
  const headerList = await headers();
  const host = (headerList.get('x-forwarded-host') || headerList.get('host') || '').toLowerCase();
  const isVidSrc = host.includes('vidsrc');

  const vidsrcStructuredData = isVidSrc
    ? [
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'VidSrc',
          alternateName: [
            'VidSrc.work',
            'VidSrc API',
            'VidSrc Embed',
            'vidsrc.to alternative',
            'vidsrc.me alternative',
            'vidsrc.xyz alternative',
          ],
          url: 'https://vidsrc.work',
          potentialAction: {
            '@type': 'SearchAction',
            target: 'https://vidsrc.work/embed/movie/{search_term_string}',
            'query-input': 'required name=search_term_string',
          },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'VidSrc',
          url: 'https://vidsrc.work',
          logo: 'https://vidsrc.work/logo/vidsrc.png',
        },
        {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'VidSrc Embed Player & API',
          applicationCategory: 'MultimediaApplication',
          operatingSystem: 'All',
          description:
            'High-performance video streaming and embed API supporting movies, TV series, and anime. Compatible with TMDB and IMDb IDs, multi-language subtitles, adaptive 4K bitrate, and zero intrusive ads. Engineered as the superior alternative to vidsrc.to and vidsrc.me.',
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.95',
            reviewCount: '3480',
          },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'What is VidSrc (vidsrc.work)?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'VidSrc (vidsrc.work) is a free developer video streaming and embed API platform that allows webmasters to embed movies and TV series effortlessly using standard HTML5 iframe elements.',
              },
            },
            {
              '@type': 'Question',
              name: 'How is VidSrc.work better than vidsrc.to and vidsrc.me?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'VidSrc.work provides 99.98% high-availability CDN proxy routing, zero intrusive redirect ads, faster player load times, true 4K/1080p stream resolution, multi-language subtitle synchronization in 40+ languages, and instant automatic multi-source failover.',
              },
            },
            {
              '@type': 'Question',
              name: 'What URL formats does VidSrc.work support?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'VidSrc.work supports both path-based (/embed/movie/{id}, /embed/tv/{id}/{season}/{episode}) and query-based endpoints (/embed/movie?tmdb={id}, /embed/movie?imdb={id}, /embed/tv?tmdb={id}&s={s}&e={e}), making it a 100% drop-in replacement for vidsrc.to, vidsrc.me, and vidsrc.xyz.',
              },
            },
            {
              '@type': 'Question',
              name: 'Can I use IMDb IDs (e.g., tt0137523) instead of TMDB IDs?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes! VidSrc.work automatically detects and resolves IMDb IDs (beginning with tt) in real-time, matching them with TMDB metadata for seamless movie and TV playback.',
              },
            },
            {
              '@type': 'Question',
              name: 'Are subtitles and multiple audio languages supported?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes, VidSrc features automated subtitle extraction in over 40+ international languages and synchronized audio stream selection.',
              },
            },
            {
              '@type': 'Question',
              name: 'Is VidSrc.work free to integrate into web applications?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes, VidSrc.work is 100% free with no subscription fees, credit cards, or API token registration required.',
              },
            },
          ],
        },
      ]
    : null;

  return (
    <div
      style={{
        backgroundColor: '#0a0a0a',
        color: '#ffffff',
        minHeight: '100vh',
        width: '100%',
        margin: 0,
        padding: 0,
      }}
    >
      {vidsrcStructuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(vidsrcStructuredData) }}
        />
      )}
      {showPlayerAds && (
        <Script
          id="embed-pop-ad"
          src="//gs.retimeliquory.com/rTYx8bqCMIiKM/141204"
          strategy="afterInteractive"
          data-cfasync="false"
        />
      )}
      {children}
    </div>
  );
}

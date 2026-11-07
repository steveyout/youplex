import Script from 'next/script';
import { headers } from 'next/headers';
import { isPlayerAdsEnabled } from '@/components/ads/ad-config';

export async function generateMetadata() {
  const headerList = await headers();
  const host = (headerList.get('x-forwarded-host') || headerList.get('host') || '').toLowerCase();
  const isVidSrc = host.includes('vidsrc');

  if (isVidSrc) {
    return {
      title: 'VidSrc — Free HD Movie & TV Show Streaming API and Player',
      description:
        'Embed and stream high-quality movies and TV shows effortlessly with VidSrc. Fast streaming API, responsive HTML5 player, adaptive bitrate, multi-language subtitles, and zero buffering.',
      keywords: [
        'vidsrc',
        'vidsrc embed',
        'vidsrc api',
        'vidsrc player',
        'free movies stream',
        'watch movies online free',
        'streaming api',
        'tv show embed',
        'hd stream',
      ],
      openGraph: {
        title: 'VidSrc — Free HD Movie & TV Show Streaming API and Player',
        description:
          'Embed and stream high-quality movies and TV shows effortlessly with VidSrc. Fast streaming API, responsive player, adaptive bitrate, and multi-language subtitles.',
        url: 'https://vidsrc.work',
        siteName: 'VidSrc',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: 'VidSrc — Free HD Movie & TV Show Streaming API',
        description:
          'Embed and stream high-quality movies and TV shows effortlessly with VidSrc.',
      },
    };
  }

  return {
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

export default function EmbedLayout({ children }) {
  const showPlayerAds = isPlayerAdsEnabled();

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

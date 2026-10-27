import Script from 'next/script';
import { isPlayerAdsEnabled } from '@/components/ads/ad-config';

export const metadata = {
  title: 'Youplex Embed API — Next-Gen Video Embedding & Streaming API',
  description:
    'Embed high-quality movies and TV shows on your website effortlessly with our RESTful streaming API.',
};

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

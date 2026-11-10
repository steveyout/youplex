import { headers } from 'next/headers';
import { CONFIG } from '@/config-global';

export default async function robots() {
  let host = '';
  try {
    const headerList = await headers();
    host = (headerList.get('x-forwarded-host') || headerList.get('host') || '').toLowerCase();
  } catch {
    // fallback
  }

  const isVidSrc = host.includes('vidsrc');
  const baseUrl = isVidSrc
    ? 'https://vidsrc.work'
    : host
      ? `https://${host}`
      : CONFIG.site.serverUrl || 'https://youplex.site';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
      {
        userAgent: [
          'Googlebot',
          'Bingbot',
          'Applebot',
          'YandexBot',
          'DuckDuckBot',
        ],
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'CCBot',
          'anthropic-ai',
          'Claude-Web',
          'ClaudeBot',
          'Bytespider',
          'PerplexityBot',
          'Scrapy',
        ],
        disallow: isVidSrc ? ['/api/'] : '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

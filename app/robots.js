import { CONFIG } from '@/config-global';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
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
          'curl',
          'Wget',
        ],
        disallow: '/',
      },
    ],
    sitemap: `${CONFIG.site.serverUrl}/sitemap.xml`,
  };
}

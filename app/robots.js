import { CONFIG } from '@/config-global';

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/'], // Add any private routes here
    },
    sitemap: `${CONFIG.site.serverUrl}/sitemap.xml`,
  };
}

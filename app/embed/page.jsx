import { headers } from 'next/headers';
import EmbedDocumentationView from './embed-view';

// ----------------------------------------------------------------------

export default async function EmbedDocumentationPage() {
  const headerList = await headers();
  const host = (headerList.get('x-forwarded-host') || headerList.get('host') || '').toLowerCase();
  const isVidSrc = host.includes('vidsrc');
  const initialOrigin = isVidSrc ? 'https://vidsrc.work' : `https://${host || 'youplex.site'}`;

  return <EmbedDocumentationView isVidSrc={isVidSrc} initialOrigin={initialOrigin} />;
}

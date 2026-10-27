import { NextResponse } from 'next/server';
import { isContentDmcaBlocked } from './lib/dmca';

export function proxy(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const embedMatch = pathname.match(/^\/embed\/(?:movie|tv)\/([^/?#]+)/i);
  const currentId = url.searchParams.get('id') || (embedMatch ? embedMatch[1] : null);

  const blocked = isContentDmcaBlocked({
    id: currentId,
    pathname,
  });

  if (blocked) {
    return new NextResponse('Gone - Content removed pursuant to DMCA', {
      status: 410,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  return NextResponse.next();
}

export const middleware = proxy;
export default proxy;

// Match all /watch routes, embed player routes, and backend media API routes to enforce DMCA blocks dynamically
export const config = {
  matcher: [
    '/watch/:path*',
    '/embed/movie/:path*',
    '/embed/tv/:path*',
    '/api/scrape',
    '/api/subtitles',
  ],
};

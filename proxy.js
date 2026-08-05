import { NextResponse } from 'next/server';
import BLOCKED_URLS from './config/dmca-blocked.json';

export default function proxy(request) {
  const url = new URL(request.url);
  const currentId = url.searchParams.get('id');

  const isBlocked = BLOCKED_URLS.some(
    (item) => item.pathname === url.pathname && item.id === currentId
  );

  if (isBlocked) {
    return new NextResponse('Gone - Content removed pursuant to DMCA', { status: 410 });
  }

  return NextResponse.next();
}

// Explicitly define static strings here to satisfy Next.js compilation rules
export const config = {
  matcher: [
    '/watch/movie/spider-man-brand-new-day',
    '/watch/movie/over-your-dead-body'
  ],
};

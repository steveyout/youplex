import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const INTRO_DB_BASE_URL = 'https://api.theintrodb.org/v3/media';
const INTRO_DB_SUBMIT_URL = 'https://api.theintrodb.org/v3/submit';

/**
 * Note: TheIntroDB API is consumed directly client-side via actions/api.js
 * to prevent server-side Cloudflare bot protection blocks in production.
 * This route redirects any legacy/direct requests to TheIntroDB API directly.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = new URL(INTRO_DB_BASE_URL);
  searchParams.forEach((val, key) => {
    targetUrl.searchParams.set(key, val);
  });
  return NextResponse.redirect(targetUrl.toString(), 307);
}

export async function POST() {
  return NextResponse.redirect(INTRO_DB_SUBMIT_URL, 307);
}

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getTidbEndpoints() {
  const base = (
    process.env.NEXT_PUBLIC_TIDB_BASE_URL ||
    process.env.TIDB_BASE_URL ||
    'https://api.theintrodb.org/v4'
  ).replace(/\/+$/, '');

  return {
    mediaUrl: `${base}/media`,
    submitUrl: `${base}/submit`,
    apiKey: (process.env.TIDB_API_KEY || process.env.NEXT_PUBLIC_TIDB_API_KEY || '').trim(),
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

/**
 * TheIntroDB (TIDB v4) Media Timestamps Proxy & Redirect
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const { mediaUrl, apiKey } = getTidbEndpoints();

  const targetUrl = new URL(mediaUrl);
  searchParams.forEach((val, key) => {
    targetUrl.searchParams.set(key, val);
  });

  const headers = {
    Accept: 'application/json',
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };

  try {
    const res = await fetch(targetUrl.toString(), {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok || res.status === 404) {
      const data = await res.json();
      return NextResponse.json(data, {
        status: res.status,
        headers: CORS_HEADERS,
      });
    }

    // Fall back to direct 307 redirect if upstream returns non-200/404
    return NextResponse.redirect(targetUrl.toString(), 307);
  } catch {
    // If server fetch encounters bot blocking or network error, redirect client directly
    return NextResponse.redirect(targetUrl.toString(), 307);
  }
}

/**
 * Submit timestamp contributions to TheIntroDB
 */
export async function POST(request) {
  const { submitUrl, apiKey } = getTidbEndpoints();

  try {
    const body = await request.json();
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    };

    const res = await fetch(submitUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(6000),
    });

    const data = await res.json();
    return NextResponse.json(data, {
      status: res.status,
      headers: CORS_HEADERS,
    });
  } catch {
    return NextResponse.redirect(submitUrl, 307);
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
